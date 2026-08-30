# 🛡️ PANDUAN LISENSI ENTERPRISE 1-DOMAIN KRIPTOGRAFIS (RSA-2048) & LOGIC BINDING

Dokumentasi resmi untuk **Author / Pemilik Software CRMHUB OMNICHANNEL** mengenai cara kerja, pengelolaan, dan penerbitan lisensi 1-domain berbasis **Kriptografi Kunci Asimetris (RSA-2048)** dengan perlindungan **Cryptographic Logic Binding**.

---

## 🌟 1. Konsep Keamanan Kriptografis (Jual Lepas 99% Open Source)

Aplikasi CRMHUB Omnichannel didesain dengan prinsip **Jual Lepas (Source Code Terbuka & Bersih Tanpa Obfuskasi/Binary)**, namun memiliki perlindungan anti-tampering dan anti-crack tingkat tinggi:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             ALUR KRIPTOGRAFI LISENSI RSA-2048                               │
├────────────────────────────────┬────────────────────────────┬───────────────────────────────┤
│  🔐 1. Komputer Author         │  📊 2. Google Spreadsheet  │  🌐 3. Server VPS Klien       │
│  (Private Key - RAHASIA)       │  (Database Lisensi Cloud)  │  (Public Key - Embedded)      │
│                                │                            │                               │
│  node generate-license.js      │  Domain, License_Key,      │  • Ambil Host Request         │
│  tokosaya.com --client="..."   │  RSA_Signature, Client     │  • Cocokkan ke Google Sheet   │
│               │                │             ▲              │  • Verifikasi RSA Signature   │
│               ▼                │             │              │  • HMAC Anti-Tamper Cache     │
│  Hasilkan Digital Signature    │─────────────┘              │  • Derive Operation Key       │
│  (HANYA BISA DIBUAT AUTHOR)    │                            │  • 7-Day Offline Grace Period │
└────────────────────────────────┴────────────────────────────┴───────────────────────────────┘
```

1. **Private Key (`license_private.key`)**:
   - Disimpan secara rahasia di folder author (`scripts/keys/license_private.key`). Kunci ini digunakan untuk menandatangani domain klien baru. Kunci privat **tidak pernah diunggah** ke server klien.
2. **Public Key (`src/config/license.js`)**:
   - Tertanam di source code aplikasi klien. Kunci publik hanya berfungsi memverifikasi signature dan secara matematis **mustahil** digunakan untuk membuat lisensi baru.
3. **Cryptographic Logic Binding**:
   - Engine pengiriman pesan WhatsApp dan broadcast mengeksekusi `deriveOperationKey('wa_dispatch')`. Jika cracker mencoba menghapus middleware lisensi, engine pengiriman pesan otomatis menolak eksekusi.
4. **HMAC-SHA256 Anti-Tamper Cache**:
   - Cache status lisensi di server klien disegel dengan stempel HMAC. Jika cracker mengedit isi memori atau cache secara manual, cache otomatis ditolak.
5. **Smart 7-Day Offline Grace Period**:
   - Jika koneksi internet ke Google Sheets terputus sementara, aplikasi tetap berjalan normal selama 7 hari berdasarkan verifikasi sah terakhir.

---

## 🛠️ 2. Cara Menerbitkan Lisensi Klien Baru (CLI Tool)

### Langkah 1: Jalankan Generator Lisensi di Terminal
Masuk ke direktori backend dan jalankan perintah:

```bash
cd omnichannel/backend
node scripts/generate-license.js nama-domain-klien.com --client="PT Klien Maju"
```

Contoh Output:
```text
================================================================
🛡️ CRMHUB RSA-2048 LICENSE GENERATOR (AUTHOR TOOL)
================================================================
🌐 Target Domain : nama-domain-klien.com
👤 Client Name   : PT Klien Maju
🔑 License Key   : CRMHUB-LZ890123-ABCD1234
🔏 RSA Signature : MIIBCgKCAQEA49E30UxfkQqf8VP3LND5u5xCeP57G6oPRTQd...
----------------------------------------------------------------
📋 BARIS CSV UNTUK DI-PASTE KE GOOGLE SHEETS (Baris Baru):
----------------------------------------------------------------
nama-domain-klien.com,CRMHUB-LZ890123-ABCD1234,"MIIBCgKCAQEA49E30UxfkQqf8VP3LND5u5xCeP57G6oPRTQd...","PT Klien Maju"
================================================================
```

### Langkah 2: Masukkan ke Google Sheets Lisensi Anda
1. Buka Google Spreadsheet lisensi Anda di Google Drive.
2. Paste baris CSV di atas ke baris baru.

---

## 📋 3. Format Tabel Google Spreadsheet Lisensi

Pastikan Sheet pertama diberi nama **`licenses`** dengan format header 4 kolom:

| Domain | License_Key | RSA_Signature | Client_Name |
|---|---|---|---|
| `tokosaya.com` | `CRMHUB-LZ890123-ABCD1234` | `MIIBCgKCAQEA49E3...` | `PT Klien Maju` |
| `demo.crmhub.id` | `CRMHUB-LZ999999-XYZ9876` | `MIIBCgKCAQEA88Z1...` | `Demo Corporate` |

> [!TIP]
> **Cara Menonaktifkan Lisensi Klien**:
> Cukup hapus baris domain klien dari Google Sheets Anda, atau ubah nama domainnya (misal: `tokosaya.com.disabled`). Klien akan langsung terblokir saat cache expired (maks 6 jam) atau saat mereka menekan tombol Refresh.

---

## ⚙️ 4. Konfigurasi Environment Variables di Server Klien

Pada file `.env` backend di server VPS klien (`omnichannel/backend/.env`):

| Variabel | Deskripsi | Default / Nilai Rekomendasi |
|---|---|---|
| `LICENSE_SHEET_ID` | Spreadsheet ID dari URL Google Sheets Anda | `1BxiMVs0XR...` |
| `ALLOW_ALL_LICENSE` | Bypass lisensi untuk debugging (`true`/`false`) | `false` (di VPS Produksi) |
| `LICENSE_CACHE_TTL` | Durasi cache dalam detik | `21600` (6 Jam) |
| `LICENSE_OFFLINE_GRACE_PERIOD` | Toleransi offline dalam detik | `604800` (7 Hari) |

> [!NOTE]
> **Mode Development / Localhost Otomatis**:
> Saat aplikasi dijalankan di `localhost`, `127.0.0.1`, `::1`, domain `.test`, `.local`, atau saat `NODE_ENV=development`, sistem **100% bebas tanpa perlu lisensi** sehingga developer lokal tidak terganggu saat mengkustomisasi fitur.

---

## 🧪 5. Menguji Validasi Lisensi Kapan Saja

Anda dapat menguji seluruh skenario validasi, RSA signing, domain normalization, dan logic binding dengan menjalankan:

```bash
cd omnichannel/backend
node tests/test_license_rsa_suite.js
```
