/**
 * Message Archive Controller
 * Handles message archival operations
 */

import pool from '../config/db.js';
import * as archiveService from '../services/messageArchiveService.js';

export const archiveConversation = async (req, res) => {
    const { conversationId } = req.params;
    const { organization_id } = req.user;
    const { older_than_days } = req.query;

    try {
        const archiveDate = older_than_days
            ? new Date(Date.now() - parseInt(older_than_days) * 24 * 60 * 60 * 1000)
            : null;

        const result = await archiveService.archiveConversationMessages(parseInt(conversationId), archiveDate);

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const restoreArchived = async (req, res) => {
    const { conversationId } = req.params;
    const { organization_id } = req.user;

    try {
        const result = await archiveService.restoreArchivedMessages(parseInt(conversationId));
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getArchived = async (req, res) => {
    const { conversationId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    const { organization_id } = req.user;

    try {
        const result = await archiveService.getArchivedMessages(
            parseInt(conversationId),
            parseInt(limit),
            parseInt(offset)
        );
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getStats = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const stats = await archiveService.getArchiveStats(organization_id);
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const runAutoArchive = async (req, res) => {
    const { organization_id } = req.user;
    const { days = 90 } = req.query;

    try {
        const archiveDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
        const result = await archiveService.archiveConversationMessages(null, archiveDate);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
