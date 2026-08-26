/**
 * Auto Archive Controller
 */

import * as autoArchiveService from '../services/autoArchiveService.js';

export const getSettings = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const settings = await autoArchiveService.getSettings(organization_id);
        res.json(settings);
    } catch (error) {
        console.error('[AutoArchive] Get error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
};

export const updateSettings = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const settings = await autoArchiveService.updateSettings(organization_id, req.body);
        res.json(settings);
    } catch (error) {
        console.error('[AutoArchive] Update error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

export const getConversationsToArchive = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const conversations = await autoArchiveService.getConversationsToArchive({ organizationId: organization_id });
        res.json(conversations);
    } catch (error) {
        console.error('[AutoArchive] Get conversations error:', error);
        res.status(500).json({ error: 'Failed to get conversations' });
    }
};

export const archiveConversation = async (req, res) => {
    const { organization_id } = req.user;
    const { conversationId } = req.params;

    try {
        await autoArchiveService.archiveConversation(organization_id, parseInt(conversationId));
        res.json({ success: true, message: 'Conversation archived' });
    } catch (error) {
        console.error('[AutoArchive] Archive error:', error);
        res.status(500).json({ error: 'Failed to archive conversation' });
    }
};

export const runAutoArchive = async (req, res) => {
    const { organization_id } = req.user;

    try {
        // Get settings
        const settings = await autoArchiveService.getSettings(organization_id);

        if (!settings?.auto_archive_enabled) {
            return res.json({ success: true, message: 'Auto archive is disabled', archived: 0 });
        }

        // Get conversations to archive
        const conversations = await autoArchiveService.getConversationsToArchive({
            organizationId: organization_id,
            limit: 100
        });

        let archivedCount = 0;

        for (const conv of conversations) {
            const success = await autoArchiveService.archiveConversation(organization_id, conv.id);
            if (success) archivedCount++;
        }

        res.json({
            success: true,
            message: `Archived ${archivedCount} conversations`,
            archived: archivedCount
        });
    } catch (error) {
        console.error('[AutoArchive] Run error:', error);
        res.status(500).json({ error: 'Failed to run auto archive' });
    }
};