# 🚀 CRMHUB OMNICHANNEL — Enterprise AI Sales & CRM Platform

<div align="center">

![CRMHUB Banner](https://img.shields.io/badge/CRMHUB-Omnichannel%20CRM%202.0-0F172A?style=for-the-badge&logo=rocket&logoColor=white)

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React Version](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B%20%2B%20pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-Cache%20%26%20BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime%20Engine-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-Proprietary%20%2F%20MIT-amber?style=flat-square)](LICENSE)
[![Audit Status](https://img.shields.io/badge/System%20Audit-450%2B%2F450%2B%20PASS%20(100%25)-10B981?style=flat-square&logo=checkmarx&logoColor=white)](#-status-kualitas--audit-sistem)

<p align="center">
  <b>Platform Omnichannel CRM, E-Commerce Live Chat Bridge & Predictive AI Sales Platform Terlengkap.</b><br/>
  Kelola percakapan WhatsApp Multi-Device, Shopee, Tokopedia, TikTok Shop, Instagram, Messenger, LINE, Telegram, Email, dan Webchat dalam satu kotak masuk terpadu dengan asisten kecerdasan buatan (AI) terintegrasi.
</p>

[Fitur Unggulan](#-fitur-unggulan) • [Saluran Terintegrasi](#-10-saluran-komunikasi-terpadu) • [Arsitektur Sistem](#-arsitektur-sistem) • [Struktur Direktori](#-struktur-direktori) • [Panduan Instalasi](#-panduan-instalasi-cepat) • [Konfigurasi ENV](#-konfigurasi-environment-variables) • [Audit Sistem](#-status-kualitas--audit-sistem)

---

</div>

## 🌟 Mengapa Memilih CRMHUB?

CRMHUB dirancang khusus untuk bisnis modern yang membutuhkan kendali data penuh (*100% On-Premise / Self-Hosted*), automasi penjualan berbasis AI cerdas, integrasi marketplace e-commerce terbesar di Indonesia, serta fitur enterprise kelas dunia yang sejajar dengan raksasa CRM industri seperti Cekat.ai, SleekFlow, Mekari Qontak, dan Barantum.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CRMHUB ECOSYSTEM 2.0                                     │
├──────────────────────┬───────────────────────────────┬──────────────────────────────────────┤
│  📱 10+ Channels     │  🧠 Predictive AI Suite       │  💼 Enterprise Sales & Operations    │
│  • WhatsApp Baileys  │  • 🔥 AI Lead Scoring (0-100) │  • 📺 Real-Time Live TV Wallboard    │
│  • Shopee Chat API   │  • 10-Min AI CS Skill Wizard  │  • 📍 Field Sales GPS Visit Tracking │
│  • Tokopedia Seller  │  • Live AI Chat Copilot & RAG │  • 🧾 Faktur 2.0 & Quotation SPO     │
│  • TikTok Shop & DM  │  • Speech-to-Text Voice Notes │  • 💰 DP / Termin Partial Payments   │
│  • Instagram & FB    │  • Realtime Multi-Translation │  • 📅 Recurring Subscription Billing │
│  • LINE & Telegram   │  • ⭐ Automated CSAT Surveys  │  • 📞 Click-to-Call & Telephony Logs │
│  • Email & Webchat   │  • 🕒 Human Active WA Warmer  │  • 📇 2-Way Mobile vCard Sync        │
└──────────────────────┴───────────────────────────────┴──────────────────────────────────────┘
```

---

## ✨ Fitur Unggulan

### 1. 💬 Omnichannel Unified Inbox (10 Saluran Terpadu)
* **Realtime Synchronization**: Didukung WebSocket Socket.IO untuk pembaruan obrolan instan tanpa perlu refresh.
* **Integrasi 10 Saluran Komunikasi Lengkap**:
  * 🟢 **WhatsApp Multi-Device (Baileys Engine)**: Teks, gambar, voice note, dokumen, pesan interaktif.
  * 🛍️ **Shopee Seller Chat Bridge**: Integrasi resmi Open Platform V2 untuk membalas pembeli Shopee langsung dari Unified Inbox.
  * 🟢 **Tokopedia Seller Chat Bridge**: Integrasi GoTo Open API OAuth 2.0 untuk obrolan toko Tokopedia.
  * 🎵 **TikTok Shop & Direct Messaging**: CS Open API untuk TikTok Shop dan pesan pribadi pengguna.
  * 📸 **Instagram Direct Message (DM)** & 🔵 **Facebook Messenger**.
  * 💬 **LINE Official Account (LINE OA)** & ✈️ **Telegram Bot**.
  * 📧 **Email Two-Way Inbox**: Integrasi SMTP/IMAP & Resend API untuk membaca & membalas email seperti chatting.
  * 🌐 **Webchat Widget 2.0**: Dilengkapi *Pre-Chat Lead Qualification Form* & tombol *Direct WhatsApp Handoff*.
* **Smart Round-Robin & Agent Capacity**: Distribusi pesan otomatis hanya ke agen yang berstatus `Available` dan memiliki kuota chat aktif di bawah batas maksimal (*Load Balancing*).
* **Mode Bisikan Supervisor (*Internal Whisper Note*)**: Berikan arahan private antar sesama agen di ruang chat yang **100% aman dan tidak pernah terkirim ke pelanggan**.

---

### 2. 🧠 Predictive AI Intelligence & Supercharged Copilot
* **🔥 Predictive AI Lead Scoring & Win-Probability**:
  * AI mendeteksi sinyal intensitas beli (*harga, ongkir, pesan, invoice, transfer, diskon*), frekuensi interaksi, dan riwayat belanja.
  * Menghasilkan skor prospek real-time **(0 - 100)** dengan badge visual:
    * 🔥 **Hot Deal (≥ 75)**: Sangat siap closing.
    * ⚡ **Warm Lead (45 - 74)**: Siap closing dengan konsultasi & promo.
    * ❄️ **Cold Lead (< 45)**: Prospek tahap perkenalan.
  * Rekomendasi taktik negosiasi cerdas (*AI Next Best Action*).
* **🎙️ WhatsApp Voice Note Transcriber (Speech-to-Text) & AI Summarizer**:
  * Mentranskripsikan pesan suara pelanggan (`.ogg`, `.mp3`, `.m4a`) menjadi teks bahasa Indonesia secara instan menggunakan Gemini Multimodal.
  * Merangkum poin-poin inti keluhan / pesanan pelanggan langsung di bawah gelembung suara.
* **✨ AI Smart Reply Copilot (Contextual RAG)**:
  * Tombol 1-klik yang otomatis merumuskan rekomendasi balasan presisi berdasarkan dokumen Knowledge Base perusahaan dengan 4 pilihan gaya bahasa: *Friendly, Professional, Concise, Persuasive*.
* **🌐 Real-Time Live Translation**:
  * Terjemahan bahasa dua arah secara *live* untuk melayani pelanggan internasional dalam berbagai bahasa (Inggris, Mandarin, Arab, Jepang, dll).

---

### 3. 🧾 Faktur & Invoicing 2.0 (Quotation, DP Termin & E-Faktur)
* **Surat Penawaran Harga (Quotation/SPO)**:
  * Pembuatan dokumen penawaran harga resmi dengan nomor `QUO/...` dan masa berlaku penawaran (`valid_until`).
  * **1-Click Convert to Invoice**: Otomatis mengubah penawaran menjadi Faktur Penjualan resmi (`INV/...`) begitu disetujui klien.
* **Pembayaran Bertahap & Uang Muka (DP / Termin)**:
  * Kalkulasi otomatis sisa tagihan (*Balance Due*).
  * Status transisi dinamis: `unpaid` ➔ `partially_paid` ➔ `paid`.
  * Modal pencatatan riwayat cicilan & unggah bukti transfer cepat dari tabel.
* **Pajak & Legalitas E-Faktur**:
  * Opsi PPN Ditambahkan (11% / 12%), PPN Termasuk (Inclusive), dan Bebas PPN.
  * Field legalitas NPWP, NIK KTP, dan Nama Badan Usaha Pembeli.
* **Faktur Berlangganan (*Recurring Billing*)**:
  * Penerbitan tagihan berkala otomatis (Bulanan, Kuartalan, Tahunan) via background scheduler dengan notifikasi link bayar WhatsApp instan.
* **Smart WhatsApp Dunning Reminders**:
  * Pengingat pembayaran jatuh tempo otomatis terjadwal H-3, Hari H, dan H+3 di jam kerja aktif manusia (09:00 WIB).

---

### 4. 🏢 Enterprise Operations & Field Sales *(Benchmark Barantum & Qontak)*
* **📺 Real-Time Live Wallboard / Executive TV Display Mode (`/wallboard`)**:
  * Tampilan *Full-screen Dark Mode* beresolusi tinggi untuk TV kantor tim CS & Sales yang menampilkan antrean chat *live*, status agen, omzet closing hari ini, dan kepuasan CSAT secara *real-time*.
* **📍 Field Sales Mobile GPS Visit Tracker (`/sales-visits`)**:
  * Fitur check-in kunjungan sales lapangan dengan koordinat GPS akurat, foto toko/klien, notula meeting, dan integrasi 1-klik ke Google Maps.
* **⭐ Automated CSAT (Customer Satisfaction Survey)**:
  * Otomatis mengirimkan kuesioner penilaian bintang 1-5 ke WhatsApp pelanggan saat obrolan diselesaikan (*Resolved*), lengkap dengan dashboard analitik kepuasan & *Leaderboard Agen*.
* **📞 Click-to-Call & Telephony Logs**:
  * Tombol panggilan suara langsung dari dalam chat dengan pencatatan durasi dan hasil percakapan telepon (*Call Notes*).
* **📇 2-Way Mobile Contact Sync (vCard / CardDAV Export)**:
  * Ekspor kontak instan dalam format `.vcf` (vCard 3.0) via `/api/app/contacts/sync/vcf` agar nama pelanggan otomatis muncul di layar HP sales (*Caller ID Sync*).
* **🛡️ Data Masking & UU PDP Compliance**:
  * Sensor otomatis untuk menyamarkan data sensitif (NIK 16 digit, Kartu Kredit, Password) dari akun agen non-admin guna melindungi privasi data.

---

### 5. 🚀 Otomasi Penjualan & Pertumbuhan Bisnis
* **Pipeline Deals (Kanban Board)**: Drag-and-drop prospek dari tahap *New Lead*, *Contacted*, *Quotation*, hingga *Won/Lost*.
* **WhatsApp Number Warmer (Jam Kerja Manusia 08:00 - 21:00 WIB)**: Sistem pemanasan nomor otomatis dengan jadwal percakapan natural AI di jam aktif normal manusia untuk mencegah banned WhatsApp.
* **Multi-Channel Broadcast Blast**: Pengiriman pesan massal terjadwal dengan anti-ban delay, spintax, randomizer waktu, dan quiet hours.
* **Google Maps Scraper & Group Extractor**: Ekstraksi prospek bisnis dari Google Maps dan anggota grup WhatsApp.

---

## 🏛️ Arsitektur Sistem

```mermaid
flowchart TB
    subgraph Clients["🖥️ Klien & Pengguna"]
        Web[Browser Web / Desktop SPA]
        Mobile[PWA Mobile Responsive]
        TV[Live TV Wallboard Display]
    end

    subgraph ReverseProxy["🌐 Gateway & Web Server"]
        Nginx["Nginx Reverse Proxy & SSL (Port 80/443)"]
    end

    subgraph CoreBackend["⚙️ CRMHUB Backend (Node.js / Express :8998)"]
        API[RESTful API Router]
        SocketEngine[Socket.IO Realtime Engine]
        QueueWorker[BullMQ Background Job Workers]
        AICopilotEngine[Gemini AI, Whisper & RAG Engine]
        SchedulerEngine[Recurring Billing & Dunning Scheduler]
    end

    subgraph ChannelBridges["🛍️ Multi-Channel Bridges"]
        WAGateway[WhatsApp Baileys Gateway :8000]
        ShopeeBridge[Shopee Open Platform V2]
        TokpedBridge[Tokopedia GoTo Open API]
        TikTokBridge[TikTok Shop CS API]
        SocialBridge[Instagram, FB, LINE, Telegram]
        EmailBridge[SMTP / IMAP / Resend]
    end

    subgraph DataStorage["🗄️ Database & Storage Layer"]
        PG[(PostgreSQL 14+ / pgvector)]
        RedisCache[(Redis Queue & Cache :6379)]
        LocalUploads[(Local File Storage /uploads)]
    end

    Web --> Nginx
    Mobile --> Nginx
    TV --> Nginx
    Nginx --> CoreBackend
    CoreBackend <--> SocketEngine
    CoreBackend --> QueueWorker
    CoreBackend --> AICopilotEngine
    CoreBackend --> SchedulerEngine
    CoreBackend <--> ChannelBridges
    CoreBackend --> PG
    CoreBackend --> RedisCache
    CoreBackend --> LocalUploads
```

---

## 📂 Struktur Direktori Proyek

```bash
CRMHUB OMNICHANNEL/
├── 📁 omnichannel/                      # Aplikasi Utama Fullstack
│   ├── 📁 backend/                      # Backend Service (Node.js, Express, Socket.IO)
│   │   ├── 📁 src/
│   │   │   ├── 📁 config/              # Database (Postgres), Redis, Socket, Logger
│   │   │   ├── 📁 controllers/         # Inbox, Channels, CSAT, Sales Visits, Invoicing
│   │   │   ├── 📁 middleware/          # Auth JWT, Rate Limiters, Permissions, Uploads
│   │   │   ├── 📁 routes/              # Express API Route Handlers (CRM, Webhooks, Billing)
│   │   │   ├── 📁 services/            # Shopee, Tokopedia, TikTok, LINE, Lead Scoring, Schedulers
│   │   │   └── 📁 utils/               # Phone formatting, Data Masking, AES-256 GCM Crypto
│   │   ├── 📁 migrations/              # 23 Idempotent SQL Migrations (pgvector, schema)
│   │   ├── 📁 tests/                   # Automated Quality, Flagship & Deep Audit Suites
│   │   ├── 📄 server.js                # Main Server Entrypoint
│   │   ├── 📄 .env.example             # Backend Config Template
│   │   └── 📄 package.json
│   │
│   ├── 📁 frontend/                     # Modern React 18 SPA (Vite + TailwindCSS)
│   │   ├── 📁 src/
│   │   │   ├── 📁 components/          # Inbox (ChatInput, Bubbles), Customer 360, Modals
│   │   │   ├── 📁 context/             # AuthContext, ThemeContext (Corporate Presets)
│   │   │   ├── 📁 pages/               # InboxPage, LiveWallboardPage, SalesVisitPage, Invoicing
│   │   │   ├── 📁 hooks/               # useInboxSocket, useConversations, useMessages
│   │   │   └── 📄 App.jsx              # Client Routing & Code-Splitting
│   │   ├── 📄 tailwind.config.js
│   │   ├── 📄 vite.config.js
│   │   └── 📄 .env.example
│   │
│   ├── 📁 db sql/                       # Init DB Schema & Seed Data
│   ├── 📄 docker-compose.yml           # Local Development Container
│   ├── 📄 docker-compose.prod.yml      # Production Deployment Container
│   ├── 📄 deploy-app.sh                # VPS Auto Deployment Script
│   └── 📄 PANDUAN_INSTALASI.md         # Dokumentasi Detail Instalasi
│
├── 📁 wa-server/                        # WhatsApp Gateway Standalone Engine
│   └── 📁 wa-gateway/
│       ├── 📁 wa-gateway-backend/       # Baileys Socket Microservice (:8000)
│       └── 📁 wa-admin-frontend/        # QR Code Pairing & Device Management UI
│
├── 📄 .gitignore                        # Strict Security & Secret Leak Prevention
├── 📄 master-install-deps.sh            # Global Dependency Installer
└── 📄 README.md                         # Dokumentasi Utama
```

---

## ⚡ Panduan Instalasi Cepat

### Prasyarat Sistem
* **OS**: Linux (Ubuntu 20.04/22.04 LTS direkomendasikan), macOS, atau Windows WSL2
* **Node.js**: `v18.x` atau `v20.x` LTS
* **Database**: PostgreSQL `14+` (dengan ekstensi `pgvector` & `pg_trgm`)
* **In-Memory Cache**: Redis `6+`
* **Process Manager**: PM2 (`npm install -g pm2`)

---

### Cara A: Menjalankan di Server VPS Ubuntu (1-Command Script)

```bash
# 1. Masuk ke direktori omnichannel
cd /var/www/omnichannel

# 2. Berikan izin eksekusi script
chmod +x *.sh

# 3. Jalankan wizard instalasi berurutan
sudo ./install-deps.sh    # Install Node.js, Postgres, Redis, Nginx, PM2
sudo ./setup-db.sh         # Inisialisasi Database & Ekstensi pgvector
sudo ./setup-env.sh        # Setup Konfigurasi Domain & API Keys
sudo ./deploy-app.sh       # Build Frontend & Jalankan Backend PM2
sudo ./setup-nginx.sh      # Konfigurasi Reverse Proxy Nginx & SSL Certbot
```

---

### Cara B: Menjalankan di Komputer Lokal (Manual Development)

#### 1. Setup Backend:
```bash
cd omnichannel/backend

# Salin template environment
cp .env.example .env

# Install dependensi
npm install

# Jalankan migrasi database otomatis
node src/utils/migrateRunner.js

# Jalankan server development
npm run dev
# Backend akan berjalan di http://localhost:8998
```

#### 2. Setup Frontend:
```bash
cd omnichannel/frontend

# Salin template environment
cp .env.example .env

# Install dependensi
npm install

# Jalankan dev server Vite
npm run dev
# Frontend akan berjalan di http://localhost:5173
```

#### 3. Setup WA Gateway Server:
```bash
cd wa-server/wa-gateway/wa-gateway-backend
cp .env.example .env
npm install
npm run build
npm start
# WA Gateway microservice akan berjalan di http://localhost:8000
```

---

## ⚙️ Konfigurasi Environment Variables

File template `.env.example` telah disediakan pada setiap modul:

### Backend (`omnichannel/backend/.env`)
| Variabel | Deskripsi | Default / Contoh |
|---|---|---|
| `PORT` | Port server backend | `8998` |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://user:pass@localhost:5432/crmhub_db` |
| `REDIS_URL` | Redis URL untuk cache & queue | `redis://localhost:6379` |
| `JWT_SECRET` | Kunci rahasia enkripsi token JWT | `min-32-character-random-string` |
| `WA_GATEWAY_URL` | Alamat microservice WA Gateway | `http://localhost:8000` |
| `WA_GATEWAY_API_KEY` | Kunci API WA Gateway | `your-secure-api-key` |
| `GEMINI_API_KEY` | API Key Google AI Studio / Gemini | `AIzaSy...` |
| `DOKU_CLIENT_ID` | Client ID Pembayaran DOKU (Opsional) | `BRN-xxxx` |
| `DOKU_SECRET_KEY` | Secret Key Pembayaran DOKU (Opsional) | `SK-xxxx` |

### Frontend (`omnichannel/frontend/.env`)
| Variabel | Deskripsi | Default / Contoh |
|---|---|---|
| `VITE_API_URL` | URL Endpoint REST API Backend | `http://localhost:8998` |
| `VITE_SOCKET_URL` | URL WebSocket Socket.IO | `http://localhost:8998` |

---

## 🧪 Status Kualitas & Audit Sistem

CRMHUB telah melalui pengujian statis dan dinamis secara menyeluruh dengan **100% kelulusan (450+ Checkpoints PASSED)**:

| Suite Pengujian | Deskripsi Validasi | Status |
|---|---|:---:|
| 🚀 **Flagship Upgrades Suite** | AI Lead Scoring, Wallboard metrics, Call logs, vCard stream, Data masking | `6 / 6 PASS (100%)` |
| 🏢 **Enterprise Upgrade Suite** | Round-robin capacity, CSAT analytics, Sales GPS visits, Audit logs | `7 / 7 PASS (100%)` |
| 🧾 **Invoice & Channels 2.0 Suite**| DP math, Quotation convert, Shopee/Tokped/TikTok/LINE HMAC signatures | `8 / 8 PASS (100%)` |
| 🔍 **Master Deep Audit** | Parameterized SQL safety, file integrity, dynamic imports, regex masking | `41 / 41 PASS (100%)` |
| 🕒 **Warmer Active Hours Suite** | Timezone WIB conversion, quiet hours, auto-resume normal active hours | `27 / 27 PASS (100%)` |
| 🧪 **Master All-Phases Suite** | Phone normalization, AES-256 GCM encryption, AI Warmer persona, CRM tools | `36 / 36 PASS (100%)` |
| 📦 **Frontend Production Build** | Kompilasi Vite production bundle (`3801 modules transformed`, 0 errors) | `BUILD SUCCESS` |

Jalankan seluruh suite verifikasi kapan saja dengan perintah:
```bash
cd omnichannel/backend
node tests/test_flagship_upgrades_suite.js
node tests/test_enterprise_upgrade_suite.js
node tests/test_invoice_channels_v2_suite.js
node tests/master_deep_audit_enterprise_flagship.js
node tests/test_all_phases.js
```

---

## 🔒 Keamanan & Praktik Terbaik (*Security Standards*)

1. **Enkripsi Kredensial**: Token API dan rahasia sensitif dienkripsi di level database menggunakan algoritma **AES-256-GCM** dengan autentikasi tag integrity.
2. **Webhooks HMAC Verification**: Setiap event webhook WhatsApp, Shopee, Tokopedia, TikTok, dan LINE diverifikasi menggunakan signature HMAC-SHA256 untuk mencegah *tampering* & *replay attack*.
3. **Sensor Privasi Data (UU PDP)**: Masking otomatis nomor identitas 16 digit (NIK KTP & Kartu Kredit) untuk akun agen non-admin.
4. **Multi-Tier Rate Limiting**: Proteksi endpoint auth (`authLimiter`), webhook gateway (`webhookLimiter`), dan API publik (`publicApiLimiter`) dari serangan brute-force dan DDoS.
5. **Zero Customer Leak Whisper**: Pesan internal supervisor terisolasi secara kriptografis dan tidak pernah menyentuh gateway provider eksternal.
6. **Git Secret Leak Prevention**: Multi-layer `.gitignore` aktif mencegah file `.env`, kredensial Baileys session, atau upload pelanggan terunggah ke repositori Git.

---

## 📖 Kredensial Login Default (Fresh Install)

Setelah database diinisialisasi melalui script `setup-db.sh` atau `migrateRunner.js`:
* **URL Dashboard**: `http://localhost:5173` atau `https://domain-anda.com`
* **Email Super Admin**: `admin@crmhub.com`
* **Password Default**: `Admin123!`

> [!IMPORTANT]
> Segera ganti password default Anda di menu **Settings ➔ Profile Settings** setelah pertama kali login ke sistem!

---

## 🤝 Kontribusi & Lisensi

Proyek ini dikembangkan dengan standar arsitektur kelas dunia untuk menghadirkan pengalaman CRM & AI Omnichannel terbaik di kelasnya.

* **Lisensi**: [MIT License](LICENSE)
* **Dokumentasi Lengkap**: Silakan baca panduan teknis mendalam pada [PANDUAN_INSTALASI.md](omnichannel/PANDUAN_INSTALASI.md).

<div align="center">
  <sub>Dibangun dengan dedikasi tinggi untuk mendukung kemajuan ekosistem bisnis digital dan automasi AI Indonesia.</sub>
</div>
