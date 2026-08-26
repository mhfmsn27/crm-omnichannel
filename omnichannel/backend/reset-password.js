
import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';

// Load konfigurasi dari .env
dotenv.config();

const { Pool } = pg;

// Konfigurasi koneksi database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Email yang ingin direset (Sesuaikan dengan email di init_db.txt atau database Anda)
const targetEmail = 'superadmin@example.com';
const newPassword = 'password123';

const resetPassword = async () => {
  try {
    console.log(`⏳ Sedang menghasilkan hash untuk password baru: '${newPassword}'...`);
    
    // 1. Generate Hash
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    console.log(`🔑 Hash berhasil dibuat. Mengupdate database...`);

    // 2. Update User
    const res = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, name, email, role',
      [passwordHash, targetEmail]
    );

    if (res.rows.length > 0) {
      console.log(`\n✅ SUKSES! Password berhasil direset.`);
      console.log(`---------------------------------------`);
      console.log(`User  : ${res.rows[0].name} (${res.rows[0].email})`);
      console.log(`Role  : ${res.rows[0].role}`);
      console.log(`Pass  : ${newPassword}`);
      console.log(`---------------------------------------`);
      console.log(`Silakan login sekarang di ${process.env.APP_URL || 'http://localhost:3000'}/login`);
    } else {
      console.error(`\n❌ ERROR: User dengan email '${targetEmail}' tidak ditemukan.`);
      console.error(`Pastikan Anda sudah menjalankan 'init_db.sql' atau cek tabel users.`);
    }

  } catch (err) {
    console.error('\n❌ Terjadi kesalahan sistem:', err);
  } finally {
    pool.end(); // Tutup koneksi database
  }
};

resetPassword();
