
import { proto, initAuthCreds } from '@whiskeysockets/baileys';
import { BufferJSON, AuthenticationCreds, SignalDataTypeMap } from '@whiskeysockets/baileys';
import { Pool } from 'pg';
import { Mutex } from 'async-mutex';
import { Buffer } from 'buffer';

// Helper function to recursively convert { type: 'Buffer', data: [...] } to real Buffers
function fixBuffers(data: any): any {
    if (!data) return data;
    
    // If it's already a Buffer, return it
    if (Buffer.isBuffer(data)) return data;

    // Handle Uint8Array which Baileys often uses now
    if (data instanceof Uint8Array) {
        return Buffer.from(data);
    }

    // If it's a Buffer-like object (from JSON.stringify)
    if (typeof data === 'object' && data !== null) {
        if (data.type === 'Buffer' && Array.isArray(data.data)) {
            return Buffer.from(data.data);
        }
        
        if (Array.isArray(data)) {
            return data.map(fixBuffers);
        }

        const newData: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                newData[key] = fixBuffers(data[key]);
            }
        }
        return newData;
    }

    return data;
}

export class BaileysPgAuthStore {
  private static mutexMap: Map<string, Mutex> = new Map();
  private mutex: Mutex;

  constructor(private dbPool: Pool, private sessionId: string) {
      if (!BaileysPgAuthStore.mutexMap.has(sessionId)) {
          BaileysPgAuthStore.mutexMap.set(sessionId, new Mutex());
      }
      this.mutex = BaileysPgAuthStore.mutexMap.get(sessionId)!;
  }

  private async withRetry<T>(operation: () => Promise<T>, retries = 3, delay = 100): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    throw lastError;
  }

  private async readData(key: string): Promise<any> {
    return await this.mutex.runExclusive(async () => {
        try {
            return await this.withRetry(async () => {
                const { rows } = await this.dbPool.query(
                'SELECT session_data::text FROM baileys_sessions WHERE client_id = $1 AND session_key = $2',
                [this.sessionId, key]
                );
                if (rows.length > 0) {
                    const dataStr = rows[0].session_data;
                    try {
                        const parsed = JSON.parse(dataStr, BufferJSON.reviver);
                        return fixBuffers(parsed); 
                    } catch (parseError) {
                        return null; 
                    }
                }
                return null;
            });
        } catch (error) {
            console.error(`[STORE-DB-READ-ERR] Failed to read '${key}' for session '${this.sessionId}':`, error);
            return null;
        }
    });
  }

  private async writeData(key: string, data: any): Promise<void> {
    return await this.mutex.runExclusive(async () => {
        try {
            const dataStr = JSON.stringify(data, BufferJSON.replacer);
            
            await this.withRetry(async () => {
                await this.dbPool.query(
                `INSERT INTO baileys_sessions (client_id, session_key, session_data)
                VALUES ($1, $2, $3::jsonb)
                ON CONFLICT (client_id, session_key) DO UPDATE SET session_data = EXCLUDED.session_data, updated_at = NOW()`,
                [this.sessionId, key, dataStr]
                );
            });
        } catch (error) {
            console.error(`[STORE-DB-WRITE-ERR] Failed to write '${key}' for session '${this.sessionId}':`, error);
        }
    });
  }

  public async useAuth() {
    let creds: AuthenticationCreds;
    const loadedCreds = await this.readData('creds');
    
    if (loadedCreds && loadedCreds.noiseKey && Buffer.isBuffer(loadedCreds.noiseKey.public)) {
      creds = loadedCreds;
    } else {
      creds = initAuthCreds(); 
    }

    const saveCreds = () => this.writeData('creds', creds);
    
    return {
      state: {
        creds,
        keys: {
          get: async (type: keyof SignalDataTypeMap, ids: string[]) => {
            const data: { [key: string]: any } = {};
            await Promise.all(
              ids.map(async (id) => {
                let value = await this.readData(`${String(type)}-${id}`);
                if (type === 'app-state-sync-key' && value) {
                    try {
                        value = proto.Message.AppStateSyncKeyData.fromObject(value);
                    } catch (e) {
                        value = null;
                    }
                }
                data[id] = value;
              })
            );
            return data;
          },
          set: async (data: any) => {
            await this.mutex.runExclusive(async () => {
                const client = await this.dbPool.connect();
                try {
                    await client.query('BEGIN');
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${String(category)}-${String(id)}`;
                            if (value) {
                                // IMPORTANT: Use BufferJSON.replacer to handle buffers correctly
                                const dataStr = JSON.stringify(value, BufferJSON.replacer);
                                await client.query(
                                    `INSERT INTO baileys_sessions (client_id, session_key, session_data)
                                    VALUES ($1, $2, $3::jsonb)
                                    ON CONFLICT (client_id, session_key) DO UPDATE SET session_data = EXCLUDED.session_data, updated_at = NOW()`,
                                    [this.sessionId, key, dataStr]
                                );
                            } else {
                                await client.query(
                                    'DELETE FROM baileys_sessions WHERE client_id = $1 AND session_key = $2',
                                    [this.sessionId, key]
                                );
                            }
                        }
                    }
                    await client.query('COMMIT');
                } catch (error) {
                    await client.query('ROLLBACK');
                    console.error(`[STORE-TX-FAIL] Failed to save keys transactionally for session ${this.sessionId}:`, error);
                } finally {
                    client.release();
                }
            });
          },
        },
      },
      saveCreds,
    };
  }
}