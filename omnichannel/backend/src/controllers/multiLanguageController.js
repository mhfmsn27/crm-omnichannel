/**
 * Multi-Language Controller
 */

import * as multiLangService from "../services/multiLanguageService.js";

export const getSettings = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const settings = await multiLangService.getLanguageSettings(organization_id);
        res.json(settings);
    } catch (error) {
        console.error('[MultiLang] Settings error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateSettings = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const settings = await multiLangService.updateLanguageSettings(organization_id, req.body);
        res.json(settings);
    } catch (error) {
        console.error('[MultiLang] Update error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const detectLanguage = async (req, res) => {
    const { text } = req.query;

    try {
        const result = multiLangService.detectLanguage(text);
        res.json(result);
    } catch (error) {
        console.error('[MultiLang] Detect error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getLanguages = async (req, res) => {
    res.json(multiLangService.getSupportedLanguages());
};

export const getAnalytics = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const analytics = await multiLangService.getLanguageAnalytics(organization_id);
        res.json(analytics);
    } catch (error) {
        console.error('[MultiLang] Analytics error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Translation endpoints
export const translate = async (req, res) => {
    const { organization_id } = req.user;
    const { text, sourceLang, targetLang } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        const result = await multiLangService.translateText(text, sourceLang || 'auto', targetLang || 'id', organization_id);
        res.json(result);
    } catch (error) {
        console.error('[Translate] error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const translateMessage = async (req, res) => {
    const { organization_id } = req.user;
    const { messageId, targetLang } = req.params;

    try {
        const result = await multiLangService.autoTranslateIncomingMessage(parseInt(messageId), organization_id, targetLang || 'id');
        res.json(result);
    } catch (error) {
        console.error('[Translate] Message error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getTranslationSettings = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const settings = await multiLangService.getTranslationSettings(organization_id);
        res.json(settings);
    } catch (error) {
        console.error('[Translate] Get settings error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateTranslationSettings = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const result = await multiLangService.updateTranslationSettings(organization_id, req.body);
        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('[Translate] Update settings error:', error);
        res.status(500).json({ error: error.message });
    }
};