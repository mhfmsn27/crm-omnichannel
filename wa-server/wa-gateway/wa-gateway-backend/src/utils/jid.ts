export function toJid(numberOrJid: string): string {
  if (typeof numberOrJid !== 'string') {
    return '';
  }

  // REJECT LID: iOS devices use LID internally but we must always use JID for sending
  // LID format: xxxxxxxxx@lid - causes "waiting for this message" errors if used directly
  if (numberOrJid.includes('@lid')) {
    throw new Error(`Invalid JID format: LID detected (${numberOrJid}). Use phone number or JID with @s.whatsapp.net`);
  }

  // FIX: Allow letters (a-z, A-Z) so 'g.us' and 's.whatsapp.net' aren't stripped
  const cleaned = numberOrJid.replace(/[^0-9a-zA-Z@.-]/g, '');

  if (cleaned.includes('@')) {
    return cleaned;
  }

  if (cleaned.startsWith('12036') || cleaned.includes('-')) {
      return `${cleaned}@g.us`;
  }

  return `${cleaned}@s.whatsapp.net`;
}
