import { Pool, PoolClient } from 'pg';

interface Session {
    id: string;
    client_id: string;
    name: string;
    sync_full_history: boolean;
    created_at: Date;
}

/**
 * Membuat entri sesi baru di database yang terkait dengan seorang klien.
 * @returns Objek sesi yang baru dibuat.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createSession(db: Pool | PoolClient, clientId: string, name: string, syncFullHistory: boolean = false): Promise<Session> {
    if (UUID_REGEX.test(name)) {
        // CRMHUB integration: use the incoming UUID name as the session id so
        // subsequent /sessions/:id/start|delete|status calls resolve correctly.
        const result = await db.query(
            `INSERT INTO sessions (id, client_id, name, sync_full_history) VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sync_full_history = EXCLUDED.sync_full_history
             RETURNING *`,
            [name, clientId, name, syncFullHistory]
        );
        return result.rows[0] as Session;
    }
    const result = await db.query(
        'INSERT INTO sessions (client_id, name, sync_full_history) VALUES ($1, $2, $3) RETURNING *',
        [clientId, name, syncFullHistory]
    );
    return result.rows[0] as Session;
}

/**
 * Mengambil semua sesi yang dimiliki oleh seorang klien.
 * @returns Array dari objek sesi.
 */
export async function getSessionsByClientId(db: Pool | PoolClient, clientId: string): Promise<Session[]> {
    const result = await db.query(
        'SELECT * FROM sessions WHERE client_id = $1 ORDER BY created_at DESC',
        [clientId]
    );
    return result.rows as Session[];
}

/**
 * Menghapus sebuah sesi, memastikan sesi tersebut milik klien yang benar.
 * @returns Objek yang berisi ID sesi yang dihapus, atau null jika tidak ditemukan/tidak diizinkan.
 */
export async function deleteSession(db: Pool | PoolClient, clientId: string, sessionId: string): Promise<{ id: string } | null> {
    const result = await db.query(
        'DELETE FROM sessions WHERE id = $1 AND client_id = $2 RETURNING id',
        [sessionId, clientId]
    );
    if ((result.rowCount ?? 0) === 0) {
        return null;
    }
    return { id: result.rows[0].id };
}

/**
 * Memverifikasi apakah sebuah sesi dimiliki oleh seorang klien.
 * Ini adalah pemeriksaan keamanan yang krusial.
 * @returns boolean true jika sesi dimiliki oleh klien, false jika tidak.
 */
export async function verifySessionOwnership(db: Pool | PoolClient, clientId: string, sessionId: string): Promise<boolean> {
    const result = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND client_id = $2 LIMIT 1',
      [sessionId, clientId]
    );
    return (result.rowCount ?? 0) > 0;
}