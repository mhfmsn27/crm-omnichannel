// frontend/src/config/featureConfig.js
export const FEATURE_CONFIG = {
  // --- CORE LIMITS ---
  feat_session_limit: {
    label: "WhatsApp Device Limit",
    type: "limit",
    desc: "Menambah slot device WhatsApp (QR Scan)."
  },
  feat_agent_limit: {
    label: "Agent Seat Limit",
    type: "limit",
    desc: "Menambah jumlah user/staff yang bisa login."
  },
  feat_broadcast_limit: {
    label: "Broadcast Quota",
    type: "limit",
    desc: "Menambah batas pengiriman pesan broadcast bulanan."
  },

  // --- CHANNEL ACCOUNT LIMITS ---
  limit_wa_api: {
    label: "WA API (BYOK) Limit",
    type: "limit",
    desc: "Batas jumlah nomor WhatsApp Official (Bring Your Own Key)."
  },
  limit_wa_coex: {
    label: "WA CoEx Limit",
    type: "limit",
    desc: "Batas jumlah nomor WhatsApp Official (Embedded Signup)."
  },
  limit_messenger: {
    label: "Messenger Page Limit",
    type: "limit",
    desc: "Batas jumlah Facebook Page yang bisa dikoneksikan."
  },
  limit_instagram: {
    label: "Instagram Account Limit",
    type: "limit",
    desc: "Batas jumlah akun Instagram yang bisa dikoneksikan."
  },
  limit_telegram: {
    label: "Telegram Bot Limit",
    type: "limit",
    desc: "Batas jumlah Bot Telegram yang bisa dikoneksikan."
  },
  limit_webchat: {
    label: "Webchat Widget Limit",
    type: "limit",
    desc: "Batas jumlah widget webchat yang bisa dibuat."
  },

  // --- MODULE UNLOCKS ---
  feat_broadcast: {
    label: "Unlock Broadcast Module",
    type: "boolean",
    desc: "Membuka akses ke menu Broadcast & Campaign."
  },
  feat_chatbot: {
    label: "Unlock AI Chatbot",
    type: "boolean",
    desc: "Membuka fitur Chatbot & Knowledge Base."
  },
  fin_invoice: {
    label: "Unlock Invoicing",
    type: "boolean",
    desc: "Membuka fitur pembuatan Invoice dan pembayaran otomatis."
  },
  api_public: {
    label: "Unlock Developer API",
    type: "boolean",
    desc: "Membuka akses ke API Publik untuk integrasi sistem pihak ketiga."
  },

  // --- NEW MODULES ---
  feat_chatform: {
    label: "Unlock Chat Form",
    type: "boolean",
    desc: "Membuka fitur Conversational Form."
  },
  feat_flowbuilder: {
    label: "Unlock Flow Builder",
    type: "boolean",
    desc: "Membuka fitur Visual Flow Builder."
  },
  feat_pipeline: {
    label: "Unlock Pipeline (CRM)",
    type: "boolean",
    desc: "Membuka fitur Kanban Pipeline CRM."
  },
  feat_upselling: {
    label: "Unlock Upselling Campaign",
    type: "boolean",
    desc: "Membuka fitur Upselling dan Recurring Broadcast."
  },
  feat_queue: {
    label: "Unlock Queue Mode",
    type: "boolean",
    desc: "Membuka fitur Antrian Chat (Queue) dan distribusi otomatis."
  },

  // --- ADVANCED FEATURES ---
  feat_media_sending: {
    label: "Unlock Media Sending",
    type: "boolean",
    desc: "Izinkan kirim gambar/video/dokumen."
  },
  feat_rotator: {
    label: "Unlock Rotator",
    type: "boolean",
    desc: "Membuka fitur Rotator untuk load balancing device."
  },
  feat_group_management: {
    label: "Unlock Group Tools",
    type: "boolean",
    desc: "Membuka fitur Grab Group & Management."
  },

  // --- TOOLS UNLOCKS ---
  tool_warmer: {
    label: "Unlock WA Warmer",
    type: "boolean",
    desc: "Fitur pemanasan nomor WhatsApp otomatis."
  },
  tool_scraper: {
    label: "Unlock GMaps Scraper",
    type: "boolean",
    desc: "Fitur scrape data bisnis dari Google Maps."
  },
  tool_group_grab: {
    label: "Unlock Group Extractor",
    type: "boolean",
    desc: "Fitur ambil data anggota grup WhatsApp."
  },
  tool_number_check: {
    label: "Unlock Number Checker",
    type: "boolean",
    desc: "Fitur validasi nomor WhatsApp aktif/tidak."
  },

  // --- CHANNEL UNLOCKS ---
  channel_wa_api: {
    label: "Unlock WA API (BYOK)",
    type: "boolean",
    desc: "Izinkan koneksi WA Official dengan kredensial sendiri."
  },
  channel_wa_coex: {
    label: "Unlock WA CoEx",
    type: "boolean",
    desc: "Izinkan koneksi WA Official via Embedded Signup."
  },
  channel_messenger: {
    label: "Unlock Messenger Channel",
    type: "boolean",
    desc: "Izinkan integrasi Facebook Messenger."
  },
  channel_instagram: {
    label: "Unlock Instagram Channel",
    type: "boolean",
    desc: "Izinkan integrasi Instagram DM."
  },
  channel_telegram: {
    label: "Unlock Telegram Channel",
    type: "boolean",
    desc: "Izinkan integrasi Telegram Bot."
  },
  channel_webchat: {
    label: "Unlock Webchat Channel",
    type: "boolean",
    desc: "Izinkan fitur Live Chat Widget untuk website."
  }
};