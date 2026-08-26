import pool from '../config/db.js';

// Constants for Smart Logic
const MAX_CONSECUTIVE_ERRORS = 5;
const COOLDOWN_MINUTES = 30; // If error, cool down for 30 mins

export const getBestSession = async (rotatorGroupId, orgId) => {
    const client = await pool.connect();
    try {
        // 1. Get All Eligible Sessions
        // Must be connected OR have a phone number (effective connection)
        // AND EITHER:
        //   - Not in cooldown (consecutive errors < limit)
        //   - OR In cooldown but enough time passed (last_sent_at > 30 mins ago)
        const sessionsRes = await client.query(
            `SELECT ws.id, ws.session_id, ws.name, ws.daily_sent_count, ws.created_at, ws.last_sent_at, ws.consecutive_errors, ws.whatsapp_number,
                    ws.type, ws.access_token, ws.phone_number_id, ws.organization_id, ws.waba_id
             FROM rotator_group_sessions rgs
             JOIN whatsapp_sessions ws ON rgs.whatsapp_session_id = ws.id
             WHERE rgs.rotator_group_id = $1
             AND ws.organization_id = $2
             AND ws.status = 'connected'
             AND (
                 ws.consecutive_errors < $3 
                 OR 
                 ws.last_sent_at < (NOW() - INTERVAL '${COOLDOWN_MINUTES} minutes')
                 OR ws.last_sent_at IS NULL
             )
             ORDER BY ws.last_sent_at ASC NULLS FIRST`, 
             [rotatorGroupId, orgId, MAX_CONSECUTIVE_ERRORS]
        );
        
        if (sessionsRes.rows.length === 0) return null;

        // 2. Filter by Warm-up Logic & Daily Limit
        const validSessions = sessionsRes.rows.filter(session => {
            const ageInDays = (new Date() - new Date(session.created_at)) / (1000 * 60 * 60 * 24);
            let dailyLimit = 2000; // Default mature limit

            if (ageInDays < 3) dailyLimit = 50;
            else if (ageInDays < 7) dailyLimit = 150;
            
            return session.daily_sent_count < dailyLimit;
        });

        if (validSessions.length === 0) return null; // All sessions hit daily limit

        // 3. Load Balancing (Least Recently Used is already sorted by SQL)
        // Reset error count if we picked a session that was in cooldown
        const selected = validSessions[0];
        if (selected.consecutive_errors >= MAX_CONSECUTIVE_ERRORS) {
             // It passed the cooldown check, so give it a chance
             // We don't reset DB here, handleSuccess/Error will update it after attempt
        }
        
        return selected;

    } finally {
        client.release();
    }
};

export const handleSuccess = async (sessionId) => {
    try {
        await pool.query(
            `UPDATE whatsapp_sessions 
             SET daily_sent_count = daily_sent_count + 1, 
                 last_sent_at = NOW(), 
                 consecutive_errors = 0,
                 health_score = LEAST(health_score + 1, 100)
             WHERE id = $1`,
            [sessionId]
        );
    } catch (err) {
        console.error(`[RotatorService] Failed to update success stats for ${sessionId}`, err);
    }
};

export const handleError = async (sessionId) => {
    try {
        await pool.query(
            `UPDATE whatsapp_sessions 
             SET consecutive_errors = consecutive_errors + 1,
                 health_score = GREATEST(health_score - 10, 0),
                 last_sent_at = NOW() -- Update timestamp so cooldown logic works correctly
             WHERE id = $1`,
            [sessionId]
        );
    } catch (err) {
        console.error(`[RotatorService] Failed to update error stats for ${sessionId}`, err);
    }
};
