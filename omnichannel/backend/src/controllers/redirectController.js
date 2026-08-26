// backend/src/controllers/redirectController.js
import * as ShortLinkService from '../services/ShortLinkService.js';
import pool from '../config/db.js';

export const handleRedirect = async (req, res) => {
    const { slug } = req.params;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    try {
        const link = await ShortLinkService.getLinkBySlug(slug);
        
        if (!link) {
            return res.status(404).send('Link not found or expired.');
        }

        // Log Click asynchronously
        ShortLinkService.logClick(link.id, ip, userAgent).catch(console.error);

        if (link.type === 'unsubscribe') {
            // Handle Unsubscribe Logic
            if (link.contact_id) {
                await pool.query(
                    'UPDATE contacts SET is_subscribed = false, unsubscribed_at = NOW() WHERE id = $1',
                    [link.contact_id]
                );

                // NEW: Log Unsubscribe Event
                await pool.query(
                    `INSERT INTO unsubscribe_logs (organization_id, contact_id, method, details)
                     VALUES ($1, $2, 'link', $3)`,
                    [link.organization_id, link.contact_id, `Clicked link from Broadcast #${link.broadcast_id || 'Unknown'}`]
                );
            }
            
            // Simple HTML Response
            return res.send(`
                <html>
                    <head>
                        <title>Unsubscribed</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { font-family: -apple-system, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9fafb; color: #1f2937; }
                            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
                            h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #059669; }
                            p { color: #6b7280; line-height: 1.5; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>✅ Unsubscribed</h1>
                            <p>You have successfully unsubscribed from future messages. <br/>Anda telah berhenti berlangganan.</p>
                        </div>
                    </body>
                </html>
            `);
        } else {
            // Tracking Link -> Redirect
            return res.redirect(link.original_url);
        }

    } catch (err) {
        console.error("Redirect Error:", err);
        res.status(500).send("Server Error");
    }
};