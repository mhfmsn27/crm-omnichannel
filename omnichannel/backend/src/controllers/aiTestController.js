import pool from '../config/db.js';
import { generateResponse } from '../services/aiService.js';

/**
 * Controller to handle AI chat simulation.
 * It does not save the messages to the main WhatsApp messages table.
 */
export const testChat = async (req, res) => {
    try {
        const { bot_config_id, user_message, chat_history } = req.body;
        const orgId = req.user.organization_id;

        // Fetch the bot config
        const botRes = await pool.query('SELECT * FROM chatbot_settings WHERE id = $1 AND organization_id = $2', [bot_config_id, orgId]);
        if (botRes.rows.length === 0) {
            return res.status(404).json({ error: "Bot config not found" });
        }
        
        const botConfig = botRes.rows[0];

        // Mock contact info for testing
        const mockContactInfo = {
            id: null,
            name: 'Simulator User',
            phone_number: '0000000000'
        };

        const responseText = await generateResponse(
            orgId,
            user_message,
            chat_history || [],
            botConfig,
            "",
            mockContactInfo
        );

        res.json({ response: responseText });
    } catch (err) {
        console.error("Test Chat Error:", err);
        res.status(500).json({ error: err.message });
    }
};
