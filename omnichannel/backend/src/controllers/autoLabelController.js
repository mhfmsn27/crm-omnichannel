/**
 * Auto-Label Rules API Controller
 * Handles CRUD operations for auto-labeling rules
 */

import pool from '../config/db.js';
import * as autoLabelService from '../services/autoLabelService.js';

// --- GET RULES ---
export const getRules = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const rules = await autoLabelService.getRules(organization_id);
        res.json(rules);
    } catch (err) {
        console.error('[AutoLabel Controller] Error getting rules:', err);
        res.status(500).json({ error: err.message });
    }
};

// --- CREATE RULE ---
export const createRule = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const rule = await autoLabelService.createRule(organization_id, req.body);
        res.status(201).json(rule);
    } catch (err) {
        console.error('[AutoLabel Controller] Error creating rule:', err);
        res.status(400).json({ error: err.message });
    }
};

// --- UPDATE RULE ---
export const updateRule = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        const rule = await autoLabelService.updateRule(organization_id, parseInt(id), req.body);
        res.json(rule);
    } catch (err) {
        console.error('[AutoLabel Controller] Error updating rule:', err);
        res.status(400).json({ error: err.message });
    }
};

// --- DELETE RULE ---
export const deleteRule = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        await autoLabelService.deleteRule(organization_id, parseInt(id));
        res.json({ message: 'Rule deleted successfully' });
    } catch (err) {
        console.error('[AutoLabel Controller] Error deleting rule:', err);
        res.status(400).json({ error: err.message });
    }
};

// --- TOGGLE RULE ACTIVE/INACTIVE ---
export const toggleRule = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { is_active } = req.body;
    try {
        const rule = await autoLabelService.updateRule(organization_id, parseInt(id), { is_active });
        res.json(rule);
    } catch (err) {
        console.error('[AutoLabel Controller] Error toggling rule:', err);
        res.status(400).json({ error: err.message });
    }
};

// --- GET LOGS ---
export const getLogs = async (req, res) => {
    const { organization_id } = req.user;
    const { limit = 100, offset = 0, contact_id, action } = req.query;
    try {
        const logs = await autoLabelService.getLogs(organization_id, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            contact_id: contact_id ? parseInt(contact_id) : undefined,
            action
        });
        res.json(logs);
    } catch (err) {
        console.error('[AutoLabel Controller] Error getting logs:', err);
        res.status(500).json({ error: err.message });
    }
};

// --- GET STATS ---
export const getStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const stats = await autoLabelService.getStats(organization_id);
        res.json(stats);
    } catch (err) {
        console.error('[AutoLabel Controller] Error getting stats:', err);
        res.status(500).json({ error: err.message });
    }
};

// --- GET AVAILABLE CHANNELS ---
export const getChannels = async (req, res) => {
    res.json(autoLabelService.getAvailableChannels());
};