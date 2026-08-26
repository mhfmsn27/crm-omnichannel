# Panduan Instalasi & Menjalankan CRMHUB OMNICHANNEL

Panduan lengkap untuk menjalankan aplikasi di lingkungan **lokal (development)** maupun **server produksi (Ubuntu VPS)**.

---

## Daftar Isi

1. [Gambaran Arsitektur](#1-gambaran-arsitektur)
2. [Prasyarat](#2-prasyarat)
3. [Cara A — Lokal dengan Docker (Tercepat)](#3-cara-a--lokal-dengan-docker-tercepat)
4. [Cara B — Lokal Manual (Tanpa Docker)](#4-cara-b--lokal-manual-tanpa-docker)
5. [Instalasi di Server Produksi (Ubuntu VPS)](#5-instalasi-di-server-produksi-ubuntu-vps)
6. [Konfigurasi Environment Variables](#6-konfigurasi-environment-variables)
7. [Migrasi Database](#7-migrasi-database)
8. [Perintah PM2 yang Sering Digunakan](#8-perintah-pm2-yang-sering-digunakan)
9. [Login Default](#9-login-default)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Gambaran Arsitektur

```
┌─────────────────────────────────────────────────────┐
│                    Browser / Client                 │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS / WSS
              ┌────────▼────────┐
              │   Nginx (Proxy) │  ← hanya di server produksi
              └────────┬────────┘
                       │ HTTP / WS
        ┌──────────────▼──────────────┐
        │   Backend (Node.js :8998)   │
        │   Express + Socket.IO       │
        │   BullMQ Workers            │
        └───┬──────────┬─────────┬───┘
            │          │         │
     ┌──────▼──┐  ┌────▼───┐  ┌─▼──────┐
     │PostgreSQL│  │ Redis  │  │Uploads │
     │+ pgvector│  │  :6379 │  │(lokal) │
     └──────────┘  └────────┘  └────────┘
        ┌──────────────────────────────┐
        │  Frontend (React + Vite)     │
        │  Build → dist/ → disajikan  │
        │  oleh Backend (produksi)    │
        │  atau Vite dev server (dev) │
        └──────────────────────────────┘
```

**Stack:**
- **Backend:** Node.js 20, Express 4, Socket.IO 4, BullMQ 4
- **Frontend:** React 18, Vite 5, Tailwind CSS
- **Database:** PostgreSQL 16+ dengan ekstensi `pgvector` & `uuid-ossp`
- **Cache / Queue:** Redis 7

---

## 2. Prasyarat

### Lokal (tanpa Docker)
| Software | Versi Minimum | Cek |
|---|---|---|
| Node.js | 20 LTS | `node -v` |
| npm | 9+ | `npm -v` |
| PostgreSQL | 16+ | `psql --version` |
| pgvector extension | 0.5+ | (install di PostgreSQL) |
| Redis | 7+ | `redis-server --version` |

### Lokal (dengan Docker)
| Software | Versi Minimum |
|---|---|
| Docker Desktop | 4.x |
| Docker Compose | v2 (sudah bundled di Docker Desktop) |

### Server Produksi
| Software | Keterangan |
|---|---|
| Ubuntu 22.04 LTS | OS yang direkomendasikan |
| VPS minimal | 2 vCPU, 4 GB RAM |
| Domain | A Record sudah diarahkan ke IP VPS |
| Root / sudo access | Diperlukan |

---

## 3. Cara A — Lokal dengan Docker (Tercepat)

> Cocok untuk development. Semua service (PostgreSQL, Redis, backend, frontend) berjalan dalam container otomatis.

### Langkah 1 — Clone atau extract project

```bash
# Jika menggunakan git
git clone <repo-url> omnichannel
cd omnichannel

# Atau extract zip yang sudah ada
cd omnichannel
```

### Langkah 2 — Buat file `.env` untuk Docker

```bash
cp .env.docker .env.local
```

Edit `.env.local` jika perlu mengubah port atau kredensial default. Untuk pertama kali, nilai default sudah cukup.

### Langkah 3 — Jalankan Docker Compose

```bash
docker compose up -d
```

Docker akan otomatis:
- Menjalankan PostgreSQL 17 + pgvector di port `5432`
- Menjalankan Redis 7 di port `6379`
- Menginisialisasi schema database dari `init_db_v2.sql`
- Menjalankan backend di port `8998` dengan hot reload
- Menjalankan frontend (Vite dev server) di port `3000`

### Langkah 4 — Jalankan migrasi fitur terbaru

```bash
docker compose exec backend psql \
  -h localhost -U omni_user -d omni_db \
  -f /app/migration_features_v2.sql
```

> Migrasi ini menambahkan tabel untuk: Auto-Assignment, Working Hours, Outbound Webhooks, Ticket & SLA.

### Langkah 5 — Akses aplikasi

| Service | URL |
|---|---|
| Aplikasi (Frontend) | http://localhost:3000 |
| Backend API | http://localhost:8998 |

### Perintah Docker yang berguna

```bash
# Lihat log backend secara real-time
docker compose logs -f backend

# Restart hanya backend
docker compose restart backend

# Masuk ke shell container backend
docker compose exec backend sh

# Hentikan semua service
docker compose down

# Hentikan dan hapus volume (RESET database)
docker compose down -v
```

---

## 4. Cara B — Lokal Manual (Tanpa Docker)

### Langkah 1 — Install Node.js 20

```bash
# macOS (dengan Homebrew)
brew install node@20

# Ubuntu / WSL
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Windows — download installer dari https://nodejs.org
```

### Langkah 2 — Setup PostgreSQL dengan pgvector

```bash
# Ubuntu
sudo apt install postgresql-16 postgresql-16-pgvector -y
sudo systemctl start postgresql

# macOS
brew install postgresql@16
brew install pgvector
```

Buat database:

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE omni_db;
CREATE USER omni_user WITH PASSWORD 'DevPassword123!';
ALTER DATABASE omni_db OWNER TO omni_user;
GRANT ALL PRIVILEGES ON DATABASE omni_db TO omni_user;
\c omni_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

Import schema awal:

```bash
psql -h localhost -U omni_user -d omni_db -f init_db_v2.sql
```

Grant akses setelah import:

```bash
sudo -u postgres psql -d omni_db <<EOF
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO omni_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO omni_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO omni_user;
EOF
```

Jalankan migrasi fitur terbaru:

```bash
psql -h localhost -U omni_user -d omni_db -f migration_features_v2.sql
```

### Langkah 3 — Jalankan Redis

```bash
# Ubuntu / WSL
sudo systemctl start redis-server

# macOS
brew services start redis

# Windows — gunakan Redis via WSL atau Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

### Langkah 4 — Setup Backend

```bash
cd backend
npm install
cp .env.example .env   # atau buat .env baru, lihat Bagian 6
```

Edit `.env` — minimal wajib diisi:

```
PORT=8998
DATABASE_URL=postgresql://omni_user:DevPassword123!@localhost:5432/omni_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=ganti-dengan-string-random-panjang
APP_URL=http://localhost:8998
```

Jalankan backend:

```bash
npm run dev
# atau: node --watch server.js
```

Backend berjalan di `http://localhost:8998`

### Langkah 5 — Setup Frontend

```bash
cd ../frontend
npm install
```

Buat file `.env`:

```bash
echo "VITE_API_BASE_URL=http://localhost:8998" > .env
```

Jalankan frontend:

```bash
npm run dev
```

Frontend berjalan di `http://localhost:5173` (Vite default).

### Langkah 6 — Akses aplikasi

Buka `http://localhost:5173` di browser.

---

## 5. Instalasi di Server Produksi (Ubuntu VPS)

### Langkah 1 — Persiapan Server

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx curl git build-essential unzip redis-server ufw

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2

# Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### Langkah 2 — PostgreSQL & pgvector

```bash
# Tambah repository PostgreSQL
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Install PostgreSQL 16 + pgvector
sudo apt install postgresql-16 postgresql-16-pgvector -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Setup database:

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE omni_db;
CREATE USER omni_user WITH PASSWORD 'GantiPasswordAman!';
ALTER DATABASE omni_db OWNER TO omni_user;
GRANT ALL PRIVILEGES ON DATABASE omni_db TO omni_user;
\c omni_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### Langkah 3 — Upload & Struktur Folder

```bash
sudo mkdir -p /var/www/omnichannel
sudo chown -R $USER:$USER /var/www/omnichannel
```

Upload file ke server (pilih salah satu):

```bash
# Opsi 1: Via SCP dari komputer lokal
scp -r ./backend  user@ip-server:/var/www/omnichannel/
scp -r ./frontend user@ip-server:/var/www/omnichannel/
scp init_db_v2.sql migration_features_v2.sql user@ip-server:/var/www/omnichannel/

# Opsi 2: Via git
cd /var/www/omnichannel
git clone <repo-url> .
```

Struktur folder yang diharapkan:

```
/var/www/omnichannel/
├── backend/
├── frontend/
├── init_db_v2.sql
└── migration_features_v2.sql
```

### Langkah 4 — Import Database

```bash
cd /var/www/omnichannel

# Import schema awal
psql -h localhost -U omni_user -d omni_db -f init_db_v2.sql

# Grant akses
sudo -u postgres psql -d omni_db <<EOF
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO omni_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO omni_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO omni_user;
EOF

# Import migrasi fitur terbaru (Auto-Assign, Working Hours, Webhooks, Ticket/SLA)
psql -h localhost -U omni_user -d omni_db -f migration_features_v2.sql
```

### Langkah 5 — Konfigurasi Backend

```bash
cd /var/www/omnichannel/backend
npm install
nano .env
```

Isi `.env` (lihat referensi lengkap di [Bagian 6](#6-konfigurasi-environment-variables)).

Minimal yang wajib diisi:

```
PORT=8998
NODE_ENV=production
APP_URL=https://domain-anda.com
DATABASE_URL=postgresql://omni_user:GantiPasswordAman!@localhost:5432/omni_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=string-random-minimal-64-karakter
```

### Langkah 6 — Build Frontend

```bash
cd /var/www/omnichannel/frontend
npm install
echo "VITE_API_BASE_URL=https://domain-anda.com" > .env
npm run build
```

Hasil build ada di `frontend/dist/` — akan otomatis disajikan oleh backend.

### Langkah 7 — Jalankan dengan PM2

```bash
cd /var/www/omnichannel/backend
pm2 start server.js --name "omni-backend"
pm2 save
pm2 startup   # ikuti instruksi yang muncul agar auto-start saat reboot
```

### Langkah 8 — Konfigurasi Nginx

```bash
sudo nano /etc/nginx/sites-available/omnichannel
```

Isi konfigurasi (ganti `domain-anda.com`):

```nginx
server {
    server_name domain-anda.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:8998;

        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket — wajib untuk Socket.IO (chat real-time, QR code)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;

        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }

    location ~ /\. {
        deny all;
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/omnichannel /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Langkah 9 — Install SSL (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d domain-anda.com
```

Certbot akan otomatis memperbarui konfigurasi Nginx dengan HTTPS.

### Langkah 10 — Permission Folder Upload

```bash
mkdir -p /var/www/omnichannel/backend/uploads/{system,cms,chat,webchat}
sudo chown -R $USER:$USER /var/www/omnichannel/backend/uploads
sudo chmod -R 755 /var/www/omnichannel/backend/uploads
```

---

## 6. Konfigurasi Environment Variables

Buat file `.env` di folder `backend/`. Berikut referensi lengkapnya:

```bash
# =============================================================================
# SERVER
# =============================================================================
PORT=8998
NODE_ENV=production                        # production | development
APP_URL=https://domain-anda.com            # URL publik aplikasi (tanpa trailing slash)

# =============================================================================
# DATABASE
# =============================================================================
DATABASE_URL=postgresql://omni_user:password@localhost:5432/omni_db

# =============================================================================
# REDIS
# =============================================================================
REDIS_URL=redis://localhost:6379

# =============================================================================
# KEAMANAN
# =============================================================================
JWT_SECRET=ganti-dengan-string-random-minimal-64-karakter

# =============================================================================
# WHATSAPP GATEWAY (Non-Official / Baileys)
# =============================================================================
WA_GATEWAY_URL=https://api-wa.layanan-anda.com
WA_GATEWAY_API_KEY=api-key-gateway-wa

# =============================================================================
# META / OFFICIAL WHATSAPP BUSINESS API
# =============================================================================
META_VERIFY_TOKEN=token-verifikasi-webhook-meta
META_APP_SECRET=app-secret-dari-meta-dashboard
FB_VERIFY_TOKEN=token-verifikasi-webhook-facebook

# =============================================================================
# AI PROVIDERS
# =============================================================================
GEMINI_API_KEY=AIza...          # Google Gemini (untuk embedding & chat)
OPENAI_API_KEY=sk-...           # OpenAI (opsional, untuk chat)

# =============================================================================
# FIREBASE (Push Notification)
# =============================================================================
FIREBASE_PROJECT_ID=project-id-firebase
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# =============================================================================
# PAYMENT GATEWAY (opsional)
# =============================================================================
DOKU_CLIENT_ID=client-id-doku
DOKU_SECRET_KEY=secret-key-doku
TRIPAY_API_KEY=api-key-tripay
TRIPAY_PRIVATE_KEY=private-key-tripay
TRIPAY_MERCHANT_CODE=kode-merchant-tripay
XENDIT_SECRET_KEY=secret-key-xendit

# =============================================================================
# EMAIL (opsional — untuk notifikasi & invoice)
# =============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app-password-gmail
SMTP_FROM=noreply@domain-anda.com
```

> **Catatan:** Tidak semua variabel wajib diisi untuk fungsi dasar. Yang **wajib** adalah:
> `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `APP_URL`.

---

## 7. Migrasi Database

Project ini memiliki beberapa file migrasi:

| File | Keterangan | Wajib |
|---|---|---|
| `init_db_v2.sql` | Schema awal — semua tabel dasar | Ya (pertama kali) |
| `migration_ai_provider.sql` | Kolom AI provider dinamis | Ya |
| `migration_features_v2.sql` | Auto-Assign, Working Hours, Webhooks, Ticket & SLA | Ya |

### Urutan import yang benar:

```bash
# 1. Schema awal
psql -h localhost -U omni_user -d omni_db -f init_db_v2.sql

# 2. Migrasi AI provider
psql -h localhost -U omni_user -d omni_db -f migration_ai_provider.sql

# 3. Migrasi fitur terbaru
psql -h localhost -U omni_user -d omni_db -f migration_features_v2.sql
```

### Apa yang ditambahkan `migration_features_v2.sql`:

- **Tabel `working_hours`** — jadwal 7 hari per organisasi
- **Tabel `working_hours_config`** — timezone & perilaku di luar jam kerja
- **Tabel `org_webhooks`** — konfigurasi outbound webhook
- **Tabel `org_webhook_logs`** — log pengiriman webhook
- **Tabel `sla_policies`** — target FRT & resolusi per prioritas
- **Kolom baru di `conversations`** — `ticket_number`, `priority`, `sla_deadline_at`, `sla_breached`, `first_reply_at`
- **Kolom baru di `organizations`** — `assignment_mode`, `rr_last_user_id`
- **Sequence `ticket_seq`** — penomoran tiket otomatis (TKT-00001 dst.)

> Migrasi menggunakan `IF NOT EXISTS` dan `ON CONFLICT DO NOTHING` sehingga **aman dijalankan ulang**.

---

## 8. Perintah PM2 yang Sering Digunakan

```bash
# Lihat status semua proses
pm2 status

# Lihat log real-time
pm2 logs omni-backend

# Lihat log dengan jumlah baris tertentu
pm2 logs omni-backend --lines 100

# Restart
pm2 restart omni-backend

# Stop
pm2 stop omni-backend

# Reload tanpa downtime (untuk update kode)
pm2 reload omni-backend

# Hapus proses dari PM2
pm2 delete omni-backend

# Monitoring resource (CPU, RAM)
pm2 monit
```

### Update kode di server (tanpa downtime)

```bash
cd /var/www/omnichannel

# Pull kode terbaru (jika pakai git)
git pull

# Update dependency backend jika ada perubahan package.json
cd backend && npm install

# Rebuild frontend
cd ../frontend && npm run build

# Reload backend tanpa downtime
pm2 reload omni-backend
```

---

## 9. Login Default

Setelah instalasi berhasil, buka aplikasi di browser:

| | |
|---|---|
| **URL** | `https://domain-anda.com` (atau `http://localhost:5173` di lokal) |
| **Email** | `superadmin@example.com` |
| **Password** | `admin123` |

> **Segera ganti password** setelah login pertama kali melalui menu **Settings → Profile Settings**.

---

## 10. Troubleshooting

### Backend tidak bisa start

```bash
# Lihat log error
pm2 logs omni-backend --lines 50

# Pastikan PORT tidak bentrok
sudo lsof -i :8998
```

### Error `bcrypt` saat `npm install`

```bash
cd /var/www/omnichannel/backend
rm -rf node_modules package-lock.json
npm install
npm rebuild bcrypt --build-from-source
```

### Database: error koneksi

```bash
# Test koneksi manual
psql -h localhost -U omni_user -d omni_db -c "SELECT 1;"

# Pastikan PostgreSQL berjalan
sudo systemctl status postgresql

# Pastikan DATABASE_URL di .env sudah benar
grep DATABASE_URL /var/www/omnichannel/backend/.env
```

### Database: import schema gagal / "already exists"

```bash
# Reset database dari awal
sudo -u postgres psql <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'omni_db' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS omni_db;
DROP USER IF EXISTS omni_user;
CREATE USER omni_user WITH PASSWORD 'GantiPasswordAman!';
CREATE DATABASE omni_db;
ALTER USER omni_user WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE omni_db TO omni_user;
\c omni_db
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

# Import ulang
psql -h localhost -U omni_user -d omni_db -f /var/www/omnichannel/init_db_v2.sql
psql -h localhost -U omni_user -d omni_db -f /var/www/omnichannel/migration_ai_provider.sql
psql -h localhost -U omni_user -d omni_db -f /var/www/omnichannel/migration_features_v2.sql
```

### Redis: koneksi ditolak

```bash
# Cek status Redis
sudo systemctl status redis-server

# Start ulang
sudo systemctl restart redis-server

# Test koneksi
redis-cli ping   # harus jawab: PONG
```

### Frontend build gagal (ESLint error)

```bash
cd /var/www/omnichannel/frontend

# Lihat error ESLint secara detail
npm run lint

# Bersihkan cache dan install ulang
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Socket.IO tidak konek (real-time tidak berfungsi)

Pastikan konfigurasi Nginx sudah menyertakan header WebSocket:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_cache_bypass $http_upgrade;
```

Jika sudah ada, cek apakah SSL sudah aktif — Socket.IO membutuhkan `wss://` di production (bukan `ws://`).

### Webhook WhatsApp tidak masuk

```bash
# Pastikan URL webhook bisa diakses publik
curl -I https://domain-anda.com/webhook/wa-gateway

# Cek log incoming webhook
pm2 logs omni-backend | grep "Webhook"
```

---

## Catatan Tambahan

- **Upload media:** Folder `backend/uploads/` harus bisa ditulis oleh proses Node.js. Gunakan `chmod 755` jika ada error permission.
- **Backup database:** Disarankan membuat backup rutin dengan `pg_dump`:
  ```bash
  pg_dump -h localhost -U omni_user omni_db > backup_$(date +%Y%m%d).sql
  ```
- **Update aplikasi:** Selalu jalankan file migrasi terbaru setelah update kode untuk memastikan schema database selaras.
- **Log Node.js:** Tersimpan di `~/.pm2/logs/`. Rotasi log otomatis bisa dikonfigurasi dengan `pm2 install pm2-logrotate`.

---

_© 2026 CRMHUB OMNICHANNEL. All rights reserved._
