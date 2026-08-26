/**
 * Contact Import Controller
 * Handles CSV import with duplicate detection
 */

import * as importService from '../services/contactImportService.js';

export const importContacts = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { filename, content, duplicate_action } = req.body;

    if (!filename || !content) {
        return res.status(400).json({ error: 'Filename and content are required' });
    }

    try {
        const result = await importService.importContacts(organization_id, userId, {
            filename,
            content,
            duplicate_action: duplicate_action || 'skip'
        });
        res.json(result);
    } catch (error) {
        console.error('[Import] Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getHistory = async (req, res) => {
    const { organization_id } = req.user;
    const { limit } = req.query;

    try {
        const history = await importService.getImportHistory(organization_id, parseInt(limit) || 20);
        res.json(history);
    } catch (error) {
        console.error('[Import] History error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getLog = async (req, res) => {
    const { organization_id } = req.user;
    const { logId } = req.params;

    try {
        const log = await importService.getImportLog(organization_id, parseInt(logId));
        if (!log) {
            return res.status(404).json({ error: 'Import log not found' });
        }
        res.json(log);
    } catch (error) {
        console.error('[Import] Log error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getTemplate = async (req, res) => {
    const sample = 'Name,Phone,Email,Address,Company,Notes\nJohn Doe,081234567890,john@example.com,Jakarta,Toko ABC,VIP Customer';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts_template.csv');
    res.send(sample);
};