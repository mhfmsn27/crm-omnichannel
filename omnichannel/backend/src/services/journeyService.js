/**
 * Customer Journey Service
 * Track and analyze customer touchpoints across channels
 */

import pool from '../config/db.js';

// --- SELF-HEALING CUSTOMER JOURNEY SCHEMA ---
export const ensureJourneyTables = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customer_journeys (
                id SERIAL PRIMARY KEY,
                organization_id INT NOT NULL,
                contact_id INT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
                first_touch_at TIMESTAMPTZ DEFAULT NOW(),
                last_touch_at TIMESTAMPTZ DEFAULT NOW(),
                touchpoint_count INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'active',
                current_stage VARCHAR(50) DEFAULT 'awareness',
                conversion_value NUMERIC(15,2) DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(organization_id, contact_id)
            );

            CREATE TABLE IF NOT EXISTS journey_touchpoints (
                id SERIAL PRIMARY KEY,
                journey_id INT NOT NULL REFERENCES customer_journeys(id) ON DELETE CASCADE,
                organization_id INT NOT NULL,
                touchpoint_type VARCHAR(50) NOT NULL,
                touchpoint_channel VARCHAR(50) NOT NULL,
                interaction_type VARCHAR(50) NOT NULL,
                content_preview TEXT,
                utm_source VARCHAR(100),
                utm_medium VARCHAR(100),
                utm_campaign VARCHAR(100),
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
    } catch (e) {
        console.error('[JourneyService] ensureJourneyTables error:', e.message);
    }
};
ensureJourneyTables().catch(() => {});

/**
 * Get or create journey for a contact
 */
export const getOrCreateJourney = async (organizationId, contactId) => {
    try {
        // Check existing
        const existing = await pool.query(
            'SELECT * FROM customer_journeys WHERE organization_id = $1 AND contact_id = $2',
            [organizationId, contactId]
        );

        if (existing.rows.length > 0) {
            return existing.rows[0];
        }

        // Create new journey
        const result = await pool.query(
            `INSERT INTO customer_journeys (organization_id, contact_id, first_touch_at, last_touch_at)
             VALUES ($1, $2, NOW(), NOW())
             RETURNING *`,
            [organizationId, contactId]
        );

        return result.rows[0];
    } catch (error) {
        console.error('[Journey] Error getting/creating journey:', error);
        return null;
    }
};

/**
 * Record a touchpoint in the customer journey
 */
export const recordTouchpoint = async (organizationId, contactId, touchpointData) => {
    const {
        touchpointType,
        touchpointChannel,
        interactionType,
        contentPreview,
        utmSource,
        utmMedium,
        utmCampaign,
        metadata
    } = touchpointData;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get or create journey
        let journey = await client.query(
            'SELECT * FROM customer_journeys WHERE organization_id = $1 AND contact_id = $2',
            [organizationId, contactId]
        );

        let journeyId;
        if (journey.rows.length === 0) {
            const newJourney = await client.query(
                `INSERT INTO customer_journeys (organization_id, contact_id, first_touch_at, last_touch_at, touchpoint_count)
                 VALUES ($1, $2, NOW(), NOW(), 1)
                 RETURNING id`,
                [organizationId, contactId]
            );
            journeyId = newJourney.rows[0].id;
        } else {
            journeyId = journey.rows[0].id;
            // Update journey touchpoint count and last touch
            await client.query(
                `UPDATE customer_journeys
                 SET touchpoint_count = touchpoint_count + 1, last_touch_at = NOW()
                 WHERE id = $1`,
                [journeyId]
            );
        }

        // Record the touchpoint
        const touchpoint = await client.query(
            `INSERT INTO journey_touchpoints
             (journey_id, organization_id, touchpoint_type, touchpoint_channel, interaction_type,
              content_preview, utm_source, utm_medium, utm_campaign, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [journeyId, organizationId, touchpointType, touchpointChannel, interactionType,
                contentPreview, utmSource, utmMedium, utmCampaign, JSON.stringify(metadata || {})]
        );

        // Update contact last_channel and touchpoint_count
        await client.query(
            `UPDATE contacts
             SET last_channel = $3, touchpoint_count = COALESCE(touchpoint_count, 0) + 1
             WHERE id = $1`,
            [contactId, organizationId, touchpointType]
        );

        await client.query('COMMIT');
        return touchpoint.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Journey] Error recording touchpoint:', error);
        return null;
    } finally {
        client.release();
    }
};

/**
 * Get customer journey with all touchpoints
 */
export const getCustomerJourney = async (organizationId, contactId) => {
    try {
        // Get journey
        const journeyRes = await pool.query(
            'SELECT * FROM customer_journeys WHERE organization_id = $1 AND contact_id = $2',
            [organizationId, contactId]
        );

        if (journeyRes.rows.length === 0) {
            return null;
        }

        const journey = journeyRes.rows[0];

        // Get touchpoints
        const touchpointsRes = await pool.query(
            `SELECT * FROM journey_touchpoints
             WHERE journey_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [journey.id]
        );

        // Get conversations as touchpoints
        const conversationsRes = await pool.query(
            `SELECT c.id, c.channel, c.status, c.last_message, c.last_message_at, c.created_at,
                    u.name as agent_name
             FROM conversations c
             LEFT JOIN users u ON c.assigned_to_agent_id = u.id
             WHERE c.contact_id = $1 AND c.organization_id = $2
             ORDER BY c.created_at DESC`,
            [contactId, organizationId]
        );

        return {
            ...journey,
            touchpoints: touchpointsRes.rows,
            conversations: conversationsRes.rows
        };
    } catch (error) {
        console.error('[Journey] Error getting customer journey:', error);
        return null;
    }
};

/**
 * Get journey timeline visualization data
 */
export const getJourneyTimeline = async (organizationId, contactId) => {
    try {
        const timeline = [];

        // Get all conversations
        const convsRes = await pool.query(
            `SELECT
                c.id, c.channel, c.status, c.last_message, c.last_message_at, c.created_at,
                c.first_reply_at, c.closed_at,
                u.name as agent_name,
                l.name as label_names
             FROM conversations c
             LEFT JOIN users u ON c.assigned_to_agent_id = u.id
             LEFT JOIN contact_labels cl ON c.contact_id = cl.contact_id
             LEFT JOIN labels l ON cl.label_id = l.id
             WHERE c.contact_id = $1 AND c.organization_id = $2
             ORDER BY c.created_at ASC`,
            [contactId, organizationId]
        );

        // Get touchpoints
        const touchRes = await pool.query(
            `SELECT * FROM journey_touchpoints
             WHERE organization_id = $1
             AND journey_id = (SELECT id FROM customer_journeys WHERE contact_id = $2)
             ORDER BY created_at ASC`,
            [organizationId, contactId]
        );

        // Get messages as events
        const msgsRes = await pool.query(
            `SELECT m.created_at, m.from_me, m.type, m.content,
                    CASE WHEN m.from_me THEN 'Agent' ELSE 'Customer' END as sender
             FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             WHERE c.contact_id = $1 AND c.organization_id = $2
             ORDER BY m.created_at ASC`,
            [contactId, organizationId]
        );

        // Build unified timeline
        const events = [];

        convsRes.rows.forEach(conv => {
            events.push({
                type: 'conversation',
                timestamp: conv.created_at,
                channel: conv.channel,
                status: conv.status,
                agent: conv.agent_name,
                labels: conv.label_names
            });
        });

        touchRes.rows.forEach(touch => {
            events.push({
                type: 'touchpoint',
                timestamp: touch.created_at,
                touchpointType: touch.touchpoint_type,
                interactionType: touch.interaction_type,
                content: touch.content_preview,
                utm: {
                    source: touch.utm_source,
                    medium: touch.utm_medium,
                    campaign: touch.utm_campaign
                }
            });
        });

        // Sort by timestamp
        events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return {
            events,
            summary: {
                totalConversations: convsRes.rows.length,
                totalTouchpoints: touchRes.rows.length,
                channels: [...new Set(convsRes.rows.map(c => c.channel))],
                startDate: convsRes.rows[0]?.created_at,
                endDate: convsRes.rows[convsRes.rows.length - 1]?.created_at
            }
        };
    } catch (error) {
        console.error('[Journey] Error getting timeline:', error);
        return { events: [], summary: { totalConversations: 0, totalTouchpoints: 0, channels: [], startDate: null, endDate: null } };
    }
};

/**
 * Calculate engagement score
 */
export const calculateEngagementScore = async (organizationId, contactId) => {
    try {
        const journeyRes = await pool.query(
            'SELECT * FROM customer_journeys WHERE organization_id = $1 AND contact_id = $2',
            [organizationId, contactId]
        );

        if (journeyRes.rows.length === 0) return 0;

        const journey = journeyRes.rows[0];

        // Scoring factors
        let score = 0;

        // Recency (max 30 points)
        const lastTouchTime = new Date(journey.last_touch_at).getTime();
        const diffMs = Date.now() - lastTouchTime;
        const daysSinceLastTouch = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (daysSinceLastTouch < 1) score += 30;
        else if (daysSinceLastTouch < 7) score += 20;
        else if (daysSinceLastTouch < 30) score += 10;

        // Frequency (max 40 points)
        const touchCount = journey.touchpoint_count || 0;
        if (touchCount > 20) score += 40;
        else if (touchCount > 10) score += 30;
        else if (touchCount > 5) score += 20;
        else if (touchCount > 1) score += 10;

        // Journey stage (max 30 points)
        if (journey.status === 'converted') score += 30;
        else if (journey.status === 'active' && touchCount > 5) score += 20;
        else if (journey.status === 'active') score += 10;

        return Math.min(100, score);
    } catch (error) {
        console.error('[Journey] Error calculating engagement:', error);
        return 0;
    }
};

/**
 * Mark journey as converted
 */
export const markJourneyConverted = async (organizationId, contactId, conversionType, conversionValue, note) => {
    try {
        await pool.query(
            `UPDATE customer_journeys
             SET status = 'converted',
                 converted_at = NOW(),
                 conversion_type = $3,
                 conversion_value = $4,
                 conversion_note = $5,
                 updated_at = NOW()
             WHERE organization_id = $1 AND contact_id = $2`,
            [organizationId, contactId, conversionType, conversionValue, note]
        );

        // Update contact lifetime_value
        if (conversionValue) {
            await pool.query(
                `UPDATE contacts
                 SET lifetime_value = COALESCE(lifetime_value, 0) + $3
                 WHERE id = $1 AND organization_id = $2`,
                [contactId, organizationId, conversionValue]
            );
        }

        return true;
    } catch (error) {
        console.error('[Journey] Error marking converted:', error);
        return false;
    }
};

/**
 * Get journey analytics for organization
 */
export const getJourneyAnalytics = async (organizationId, options = {}) => {
    const { startDate, endDate } = options;

    try {
        let dateFilter = '';
        const params = [organizationId];

        if (startDate) {
            dateFilter += ` AND created_at >= $${params.length + 1}`;
            params.push(startDate);
        }
        if (endDate) {
            dateFilter += ` AND created_at <= $${params.length + 1}`;
            params.push(endDate);
        }

        // Status distribution
        const statusDist = await pool.query(
            `SELECT status, COUNT(*) as count
             FROM customer_journeys
             WHERE organization_id = $1 ${dateFilter}
             GROUP BY status`,
            params
        );

        // Average touchpoints
        const avgTouchpoints = await pool.query(
            `SELECT AVG(touchpoint_count) as avg_touchpoints
             FROM customer_journeys
             WHERE organization_id = $1 ${dateFilter}`,
            params
        );

        // Engagement score distribution
        const engagementDist = await pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE engagement_score >= 80) as high_engagement,
                COUNT(*) FILTER (WHERE engagement_score >= 50 AND engagement_score < 80) as medium_engagement,
                COUNT(*) FILTER (WHERE engagement_score < 50) as low_engagement
             FROM customer_journeys
             WHERE organization_id = $1 ${dateFilter}`,
            params
        );

        // Top conversion paths
        const conversionPaths = await pool.query(
            `SELECT touchpoint_type, COUNT(*) as count
             FROM journey_touchpoints
             WHERE organization_id = $1 ${dateFilter}
             GROUP BY touchpoint_type
             ORDER BY count DESC
             LIMIT 10`,
            params
        );

        return {
            statusDistribution: statusDist.rows,
            avgTouchpoints: avgTouchpoints.rows[0]?.avg_touchpoints || 0,
            engagementDistribution: engagementDist.rows[0],
            topConversionPaths: conversionPaths.rows
        };
    } catch (error) {
        console.error('[Journey] Error getting analytics:', error);
        return {
            statusDistribution: [],
            avgTouchpoints: 0,
            engagementDistribution: { high_engagement: 0, medium_engagement: 0, low_engagement: 0 },
            topConversionPaths: []
        };
    }
};