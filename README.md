# 🚀 CRMHUB OMNICHANNEL — Enterprise AI Sales & CRM Platform

<div align="center">

![CRMHUB Banner](https://img.shields.io/badge/CRMHUB-Omnichannel%20CRM-0F172A?style=for-the-badge&logo=rocket&logoColor=white)

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React Version](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B%20%2B%20pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-Cache%20%26%20BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime%20Engine-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-Proprietary%20%2F%20MIT-amber?style=flat-square)](LICENSE)
[![Audit Status](https://img.shields.io/badge/System%20Audit-302%2F302%20PASS%20(100%25)-10B981?style=flat-square&logo=checkmarx&logoColor=white)](#-status-kualitas--audit-sistem)

<p align="center">
  <b>Platform Omnichannel CRM & AI Sales Assistant Self-Hosted Terlengkap untuk Bisnis, Agency, dan Enterprise.</b><br/>
  Kelola percakapan WhatsApp Multi-Device, Instagram, Messenger, Telegram, dan Webchat dalam satu kotak masuk terpadu dengan asisten kecerdasan buatan (AI) terintegrasi.
</p>

[Fitur Unggulan](#-fitur-unggulan) • [Arsitektur Sistem](#-arsitektur-sistem) • [Struktur Direktori](#-struktur-direktori) • [Panduan Instalasi](#-panduan-instalasi-cepat) • [Konfigurasi ENV](#-konfigurasi-environment-variables) • [Dokumentasi](#-dokumentasi-lengkap)

---

</div>

## 🌟 Mengapa Memilih CRMHUB?

CRMHUB dirancang khusus untuk bisnis modern yang membutuhkan kendali data penuh (*100% On-Premise / Self-Hosted*), automasi penjualan WhatsApp berbasis AI cerdas, serta integrasi multi-kanal tanpa biaya langganan pihak ketiga yang mahal.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CRMHUB ECOSYSTEM                                         │
├──────────────────────┬───────────────────────────────┬──────────────────────────────────────┤
│  📱 Multi-Channel    │  🧠 AI Intelligence Suite     │  💼 Sales & Growth Operations        │
│  • WhatsApp Baileys  │  • 10-Min AI CS Skill Wizard  │  • Visual Kanban Deal Pipeline       │
│  • Instagram DM      │  • Live AI Chat Copilot       │  • WhatsApp Warmer Persona Bot       │
│  • FB Messenger      │  • Speech-to-Text Voice Notes │  • Multi-Channel Broadcast Blast     │
│  • Telegram Bot      │  • Smart RAG Knowledge Base   │  • Invoicing & DOKU Payment Gateway  │
│  • Live Webchat      │  • CSAT & Lead Qualification  │  • 1-Click Database Disaster Recovery│
└──────────────────────┴───────────────────────────────┴──────────────────────────────────────┘
```

---

## ✨ Fitur Unggulan

### 1. 💬 Omnichannel Unified Inbox (Kotak Masuk Terpadu)
* **Realtime Synchronization**: Didukung WebSocket Socket.IO untuk pembaruan instan tanpa reload.
* **WhatsApp Multi-Device (Baileys Engine)**: Koneksi QR Code stabil, support teks, gambar, audio voice note, video, dokumen PDF/XLS, lokasi, kontak, dan pesan interaktif.
* **Integrasi Lintas Saluran**: WhatsApp, Instagram Direct Message, Facebook Messenger, Telegram Bot, dan Webchat Widget.
* **Isolasi Kotak Masuk (*Inbox Isolation*)**: Pembagian inbox per divisi (misal: CS Penjualan, Tim Support, Admin Klaim).
* **Auto-Assignment & Round Robin**: Pembagian pesan otomatis ke agen yang sedang online berdasarkan beban kerja atau kuota harian.

### 2. 🧠 AI CS Skills Library & Onboarding Wizard 10 Menit
* **6 Preset Keahlian AI Siap Pakai**:
  * 🛍️ *Toko Online & E-Commerce* (Rekomendasi produk, cek ongkir, cross-sell & closing)
  * 🏥 *Klinik Medis, Kecantikan & Dental* (Jadwal konsultasi, info tindakan, etika medis)
  * 🏢 *Properti & Real Estate* (Kualifikasi budget, booking survei lokasi, spesifikasi unit)
  * 🎓 *Kursus, Bootcamp & Edukasi* (Kurikulum, biaya pendaftaran, follow-up prospek)
  * 💼 *Jasa & Konsultan B2B* (Proposal, scope of work, company profile)
  * 🍽️ *Restoran & Kuliner Delivery* (Reservasi meja, rekomendasi menu, katering)
* **Vector Semantic Search (pgvector)**: AI menjawab pertanyaan pelanggan berdasarkan dokumen SOP dan FAQ Knowledge Base secara akurat tanpa halusinasi.

### 3. 🪄 Live AI Copilot Assistant & Voice Note Transcriber
* **Magic Wand Tone Shifter**:
  * 💡 *Smart Reply Contextual*: Rekomendasi 3 draf balasan instan berdasarkan 15 pesan terakhir.
  * 🌸 *Ramah & Hangat* (Emoji bersahabat)
  * 💼 *Formal & Profesional* (Standar B2B)
  * 🎯 *Persuasif / Closing Sales* (Copywriting membujuk)
  * ⚡ *Singkat & Padat* (To-the-point)
  * ✍️ *Perbaiki Ejaan & Typo*
  * 🇬🇧 *Terjemahkan ke Bahasa Inggris*
* **WhatsApp Voice Note Transcriber (Speech-to-Text)**: Mentranskripsikan pesan suara pelanggan (`.ogg`, `.mp3`, `.m4a`) menjadi teks bahasa Indonesia secara instan menggunakan Gemini Multimodal.

### 4. 🤫 Supervisor Whisper Mode & Private Notes
* **Mode Bisikan Tim Internal**: Berikan arahan, koreksi, atau catatan private antar sesama agen/supervisor langsung di ruang chat.
* **Zero Customer Leak**: Pesan whisper berlabel `🔒 Internal Note` warna amber khusus dan **100% tidak pernah dikirim ke WhatsApp/Instagram pelanggan**.

### 5. 🎨 Multi-Theme Corporate Design System (UI/UX)
* **3 Pilihan Tema Visual**:
  * 🏛️ **Executive Corporate Navy**: Tampilan formal *Deep Slate Navy* (`#0F172A`) & *Royal Blue* (`#2563EB`) untuk perusahaan dan instansi.
  * ⚡ **Minimalist Tech Modern**: Desain bersih *border-driven* ala Linear & Stripe.
  * 📱 **Classic WhatsApp Green**: Warna hijau khas WhatsApp Omnichannel original.
* **Pencahayaan Mandiri**: Pilihan *Light Mode* (Terang) dan *Dark Mode* (Gelap) dengan penyimpanan instan di `localStorage`.

### 6. 🛡️ Server Health Telemetry & 1-Click Database Disaster Recovery
* **Dashboard Telemetri Real-Time** (`/settings/system-health`): Monitoring CPU load, memori RAM VPS, kapasitas database PostgreSQL, koneksi aktif, ukuran media uploads, dan antrean BullMQ.
* **1-Click SQL Backup**: Ekspor cadangan database 24 tabel inti secara instan dalam format `.sql` stream langsung ke browser dengan 1 baris perintah restore CLI (`psql -U postgres -d crmhub < crmhub_backup.sql`).

### 7. 🚀 Otomasi Penjualan & Alat Pertumbuhan Bisnis
* **Pipeline Deals (Kanban Board)**: Drag-and-drop prospek dari tahap *New Lead*, *Contacted*, *Quotation*, hingga *Won/Lost*.
* **WhatsApp Number Warmer**: Sistem pemanasan nomor baru otomatis dengan persona obrolan natural AI untuk mencegah resiko banned WhatsApp.
* **Multi-Channel Broadcast**: Pengiriman pesan massal terjadwal dengan anti-ban delay, spintax, randomizer waktu, dan quiet hours (jam istirahat).
* **Invoicing & DOKU Payment Gateway**: Pembuatan invoice otomatis dengan QRIS, Virtual Account, dan kartu kredit.
* **Google Maps Scraper & Group Extractor**: Ekstraksi prospek bisnis dari Google Maps dan anggota grup WhatsApp.

---

## 🏛️ Arsitektur Sistem

```mermaid
flowchart TB
    subgraph Clients["🖥️ Klien & Pengguna"]
        Web[Browser Web / Desktop]
        Mobile[PWA Mobile Responsive]
    end

    subgraph ReverseProxy["🌐 Gateway & Web Server"]
        Nginx["Nginx Reverse Proxy & SSL (Port 80/443)"]
    end

    subgraph CoreBackend["⚙️ CRMHUB Backend (Node.js / Express :8998)"]
        API[RESTful API Router]
        SocketEngine[Socket.IO Realtime Engine]
        QueueWorker[BullMQ Background Job Workers]
        AICopilotEngine[Gemini AI & Skill RAG Engine]
    end

    subgraph WAGatewayServer["📱 WA Gateway Engine (Baileys :8000)"]
        WAGateway[WhatsApp Multi-Device Gateway]
        WASessions[(Baileys Auth Storage)]
    end

    subgraph DataStorage["🗄️ Database & Storage Layer"]
        PG[(PostgreSQL 14+ / pgvector)]
        RedisCache[(Redis Queue & Cache :6379)]
        LocalUploads[(Local File Storage /uploads)]
    end

    Web --> Nginx
    Mobile --> Nginx
    Nginx --> CoreBackend
    CoreBackend <--> SocketEngine
    CoreBackend --> QueueWorker
    CoreBackend --> AICopilotEngine
    CoreBackend <--> WAGateway
    WAGateway --> WASessions
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
│   │   │   ├── 📁 controllers/         # Inbox, AI Copilot, Broadcast, Pipelines, Health
│   │   │   ├── 📁 middleware/          # Auth JWT, Rate Limiters, Permissions, Uploads
│   │   │   ├── 📁 routes/              # Express API Route Handlers
│   │   │   ├── 📁 services/            # AI Skill Presets, RAG Tools, WA Gateway Service
│   │   │   └── 📁 utils/               # Phone formatting, AES-256 GCM Crypto, Helpers
│   │   ├── 📁 migrations/              # 27 Idempotent SQL Migrations (pgvector, schema)
│   │   ├── 📁 tests/                   # Automated Quality & Deep Audit Test Suites
│   │   ├── 📄 server.js                # Main Server Entrypoint
│   │   ├── 📄 .env.example             # Backend Config Template
│   │   └── 📄 package.json
│   │
│   ├── 📁 frontend/                     # Modern React 18 SPA (Vite + TailwindCSS)
│   │   ├── 📁 src/
│   │   │   ├── 📁 components/          # Inbox (ChatInput, Bubbles), Chatbot Wizards, Layout
│   │   │   ├── 📁 context/             # AuthContext, ThemeContext (Corporate Presets)
│   │   │   ├── 📁 pages/               # InboxPage, DashboardPage, Pipelines, Settings
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

Untuk instalasi di server VPS produksi, gunakan script automasi yang telah disediakan:

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
# Sesuaikan DATABASE_URL dan REDIS_URL di dalam file .env

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

### Cara C: Menjalankan dengan Docker Compose (Tercepat)

```bash
cd omnichannel
docker-compose up -d
```
Docker akan secara otomatis menyalakan container PostgreSQL + pgvector, Redis, Backend Express, dan Frontend.

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

CRMHUB telah melalui pengujian statis dan dinamis secara menyeluruh dengan **100% kelulusan (302/302 Checkpoints PASSED)**:

| Suite Pengujian | Deskripsi Validasi | Status |
|---|---|:---:|
| 🔒 **Git Readiness Audit** | Verifikasi isolasi kunci `.env`, sanitasi media, dan blokir kebocoran file rahasia | `20 / 20 PASS (100%)` |
| 🛡️ **Comprehensive Quality Audit** | Integritas token tema korporat, accessibility modal, fallback styling, dan tag safety | `36 / 36 PASS (100%)` |
| 🔬 **Ultra-Deep Changes Audit** | Pengujian kontrak route AI Copilot, Speech-to-Text, Whisper Mode, dan DB Backup | `79 / 79 PASS (100%)` |
| 🚀 **Full-System Architecture** | Pengujian 14 router, 27 migrasi SQL, 15 socket events, dan 129 lazy components | `60 / 60 PASS (100%)` |
| 🧩 **Deep Controller & Modules** | Verifikasi method controller modular (Inbox, Webhook, Rate Limiters, Cryptography) | `71 / 71 PASS (100%)` |
| 🧪 **Master Verification Suite** | Phone normalization, AES-256 GCM encryption, AI Warmer persona, CRM tools | `36 / 36 PASS (100%)` |
| 📦 **Frontend Production Build** | Kompilasi Vite production bundle (`3792 modules transformed`, code-splitting) | `BUILD SUCCESS` |

Jalankan seluruh suite verifikasi kapan saja dengan perintah:
```bash
cd omnichannel/backend
node tests/git_readiness_audit.js
node tests/comprehensive_quality_audit.js
node tests/ultra_audit_latest_changes.js
node tests/full_system_audit.js
node tests/deep_audit.js
node tests/test_all_phases.js
```

---

## 🔒 Keamanan & Praktik Terbaik (*Security Standards*)

1. **Enkripsi Kredensial**: Token API dan rahasia sensitif dienkripsi di level database menggunakan algoritma **AES-256-GCM** dengan autentikasi tag integrity.
2. **Webhooks HMAC Verification**: Setiap event webhook WhatsApp diverifikasi menggunakan signature HMAC-SHA256 untuk mencegah *tampering* & *replay attack*.
3. **Multi-Tier Rate Limiting**: Proteksi endpoint auth (`authLimiter`), webhook gateway (`webhookLimiter`), dan API publik (`publicApiLimiter`) dari serangan brute-force dan DDoS.
4. **Zero Customer Leak Whisper**: Pesan internal supervisor terisolasi secara kriptografis dan tidak pernah menyentuh gateway provider eksternal.
5. **Git Secret Leak Prevention**: Multi-layer `.gitignore` aktif mencegah file `.env`, kredensial Baileys session, atau upload pelanggan terunggah ke repositori Git.

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
