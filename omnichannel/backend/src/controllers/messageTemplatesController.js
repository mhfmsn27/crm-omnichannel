/**
 * Message Templates Controller
 */

import * as templatesService from '../services/messageTemplatesService.js';

export const getTemplates = async (req, res) => {
    const { organization_id } = req.user;
    const { type } = req.query;

    try {
        const templates = await templatesService.getTemplates(organization_id, type || null);
        res.json(templates);
    } catch (error) {
        console.error('[Templates] Get error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createTemplate = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { name, template_type, title, description, image_url, buttons, cta_url, cta_text } = req.body;

    if (!name || !template_type) {
        return res.status(400).json({ error: 'Name and template_type are required' });
    }

    try {
        const template = await templatesService.createTemplate(organization_id, userId, {
            name, template_type, title, description, image_url, buttons, cta_url, cta_text
        });
        res.status(201).json(template);
    } catch (error) {
        console.error('[Templates] Create error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateTemplate = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { name, title, description, image_url, buttons, cta_url, cta_text, is_active } = req.body;

    try {
        const updated = await templatesService.updateTemplate(organization_id, parseInt(id), {
            name, title, description, image_url, buttons, cta_url, cta_text, is_active
        });

        if (!updated) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('[Templates] Update error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteTemplate = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        await templatesService.deleteTemplate(organization_id, parseInt(id));
        res.json({ message: 'Template deleted' });
    } catch (error) {
        console.error('[Templates] Delete error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getTemplateTypes = async (req, res) => {
    res.json(templatesService.getTemplateTypes());
};