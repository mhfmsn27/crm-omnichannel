import { generateApiKey } from '../utils/apiKey';
import { Pool, PoolClient } from 'pg';

interface Client {
    id: string;
    name: string;
    webhook_url: string | null;
    api_key?: string;
    created_at: Date;
}

interface CreateClientData {
    name: string;
    webhook_url?: string | null;
}

interface UpdateClientData {
    name?: string;
    webhook_url?: string | null;
}

export async function getClients(db: Pool | PoolClient): Promise<Omit<Client, 'api_key'>[]> {
    const result = await db.query('SELECT id, name, webhook_url, created_at FROM clients ORDER BY created_at DESC');
    return result.rows as Omit<Client, 'api_key'>[];
}

export async function createClient(db: Pool | PoolClient, data: CreateClientData): Promise<Client> {
    const { name, webhook_url } = data;
    const apiKey = generateApiKey();
    const result = await db.query(
        'INSERT INTO clients (name, webhook_url, api_key) VALUES ($1, $2, $3) RETURNING *',
        [name, webhook_url || null, apiKey]
    );
    return result.rows[0] as Client;
}

export async function updateClient(db: Pool | PoolClient, id: string, data: UpdateClientData): Promise<Client | null> {
    const { name, webhook_url } = data;
    // Build dynamic query
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
        updates.push(`name = $${idx++}`);
        values.push(name);
    }
    if (webhook_url !== undefined) {
        updates.push(`webhook_url = $${idx++}`);
        values.push(webhook_url);
    }

    if (updates.length === 0) return null;

    values.push(id);
    const result = await db.query(
        `UPDATE clients SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, webhook_url, created_at`,
        values
    );
    return (result.rows[0] as Client) || null;
}

export async function deleteClient(db: Pool | PoolClient, id: string): Promise<{ id: string } | null> {
    const result = await db.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
    if ((result.rowCount ?? 0) === 0) {
        return null;
    }
    return { id: result.rows[0].id };
}