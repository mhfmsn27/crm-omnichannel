const PALETTE = [
    '#E53935', '#D81B60', '#8E24AA', '#5E35B1',
    '#3949AB', '#1E88E5', '#039BE5', '#00ACC1',
    '#00897B', '#43A047', '#7CB342', '#F4511E',
    '#FB8C00', '#EF6C00', '#6D4C41', '#546E7A',
];

// Remove lone surrogates that would cause encodeURIComponent to throw URIError.
// Regex: match a valid surrogate pair (keep) OR a lone surrogate (remove).
const stripLoneSurrogates = (str) => {
    if (!str) return '';
    return str.replace(
        /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g,
        (match) => (match.length === 2 ? match : '')
    );
};

const FALLBACK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#546E7A"/><text x="20" y="20" dy=".36em" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="600" fill="white">?</text></svg>';
const FALLBACK_AVATAR = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(FALLBACK_SVG)}`;

/**
 * Returns a local SVG data-URL avatar showing 1-2 initials from the given name.
 * Color is deterministic based on the name — same name always gets same color.
 * Handles emoji, lone surrogates, and other malformed Unicode safely.
 */
export function getInitialsAvatar(name) {
    try {
        // Strip lone surrogates from DB data before any processing
        const clean = stripLoneSurrogates((name || '').trim());
        const words = clean.split(/\s+/).filter(Boolean);

        // Use Array.from() for Unicode-safe character access (handles emoji, CJK, etc.)
        const chars = (s) => Array.from(s);

        let initials;
        if (words.length >= 2) {
            initials = ((chars(words[0])[0] || '') + (chars(words[1])[0] || '')).toUpperCase();
        } else if (words.length === 1) {
            initials = chars(words[0]).slice(0, 2).join('').toUpperCase();
        } else {
            initials = '?';
        }

        // Strip lone surrogates that may have been introduced by slice/toUpperCase on edge cases
        initials = stripLoneSurrogates(initials).trim() || '?';

        // Keep only the first 2 Unicode characters (Array.from respects surrogate pairs)
        initials = chars(initials).slice(0, 2).join('');

        // Escape for SVG text content
        const safeInitials = initials
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        // Hash using codePointAt so emoji characters hash correctly
        const hash = chars(clean || '?').reduce((acc, c) => acc + (c.codePointAt(0) || 0), 0);
        const bg = PALETTE[hash % PALETTE.length];

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="${bg}"/><text x="20" y="20" dy=".36em" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif" font-size="16" font-weight="600" fill="white">${safeInitials}</text></svg>`;

        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch (_) {
        // Ultimate fallback: pre-encoded static avatar
        return FALLBACK_AVATAR;
    }
}

/**
 * Checks if a WhatsApp profile picture URL is expired based on the 'oe' parameter.
 * Returns null if expired to prevent 403 Forbidden browser console errors.
 */
export function getValidProfilePicUrl(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('whatsapp.net')) {
            const oe = urlObj.searchParams.get('oe');
            if (oe) {
                const expiryTimestamp = parseInt(oe, 16) * 1000;
                // Add a small buffer (e.g. 1 hour) just in case
                if (Date.now() > expiryTimestamp - 3600000) {
                    return null;
                }
            }
        }
        return url;
    } catch (e) {
        return url;
    }
}
