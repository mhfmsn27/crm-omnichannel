/**
 * Team Gamification Service
 * Points, badges, leaderboards, and team engagement
 */

import pool from '../config/db.js';

// --- SELF-HEALING GAMIFICATION SCHEMA ---
export const ensureGamificationTables = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS gamification_settings (
                id SERIAL PRIMARY KEY,
                organization_id INT UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT true,
                points_per_message INT DEFAULT 1,
                points_per_closed_conversation INT DEFAULT 10,
                points_per_five_star_csat INT DEFAULT 20,
                points_per_sale INT DEFAULT 50,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS agent_points (
                id SERIAL PRIMARY KEY,
                organization_id INT NOT NULL,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                points INT NOT NULL,
                reason VARCHAR(255) NOT NULL,
                reference_id VARCHAR(100),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS agent_badges (
                id SERIAL PRIMARY KEY,
                organization_id INT NOT NULL,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                badge_type VARCHAR(100) NOT NULL,
                badge_name VARCHAR(255) NOT NULL,
                earned_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS agent_streaks (
                id SERIAL PRIMARY KEY,
                organization_id INT NOT NULL,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                current_streak INT DEFAULT 0,
                longest_streak INT DEFAULT 0,
                last_active_date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(organization_id, user_id)
            );
        `);
    } catch (e) {
        console.error('[GamificationService] ensureGamificationTables error:', e.message);
    }
};
ensureGamificationTables().catch(() => {});

/**
 * Get or create gamification settings for organization
 */
export const getOrCreateSettings = async (organizationId) => {
    try {
        const existing = await pool.query(
            'SELECT * FROM gamification_settings WHERE organization_id = $1',
            [organizationId]
        );

        if (existing.rows.length > 0) {
            return existing.rows[0];
        }

        // Create default settings
        const result = await pool.query(
            `INSERT INTO gamification_settings (organization_id)
             VALUES ($1)
             RETURNING *`,
            [organizationId]
        );

        return result.rows[0];
    } catch (error) {
        console.error('[Gamification] Error getting settings:', error);
        return null;
    }
};

/**
 * Update gamification settings
 */
export const updateSettings = async (organizationId, settings) => {
    const {
        pointsPerConversation,
        pointsPerResolution,
        pointsPerPositiveRating,
        pointsPerNegativeRating,
        pointsPerQuickResponse,
        quickResponseThreshold,
        leaderboardPeriod,
        topCount,
        isActive
    } = settings;

    try {
        const result = await pool.query(
            `UPDATE gamification_settings SET
             points_per_conversation = COALESCE($2, points_per_conversation),
             points_per_resolution = COALESCE($3, points_per_resolution),
             points_per_positive_rating = COALESCE($4, points_per_positive_rating),
             points_per_negative_rating = COALESCE($5, points_per_negative_rating),
             points_per_quick_response = COALESCE($6, points_per_quick_response),
             quick_response_threshold = COALESCE($7, quick_response_threshold),
             leaderboard_period = COALESCE($8, leaderboard_period),
             top_count = COALESCE($9, top_count),
             is_active = COALESCE($10, is_active),
             updated_at = NOW()
             WHERE organization_id = $1
             RETURNING *`,
            [organizationId, pointsPerConversation, pointsPerResolution, pointsPerPositiveRating,
                pointsPerNegativeRating, pointsPerQuickResponse, quickResponseThreshold,
                leaderboardPeriod, topCount, isActive]
        );

        return result.rows[0];
    } catch (error) {
        console.error('[Gamification] Error updating settings:', error);
        return null;
    }
};

/**
 * Award points to an agent
 */
export const awardPoints = async (organizationId, userId, points, transactionType, description, metadata = {}, conversationId = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get or create agent points record
        let agentPoints = await client.query(
            'SELECT * FROM agent_points WHERE organization_id = $1 AND user_id = $2',
            [organizationId, userId]
        );

        if (agentPoints.rows.length === 0) {
            await client.query(
                `INSERT INTO agent_points (organization_id, user_id, total_points, lifetime_points, period_points)
                 VALUES ($1, $2, $3, $3, $3)`,
                [organizationId, userId, points]
            );
        } else {
            // Update points
            await client.query(
                `UPDATE agent_points SET
                 total_points = total_points + $3,
                 lifetime_points = lifetime_points + $3,
                 period_points = period_points + $3,
                 last_activity_at = NOW(),
                 updated_at = NOW()
                 WHERE organization_id = $1 AND user_id = $2`,
                [organizationId, userId, points]
            );
        }

        // Log transaction
        await client.query(
            `INSERT INTO points_transactions
             (organization_id, user_id, conversation_id, points, transaction_type, description, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [organizationId, userId, conversationId, points, transactionType, description, JSON.stringify(metadata)]
        );

        await client.query('COMMIT');

        // Check for badge achievements
        checkAndAwardBadges(organizationId, userId).catch(e =>
            console.error('[Gamification] Badge check error:', e)
        );

        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Gamification] Error awarding points:', error);
        return false;
    } finally {
        client.release();
    }
};

/**
 * Get leaderboard
 */
export const getLeaderboard = async (organizationId, options = {}) => {
    const { period = 'weekly', limit = 10 } = options;

    try {
        // Determine date range based on period
        let dateFilter = '';
        let periodType = 'weekly';

        if (period === 'daily') {
            dateFilter = "AND created_at >= CURRENT_DATE";
            periodType = 'daily';
        } else if (period === 'monthly') {
            dateFilter = "AND created_at >= DATE_TRUNC('month', CURRENT_DATE)";
            periodType = 'monthly';
        } else {
            dateFilter = "AND created_at >= DATE_TRUNC('week', CURRENT_DATE)";
            periodType = 'weekly';
        }

        // Get leaderboard data
        const leaderboard = await pool.query(`
            SELECT
                ap.user_id,
                u.name as agent_name,
                u.profile_pic_url,
                COALESCE(SUM(pt.points), 0) as period_points,
                ap.total_points as lifetime_points,
                COUNT(DISTINCT pt.conversation_id) FILTER (WHERE pt.transaction_type = 'resolution') as resolutions
            FROM agent_points ap
            JOIN users u ON ap.user_id = u.id
            LEFT JOIN points_transactions pt ON ap.user_id = pt.user_id AND pt.organization_id = $1 ${dateFilter}
            WHERE ap.organization_id = $1
            GROUP BY ap.user_id, u.name, u.profile_pic_url, ap.total_points
            ORDER BY period_points DESC
            LIMIT $2
        `, [organizationId, limit]);

        // Add rank
        const ranked = leaderboard.rows.map((row, idx) => ({
            ...row,
            rank: idx + 1,
            period_type: periodType
        }));

        return ranked;
    } catch (error) {
        console.error('[Gamification] Error getting leaderboard:', error);
        return [];
    }
};

/**
 * Get agent stats
 */
export const getAgentStats = async (organizationId, userId) => {
    try {
        // Get agent points record
        const pointsRes = await pool.query(
            'SELECT * FROM agent_points WHERE organization_id = $1 AND user_id = $2',
            [organizationId, userId]
        );

        const points = pointsRes.rows[0] || getEmptyAgentPoints();

        // Get recent achievements
        const achievements = await pool.query(
            `SELECT * FROM points_transactions
             WHERE organization_id = $1 AND user_id = $2
             ORDER BY created_at DESC
             LIMIT 10`,
            [organizationId, userId]
        );

        // Get badges
        const badges = points.badges_earned || [];

        // Get streak info
        const streak = {
            current: points.current_streak || 0,
            longest: points.longest_streak || 0
        };

        return {
            ...points,
            badges,
            recentAchievements: achievements.rows,
            streak
        };
    } catch (error) {
        console.error('[Gamification] Error getting agent stats:', error);
        return getEmptyAgentPoints();
    }
};

/**
 * Check and award badges
 */
export const checkAndAwardBadges = async (organizationId, userId) => {
    try {
        const settings = await getOrCreateSettings(organizationId);
        if (!settings || !settings.is_active) return;

        const agentPoints = await pool.query(
            'SELECT * FROM agent_points WHERE organization_id = $1 AND user_id = $2',
            [organizationId, userId]
        );

        if (agentPoints.rows.length === 0) return;

        const ap = agentPoints.rows[0];
        const earnedBadges = ap.badges_earned || [];
        const earnedIds = earnedBadges.map(b => b.id);

        // Get all badges
        const badges = await pool.query(
            'SELECT * FROM achievement_badges WHERE organization_id = $1 AND is_active = true',
            [organizationId]
        );

        for (const badge of badges.rows) {
            if (earnedIds.includes(badge.id)) continue;

            let earned = false;
            let reason = '';

            switch (badge.requirement_type) {
                case 'resolutions':
                    const resCount = await pool.query(
                        `SELECT COUNT(*) FROM points_transactions
                         WHERE organization_id = $1 AND user_id = $2 AND transaction_type = 'resolution'`,
                        [organizationId, userId]
                    );
                    if (resCount.rows[0].count >= badge.requirement_value) {
                        earned = true;
                        reason = `Achieved ${badge.requirement_value} resolutions`;
                    }
                    break;

                case 'points':
                    if (ap.lifetime_points >= badge.requirement_value) {
                        earned = true;
                        reason = `Earned ${badge.requirement_value} lifetime points`;
                    }
                    break;

                case 'streak':
                    if (ap.longest_streak >= badge.requirement_value) {
                        earned = true;
                        reason = `${badge.requirement_value} day streak`;
                    }
                    break;
            }

            if (earned) {
                // Award badge
                earnedBadges.push({
                    id: badge.id,
                    name: badge.name,
                    icon: badge.icon,
                    earnedAt: new Date().toISOString()
                });

                await pool.query(
                    'UPDATE agent_points SET badges_earned = $3 WHERE organization_id = $1 AND user_id = $2',
                    [organizationId, userId, JSON.stringify(earnedBadges)]
                );

                // Award bonus points
                if (badge.bonus_points > 0) {
                    await awardPoints(
                        organizationId,
                        userId,
                        badge.bonus_points,
                        'badge',
                        `Badge earned: ${badge.name}`,
                        { badgeId: badge.id, badgeName: badge.name }
                    );
                }
            }
        }
    } catch (error) {
        console.error('[Gamification] Error checking badges:', error);
    }
};

/**
 * Update streak
 */
export const updateStreak = async (organizationId, userId) => {
    try {
        const agentPoints = await pool.query(
            'SELECT * FROM agent_points WHERE organization_id = $1 AND user_id = $2',
            [organizationId, userId]
        );

        if (agentPoints.rows.length === 0) return;

        const ap = agentPoints.rows[0];
        const lastActivity = ap.last_activity_at ? new Date(ap.last_activity_at) : null;
        const now = new Date();

        let newStreak = ap.current_streak || 0;
        let newLongest = ap.longest_streak || 0;

        if (lastActivity) {
            const daysDiff = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));

            if (daysDiff === 1) {
                // Consecutive day
                newStreak += 1;
            } else if (daysDiff > 1) {
                // Streak broken
                newStreak = 1;
            }
            // Same day = no change
        } else {
            newStreak = 1;
        }

        if (newStreak > newLongest) {
            newLongest = newStreak;
        }

        await pool.query(
            `UPDATE agent_points SET
             current_streak = $3,
             longest_streak = $4,
             last_activity_at = NOW()
             WHERE organization_id = $1 AND user_id = $2`,
            [organizationId, userId, newStreak, newLongest]
        );

        return { current: newStreak, longest: newLongest };
    } catch (error) {
        console.error('[Gamification] Error updating streak:', error);
        return null;
    }
};

// Helper functions
const getEmptyAgentPoints = () => ({
    total_points: 0,
    lifetime_points: 0,
    period_points: 0,
    badges_earned: [],
    current_streak: 0,
    longest_streak: 0,
    last_activity_at: null
});