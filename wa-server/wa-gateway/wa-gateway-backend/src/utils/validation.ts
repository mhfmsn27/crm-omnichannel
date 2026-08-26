
import { z } from 'zod';

// Custom validation: JID must not contain LID to prevent routing errors
const jidWithoutLid = z.string().refine(
  (val) => !val.includes('@lid'),
  { message: "Invalid JID: LID format not allowed. Use phone number or JID with @s.whatsapp.net" }
);

export const loginBodySchema = z.object({ username: z.string().min(3), password: z.string().min(6) });
export const createClientBodySchema = z.object({ name: z.string().min(1), webhook_url: z.string().url().optional().or(z.literal('')) });

export const createSessionBodySchema = z.object({
    name: z.string().min(1),
    webhookUrl: z.string().url().optional(), // accepted from CRMHUB but ignored if CRMHUB_WEBHOOK_URL env is set
    syncFullHistory: z.boolean().optional(),
});
export const sessionIdParamsSchema = z.object({ sessionId: z.string().uuid() });

const sessionIdentifierInBody = z.object({ sessionId: z.string().uuid() });
const sessionIdentifierInQuery = z.object({ sessionId: z.string().uuid() });

// Use jidWithoutLid for all recipient fields to reject LID input
export const sendTextBodySchema = sessionIdentifierInBody.extend({ to: jidWithoutLid, text: z.string().min(1), replyTo: z.object({}).passthrough().optional() });
export const sendMediaBodySchema = sessionIdentifierInBody.extend({ to: jidWithoutLid, mediaType: z.enum(['image', 'video', 'audio', 'document']), url: z.string().url(), caption: z.string().optional(), mimetype: z.string().optional(), filename: z.string().optional(), replyTo: z.object({}).passthrough().optional() });
export const sendLocationBodySchema = sessionIdentifierInBody.extend({ to: jidWithoutLid, latitude: z.number(), longitude: z.number() });
export const sendContactBodySchema = sessionIdentifierInBody.extend({ to: jidWithoutLid, name: z.string().min(1), phone: z.string().min(5) });
export const messageKeySchema = z.object({
    remoteJid: z.string(),
    id: z.string(),
    fromMe: z.boolean().optional(),
    participant: z.string().optional() // Tambahkan participant untuk akurasi di grup
});
export const reactBodySchema = sessionIdentifierInBody.extend({ to: jidWithoutLid, key: messageKeySchema, emoji: z.string().min(1) });
export const deleteMessageBodySchema = sessionIdentifierInBody.extend({ to: jidWithoutLid, key: messageKeySchema });
export const forwardMessageBodySchema = sessionIdentifierInBody.extend({ to: jidWithoutLid, message: z.object({}).passthrough() });
export const downloadMediaBodySchema = sessionIdentifierInBody.extend({ message: z.object({}).passthrough() });
export const sendButtonsBodySchema = sessionIdentifierInBody.extend({ to: jidWithoutLid, text: z.string().min(1), footer: z.string().optional(), buttons: z.array(z.object({ id: z.string(), text: z.string() })).min(1) });

// --- EDIT PESAN (NEW) ---
export const editMessageBodySchema = sessionIdentifierInBody.extend({
    to: jidWithoutLid,
    key: messageKeySchema,
    text: z.string().min(1)
});

// --- BULK SENDING ---
export const sendBulkBodySchema = sessionIdentifierInBody.extend({
    receivers: z.array(jidWithoutLid).min(1),
    delay: z.number().min(2000, { message: "Delay must be at least 2000ms (2 seconds) to prevent bot detection" }).default(2000).optional(),
    type: z.enum(['text', 'image', 'video']),
    message: z.object({
        text: z.string().optional(),
        url: z.string().url().optional(),
        caption: z.string().optional()
    }).refine(data => data.text || data.url, { message: "Message content (text or url) is required" })
});

// --- MANAJEMEN GRUP ---
export const groupInfoQuerySchema = sessionIdentifierInQuery.extend({ jid: z.string().min(5) });
export const groupListQuerySchema = sessionIdentifierInQuery;
export const createGroupBodySchema = sessionIdentifierInBody.extend({ subject: z.string().min(1), participants: z.array(z.string().min(5)) });
export const groupParticipantsBodySchema = sessionIdentifierInBody.extend({ jid: z.string().min(5), action: z.enum(['add', 'remove', 'promote', 'demote']), participants: z.array(z.string().min(5)) });
export const updateGroupSubjectBodySchema = sessionIdentifierInBody.extend({ jid: z.string().min(5), subject: z.string().min(1) });
export const updateGroupDescriptionBodySchema = sessionIdentifierInBody.extend({ jid: z.string().min(5), description: z.string() });
export const leaveGroupBodySchema = sessionIdentifierInBody.extend({ jid: z.string().min(5) });
export const groupInviteCodeQuerySchema = sessionIdentifierInQuery.extend({ jid: z.string().min(5) });

// --- MANAJEMEN CONTACT ---
export const checkWhatsappBodySchema = sessionIdentifierInBody.extend({ numbers: z.array(z.string().min(5)) });
export const blockUnblockBodySchema = sessionIdentifierInBody.extend({ jid: z.string().min(5) });
export const contactQuerySchema = sessionIdentifierInQuery.extend({ jid: z.string().min(5) });

// --- MANAJEMEN PROFILE ---
export const updateProfileStatusBodySchema = sessionIdentifierInBody.extend({ text: z.string() });
export const updateProfilePictureBodySchema = sessionIdentifierInBody.extend({ url: z.string().url() });

// --- MANAJEMEN CHAT (NEW) ---
export const chatPresenceBodySchema = sessionIdentifierInBody.extend({ jid: z.string().min(5), presence: z.enum(['unavailable', 'available', 'composing', 'recording', 'paused']) });
export const chatArchiveBodySchema = sessionIdentifierInBody.extend({ jid: z.string().min(5), archive: z.boolean() });
export const chatPinBodySchema = sessionIdentifierInBody.extend({ jid: z.string().min(5), pin: z.boolean() });
export const chatMuteBodySchema = sessionIdentifierInBody.extend({ jid: z.string().min(5), muteDuration: z.number().min(0).optional() });
export const chatMarkReadBodySchema = sessionIdentifierInBody.extend({ jid: z.string().min(5), read: z.boolean() });

// --- REFRESH CONTACT SESSION (iOS FIX) ---
export const refreshContactBodySchema = sessionIdentifierInBody.extend({
    phone: z.string().min(7).max(15).optional(),
    jid: jidWithoutLid.optional()
}).refine(data => data.phone || data.jid, {
    message: "Either 'phone' or 'jid' is required"
});
