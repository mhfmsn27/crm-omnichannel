/**
 * Advanced Analytics Controller
 */

import * as analyticsService from "../services/analyticsService.js";
import { getRealtimeQueueMetrics } from "../services/analyticsService.js";

export const getOverview = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate, agentId } = req.query;

    try {
        const data = await analyticsService.getDashboardOverview(organization_id, {
            startDate,
            endDate,
            agentId: agentId ? parseInt(agentId) : null
        });
        res.json(data);
    } catch (error) {
        console.error('[Analytics] Overview error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getConversationAnalytics = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate, channel, agentId } = req.query;

    try {
        const data = await analyticsService.getConversationAnalytics(organization_id, {
            startDate,
            endDate,
            channel,
            agentId: agentId ? parseInt(agentId) : null
        });
        res.json(data);
    } catch (error) {
        console.error('[Analytics] Conversation error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getResponseTimeAnalytics = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate } = req.query;

    try {
        const data = await analyticsService.getResponseTimeAnalytics(organization_id, {
            startDate,
            endDate
        });
        res.json(data);
    } catch (error) {
        console.error('[Analytics] Response time error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getCsatAnalytics = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate } = req.query;

    try {
        const data = await analyticsService.getCsatAnalytics(organization_id, {
            startDate,
            endDate
        });
        res.json(data);
    } catch (error) {
        console.error('[Analytics] CSAT error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getChannelPerformance = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate } = req.query;

    try {
        const data = await analyticsService.getChannelPerformance(organization_id, {
            startDate,
            endDate
        });
        res.json(data);
    } catch (error) {
        console.error('[Analytics] Channel performance error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getPeakHours = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const data = await analyticsService.getPeakHoursAnalysis(organization_id);
        res.json(data);
    } catch (error) {
        console.error('[Analytics] Peak hours error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getRealtimeMetrics = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const data = await getRealtimeQueueMetrics(organization_id);
        res.json(data);
    } catch (error) {
        console.error('[Analytics] Realtime error:', error);
        res.status(500).json({ error: error.message });
    }
};