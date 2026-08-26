/**
 * Gamification Controller
 */

import * as gamificationService from "../services/gamificationService.js";

export const getSettings = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const settings = await gamificationService.getOrCreateSettings(organization_id);
        res.json(settings);
    } catch (error) {
        console.error('[Gamification] Settings error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateSettings = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const settings = await gamificationService.updateSettings(organization_id, req.body);
        res.json(settings);
    } catch (error) {
        console.error('[Gamification] Update error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getLeaderboard = async (req, res) => {
    const { organization_id } = req.user;
    const { period = 'weekly', limit = 10 } = req.query;

    try {
        const leaderboard = await gamificationService.getLeaderboard(organization_id, {
            period,
            limit: parseInt(limit)
        });
        res.json(leaderboard);
    } catch (error) {
        console.error('[Gamification] Leaderboard error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getAgentStats = async (req, res) => {
    const { organization_id, id: userId } = req.user;

    try {
        const stats = await gamificationService.getAgentStats(organization_id, userId);
        res.json(stats);
    } catch (error) {
        console.error('[Gamification] Agent stats error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const awardPoints = async (req, res) => {
    const { organization_id } = req.user;
    const { userId, points, transactionType, description, conversationId } = req.body;

    try {
        const success = await gamificationService.awardPoints(
            organization_id,
            parseInt(userId),
            points,
            transactionType,
            description,
            {},
            conversationId ? parseInt(conversationId) : null
        );

        if (!success) {
            return res.status(500).json({ error: 'Failed to award points' });
        }

        res.json({ message: 'Points awarded' });
    } catch (error) {
        console.error('[Gamification] Award error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateStreak = async (req, res) => {
    const { organization_id, id: userId } = req.user;

    try {
        const streak = await gamificationService.updateStreak(organization_id, userId);
        res.json(streak);
    } catch (error) {
        console.error('[Gamification] Streak error:', error);
        res.status(500).json({ error: error.message });
    }
};