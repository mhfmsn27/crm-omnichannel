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
        const events = [];

        // 1. Conversations
        try {
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

            convsRes.rows.forEach(conv => {
                events.push({
                    id: `conv-${conv.id}`,
                    type: 'conversation',
                    title: `Sesi Obrolan (${conv.channel?.toUpperCase() || 'CHAT'})`,
                    timestamp: conv.created_at,
                    channel: conv.channel,
                    status: conv.status,
                    agent: conv.agent_name,
                    labels: conv.label_names,
                    lastMessage: conv.last_message
                });
            });
        } catch (e) {
            console.warn('[Journey Timeline] Conv fetch warning:', e.message);
        }

        // 2. Journey Touchpoints (Web, UTM, Shortlinks)
        try {
            const touchRes = await pool.query(
                `SELECT * FROM journey_touchpoints
                 WHERE organization_id = $1
                 AND journey_id = (SELECT id FROM customer_journeys WHERE contact_id = $2)
                 ORDER BY created_at ASC`,
                [organizationId, contactId]
            );

            touchRes.rows.forEach(touch => {
                events.push({
                    id: `touch-${touch.id}`,
                    type: 'touchpoint',
                    title: `Kunjungan / Interaksi (${touch.touchpoint_type || 'Web'})`,
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
        } catch (e) {
            console.warn('[Journey Timeline] Touchpoint fetch warning:', e.message);
        }

        // 3. Invoices (Created & Paid Events)
        try {
            const invRes = await pool.query(
                `SELECT id, invoice_number, total_amount, status, created_at, paid_at
                 FROM invoices
                 WHERE contact_id = $1 AND organization_id = $2
                 ORDER BY created_at ASC`,
                [contactId, organizationId]
            );

            invRes.rows.forEach(inv => {
                events.push({
                    id: `inv-${inv.id}`,
                    type: 'invoice_created',
                    title: `Invoice Diterbitkan #${inv.invoice_number}`,
                    timestamp: inv.created_at,
                    amount: Number(inv.total_amount || 0),
                    status: inv.status,
                    invoiceNumber: inv.invoice_number
                });

                if (inv.status === 'paid' && inv.paid_at) {
                    events.push({
                        id: `inv-paid-${inv.id}`,
                        type: 'invoice_paid',
                        title: `Pembayaran Lunas #${inv.invoice_number}`,
                        timestamp: inv.paid_at,
                        amount: Number(inv.total_amount || 0),
                        status: 'paid',
                        invoiceNumber: inv.invoice_number
                    });
                }
            });
        } catch (e) {
            console.warn('[Journey Timeline] Invoices fetch warning:', e.message);
        }

        // 4. Deals & Pipeline Movements
        try {
            const dealHistoryRes = await pool.query(
                `SELECT psh.id, psh.created_at, psh.conversation_id,
                        ps_from.name as from_stage, ps_to.name as to_stage, ps_to.color as stage_color,
                        u.name as changed_by_name, c.value as deal_value
                 FROM pipeline_stage_history psh
                 JOIN conversations c ON psh.conversation_id = c.id
                 LEFT JOIN pipeline_stages ps_from ON psh.from_stage_id = ps_from.id
                 JOIN pipeline_stages ps_to ON psh.to_stage_id = ps_to.id
                 LEFT JOIN users u ON psh.changed_by = u.id
                 WHERE c.contact_id = $1 AND c.organization_id = $2
                 ORDER BY psh.created_at ASC`,
                [contactId, organizationId]
            );

            dealHistoryRes.rows.forEach(dh => {
                events.push({
                    id: `deal-stage-${dh.id}`,
                    type: 'deal_stage_changed',
                    title: `Deal Pindah ke: ${dh.to_stage}`,
                    timestamp: dh.created_at,
                    fromStage: dh.from_stage,
                    toStage: dh.to_stage,
                    color: dh.stage_color,
                    agent: dh.changed_by_name,
                    value: Number(dh.deal_value || 0)
                });
            });
        } catch (e) {
            console.warn('[Journey Timeline] Deal history fetch warning:', e.message);
        }

        // 5. CSAT Feedback
        try {
            const csatRes = await pool.query(
                `SELECT s.id, s.rating, s.feedback, s.created_at, u.name as agent_name
                 FROM csat_surveys s
                 JOIN conversations c ON s.conversation_id = c.id
                 LEFT JOIN users u ON s.agent_id = u.id
                 WHERE c.contact_id = $1 AND s.organization_id = $2
                 ORDER BY s.created_at ASC`,
                [contactId, organizationId]
            );

            csatRes.rows.forEach(cs => {
                events.push({
                    id: `csat-${cs.id}`,
                    type: 'csat_survey',
                    title: `Ulasan CSAT: ${cs.rating}/5 ⭐`,
                    timestamp: cs.created_at,
                    rating: cs.rating,
                    feedback: cs.feedback,
                    agent: cs.agent_name
                });
            });
        } catch (e) {
            console.warn('[Journey Timeline] CSAT fetch warning:', e.message);
        }

        // 6. Agent Internal Notes
        try {
            const notesRes = await pool.query(
                `SELECT n.id, n.note, n.note_type, n.created_at, u.name as author_name, n.is_internal
                 FROM agent_notes n
                 LEFT JOIN users u ON n.created_by = u.id
                 WHERE n.contact_id = $1 AND n.organization_id = $2
                 ORDER BY n.created_at ASC`,
                [contactId, organizationId]
            );

            notesRes.rows.forEach(nt => {
                events.push({
                    id: `note-${nt.id}`,
                    type: 'agent_note',
                    title: nt.is_internal ? 'Catatan Internal (Whisper)' : 'Catatan Kontak',
                    timestamp: nt.created_at,
                    note: nt.note,
                    noteType: nt.note_type,
                    isInternal: nt.is_internal,
                    agent: nt.author_name
                });
            });
        } catch (e) {
            console.warn('[Journey Timeline] Agent notes fetch warning:', e.message);
        }

        // Sort descending (newest first for clean activity feed)
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return {
            events,
            summary: {
                totalEvents: events.length,
                totalInvoices: events.filter(e => e.type.startsWith('invoice')).length,
                totalConversations: events.filter(e => e.type === 'conversation').length,
                totalTouchpoints: events.filter(e => e.type === 'touchpoint').length,
                lastActivityAt: events[0]?.timestamp || null
            }
        };
    } catch (error) {
        console.error('[Journey] Error getting timeline:', error);
        return { events: [], summary: { totalEvents: 0, totalInvoices: 0, totalConversations: 0, totalTouchpoints: 0, lastActivityAt: null } };
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