/**
 * Chatbot Training Controller
 */

import * as trainingService from '../services/chatbotTrainingService.js';

export const getTrainingData = async (req, res) => {
    const { organization_id } = req.user;
    const { type, active } = req.query;

    try {
        const data = await trainingService.getTrainingData(organization_id, {
            type,
            active: active === 'true' ? true : active === 'false' ? false : undefined
        });
        res.json(data);
    } catch (error) {
        console.error('[Training] Get error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const addTrainingData = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { data_type, question, answer, keywords, category, confidence_score } = req.body;

    if (!question || !answer) {
        return res.status(400).json({ error: 'Question and answer are required' });
    }

    try {
        const item = await trainingService.addTrainingData(organization_id, userId, {
            data_type: data_type || 'faq',
            question,
            answer,
            keywords,
            category,
            confidence_score
        });
        res.status(201).json(item);
    } catch (error) {
        console.error('[Training] Add error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateTrainingData = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { question, answer, keywords, category, is_active, confidence_score } = req.body;

    try {
        const item = await trainingService.updateTrainingData(organization_id, parseInt(id), {
            question,
            answer,
            keywords,
            category,
            is_active,
            confidence_score
        });

        if (!item) {
            return res.status(404).json({ error: 'Training data not found' });
        }

        res.json(item);
    } catch (error) {
        console.error('[Training] Update error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteTrainingData = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        await trainingService.deleteTrainingData(organization_id, parseInt(id));
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error('[Training] Delete error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const bulkImport = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required' });
    }

    try {
        const result = await trainingService.bulkImport(organization_id, userId, items);
        res.json(result);
    } catch (error) {
        console.error('[Training] Bulk import error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getStats = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const stats = await trainingService.getTrainingStats(organization_id);
        res.json(stats);
    } catch (error) {
        console.error('[Training] Stats error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const testTraining = async (req, res) => {
    const { organization_id } = req.user;
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const context = await trainingService.getTrainingContext(organization_id, message);
        res.json({
            message,
            context: context?.context || null,
            matchedItems: context?.matchedItems || 0
        });
    } catch (error) {
        console.error('[Training] Test error:', error);
        res.status(500).json({ error: error.message });
    }
};