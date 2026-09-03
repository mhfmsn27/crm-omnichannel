import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// NORMALIZE BASE URL
const rawUrl = process.env.WA_GATEWAY_URL || 'https://send.app-portal.cloud';
const baseUrl = rawUrl.replace(/\/$/, '').replace(/\/api\/v1\/?$/, '');
const GATEWAY_URL = `${baseUrl}/api/v1`;

// WEBHOOK URL (Self)
const WEBHOOK_URL = `${process.env.APP_URL}/webhook/wa-gateway`;

const API_KEY = process.env.WA_GATEWAY_API_KEY;
const TIMEOUT = 60000; // Standard Timeout (60s)

const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
});

// Helper: Sleep
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Helper: Normalize "to" JID - convert LID to proper JID format
// wa-server now rejects LID format: must use phone@s.whatsapp.net
export const normalizeJid = (to) => {
  if (!to) return null;

  const strTo = String(to);

  // Already valid JID with @s.whatsapp.net
  if (strTo.includes('@s.whatsapp.net')) {
    return strTo;
  }

  // LID format detected - convert to proper JID
  // e.g., "236077222777046@lid" or "123@s.whatsapp.net@lid" -> "236077222777046@s.whatsapp.net"
  if (strTo.includes('@lid')) {
    // Remove @lid and any double suffixes
    const clean = strTo.replace(/@lid@lid$/, '@lid').replace(/@lid$/, '');

    // If it's just digits, add @s.whatsapp.net
    if (/^\d+$/.test(clean)) {
      return `${clean}@s.whatsapp.net`;
    }

    // If it has @ but not @s.whatsapp.net, fix the domain
    if (clean.includes('@')) {
      return clean.split('@')[0] + '@s.whatsapp.net';
    }

    return `${clean}@s.whatsapp.net`;
  }

  // Phone number only - add @s.whatsapp.net
  if (/^\d+$/.test(strTo)) {
    return `${strTo}@s.whatsapp.net`;
  }

  // Already has @ but wrong domain (ignore groups)
  if (strTo.includes('@') && !strTo.includes('@s.whatsapp.net') && !strTo.endsWith('@g.us')) {
    return strTo.split('@')[0] + '@s.whatsapp.net';
  }

  return strTo;
};

// Helper: Get MimeType from Extension
const getMimeType = (url) => {
  if (!url) return null;
  const ext = url.split('.').pop().toLowerCase().split('?')[0];
  const map = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
    'mp4': 'video/mp4', 'avi': 'video/avi', 'mov': 'video/quicktime', 'mkv': 'video/x-matroska',
    'mp3': 'audio/mpeg', 'ogg': 'audio/ogg', 'wav': 'audio/wav', 'm4a': 'audio/mp4',
    'pdf': 'application/pdf',
    'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint', 'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain', 'csv': 'text/csv', 'json': 'application/json', 'xml': 'application/xml', 'zip': 'application/zip', 'rar': 'application/x-rar-compressed'
  };
  return map[ext] || null;
};

// --- SESSION MANAGEMENT ---

// 1. Create Session
export const createSession = async (sessionName, syncFullHistory = false) => {
  const endpoint = `${GATEWAY_URL}/sessions`;
  try {
    console.log(`[WA Gateway] Creating session: ${sessionName} with Webhook: ${WEBHOOK_URL} (Sync: ${syncFullHistory})`);

    const payload = {
      name: sessionName,
      webhookUrl: WEBHOOK_URL,
      syncFullHistory
    };

    const res = await axios.post(endpoint, payload, { headers: getHeaders(), timeout: TIMEOUT });
    return res.data;
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    throw new Error(`Gateway Error: ${msg}`);
  }
};

// 2. Start Session
export const startSession = async (sessionId) => {
  const endpoint = `${GATEWAY_URL}/sessions/${sessionId}/start`;
  try {
    const res = await axios.post(endpoint, { webhookUrl: WEBHOOK_URL }, { headers: getHeaders(), timeout: TIMEOUT });
    return res.data || { status: 'STARTED' };
  } catch (error) {
    const status = error.response?.status;
    if (status === 404 || status === 403) return null;
    return null;
  }
};

// 2.5 Get Session Status (including live QR code if NEED_QR)
export const getSessionStatus = async (sessionId) => {
  const endpoint = `${GATEWAY_URL}/sessions/${sessionId}/status`;
  try {
    const res = await axios.get(endpoint, { headers: getHeaders(), timeout: 10000 });
    return res.data;
  } catch (error) {
    return null;
  }
};

// 3. Delete Session
export const deleteSession = async (sessionId) => {
  try {
    await axios.delete(`${GATEWAY_URL}/sessions/${sessionId}`, { headers: getHeaders(), timeout: TIMEOUT });
    return true;
  } catch (error) {
    if (error.response && (error.response.status === 404 || error.response.status === 403)) {
      return true;
    }
    throw error;
  }
};

// --- MESSAGING ---

const handleSendError = (error, to, method) => {
  const msg = String(error.response?.data?.message || error.response?.data?.error || error.message || '');
  console.error(`[WA Gateway] ${method} Error (${to}):`, msg);

  // User Friendly Error for Disconnected Session
  if (msg.includes('not active') || msg.includes('not connected') || msg.includes('Session not found')) {
    throw new Error("Sesi tidak aktif. Silakan hubungkan ulang device WA Anda.");
  }
  throw new Error(msg);
};

// 4. Send Text
export const sendText = async (sessionId, to, text) => {
  const normalizedTo = normalizeJid(to);
  try {
    const res = await axios.post(`${GATEWAY_URL}/message/send-text`, {
      sessionId, to: normalizedTo, text
    }, { headers: getHeaders(), timeout: TIMEOUT });
    return res.data;
  } catch (error) {
    handleSendError(error, normalizedTo, 'Send Text');
  }
};

// 4.5 Send Buttons
export const sendButtons = async (sessionId, to, text, footer, buttons) => {
  const normalizedTo = normalizeJid(to);
  try {
    const payload = {
      sessionId,
      to: normalizedTo,
      text,
      footer,
      buttons
    };
    const res = await axios.post(`${GATEWAY_URL}/message/send-buttons`, payload, { headers: getHeaders(), timeout: TIMEOUT });
    return res.data;
  } catch (error) {
    const msg = String(error.response?.data?.message || error.response?.data?.error || error.message || '');
    if (msg.includes('not active') || msg.includes('not connected') || msg.includes('Session not found')) {
      handleSendError(error, normalizedTo, 'Send Buttons');
    }
    console.error(`[WA Gateway] Send Buttons Error (${normalizedTo}):`, msg);

    // Fallback: If Gateway button endpoint fails (e.g., unsupported by device/WA version), we will send as normal text
    console.log(`[WA Gateway] Falling back to text message for buttons...`);
    const fallbackText = `${text}\n\n${buttons.map((b, i) => {
        let line = `${i + 1}. ${b.text}`;
        if (b.url) line += `\n   🔗 ${b.url}`;
        else if (b.phone) line += `\n   📞 ${b.phone}`;
        return line;
    }).join('\n\n')}\n\n_${footer || 'Silakan balas dengan angka atau klik link di atas'}_`;
    return sendText(sessionId, to, fallbackText);
  }
};

// 5. Send Media
export const sendMedia = async (sessionId, to, mediaUrl, caption, mimetype, filename) => {
  const normalizedTo = normalizeJid(to);
  try {
    // 1. Auto-detect Filename if missing
    if (!filename && mediaUrl) {
      try {
        const urlParts = mediaUrl.split('/');
        filename = urlParts[urlParts.length - 1].split('?')[0];
      } catch (e) {
        filename = 'file';
      }
    }
    if (!filename) filename = 'file';

    // 2. Auto-detect Mimetype if missing
    if (!mimetype && mediaUrl) {
      mimetype = getMimeType(mediaUrl);
    }

    // 3. Determine Type
    let type = 'image';
    if (mimetype) {
      if (mimetype.startsWith('video')) type = 'video';
      else if (mimetype.startsWith('audio')) type = 'audio';
      else if (mimetype.startsWith('image')) type = 'image';
      else type = 'document'; // Default to document for application/*, text/*
    } else {
      // Fallback extension check
      if (mediaUrl.match(/\.(mp4|avi|mov|mkv)$/i)) type = 'video';
      else if (mediaUrl.match(/\.(mp3|ogg|wav|m4a)$/i)) type = 'audio';
      else if (mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) type = 'image';
      else type = 'document';
    }

    // 4. Fallback mimetype for documents if still missing (Required by Gateway)
    if (type === 'document' && !mimetype) {
      mimetype = 'application/octet-stream';
    }

    const payload = {
      sessionId,
      to: normalizedTo,
      mediaType: type,
      url: mediaUrl,
      caption,
      mimetype: mimetype,
      mimeType: mimetype,
      fileName: filename,
      filename: filename
    };

    const res = await axios.post(`${GATEWAY_URL}/message/send-media`, payload, { headers: getHeaders(), timeout: TIMEOUT });
    return res.data; // Return full data (including message ID)
  } catch (error) {
    handleSendError(error, normalizedTo, 'Send Media');
  }
};

// 5.5 Edit Message
export const editMessage = async (sessionId, to, key, text) => {
  try {
    const payload = { sessionId, to, key, text };
    const res = await axios.put(`${GATEWAY_URL}/message/edit`, payload, { headers: getHeaders(), timeout: TIMEOUT });
    return res.data;
  } catch (error) {
    handleSendError(error, to, 'Edit Message');
  }
};

// 5.5b Revoke Message (Delete for everyone)
export const revokeMessage = async (sessionId, to, key) => {
  const normalizedTo = normalizeJid(to);
  try {
    const normalizedKey = { ...key, remoteJid: normalizedTo };
    const payload = { sessionId, to: normalizedTo, key: normalizedKey };
    const res = await axios.post(`${GATEWAY_URL}/message/delete`, payload, { headers: getHeaders(), timeout: TIMEOUT });
    return res.data;
  } catch (error) {
    console.warn(`[WA Gateway] Revoke Message Failed (Fallback to DELETE):`, error.message);
    try {
        const normalizedKey = { ...key, remoteJid: normalizedTo };
        const payload = { sessionId, to: normalizedTo, key: normalizedKey };
        const res = await axios.delete(`${GATEWAY_URL}/message/delete`, { data: payload, headers: getHeaders(), timeout: TIMEOUT });
        return res.data;
    } catch (fallbackError) {
        handleSendError(fallbackError, normalizedTo, 'Revoke Message');
    }
  }
};

// 5.6 Mark Message as Read (Sync CRM -> WA Mobile)
export const markRead = async (sessionId, to, messageId) => {
  try {
    const payload = { sessionId, to, messageId };
    await axios.post(`${GATEWAY_URL}/message/mark-read`, payload, { headers: getHeaders(), timeout: 5000 });
  } catch (err) {
    try {
      // Fallback endpoint
      await axios.post(`${GATEWAY_URL}/message/read`, { sessionId, to, messageId }, { headers: getHeaders(), timeout: 5000 });
    } catch (fallbackErr) {
      // Silently ignore if gateway doesn't support marking as read
    }
  }
};

// 6. Get Session QR
export const getSessionQR = async (sessionId) => {
  const endpoint = `${GATEWAY_URL}/sessions/${sessionId}/status`;
  try {
    const res = await axios.get(endpoint, { headers: getHeaders(), timeout: 5000 });
    return res.data?.qr || null;
  } catch (error) {
    return null;
  }
};

// 7. Get Contact Profile Picture
export const getContactProfile = async (sessionId, jid) => {
  const endpoint = `${GATEWAY_URL}/contact/profile-picture`;
  const timeoutMs = 15000;

  const extractUrl = (data) => {
    if (!data) return null;
    if (typeof data === 'string' && data.startsWith('http')) return data;
    if (data.profile_picture_url) return data.profile_picture_url;
    if (data.imageUrl) return data.imageUrl;
    if (data.url) return data.url;
    if (data.ppUrl) return data.ppUrl;
    if (data.data) {
      if (typeof data.data === 'string' && data.data.startsWith('http')) return data.data;
      if (data.data.profile_picture_url) return data.data.profile_picture_url;
      if (data.data.imageUrl) return data.data.imageUrl;
      if (data.data.url) return data.data.url;
    }
    return null;
  };

  const fetchInternal = async (targetJid) => {
    try {
      const res = await axios.get(endpoint, {
        params: { sessionId, jid: targetJid },
        headers: getHeaders(),
        timeout: timeoutMs
      });
      return extractUrl(res.data);
    } catch (err) {
      return null;
    }
  };

  let url = await fetchInternal(jid);
  if (url) return url;

  if (jid.includes('@')) {
    const bareJid = jid.split('@')[0];
    url = await fetchInternal(bareJid);
  }

  return url;
};

// 8. Download Media
export const downloadMedia = async (sessionId, messageObject) => {
  const endpoint = `${GATEWAY_URL}/message/download-media`;
  try {
    if (!messageObject || !messageObject.message) throw new Error("Invalid message object");

    const sanitizedMessage = {
      key: messageObject.key,
      message: messageObject.message
    };

    const payload = { message: sanitizedMessage, sessionId: sessionId };

    const res = await axios.post(endpoint, payload, { headers: getHeaders(), responseType: 'stream', timeout: 60000 });
    return res.data;
  } catch (error) {
    console.error(`[WA Gateway] Download Media Failed:`, error.message);
    return null;
  }
};

// 9. CHECK WHATSAPP NUMBER
export const checkNumber = async (sessionId, phone) => {
  const endpoint = `${GATEWAY_URL}/contact/check-whatsapp`;
  try {
    const res = await axios.post(endpoint, { sessionId, numbers: [phone] }, { headers: getHeaders(), timeout: 20000 });
    const data = res.data;
    if (Array.isArray(data) && data.length > 0) return data[0];
    return data;
  } catch (error) {
    throw error;
  }
};

// 10. BATCH CHECK WIDS
export const checkWids = async (sessionId, wids) => {
  const endpoint = `${GATEWAY_URL}/contact/check-whatsapp`;
  try {
    const CHUNK_SIZE = 50;
    let results = [];
    for (let i = 0; i < wids.length; i += CHUNK_SIZE) {
      const chunk = wids.slice(i, i + CHUNK_SIZE);
      const res = await axios.post(endpoint, { sessionId, numbers: chunk }, { headers: getHeaders(), timeout: 30000 });
      if (Array.isArray(res.data)) results = [...results, ...res.data];
    }
    return results;
  } catch (error) {
    return [];
  }
};

// 10b. RESOLVE ALL LID MAPPINGS — Fetch all known LID → PN mappings from wa-server cache + address book
export const resolveAllLids = async (sessionId) => {
  const endpoint = `${GATEWAY_URL}/contact/resolve-lids`;
  try {
    const res = await axios.post(endpoint, { sessionId }, { headers: getHeaders(), timeout: 30000 });
    return res.data;
  } catch (error) {
    throw error;
  }
};

// 11. GROUP MANAGEMENT
export const getGroups = async (sessionId) => {
  const endpoint = `${GATEWAY_URL}/group/list`;
  try {
    const res = await axios.get(endpoint, { params: { sessionId }, headers: getHeaders(), timeout: 120000 });
    return res.data.data || [];
  } catch (error) {
    throw new Error(`Failed to fetch groups: ${error.message}`);
  }
};

export const getGroupMetaData = async (sessionId, jid) => {
  const endpoint = `${GATEWAY_URL}/group/info`;
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const res = await axios.get(endpoint, { params: { sessionId, jid }, headers: getHeaders(), timeout: 120000 });
      if (res.data) {
        if (res.data.data) return res.data.data;
        if (res.data.id || res.data.subject) return res.data;
      }
      return res.data;
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) throw new Error(`Failed to get group info: ${error.message}`);
      await sleep(3000 * attempt);
    }
  }
};
// --- TYPING INDICATOR (CRM -> WA) ---
export const sendTyping = async (sessionId, to, isTyping = true) => {
  try {
    const payload = { sessionId, to, typing: isTyping };
    await axios.post(GATEWAY_URL+'/presence/update', payload, { headers: getHeaders(), timeout: 5000 });
  } catch (error) {
    console.warn('[WA Gateway] Typing indicator not supported:', error.message);
  }
};
// --- STAR/UNSTAR ---
export const starMessage = async (sessionId, jid, messageId) => {
  try {
    const payload = { sessionId, jid, messageId, star: true };
    await axios.post(GATEWAY_URL+'/message/star', payload, { headers: getHeaders(), timeout: 10000 });
  } catch (error) { console.warn('[WA Gateway] Star failed:', error.message); }
};
export const unstarMessage = async (sessionId, jid, messageId) => {
  try {
    const payload = { sessionId, jid, messageId, star: false };
    await axios.post(GATEWAY_URL+'/message/star', payload, { headers: getHeaders(), timeout: 10000 });
  } catch (error) { console.warn('[WA Gateway] Unstar failed:', error.message); }
};
// --- BLOCK/UNBLOCK ---
export const blockContact = async (sessionId, jid) => {
  try {
    const payload = { sessionId, jid, action: 'block' };
    await axios.post(GATEWAY_URL+'/contact/block', payload, { headers: getHeaders(), timeout: 10000 });
  } catch (error) { console.warn('[WA Gateway] Block failed:', error.message); }
};
export const unblockContact = async (sessionId, jid) => {
  try {
    const payload = { sessionId, jid, action: 'unblock' };
    await axios.post(GATEWAY_URL+'/contact/block', payload, { headers: getHeaders(), timeout: 10000 });
  } catch (error) { console.warn('[WA Gateway] Unblock failed:', error.message); }
};
// --- GROUP ---
export const updateGroupSubject = async (sessionId, jid, subject) => {
  try {
    const payload = { sessionId, jid, subject };
    await axios.post(GATEWAY_URL+'/group/update-subject', payload, { headers: getHeaders(), timeout: 15000 });
  } catch (error) { console.warn('[WA Gateway] Update subject failed:', error.message); }
};
export const updateGroupDescription = async (sessionId, jid, description) => {
  try {
    const payload = { sessionId, jid, description };
    await axios.post(GATEWAY_URL+'/group/update-description', payload, { headers: getHeaders(), timeout: 15000 });
  } catch (error) { console.warn('[WA Gateway] Update desc failed:', error.message); }
};
export const addParticipants = async (sessionId, jid, participants) => {
  try {
    const payload = { sessionId, jid, participants };
    await axios.post(GATEWAY_URL+'/group/add-participants', payload, { headers: getHeaders(), timeout: 30000 });
  } catch (error) { console.warn('[WA Gateway] Add participants failed:', error.message); }
};
export const removeParticipants = async (sessionId, jid, participants) => {
  try {
    const payload = { sessionId, jid, participants };
    await axios.post(GATEWAY_URL+'/group/remove-participants', payload, { headers: getHeaders(), timeout: 30000 });
  } catch (error) { console.warn('[WA Gateway] Remove participants failed:', error.message); }
};
export const promoteParticipants = async (sessionId, jid, participants) => {
  try {
    const payload = { sessionId, jid, participants };
    await axios.post(GATEWAY_URL+'/group/promote', payload, { headers: getHeaders(), timeout: 15000 });
  } catch (error) { console.warn('[WA Gateway] Promote failed:', error.message); }
};
export const demoteParticipants = async (sessionId, jid, participants) => {
  try {
    const payload = { sessionId, jid, participants };
    await axios.post(GATEWAY_URL+'/group/demote', payload, { headers: getHeaders(), timeout: 15000 });
  } catch (error) { console.warn('[WA Gateway] Demote failed:', error.message); }
};
export const leaveGroup = async (sessionId, jid) => {
  try {
    const payload = { sessionId, jid };
    await axios.post(GATEWAY_URL+'/group/leave', payload, { headers: getHeaders(), timeout: 15000 });
  } catch (error) { console.warn('[WA Gateway] Leave group failed:', error.message); }
};
