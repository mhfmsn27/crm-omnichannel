/**
 * Broadcast Schedule Controller
 */

import * as scheduleService from '../services/broadcastScheduleService.js';

export const createScheduled = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { name, message, channel, target_type, target_labels, target_agents, scheduled_at, media_url, device_id } = req.body;

    if (!name || !message || !scheduled_at) {
        return res.status(400).json({ error: 'Name, message, and scheduled_at are required' });
    }

    try {
        const broadcast = await scheduleService.createScheduledBroadcast(organization_id, userId, {
            campaign_name: name,
            message,
            channel: channel || 'whatsapp',
            target_type: target_type || 'all',
            target_ids: target_agents || [],
            target_labels: target_labels || [],
            device_id: device_id ? parseInt(device_id) : null,
            media_url: media_url || null,
            scheduled_at: new Date(scheduled_at)
        });
        res.status(201).json(broadcast);
    } catch (error) {
        console.error('[Broadcast Schedule] Create error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getScheduled = async (req, res) => {
    const { organization_id } = req.user;
    const { status } = req.query;

    try {
        const broadcasts = await scheduleService.getScheduledBroadcasts(organization_id, status);
        res.json(broadcasts);
    } catch (error) {
        console.error('[Broadcast Schedule] Get error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateScheduled = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { name, message, scheduled_at, target_labels, target_agents, status } = req.body;

    try {
        const updated = await scheduleService.updateScheduledBroadcast(organization_id, parseInt(id), {
            campaign_name: name,
            message,
            scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
            target_labels: target_labels || [],
            target_ids: target_agents || [],
            status
        });

        if (!updated) {
            return res.status(404).json({ error: 'Scheduled broadcast not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('[Broadcast Schedule] Update error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const cancelScheduled = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        const cancelled = await scheduleService.cancelScheduledBroadcast(organization_id, parseInt(id));

        if (!cancelled) {
            return res.status(404).json({ error: 'Scheduled broadcast not found or already sent' });
        }

        res.json({ message: 'Broadcast cancelled' });
    } catch (error) {
        console.error('[Broadcast Schedule] Cancel error:', error);
        res.status(500).json({ error: error.message });
    }
};