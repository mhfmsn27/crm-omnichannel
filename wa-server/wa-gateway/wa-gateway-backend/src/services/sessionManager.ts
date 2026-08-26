import makeWASocket, {
  DisconnectReason,
  WASocket,
  makeCacheableSignalKeyStore,
  proto,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  isJidUser,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import { FastifyInstance } from 'fastify';
import { WebhookService } from './webhook.service';
import { Pool } from 'pg';
import { BaileysPgAuthStore } from '../utils/baileys-pg-store';
import { config } from '../config';
import { SocksProxyAgent } from 'socks-proxy-agent';
import '@fastify/postgres';
import '@fastify/sensible';
import NodeCache from 'node-cache';

type SessionStatus = 'CONNECTED' | 'DISCONNECTED' | 'NEED_QR' | 'INITIALIZING' | 'RECOVERING';

import { BufferJSON } from '@whiskeysockets/baileys';

/**
 * Persistent message store backed by PostgreSQL.
 * Keeps the last MAX_MEM messages in RAM for fast access,
 * AND writes every outgoing message to DB so getMessage() survives restarts.
 * The DB TTL is 24 hours — enough time for all retry requests to succeed.
 */
class PersistentMessageStore {
    private memCache = new Map<string, proto.IMessage>();
    private keys: string[] = [];
    private MAX_MEM = 500;
    private dbPool: Pool;
    private sessionId: string;
    private dbReady = false;

    constructor(dbPool: Pool, sessionId: string) {
        this.dbPool = dbPool;
        this.sessionId = sessionId;
        this.ensureTable();
    }

    private async ensureTable() {
        try {
            await this.dbPool.query(`
                CREATE TABLE IF NOT EXISTS wa_message_store (
                    session_id VARCHAR(255) NOT NULL,
                    message_id VARCHAR(255) NOT NULL,
                    message_data JSONB NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    PRIMARY KEY (session_id, message_id)
                );
                CREATE INDEX IF NOT EXISTS idx_wa_msg_store_session ON wa_message_store(session_id);
            `);
            this.dbReady = true;
        } catch (e: any) {
            console.error('[PersistentMsgStore] Failed to ensure table:', e.message);
        }
    }

    set(id: string, message: proto.IMessage) {
        // In-memory update
        if (!this.memCache.has(id)) {
            if (this.keys.length >= this.MAX_MEM) {
                const oldKey = this.keys.shift();
                if (oldKey) this.memCache.delete(oldKey);
            }
            this.keys.push(id);
            this.memCache.set(id, message);
        }
        // Background DB persist
        if (this.dbReady) {
            this.dbPool.query(
                `INSERT INTO wa_message_store (session_id, message_id, message_data)
                 VALUES ($1, $2, $3::jsonb)
                 ON CONFLICT (session_id, message_id) DO NOTHING`,
                [this.sessionId, id, JSON.stringify(message, BufferJSON.replacer)]
            ).catch(() => {});
            // Clean up messages older than 24h in the background
            this.dbPool.query(
                `DELETE FROM wa_message_store WHERE session_id = $1 AND created_at < NOW() - INTERVAL '24 hours'`,
                [this.sessionId]
            ).catch(() => {});
        }
    }

    async get(id: string): Promise<proto.IMessage | undefined> {
        // Fast path: in-memory
        const memHit = this.memCache.get(id);
        if (memHit) return memHit;
        // Slow path: DB lookup (handles restart scenarios)
        if (!this.dbReady) return undefined;
        try {
            const res = await this.dbPool.query(
                `SELECT message_data FROM wa_message_store WHERE session_id = $1 AND message_id = $2`,
                [this.sessionId, id]
            );
            if (res.rows.length > 0) {
                const parsed = JSON.parse(JSON.stringify(res.rows[0].message_data), BufferJSON.reviver) as proto.IMessage;
                // Warm up memory cache
                this.memCache.set(id, parsed);
                this.keys.push(id);
                return parsed;
            }
        } catch (e: any) {
            console.error('[PersistentMsgStore] DB get error:', e.message);
        }
        return undefined;
    }
}

export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, WASocket> = new Map();
  private qrCodes: Map<string, string> = new Map();
  private sessionStatuses: Map<string, SessionStatus> = new Map();
  private messageQueue: Map<string, proto.IWebMessageInfo[]> = new Map();
  private sessionOwners: Map<string, string> = new Map();
  private fastify: FastifyInstance;
  private webhookService: WebhookService;
  private dbPool: Pool;
  
  private startPromises: Map<string, Promise<void>> = new Map();
  private recoveryRetries: Map<string, number> = new Map();
  private conflictLocks: Map<string, number> = new Map();
  
  private sessionConnectionTimes: Map<string, number> = new Map();
  private messageCaches: Map<string, PersistentMessageStore> = new Map();
  private msgRetryCaches: Map<string, NodeCache> = new Map();

  // LID to Phone Number Cache (Global mapping)
  private lidToPnCache: Map<string, string> = new Map();
  private saveTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // Error counting for auto-healing
  private sessionErrorCounts: Map<string, { count: number; lastError: number }> = new Map();

  // iOS-specific: Track contacts with send failures for retry
  private iOSFailureCache: Map<string, { sessionId: string; jid: string; attempts: number; lastAttempt: number }> = new Map();

  // iOS-specific: Track when we last sent a message to a contact (for pre-send delay)
  private lastMessageTime: Map<string, number> = new Map();

  // iOS-specific: Track consecutive messages sent to a contact (for session refresh trigger)
  private consecutiveMessageCount: Map<string, number> = new Map();

  // iOS-specific: Threshold for triggering proactive session refresh
  private static readonly SESSION_REFRESH_THRESHOLD = 3;

  // Prekey upload scheduler
  private prekeyUploadIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor(fastifyInstance: FastifyInstance) {
    this.fastify = fastifyInstance;
    // FIX: Cast fastify to any to access pg property
    this.dbPool = (this.fastify as any).pg.pool;
    this.webhookService = new WebhookService(this.dbPool, this.fastify.log);
    this.resumeAllSessions();
  }

  // ============================================
  // iOS FIX: Proactive Prekey Upload
  // Helps prevent "waiting for this message" on iOS
  // ============================================

  /**
   * Start periodic prekey upload to keep session fresh
   * This helps prevent "waiting for this message" errors on iOS
   */
  private startPrekeyUploadScheduler(sessionId: string, sock: WASocket) {
    // Stop existing scheduler if any
    this.stopPrekeyUploadScheduler(sessionId);

    // Upload prekeys immediately when connected
    this.uploadPrekeys(sessionId, sock);

    // Then upload every 4 hours (iOS sessions tend to go stale after ~6 hours)
    const interval = setInterval(() => {
      const currentSock = this.sessions.get(sessionId);
      if (currentSock) {
        this.uploadPrekeys(sessionId, currentSock);
      }
    }, 4 * 60 * 60 * 1000);

    this.prekeyUploadIntervals.set(sessionId, interval);
  }

  private stopPrekeyUploadScheduler(sessionId: string) {
    const existing = this.prekeyUploadIntervals.get(sessionId);
    if (existing) {
      clearInterval(existing);
      this.prekeyUploadIntervals.delete(sessionId);
    }
  }

  private async uploadPrekeys(sessionId: string, sock: WASocket) {
    try {
      // Use reflection to call internal uploadPreKeys method if available
      const sockAny = sock as any;
      if (sockAny.uploadPreKeys && typeof sockAny.uploadPreKeys === 'function') {
        await sockAny.uploadPreKeys();
        this.fastify.log.debug(`[PREKEY/${sessionId}] Prekeys uploaded successfully`);
      }
    } catch (err) {
      this.fastify.log.warn(`[PREKEY/${sessionId}] Failed to upload prekeys: ${err}`);
    }
  }

  // ============================================
  // iOS FIX: Session Refresh for Specific Contact
  // ============================================

  /**
   * Check if a JID is likely an iOS device based on send patterns
   * iOS devices often have different session handling
   */
  private isLikelyIOSDevice(jid: string): boolean {
    // iOS JIDs don't have specific patterns, but we can detect
    // based on failure patterns. For now, assume all users could be iOS.
    return true;
  }

  /**
   * Calculate delay before sending to iOS device to allow session stabilization
   * iOS needs time to process encryption keys after connection changes
   * Delay increases with consecutive message count to prevent session fatigue
   */
  private getPreSendDelay(sessionId: string, jid: string): number {
    const key = `${sessionId}:${jid}`;
    const lastSent = this.lastMessageTime.get(key);
    const consecutiveCount = this.consecutiveMessageCount.get(key) || 0;
    const now = Date.now();

    // Progressive delay based on consecutive message count
    // Messages 1-2: minimal delay
    // Messages 3+: increasing delay to prevent session fatigue
    if (consecutiveCount >= 3) {
      // After 3+ consecutive messages, add significant delay
      // iOS needs time to process accumulated encryption
      return 800 + (consecutiveCount * 200); // 800ms, 1000ms, 1200ms...
    }

    if (consecutiveCount >= 2) {
      // After 2 consecutive messages, moderate delay
      return 500;
    }

    // If we sent a message recently (within 5 seconds), reduce delay
    if (lastSent && (now - lastSent) < 5000) {
      return 100; // Minimal delay for rapid succession
    }

    // If this is the first message or last was long ago, add delay for session sync
    return 300; // Small delay to allow encryption session to stabilize
  }

  /**
   * Record when a message was sent to track message timing
   */
  private recordMessageSent(sessionId: string, jid: string) {
    const key = `${sessionId}:${jid}`;
    this.lastMessageTime.set(key, Date.now());

    // Increment consecutive message count
    const current = this.consecutiveMessageCount.get(key) || 0;
    this.consecutiveMessageCount.set(key, current + 1);
  }

  /**
   * Reset consecutive message count (call after session refresh)
   */
  private resetConsecutiveCount(sessionId: string, jid: string) {
    const key = `${sessionId}:${jid}`;
    this.consecutiveMessageCount.delete(key);
  }

  /**
   * Mark a contact as having iOS-related send failure
   * This triggers session refresh on next send attempt
   */
  public markIOSFailure(sessionId: string, jid: string) {
    const key = `${sessionId}:${jid}`;
    const existing = this.iOSFailureCache.get(key);
    this.iOSFailureCache.set(key, {
      sessionId,
      jid,
      attempts: (existing?.attempts || 0) + 1,
      lastAttempt: Date.now()
    });

    // Clear old entries (older than 1 hour)
    for (const [k, v] of this.iOSFailureCache) {
      if (Date.now() - v.lastAttempt > 60 * 60 * 1000) {
        this.iOSFailureCache.delete(k);
      }
    }
  }

  /**
   * Check if a contact needs session refresh before sending
   */
  private needsSessionRefresh(sessionId: string, jid: string): boolean {
    const key = `${sessionId}:${jid}`;
    const failure = this.iOSFailureCache.get(key);
    if (!failure) return false;

    // If we've failed 2+ times, recommend refresh
    return failure.attempts >= 2;
  }

  /**
   * Clear iOS failure record after successful send
   */
  public clearIOSFailure(sessionId: string, jid: string) {
    const key = `${sessionId}:${jid}`;
    this.iOSFailureCache.delete(key);
  }

  /**
   * Get LID (Legacy ID) for a given JID if available
   * iOS devices may require LID for proper message routing
   */
  public getLidForJid(jid: string): string | null {
    const cleanJid = jid.replace('@s.whatsapp.net', '');
    for (const [lid, pn] of this.lidToPnCache) {
      if (pn === jid || pn === cleanJid || pn === `${cleanJid}@s.whatsapp.net`) {
        return lid;
      }
    }
    return null;
  }

  /**
   * Refresh session for a specific contact (sends Keyed PK Message)
   * This helps re-establish encryption with iOS devices
   *
   * @param sessionId - The session ID
   * @param jid - The JID to refresh session for
   * @param lid - Optional LID if known (helps with iOS routing)
   * @param sock - The WASocket instance
   */
  private async refreshContactSession(
    sessionId: string,
    jid: string,
    lid: string | null,
    sock: WASocket
  ): Promise<boolean> {
    try {
      const sockAny = sock as any;
      this.fastify.log.info(`[IOS-FIX/${sessionId}] Refreshing session for ${jid}${lid ? ` (LID: ${lid})` : ''}`);

      // Step 1: Send presence update to JID to trigger session activity
      try {
        await sock.sendPresenceUpdate('available', jid);
      } catch (_) {}

      // Step 2: If we have LID, also send presence to LID for iOS
      if (lid) {
        try {
          await sock.sendPresenceUpdate('available', lid);
        } catch (_) {}
        // Small delay between JID and LID presence updates
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Step 3: Small delay to let presence update propagate
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 4: Try to process any pending retry requests for this contact
      if (sockAny.signalRepository) {
        const signalAny = sockAny.signalRepository as any;

        // Process pending devices to ensure we have fresh session keys
        if (signalAny.processPendingDevices) {
          try {
            // Try both JID and LID if available
            await signalAny.processPendingDevices(jid);
            if (lid) {
              await signalAny.processPendingDevices(lid);
            }
          } catch (_) {}
        }

        // Try to get existing session and see if it's valid
        if (signalAny.sessionStore) {
          try {
            const session = await signalAny.sessionStore.getSession(jid);
            if (session) {
              this.fastify.log.debug(`[IOS-FIX/${sessionId}] Existing session found for ${jid}`);
            } else {
              this.fastify.log.warn(`[IOS-FIX/${sessionId}] No session found for ${jid}`);
            }
          } catch (_) {}
        }
      }

      // Step 5: Final delay after session refresh attempts
      await new Promise(resolve => setTimeout(resolve, 200));

      this.fastify.log.info(`[IOS-FIX/${sessionId}] Session refresh completed for ${jid}`);
      return true;
    } catch (err) {
      this.fastify.log.warn(`[IOS-FIX/${sessionId}] Could not refresh session for ${jid}: ${err}`);
      return false;
    }
  }

  // ============================================
  // iOS FIX: Detect Session-Related Errors
  // ============================================

  /**
   * Check if an error is related to session/encryption issues
   * that cause "waiting for this message" on iOS
   */
  private isSessionRelatedError(error: any): boolean {
    if (!error) return false;

    const errorStr = String(error.message || error).toLowerCase();
    const sessionRelatedPatterns = [
      'session',
      'prekey',
      'no session',
      'invalid prekey',
      'bad mac',
      'mac error',
      'decrypt',
      'encrypt',
      'key',
      'stale',
      'waiting for this message',
      'messagecounter',
      'protocol error'
    ];

    return sessionRelatedPatterns.some(pattern => errorStr.includes(pattern));
  }
  
  private async resumeAllSessions() {
    this.fastify.log.info('Attempting to resume all sessions from database...');
    try {
        const { rows } = await this.dbPool.query<{ id: string, client_id: string }>("SELECT id, client_id FROM sessions");
        if (rows.length === 0) {
            this.fastify.log.info('No sessions found in database to resume.');
            return;
        }
        this.fastify.log.info(`Found ${rows.length} sessions to resume. Initializing...`);
        
        for (const row of rows) {
            try {
                this.sessionOwners.set(row.id, row.client_id);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Stagger start
                // freshAuth=false: preserve credentials on resume
                this.startSession(row.id, row.client_id, false).catch(err => {
                    this.fastify.log.error(`[RESUME-FAIL/${row.id}] Failed to auto-resume session: ${err?.message || err}`);
                });
            } catch (innerErr) {
                this.fastify.log.error(innerErr, `[RESUME-ERROR/${row.id}] Error in resume loop`);
            }
        }
    } catch (error) {
        this.fastify.log.error(error, "Critical error while resuming sessions from database.");
    }
  }

  public static getInstance(fastifyInstance: FastifyInstance): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(fastifyInstance);
    }
    return SessionManager.instance;
  }

  private async loadLidMap(sessionId: string) {
    try {
        const res = await this.dbPool.query(
            "SELECT session_data FROM baileys_sessions WHERE client_id = $1 AND session_key = 'custom-lid-map'",
            [sessionId]
        );
        if (res.rows.length > 0 && res.rows[0].session_data) {
            let data;
            if (typeof res.rows[0].session_data === 'string') {
                 try {
                    data = JSON.parse(res.rows[0].session_data);
                 } catch {
                    data = {};
                 }
            } else {
                data = res.rows[0].session_data;
            }
            
            let count = 0;
            if (data) {
                for (const [lid, pn] of Object.entries(data)) {
                    this.lidToPnCache.set(lid, pn as string);
                    count++;
                }
            }
            this.fastify.log.info(`[LID-MAP/${sessionId}] Loaded ${count} LID mappings from database.`);
        }
    } catch (err) {
        this.fastify.log.error(`[LID-MAP-ERR/${sessionId}] Failed to load LID mappings: ${err}`);
    }
  }

  private queueLidSave(sessionId: string) {
    if (this.saveTimeouts.has(sessionId)) return;
    
    const timeout = setTimeout(() => {
        this.saveLidMap(sessionId);
        this.saveTimeouts.delete(sessionId);
    }, 5000); 
    this.saveTimeouts.set(sessionId, timeout);
  }

  private async saveLidMap(sessionId: string) {
    try {
        // Convert map to object for storage
        const obj = Object.fromEntries(this.lidToPnCache);
        const dataStr = JSON.stringify(obj);
        
        await this.dbPool.query(
            `INSERT INTO baileys_sessions (client_id, session_key, session_data)
             VALUES ($1, $2, $3::jsonb)
             ON CONFLICT (client_id, session_key) DO UPDATE SET session_data = EXCLUDED.session_data, updated_at = NOW()`,
            [sessionId, 'custom-lid-map', dataStr]
        );
        this.fastify.log.debug(`[LID-MAP/${sessionId}] Saved mappings to DB.`);
    } catch (err) {
        this.fastify.log.error(`[LID-MAP-SAVE-ERR/${sessionId}] ${err}`);
    }
  }

  // Public method to get PN from LID (used by Group Routes)
  public getPhoneNumber(jid: string | null | undefined): string | null {
      if (!jid) return null;
      if (jid.includes('@lid')) {
          const pn = this.lidToPnCache.get(jid);
          return pn || jid; // Fallback to LID if not found, but cleaner to return normalized if possible
      }
      return jid;
  }

  /**
   * Resolve all known LID → PN mappings for a session.
   * Combines in-memory cache + WhatsApp contact store for comprehensive resolution.
   * Used to heal old @lid contacts in the database.
   */
  public async resolveAllLids(sessionId: string): Promise<{ lid: string; pn: string }[]> {
      const mappings: { lid: string; pn: string }[] = [];

      // 1. Add all entries from in-memory cache
      for (const [lid, pn] of this.lidToPnCache) {
          if (pn && pn.includes('@s.whatsapp.net')) {
              mappings.push({ lid, pn });
          }
      }

      // 2. Also query the WhatsApp contact store directly from Baileys auth state
      // This contains contacts fetched from WhatsApp's address book which has both LID and real JID
      const sock = this.sessions.get(sessionId);
      const sockAny = sock as any;
      try {
          if (sockAny.store?.contacts) {
              for (const [jid, contact] of Object.entries(sockAny.store.contacts)) {
                  const c = contact as any;
                  if (c?.lid && c?.id && !c.id.includes('@lid') && c.id.includes('@s.whatsapp.net')) {
                      // Already in cache? Update if different
                      const existing = this.lidToPnCache.get(c.lid);
                      if (!existing || existing !== c.id) {
                          this.lidToPnCache.set(c.lid, c.id);
                          this.queueLidSave(sessionId);
                      }
                      if (!mappings.find(m => m.lid === c.lid)) {
                          mappings.push({ lid: c.lid, pn: c.id });
                      }
                  }
              }
          }
      } catch (err) {
          this.fastify.log.warn(`[resolveAllLids/${sessionId}] Could not query contact store: ${err}`);
      }

      return mappings;
  }

  /**
   * Update a specific LID → PN mapping in the cache and persist to DB.
   */
  public async updateLidMapping(sessionId: string, lid: string, pn: string): Promise<void> {
      if (!lid.includes('@lid') || !pn.includes('@s.whatsapp.net')) return;
      this.lidToPnCache.set(lid, pn);
      await this.saveLidMap(sessionId);
  }

  // Helper to normalize JID in message object using senderPn trick
  private normalizeMessageSource(sessionId: string, msg: proto.IWebMessageInfo) {
      if (!msg.key) return msg;

      const keyAny = msg.key as any; // Cast to access senderPn which is hidden in types
      const msgAny = msg as any;     // Cast to access sender/participant from message body

      // Helper function to resolve LID
      const resolve = (jid: string | null | undefined): string | null | undefined => {
          if (!jid) return jid;
          if (!jid.includes('@lid')) return jid;

          // Log when we see LID - this indicates iOS or multi-device scenarios
          this.fastify.log.info(`[IOS-LID/${sessionId}] Received message with LID: ${jid}`);

          // Helper to extract and validate a WhatsApp JID
          const extractRealJid = (candidate: string | null | undefined): string | null => {
              if (!candidate || typeof candidate !== 'string') return null;
              // Accept both @s.whatsapp.net and @lid forms (in case of double-LID)
              if (candidate.includes('@s.whatsapp.net')) return candidate;
              if (candidate.includes('@lid') && !candidate.includes('@s.whatsapp.net')) return null;
              return null;
          };

          // STRATEGY 1: Check 'senderPn' from incoming message key (The "Golden Ticket")
          // WhatsApp often sends the real phone number in this property for LID messages
          const senderPn = extractRealJid(keyAny.senderPn);
          if (senderPn) {
              // Validasi tambahan: senderPn harus relevan dengan JID yang sedang di-resolve
              // (Biasanya senderPn adalah milik pengirim pesan)

              if (!this.lidToPnCache.has(jid) || this.lidToPnCache.get(jid) !== senderPn) {
                  // Simpan ke cache untuk penggunaan masa depan (misal: list group)
                  this.lidToPnCache.set(jid, senderPn);
                  this.queueLidSave(sessionId);

                  // Notify backend to merge conversations
                  const clientId = this.sessionOwners.get(sessionId);
                  if (clientId) {
                      this.webhookService.sendWebhook(clientId, {
                          type: 'lid.resolved',
                          instanceId: sessionId,
                          mappings: [{ lid: jid, pn: senderPn }]
                      }).catch(() => {});
                  }
              }
              return senderPn;
          }

          // STRATEGY 2: Check message body for sender JID (for history sync messages
          // where key.senderPn may not be populated but body has sender/participant info)
          const bodySender = extractRealJid(msgAny.sender || msgAny.participant);
          if (bodySender) {
              if (!this.lidToPnCache.has(jid) || this.lidToPnCache.get(jid) !== bodySender) {
                  this.lidToPnCache.set(jid, bodySender);
                  this.queueLidSave(sessionId);

                  const clientId = this.sessionOwners.get(sessionId);
                  if (clientId) {
                      this.webhookService.sendWebhook(clientId, {
                          type: 'lid.resolved',
                          instanceId: sessionId,
                          mappings: [{ lid: jid, pn: bodySender }]
                      }).catch(() => {});
                  }
              }
              return bodySender;
          }

          // STRATEGY 3: Check Internal Cache
          const cached = this.lidToPnCache.get(jid);
          return cached || jid;
      };

      // Normalize remoteJid (Sender in 1-on-1, or Group ID)
      if (msg.key.remoteJid) {
          msg.key.remoteJid = resolve(msg.key.remoteJid);
      }

      // Normalize participant (Sender in Group)
      if (msg.key.participant) {
          // senderPn usually belongs to the participant in a group message
          const resolvedParticipant = resolve(msg.key.participant);
          if (resolvedParticipant) msg.key.participant = resolvedParticipant;
      }

      return msg;
  }

  private createBaileysLogger(sessionId: string) {
      const baseLogger = this.fastify.log.child({ session: sessionId });
      
      // We need to implement a full Pino-compatible interface because Baileys uses .child() internally
      const createInterceptor = (logger: any): any => {
          return {
              ...logger,
              level: 'error', // Set Baileys log level to error to reduce noise
              // Implement child method to return another intercepted logger
              child: (bindings: any) => {
                  return createInterceptor(logger.child(bindings));
              },
              error: (obj: any, msg?: string, ...args: any[]) => {
                  const errorMessage = (typeof msg === 'string' ? msg : (obj?.message || ''));
                  const isBadMac = errorMessage.includes('Bad MAC') || (obj?.stack && obj.stack.includes('Bad MAC'));
                  const isSessionError = errorMessage.includes('SessionError') || (obj?.name === 'SessionError');
                  const isCounterError = errorMessage.includes('MessageCounterError') || (obj?.name === 'MessageCounterError');

                  if (isBadMac || isSessionError || isCounterError) {
                      this.handleSessionError(sessionId, 'Decryption Error');
                  }
                  
                  // Filter out MessageCounterError from logs as it's often transient
                  if (!errorMessage.includes('MessageCounterError')) {
                      logger.error(obj, msg, ...args);
                  }
              },
              warn: (obj: any, msg?: string, ...args: any[]) => {
                  logger.warn(obj, msg, ...args);
              },
              info: (obj: any, msg?: string, ...args: any[]) => {
                  logger.info(obj, msg, ...args);
              },
              debug: (obj: any, msg?: string, ...args: any[]) => {
                  // logger.debug(obj, msg, ...args);
              },
              trace: () => {}
          };
      };

      return createInterceptor(baseLogger);
  }

  private handleSessionError(sessionId: string, type: string) {
      const now = Date.now();
      const current = this.sessionErrorCounts.get(sessionId) || { count: 0, lastError: 0 };

      // Reset count if last error was more than 10 seconds ago
      if (now - current.lastError > 10000) {
          current.count = 0;
      }

      current.count++;
      current.lastError = now;
      this.sessionErrorCounts.set(sessionId, current);

      this.fastify.log.warn(`[AUTO-HEAL/${sessionId}] Detected ${type} (${current.count}/3)`);

      // If we hit 3 errors in short succession, restart the session
      if (current.count >= 3) {
          this.fastify.log.error(`[AUTO-HEAL/${sessionId}] Too many errors. Triggering forceful refresh...`);
          this.sessionErrorCounts.delete(sessionId);
          this.refreshSession(sessionId, true).catch(err => {
              this.fastify.log.error(`[AUTO-HEAL-FAIL/${sessionId}] Failed to refresh: ${err}`);
          });
      }
  }

  public async startSession(sessionId: string, clientId?: string, freshAuth: boolean = true): Promise<{ status: SessionStatus }> {
    const lockTime = this.conflictLocks.get(sessionId);
    if (lockTime) {
        if (Date.now() < lockTime) {
            const remaining = Math.ceil((lockTime - Date.now()) / 1000);
            throw this.fastify.httpErrors.tooManyRequests(`Session locked due to conflict. Please wait ${remaining} seconds.`);
        } else {
            this.conflictLocks.delete(sessionId);
        }
    }

    if (this.startPromises.has(sessionId)) {
        return { status: this.sessionStatuses.get(sessionId) || 'INITIALIZING' };
    }

    if (clientId) {
        this.sessionOwners.set(sessionId, clientId);
    }

    const startTask = async () => {
        try {
            await this.destroySession(sessionId);

            // Only clear auth state if freshAuth=true (user explicitly wants new QR)
            // Don't clear if reconnecting - the auth is still valid
            if (freshAuth) {
                this.fastify.log.info(`[START/${sessionId}] Clearing auth state for fresh QR`);
                await this.clearAuthState(sessionId);
            } else {
                this.fastify.log.info(`[START/${sessionId}] Preserving auth state for reconnect`);
            }

            const currentStatus = this.sessionStatuses.get(sessionId);
            if (currentStatus !== 'RECOVERING') {
                this.sessionStatuses.set(sessionId, 'INITIALIZING');
            }

            this.fastify.log.info(`[START/${sessionId}] Starting session (freshAuth=${freshAuth})...`);

            await this.loadLidMap(sessionId);

            const authStore = new BaileysPgAuthStore(this.dbPool, sessionId);
            const { state, saveCreds } = await authStore.useAuth();
            
            const { version, isLatest } = await fetchLatestBaileysVersion();
            this.fastify.log.info(`[VERSION/${sessionId}] Using WA v${version.join('.')} (isLatest: ${isLatest})`);

            // Fetch sync_full_history preference from DB
            let useSyncFullHistory = false;
            try {
                const sessionRes = await this.dbPool.query('SELECT sync_full_history FROM sessions WHERE id = $1', [sessionId]);
                if (sessionRes.rows.length > 0 && sessionRes.rows[0].sync_full_history) {
                    useSyncFullHistory = true;
                }
            } catch (err: any) {
                this.fastify.log.warn(`[START/${sessionId}] Failed to fetch sync_full_history: ${err.message}`);
            }

            let agent;
            if (config.PROXY_ENABLED && config.PROXY_HOST) {
                const proxyUrl = `socks5://${config.PROXY_USERNAME}:${config.PROXY_PASSWORD}@${config.PROXY_HOST}:${config.PROXY_PORT}`;
                agent = new SocksProxyAgent(proxyUrl);
            }

            // Use custom logger to intercept crypto errors
            const baileysLogger = this.createBaileysLogger(sessionId);
            const isRecovering = this.sessionStatuses.get(sessionId) === 'RECOVERING';

            let msgCache = this.messageCaches.get(sessionId);
            if (!msgCache) {
                msgCache = new PersistentMessageStore(this.dbPool, sessionId);
                this.messageCaches.set(sessionId, msgCache);
            }

            // ANTI-BAN: Randomize browser fingerprint per session to avoid bot-pattern detection
            const chromeVersions = ['20.0.04', '22.04.1', '24.04', '18.04.6', '20.10', '22.10'];
            const randomBrowser: [string, string, string] = ["Ubuntu", "Chrome", chromeVersions[Math.floor(Math.random() * chromeVersions.length)]];

            let msgRetryCache = this.msgRetryCaches.get(sessionId);
            if (!msgRetryCache) {
                msgRetryCache = new NodeCache({ stdTTL: 60 * 60, checkperiod: 120, useClones: false });
                this.msgRetryCaches.set(sessionId, msgRetryCache);
            }

            const sock = makeWASocket({
                version,
                browser: randomBrowser, 
                msgRetryCounterCache: msgRetryCache,
                auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, baileysLogger as any) },
                logger: baileysLogger as any,
                printQRInTerminal: false,
                defaultQueryTimeoutMs: 90000, 
                connectTimeoutMs: 60000,
                fetchAgent: agent,
                syncFullHistory: useSyncFullHistory, // Dynamically use DB preference
                generateHighQualityLinkPreview: !isRecovering,
                retryRequestDelayMs: 5000, 
                keepAliveIntervalMs: 30000, 
                markOnlineOnConnect: true,
                patchMessageBeforeSending: (message) => {
                    const requiresPatch = !!(
                        message.buttonsMessage ||
                        message.templateMessage ||
                        message.listMessage
                    );
                    if (requiresPatch) {
                        message = {
                            viewOnceMessage: {
                                message: {
                                    messageContextInfo: {
                                        deviceListMetadataVersion: 2,
                                        deviceListMetadata: {},
                                    },
                                    ...message,
                                },
                            },
                        };
                    }
                    return message;
                },
                getMessage: async (key) => {
                    // Async get from persistent store (memory + DB fallback)
                    return msgCache!.get(key.id!);
                }
            });

            this.sessions.set(sessionId, sock);
            this.fastify.log.info(`[SOCKET-CREATED/${sessionId}] Socket created, waiting for QR...`);

            // Intercept sendMessage to persist outgoing messages for retry requests (E2E encryption sync)
            // PersistentMessageStore saves to both RAM and PostgreSQL — survives restarts!
            const originalSendMessage = sock.sendMessage.bind(sock);
            sock.sendMessage = async (jid: string, content: any, options?: any) => {
                const msg = await originalSendMessage(jid, content, options);
                if (msg && msg.key && msg.key.id && msg.message) {
                    msgCache!.set(msg.key.id, msg.message);
                }
                return msg;
            };
            this.attachEventListeners(sessionId, sock, saveCreds);
        } catch (error) {
            this.fastify.log.error(error, `[FATAL/${sessionId}] Error starting session`);
            this.sessionStatuses.set(sessionId, 'DISCONNECTED');
            this.sessions.delete(sessionId);
            throw this.fastify.httpErrors.internalServerError('Failed to initialize session');
        }
    };

    const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error("Session start timed out (40s)")), 40000);
    });

    const promise = Promise.race([startTask(), timeoutPromise]);
    this.startPromises.set(sessionId, promise);
    
    try {
        await promise;
        return { status: this.sessionStatuses.get(sessionId) || 'INITIALIZING' };
    } catch (error) {
        this.fastify.log.error(error, `[START-ERROR/${sessionId}]`);
        this.sessionStatuses.set(sessionId, 'DISCONNECTED');
        return { status: 'DISCONNECTED' };
    } finally {
        this.startPromises.delete(sessionId);
    }
  }
  
  private attachEventListeners(sessionId: string, sock: WASocket, saveCreds: () => Promise<void>) {
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      const clientId = this.sessionOwners.get(sessionId);
      const currentStatus = this.sessionStatuses.get(sessionId);
      
      if (qr) {
          this.fastify.log.info(`[QR-GEN/${sessionId}] QR code generated!`);
          this.sessionStatuses.set(sessionId, 'NEED_QR');
          this.qrCodes.set(sessionId, qr);
          this.recoveryRetries.delete(sessionId);
          this.notifyStatusUpdate(sessionId, 'NEED_QR');
      }
      
      if (connection === 'open') {
          this.sessionStatuses.set(sessionId, 'CONNECTED');
          this.qrCodes.delete(sessionId);
          this.recoveryRetries.delete(sessionId);
          this.conflictLocks.delete(sessionId);
          this.sessionConnectionTimes.set(sessionId, Date.now());
          this.sessionErrorCounts.delete(sessionId); // Clear error counts on success

          this.fastify.log.info(`[CONNECTED/${sessionId}] Connection established.`);
          this.notifyStatusUpdate(sessionId, 'CONNECTED');

          // iOS FIX: Start prekey upload scheduler to prevent "waiting for this message"
          this.startPrekeyUploadScheduler(sessionId, sock);

          try { await sock.sendPresenceUpdate('available'); } catch (e) {}
      }
      
      if (connection === 'close') {
        const error = lastDisconnect?.error as Boom;
        const statusCode = error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        // Suppress MessageCounterError noise during closing
        if (error?.message?.includes('MessageCounterError')) {
            return; 
        }

        this.fastify.log.warn(`[CLOSE/${sessionId}] Closed. Code: ${statusCode}, Reconnect: ${shouldReconnect}`);

        this.qrCodes.delete(sessionId);
        this.sessionConnectionTimes.delete(sessionId);

        if (statusCode === DisconnectReason.loggedOut || statusCode === 403) {
             this.fastify.log.error(`[LOGGED-OUT/${sessionId}] Session logged out. Clearing data.`);
             this.sessionStatuses.set(sessionId, 'DISCONNECTED');
             await this.destroySession(sessionId);
             await this.clearSessionDataFromDb(sessionId); 
             this.notifyStatusUpdate(sessionId, 'DISCONNECTED');
             return;
        }

        if (statusCode === 440) { 
             this.fastify.log.error(`[CONFLICT/${sessionId}] Session conflict (440).`);
             this.sessionStatuses.set(sessionId, 'DISCONNECTED');
             this.conflictLocks.set(sessionId, Date.now() + 30000); // Lock for 30s
             await this.destroySession(sessionId); 
             this.notifyStatusUpdate(sessionId, 'DISCONNECTED');
             return; 
        }

        if (currentStatus === 'RECOVERING' || statusCode === 408) {
            const retries = this.recoveryRetries.get(sessionId) || 0;
            if (retries < 5) {
                this.fastify.log.info(`[RECOVER-RETRY/${sessionId}] Attempt ${retries + 1}/5...`);
                this.recoveryRetries.set(sessionId, retries + 1);
                this.sessions.delete(sessionId);
                setTimeout(() => {
                    // freshAuth=false: preserve credentials for reconnect
                    this.startSession(sessionId, clientId, false).catch(e => this.fastify.log.error(e));
                }, 3000);
                return;
            } else {
                this.fastify.log.error(`[RECOVER-FAIL/${sessionId}] Max retries reached.`);
                this.cleanupSession(sessionId);
                this.notifyStatusUpdate(sessionId, 'DISCONNECTED');
            }
        } else {
            if (shouldReconnect) {
                this.sessions.delete(sessionId);
                const currentRetries = this.recoveryRetries.get(sessionId) || 0;
                this.recoveryRetries.set(sessionId, currentRetries + 1);
                const backoffDelay = Math.min(25000, Math.round(Math.pow(1.4, Math.min(currentRetries, 8)) * 2000 + Math.random() * 1000));
                this.fastify.log.info(`[AUTO-RECONNECT/${sessionId}] Scheduling reconnect in ${backoffDelay}ms (attempt ${currentRetries + 1})...`);
                setTimeout(() => {
                     // freshAuth=false: preserve credentials for reconnect
                     this.startSession(sessionId, clientId, false).catch(e => this.fastify.log.error(e));
                }, backoffDelay);
            } else {
                this.cleanupSession(sessionId);
                this.notifyStatusUpdate(sessionId, 'DISCONNECTED');
            }
        }
      }
    });

    sock.ev.on('contacts.upsert', (contacts) => {
        const updates: { lid: string, pn: string, name?: string, imgUrl?: string }[] = [];
        let mappedCount = 0;
        for (const contact of contacts) {
            if (contact.id && contact.lid) {
                if (contact.id.endsWith('@s.whatsapp.net')) {
                    const pnJid = jidNormalizedUser(contact.id);
                    this.lidToPnCache.set(contact.lid, pnJid);
                    // Cast to any to access pushName which may not be in the type definition
                    const contactAny = contact as any;
                    updates.push({
                        lid: contact.lid,
                        pn: pnJid,
                        name: contact.name || contactAny.pushName || undefined,
                        imgUrl: contactAny.imgUrl || undefined
                    });
                    mappedCount++;
                }
            }
        }
        if (mappedCount > 0) {
            this.queueLidSave(sessionId);
            // Notify backend to heal existing @lid contacts in DB
            const clientId = this.sessionOwners.get(sessionId);
            if (clientId) {
                this.webhookService.sendWebhook(clientId, {
                    type: 'lid.resolved',
                    instanceId: sessionId,
                    mappings: updates
                }).catch(() => {});
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const clientId = this.sessionOwners.get(sessionId);
        const msgCache = this.messageCaches.get(sessionId);
        
        for (const msg of m.messages) {
            if (msgCache && msg.key.id && msg.message) {
                msgCache.set(msg.key.id, msg.message);
            }

            if (!clientId) continue;
            // Apply LID to PN Resolution here
            const normalizedMsg = this.normalizeMessageSource(sessionId, msg);

            if (!this.messageQueue.has(sessionId)) this.messageQueue.set(sessionId, []);
            this.messageQueue.get(sessionId)!.push(normalizedMsg);
            
            if (!normalizedMsg.message) continue;

            // Include senderPn for LID resolution in CRM
            // senderPn contains the real phone number for LID messages (WA Web/multi-device)
            const originalKey = m.messages.find(pm => pm.key?.id === normalizedMsg.key?.id)?.key;
            const senderPn = (originalKey as any)?.senderPn;

            const payload = { type: 'new_message', instanceId: sessionId, data: normalizedMsg };
            if (senderPn) {
                (payload as any).senderPn = senderPn;
            }
            await this.webhookService.sendWebhook(clientId, payload);
        }
    });

    sock.ev.on('messaging-history.set', async ({ messages, contacts, chats, isLatest }) => {
        const clientId = this.sessionOwners.get(sessionId);
        if (!clientId) return;

        // Normalize contacts data for LID resolution on CRM side
        const normalizedContacts = contacts?.map(c => ({
            id: c.id,
            lid: (c as any).lid || null,
            name: c.name || (c as any).notify || null,
        })).filter(c => c.id) || [];

        // Normalize chats data for unread count sync on CRM side
        const normalizedConversations = chats?.map(c => ({
            id: c.id,
            unreadCount: c.unreadCount ?? null,
            conversationTimestamp: (c as any).conversationTimestamp || null,
        })).filter(c => c.id) || [];

        // Process messages for history sync
        if (messages && messages.length > 0) {
            this.fastify.log.info(`[HISTORY/${sessionId}] Received ${messages.length} msgs, ${normalizedContacts.length} contacts, ${normalizedConversations.length} chats. isLatest=${isLatest}`);
            
            // Log messages that will be DROPPED (no content / failed decrypt)
            const dropped = messages.filter(msg => !msg.message);
            if (dropped.length > 0) {
                this.fastify.log.warn(`[HISTORY/${sessionId}] DROPPED ${dropped.length}/${messages.length} msgs (no content/decrypt fail)`);
                dropped.slice(0, 5).forEach(msg => {
                    this.fastify.log.warn(`[HISTORY/${sessionId}]   - dropped: jid=${msg.key?.remoteJid}, id=${msg.key?.id}, fromMe=${msg.key?.fromMe}`);
                });
            }

            const normalizedMessages = messages
                .filter(msg => msg.message)
                .map(msg => this.normalizeMessageSource(sessionId, msg));
            
            this.fastify.log.info(`[HISTORY/${sessionId}] Sending ${normalizedMessages.length} valid msgs to CRM webhook`);

            // Chunk into 200 messages per webhook to avoid Nginx 413 Payload Too Large
            const CHUNK_SIZE = 200;
            for (let i = 0; i < normalizedMessages.length; i += CHUNK_SIZE) {
                const chunk = normalizedMessages.slice(i, i + CHUNK_SIZE);
                const payload: any = { 
                    type: 'history_sync', 
                    instanceId: sessionId, 
                    data: { messages: chunk } 
                };

                // Include contacts and conversations data only in the FIRST chunk
                if (i === 0) {
                    if (normalizedContacts.length > 0) payload.data.contacts = normalizedContacts;
                    if (normalizedConversations.length > 0) payload.data.conversations = normalizedConversations;
                }
                
                await this.webhookService.sendWebhook(clientId, payload).catch(err => {
                    this.fastify.log.error(`[Webhook] Failed to send history_sync chunk: ${err.message}`);
                });
            }
        } else if (normalizedContacts.length > 0 || normalizedConversations.length > 0) {
            // No messages but we have contacts/chats data — still send for LID resolution and unread sync
            this.fastify.log.info(`[HISTORY/${sessionId}] No messages but received ${normalizedContacts.length} contacts, ${normalizedConversations.length} chats.`);
            const payload: any = { 
                type: 'history_sync', 
                instanceId: sessionId, 
                data: {} 
            };
            if (normalizedContacts.length > 0) payload.data.contacts = normalizedContacts;
            if (normalizedConversations.length > 0) payload.data.conversations = normalizedConversations;
            await this.webhookService.sendWebhook(clientId, payload).catch(err => {
                this.fastify.log.error(`[Webhook] Failed to send history_sync contacts/chats: ${err.message}`);
            });
        }
    });
    
    sock.ev.on('messages.update', async (updates) => {
        const clientId = this.sessionOwners.get(sessionId);
        if (!clientId) return;

        // Baileys WAMessageStatus: 0=ERROR,1=PENDING,2=SERVER_ACK,3=DELIVERY_ACK,4=READ,5=PLAYED
        // Full status lifecycle: pending → sent → delivered → read; failed = 0
        const statusMap: Record<number, string> = {
            0: 'failed',    // ERROR
            1: 'pending',  // PENDING
            2: 'sent',     // SERVER_ACK
            3: 'delivered',// DELIVERY_ACK
            4: 'read',     // READ
            5: 'read'      // PLAYED
        };

        for (const update of updates) {
            if (update.key) {
                if (update.key.remoteJid?.includes('@lid')) {
                    const pn = this.lidToPnCache.get(update.key.remoteJid);
                    if (pn) update.key.remoteJid = pn;
                }
                if (update.key.participant?.includes('@lid')) {
                    const pn = this.lidToPnCache.get(update.key.participant);
                    if (pn) update.key.participant = pn;
                }
            }

            if (update.key && update.update?.status) {
                const statusStr = statusMap[update.update.status as number] || String(update.update.status);
                // messageId and status must be at root level for CRMHUB's handleMessageAck
                const payload = {
                    type: 'message_status_update',
                    instanceId: sessionId,
                    messageId: update.key.id,
                    status: statusStr,
                    data: { status: update.update.status, key: update.key }
                };
                await this.webhookService.sendWebhook(clientId, payload);
            }
        }
    });
  }

  private notifyStatusUpdate(sessionId: string, status: SessionStatus) {
      const clientId = this.sessionOwners.get(sessionId);
      const sock = this.sessions.get(sessionId);
      const qr = this.qrCodes.get(sessionId);

      this.fastify.log.info(`[NOTIFY/${sessionId}] Status: ${status}, clientId: ${clientId}, hasSock: ${!!sock}`);

      if (clientId) {
          const payload = {
              type: status === 'NEED_QR' ? 'qr.received' : 'session.status.update',
              instanceId: sessionId,
              data: {
                  status: status,
                  phone: status === 'CONNECTED' ? sock?.user?.id.split(':')[0] : undefined,
                  qr: status === 'NEED_QR' ? qr : undefined
              }
          };
          this.fastify.log.info(`[NOTIFY/${sessionId}] Sending webhook: ${JSON.stringify(payload)}`);
          this.webhookService.sendWebhook(clientId, payload).catch(err =>
              this.fastify.log.error(`[Webhook] Failed to send status update for ${sessionId}: ${err.message}`)
          );
      } else {
          this.fastify.log.warn(`[NOTIFY/${sessionId}] No clientId found, skipping webhook`);
      }
  }

  private async clearSessionDataFromDb(sessionId: string) {
      try {
          await this.dbPool.query("DELETE FROM baileys_sessions WHERE client_id = $1", [sessionId]);
          this.fastify.log.info(`[DB-CLEAR/${sessionId}] Cleared all session data.`);
      } catch (err) {
          this.fastify.log.error(`[DB-CLEAR-FAIL/${sessionId}] ${err}`);
      }
  }

  private async destroySession(sessionId: string) {
      const sock = this.sessions.get(sessionId);
      if (sock) {
          try {
              sock.ws.close();
              sock.ev.removeAllListeners('connection.update');
              sock.ev.removeAllListeners('creds.update');
              sock.end(undefined);
          } catch (e) { }
      }
      this.sessions.delete(sessionId);
  }

  /**
   * Clear all auth state for a session (credentials, keys, etc)
   * Used when user wants to reconnect with a new QR code
   */
  private async clearAuthState(sessionId: string) {
      try {
          await this.dbPool.query(
              "DELETE FROM baileys_sessions WHERE client_id = $1",
              [sessionId]
          );
          this.fastify.log.info(`[AUTH-CLEAR/${sessionId}] Auth state cleared`);
      } catch (err) {
          this.fastify.log.error(`[AUTH-CLEAR-ERR/${sessionId}] Failed to clear auth: ${err}`);
      }
  }

  public popMessages(sessionId: string): proto.IWebMessageInfo[] {
      const messages = this.messageQueue.get(sessionId);
      if (messages) {
          this.messageQueue.set(sessionId, []);
          return messages;
      }
      return [];
  }

  public getSession(sessionId: string): WASocket | undefined { return this.sessions.get(sessionId); }

  // ============================================
  // iOS FIX: Send Message with Retry Logic
  // ============================================

  /**
   * Send message with automatic retry on session-related errors
   * This helps deliver messages to iOS users who show "waiting for this message"
   *
   * IMPORTANT: Always use JID for sending (Baileys handles LID internally),
   * but track LID for session refresh attempts on iOS devices.
   */
  public async sendMessageWithRetry(
    sessionId: string,
    jid: string,
    content: any,
    options?: any
  ): Promise<any> {
    const sock = this.sessions.get(sessionId);
    if (!sock) {
      throw new Error(`Session ${sessionId} not found or not connected`);
    }

    // Validate JID format - reject LID to prevent routing errors
    if (jid.includes('@lid')) {
      this.fastify.log.warn(`[IOS-RETRY/${sessionId}] Rejected LID in sendMessage: ${jid}. Use JID instead.`);
      throw new Error(`Cannot send to LID directly. Use JID format.`);
    }

    const maxRetries = 3;
    let lastError: any;
    const key = `${sessionId}:${jid}`;
    const consecutiveCount = this.consecutiveMessageCount.get(key) || 0;

    // Get LID mapping for debugging and session refresh
    const lid = this.getLidForJid(jid);
    if (lid) {
      this.fastify.log.info(`[IOS-LID/${sessionId}] Sending to ${jid} (has LID: ${lid})`);
    } else {
      this.fastify.log.debug(`[IOS-LID/${sessionId}] Sending to ${jid} (no LID mapping)`);
    }

    // iOS FIX: Proactive session refresh if we've sent many consecutive messages
    // This prevents session fatigue on iOS devices
    if (consecutiveCount >= SessionManager.SESSION_REFRESH_THRESHOLD) {
      this.fastify.log.info(`[IOS-FIX/${sessionId}] Proactive refresh before message #${consecutiveCount + 1} to ${jid}`);
      await this.refreshContactSession(sessionId, jid, lid, sock);
      // Reset consecutive count after proactive refresh
      this.resetConsecutiveCount(sessionId, jid);
      // Small delay after refresh
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Apply pre-send delay for iOS session stabilization
    const preSendDelay = this.getPreSendDelay(sessionId, jid);
    if (preSendDelay > 0) {
      this.fastify.log.debug(`[IOS-DELAY/${sessionId}] Applying ${preSendDelay}ms delay (consecutive: ${consecutiveCount})`);
      await new Promise(resolve => setTimeout(resolve, preSendDelay));
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // iOS FIX: Before retry, try to refresh the contact's session
        if (attempt > 1) {
          this.fastify.log.info(`[IOS-RETRY/${sessionId}] Retry ${attempt}/${maxRetries} for ${jid}`);
          // Pass both JID and LID for comprehensive session refresh
          await this.refreshContactSession(sessionId, jid, lid, sock);
          // Reset consecutive count after retry refresh
          this.resetConsecutiveCount(sessionId, jid);

          // Exponential backoff: 1s, 2s, 3s between retries
          const backoffDelay = attempt * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }

        // ALWAYS send to JID (Baileys handles LID routing internally)
        const result = await sock.sendMessage(jid, content, options);

        // Success - clear any failure record and record timestamp
        this.clearIOSFailure(sessionId, jid);
        this.recordMessageSent(sessionId, jid);

        return result;

      } catch (error: any) {
        lastError = error;
        const errorStr = String(error.message || error);

        this.fastify.log.warn(`[IOS-RETRY/${sessionId}] Attempt ${attempt} failed: ${errorStr}`);

        // Check if it's a session-related error
        if (this.isSessionRelatedError(error)) {
          this.markIOSFailure(sessionId, jid);

          // Reset consecutive count on session error
          this.resetConsecutiveCount(sessionId, jid);

          // If not the last attempt, continue to retry
          if (attempt < maxRetries) {
            continue;
          }
        } else {
          // Non-session error - don't retry, throw immediately
          throw error;
        }
      }
    }

    // All retries exhausted - reset consecutive count
    this.resetConsecutiveCount(sessionId, jid);
    this.fastify.log.error(`[IOS-RETRY/${sessionId}] All ${maxRetries} attempts failed for ${jid}`);
    throw lastError;
  }

  /**
   * Force refresh session for a specific contact
   * Useful when "waiting for this message" is reported
   */
  public async forceRefreshContactSession(sessionId: string, jid: string): Promise<boolean> {
    const sock = this.sessions.get(sessionId);
    if (!sock) {
      throw new Error(`Session ${sessionId} not found or not connected`);
    }

    // Reject LID to prevent routing errors
    if (jid.includes('@lid')) {
      this.fastify.log.warn(`[IOS-FIX/${sessionId}] forceRefreshContactSession rejected LID: ${jid}`);
      throw new Error(`Cannot refresh LID directly. Use JID format.`);
    }

    this.clearIOSFailure(sessionId, jid);
    const lid = this.getLidForJid(jid);
    return this.refreshContactSession(sessionId, jid, lid, sock);
  }

  public async stopSession(sessionId: string): Promise<void> {
    this.fastify.log.info(`[STOP/${sessionId}] Stopping session...`);
    const sock = this.sessions.get(sessionId);
    if (sock) {
      try { 
          await Promise.race([
              sock.logout(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 5000))
          ]);
      } catch (error: any) { 
          this.fastify.log.warn(`[STOP/${sessionId}] Logout timed out or failed: ${error.message}`);
      }
      finally { this.cleanupSession(sessionId); }
    }
  }

  public async refreshSession(sessionId: string, force: boolean = false): Promise<void> {
    this.sessionStatuses.set(sessionId, 'RECOVERING');
    await this.destroySession(sessionId);
    await new Promise(resolve => setTimeout(resolve, 3000));
    this.startSession(sessionId, this.sessionOwners.get(sessionId)).catch(() => {});
  }

  public getSessionStatus(sessionId: string): { status: SessionStatus; qr?: string; user?: any } {
    const status = this.sessionStatuses.get(sessionId) || 'DISCONNECTED';
    if (status === 'NEED_QR') {
      return { status, qr: this.qrCodes.get(sessionId) };
    }
    if (status === 'CONNECTED') {
        const sock = this.sessions.get(sessionId);
        return { status, user: sock?.user };
    }
    return { status };
  }

  public getSessionConnectionTime(sessionId: string): number | undefined {
      return this.sessionConnectionTimes.get(sessionId);
  }

  public getSessionStats() {
    const stats = {
        total_in_memory: this.sessionStatuses.size,
        connected: 0,
        disconnected: 0,
        need_qr: 0,
        initializing: 0,
        recovering: 0
    };
    this.sessionStatuses.forEach((status) => {
        if (status === 'CONNECTED') stats.connected++;
        else if (status === 'DISCONNECTED') stats.disconnected++;
        else if (status === 'NEED_QR') stats.need_qr++;
        else if (status === 'INITIALIZING') stats.initializing++;
        else if (status === 'RECOVERING') stats.recovering++;
    });
    return stats;
  }

  private cleanupSession(sessionId: string) {
    this.sessions.delete(sessionId);
    this.sessionStatuses.set(sessionId, 'DISCONNECTED');
    this.recoveryRetries.delete(sessionId);
    this.startPromises.delete(sessionId);
    this.qrCodes.delete(sessionId);
    this.conflictLocks.delete(sessionId);
    this.sessionConnectionTimes.delete(sessionId);
    this.sessionErrorCounts.delete(sessionId);

    // FIX: Also cleanup messageCaches to prevent memory leak
    this.messageCaches.delete(sessionId);

    // iOS FIX: Cleanup prekey scheduler
    this.stopPrekeyUploadScheduler(sessionId);

    // iOS FIX: Clear iOS failure records for this session
    for (const key of this.iOSFailureCache.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.iOSFailureCache.delete(key);
      }
    }

    // iOS FIX: Clear last message time tracking for this session
    for (const key of this.lastMessageTime.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.lastMessageTime.delete(key);
      }
    }

    // iOS FIX: Clear consecutive message count for this session
    for (const key of this.consecutiveMessageCount.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.consecutiveMessageCount.delete(key);
      }
    }

    // FIX: Cleanup LID cache for this session
    // Remove LID mappings associated with this session
    let deletedLids = 0;
    for (const [lid, _] of this.lidToPnCache) {
        // We can't track which session owns which LID without a reverse map
        // So we'll leave the global cache, but limit its growth
    }

    const saveTimeout = this.saveTimeouts.get(sessionId);
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        this.saveTimeouts.delete(sessionId);
    }
  }
}