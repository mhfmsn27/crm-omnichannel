import React from 'react';

/**
 * High-Resolution Vector Brand Icons for Omnichannel Channels & Integrations
 */

// 1. WhatsApp Brand Icon (Unofficial / QR Scan)
export const WhatsAppIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <circle cx="12" cy="12" r="11" fill="#25D366" />
        <path
            d="M17.5 14.5c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.34.22-.64.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.6.14-.14.3-.34.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.63-.93-2.23-.24-.58-.5-.5-.68-.51-.18-.01-.38-.01-.58-.01-.2 0-.53.07-.8.37-.28.3-1.07 1.05-1.07 2.56s1.1 2.97 1.25 3.17c.15.2 2.16 3.3 5.23 4.63.73.31 1.3.5 1.74.64.73.23 1.4.2 1.93.12.59-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.2-.57-.35z"
            fill="#FFFFFF"
        />
    </svg>
);

// 2. WhatsApp API Icon (Cloud API Official / Verified)
export const WhatsAppApiIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <circle cx="12" cy="12" r="11" fill="#128C7E" />
        <path
            d="M16.8 13.8c-.25-.12-1.47-.72-1.7-.8-.23-.09-.39-.13-.56.13-.17.25-.65.81-.8.98-.14.17-.29.19-.54.06-.25-.13-1.07-.39-2.04-1.26-.76-.67-1.27-1.5-1.41-1.75-.15-.25-.02-.39.1-.51.11-.11.25-.29.38-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.57-1.38-.79-1.89-.2-.49-.42-.42-.57-.43-.15-.01-.32-.01-.49-.01-.17 0-.45.06-.68.31-.23.25-.9 0.89-.9 2.16s.93 2.51 1.06 2.68c.13.17 1.83 2.79 4.42 3.91.62.27 1.1.43 1.48.55.62.2 1.18.17 1.63.1.5-.08 1.49-.61 1.7-1.2.21-.59.21-1.1.14-1.2-.06-.1-.22-.16-.47-.29z"
            fill="#FFFFFF"
        />
        <circle cx="18" cy="6" r="4" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1.2" />
        <path d="M16.5 6l1 1 2-2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// 3. WhatsApp CoEx Icon (Co-Existence Multi-Device)
export const WhatsAppCoExIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <circle cx="12" cy="12" r="11" fill="#075E54" />
        <path
            d="M15.5 13.5c-.22-.11-1.3-.64-1.5-.72-.2-.08-.35-.12-.5.12-.15.23-.58.73-.71.88-.13.15-.26.17-.48.06-.22-.11-.94-.35-1.8-1.12-.67-.6-1.12-1.34-1.25-1.56-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.22-.7-1.67-.18-.44-.37-.38-.5-.38-.13-.01-.28-.01-.43-.01-.15 0-.4.05-.6.28-.2.23-.8.79-.8 1.92s.82 2.23.94 2.38c.11.15 1.62 2.48 3.92 3.48.55.24.98.38 1.31.49.55.18 1.05.15 1.45.09.44-.07 1.32-.54 1.51-1.07.19-.53.19-.98.13-1.07-.06-.09-.2-.14-.42-.26z"
            fill="#FFFFFF"
        />
        {/* Sync arrows badge */}
        <circle cx="6.5" cy="6.5" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1" />
        <path d="M5 6.5a1.5 1.5 0 012.8-0.7M8 6.5a1.5 1.5 0 01-2.8 0.7" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
    </svg>
);

// 4. Email Inbox Icon
export const EmailIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <rect x="2" y="4" width="20" height="16" rx="4" fill="#EA4335" />
        <path d="M2 7l10 7 10-7" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// 5. Meta Messenger Icon
export const MessengerIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <defs>
            <linearGradient id="msgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00B2FF" />
                <stop offset="50%" stopColor="#006AFF" />
                <stop offset="100%" stopColor="#9B00E8" />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#msgGrad)" />
        <path
            d="M6.5 13.5l4-3.8 2.2 2.2 4.3-3.9-4.2 3.9-2.1-2.2-4.2 3.8z"
            fill="#FFFFFF"
        />
    </svg>
);

// 6. Instagram Icon
export const InstagramIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <defs>
            <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFDC80" />
                <stop offset="25%" stopColor="#F77737" />
                <stop offset="50%" stopColor="#FD1D1D" />
                <stop offset="75%" stopColor="#C13584" />
                <stop offset="100%" stopColor="#833AB4" />
            </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#igGrad)" />
        <rect x="6" y="6" width="12" height="12" rx="3.5" stroke="#FFFFFF" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3" stroke="#FFFFFF" strokeWidth="1.8" />
        <circle cx="15.8" cy="8.2" r="1" fill="#FFFFFF" />
    </svg>
);

// 7. TikTok Brand Icon
export const TikTokIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#000000" />
        <path
            d="M15.5 5.5a4.5 4.5 0 003 1.2v2.5a6.8 6.8 0 01-3-1v4.8a4.5 4.5 0 11-4.5-4.5c.3 0 .7.05 1 .12v2.6a2 2 0 101.5 1.9V5.5h2z"
            fill="#25F4EE"
        />
        <path
            d="M16 5.5a4.5 4.5 0 003 1.2v2.5a6.8 6.8 0 01-3-1v4.8a4.5 4.5 0 11-4.5-4.5c.3 0 .7.05 1 .12v2.6a2 2 0 101.5 1.9V5.5h2z"
            fill="#FE2C55"
            style={{ mixBlendMode: 'screen' }}
        />
    </svg>
);

// 8. Shopee Brand Icon
export const ShopeeIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#EE4D2D" />
        <path
            d="M12 5.5a3 3 0 00-3 3v1h6v-1a3 3 0 00-3-3zm-4.5 4v9a1 1 0 001 1h7a1 1 0 001-1v-9h-9zm5 4.5c-.3-.2-.8-.4-1.3-.4-.5 0-.8.2-.8.5 0 .3.3.4.8.6.8.2 1.6.6 1.6 1.4 0 .9-.8 1.4-1.8 1.4-1 0-1.6-.4-1.8-.7l.4-.7c.3.3.8.6 1.4.6.5 0 .9-.2.9-.6 0-.3-.3-.5-.9-.7-.8-.3-1.5-.6-1.5-1.3 0-.8.7-1.4 1.7-1.4.8 0 1.4.3 1.6.5l-.4.7z"
            fill="#FFFFFF"
        />
    </svg>
);

// 9. Tokopedia Brand Icon
export const TokopediaIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#03AC0E" />
        <path
            d="M12 5.5c-3.6 0-6.5 2.7-6.5 6.2 0 2.2 1.2 4.2 3 5.3v2.5l2.4-1.4c.4.1.7.1 1.1.1 3.6 0 6.5-2.7 6.5-6.2s-2.9-6.5-6.5-6.5zm-2.8 5.2a1.8 1.8 0 113.6 0 1.8 1.8 0 01-3.6 0zm5.6 0a1.8 1.8 0 113.6 0 1.8 1.8 0 01-3.6 0z"
            fill="#FFFFFF"
        />
    </svg>
);

// 10. LINE Official Brand Icon
export const LineIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#06C755" />
        <path
            d="M19 11.5c0-4-3.5-7-8-7s-8 3-8 7c0 3.5 3 6.3 6.8 6.9.3.1.7.2.8.5.1.4.1 1.1 0 1.5-.1.4-.4 1.4 1.2.8 1.6-.7 4.4-2.6 6-4.5 1-1.3 1.2-2.8 1.2-4.2zm-10.5 2h-1.5v-4h1.5v4zm2.5 0h-1.5v-4h1.5v4zm3-2.5h-1.5v-1.5h1.5v-1h-2.5v4h2.5v-1.5zm3 2.5h-1.5l-1.5-2.2v2.2h-1.5v-4h1.5l1.5 2.2v-2.2h1.5v4z"
            fill="#FFFFFF"
        />
    </svg>
);

// 11. Telegram Brand Icon
export const TelegramIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <circle cx="12" cy="12" r="11" fill="#229ED9" />
        <path
            d="M17.5 7.5L5.5 12.2c-.8.3-.8.8-.1 1l3.1 1 7.2-4.5c.3-.2.6-.1.4.1l-5.8 5.2-.2 3.1c.3 0 .5-.1.6-.3l1.5-1.5 3.2 2.4c.6.3 1 .2 1.2-.5l2.1-10c.2-.9-.3-1.3-.9-1.2z"
            fill="#FFFFFF"
        />
    </svg>
);

// 12. Webchat Widget Icon
export const WebchatIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <defs>
            <linearGradient id="wbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#wbGrad)" />
        <path
            d="M7 11.5c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5c-.7 0-1.4-.1-2-.4l-2.5.9.8-2.2c-.8-.9-1.3-2-1.3-3.3z"
            fill="#FFFFFF"
        />
        <circle cx="10" cy="11.5" r="0.9" fill="#4F46E5" />
        <circle cx="12" cy="11.5" r="0.9" fill="#4F46E5" />
        <circle cx="14" cy="11.5" r="0.9" fill="#4F46E5" />
    </svg>
);

// 13. Zapier & Make Automation Icon
export const ZapierIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#FF4F00" />
        <path
            d="M12 5v14M5 12h14M7 7l10 10M17 7L7 17"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
        />
    </svg>
);

// 14. Device Health Monitor Icon
export const DeviceHealthIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#059669" />
        <path
            d="M5 12h3l2-5 4 10 2-5h3"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// 15. E-Commerce Integration Icon
export const EcommerceIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#8B5CF6" />
        <path
            d="M6 9l1-4h10l1 4M6 9h12v9a1 1 0 01-1 1H7a1 1 0 01-1-1V9zm4 3a2 2 0 004 0"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// 16. Ongkir & Shipping Logistics Icon
export const OngkirIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#D97706" />
        <path
            d="M4 8h10v7H4V8zm10 2h3l3 3v2h-6v-5z"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle cx="7.5" cy="16.5" r="1.5" fill="#FFFFFF" />
        <circle cx="17.5" cy="16.5" r="1.5" fill="#FFFFFF" />
    </svg>
);

// 17. Webhook Outbound Icon
export const WebhookIcon = ({ className = "w-4 h-4", ...props }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#0284C7" />
        <path
            d="M8 8a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4zm-4 12a2 2 0 110-4 2 2 0 010 4zm-4-10l4 4 4-4"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// Master Dynamic Dispatcher Component
export default function ChannelIcon({ type, className = "w-4 h-4", ...props }) {
    const norm = String(type || '').toLowerCase();
    switch (norm) {
        case 'whatsapp':
        case 'wa':
        case 'unofficial':
            return <WhatsAppIcon className={className} {...props} />;
        case 'wa-api':
        case 'wa_api':
        case 'official':
        case 'whatsapp_api':
            return <WhatsAppApiIcon className={className} {...props} />;
        case 'wa-coex':
        case 'wa_coex':
        case 'coex':
            return <WhatsAppCoExIcon className={className} {...props} />;
        case 'email':
        case 'mail':
            return <EmailIcon className={className} {...props} />;
        case 'messenger':
        case 'facebook':
            return <MessengerIcon className={className} {...props} />;
        case 'instagram':
        case 'ig':
            return <InstagramIcon className={className} {...props} />;
        case 'tiktok':
            return <TikTokIcon className={className} {...props} />;
        case 'shopee':
            return <ShopeeIcon className={className} {...props} />;
        case 'tokopedia':
            return <TokopediaIcon className={className} {...props} />;
        case 'line':
            return <LineIcon className={className} {...props} />;
        case 'telegram':
        case 'tg':
            return <TelegramIcon className={className} {...props} />;
        case 'webchat':
            return <WebchatIcon className={className} {...props} />;
        case 'zapier':
        case 'make':
            return <ZapierIcon className={className} {...props} />;
        case 'device-health':
        case 'device_health':
            return <DeviceHealthIcon className={className} {...props} />;
        case 'ecommerce':
            return <EcommerceIcon className={className} {...props} />;
        case 'ongkir':
        case 'shipping':
            return <OngkirIcon className={className} {...props} />;
        case 'webhooks':
        case 'webhook':
            return <WebhookIcon className={className} {...props} />;
        default:
            return <WhatsAppIcon className={className} {...props} />;
    }
}
