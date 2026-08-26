import axios from 'axios';
import { FastifyBaseLogger } from 'fastify';
import { Pool } from 'pg';

export class WebhookService {
    constructor(private dbPool: Pool, private logger: FastifyBaseLogger) {}

    async sendWebhook(clientId: string, payload: unknown): Promise<void> {
        // Single-tenant mode: bypass DB lookup when env var is set directly
        const envWebhookUrl = process.env.CRMHUB_WEBHOOK_URL;
        if (envWebhookUrl) {
            await this.attemptSend(envWebhookUrl, payload, clientId);
            return;
        }

        let webhookUrl: string | null = null;
        try {
            const result = await this.dbPool.query<{ webhook_url: string }>(
                'SELECT webhook_url FROM clients WHERE id = $1',
                [clientId]
            );

            if (result.rows.length > 0 && result.rows[0].webhook_url) {
                webhookUrl = result.rows[0].webhook_url;
            } else {
                return;
            }
        } catch (dbError) {
            this.logger.error({ clientId, dbError }, 'Failed to retrieve webhook URL from database.');
            return;
        }

        if (webhookUrl) {
            await this.attemptSend(webhookUrl, payload, clientId);
        }
    }

    private async attemptSend(url: string, payload: unknown, clientId: string, retries = 3, delay = 1000): Promise<void> {
        try {
            await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'WhatsApp-Gateway/1.0'
                },
                timeout: 5000 // Timeout 5 detik agar tidak menggantung proses terlalu lama
            });
        } catch (error) {
            if (retries > 0) {
                this.logger.warn({ clientId, url, retriesLeft: retries - 1 }, `Webhook failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.attemptSend(url, payload, clientId, retries - 1, delay * 2);
            }

            if (axios.isAxiosError(error)) {
                this.logger.error({
                    clientId,
                    url: url,
                    status: error.response?.status,
                    message: error.message
                }, 'Failed to send webhook after retries.');
            } else {
                this.logger.error({ clientId, url: url, error: error }, 'Unknown error sending webhook after retries.');
            }
        }
    }
}
