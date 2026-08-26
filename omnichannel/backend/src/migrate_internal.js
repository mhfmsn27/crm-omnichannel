import pool from './config/db.js';

const run = async () => {
    try {
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE`);
        console.log("Migration successful: Added is_internal to messages");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit(0);
    }
};

run();
