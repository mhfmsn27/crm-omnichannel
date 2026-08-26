import pool from '../config/db.js';
import { generateResponse as generateResponseGemini } from './geminiService.js';
import { generateResponseOpenAI } from './openaiService.js';
import { generateResponseOpenRouter } from './openrouterService.js';

/**
 * Unified AI response generator.
 * Reads the organization's ai_provider setting and routes to the correct provider.
 *
 * @param {number} orgId
 * @param {string} userMessage
 * @param {Array}  chatHistory
 * @param {Object} botConfig
 * @param {string} extraContext
 * @param {Object} contactInfo
 */
export const generateResponse = async (orgId, userMessage, chatHistory, botConfig, extraContext = "", contactInfo = {}) => {
    try {
        const orgRes = await pool.query('SELECT ai_provider FROM organizations WHERE id = $1', [orgId]);
        const provider = orgRes.rows[0]?.ai_provider || 'gemini';

        if (provider === 'openai') {
            return generateResponseOpenAI(orgId, userMessage, chatHistory, botConfig, extraContext, contactInfo);
        } else if (provider === 'openrouter') {
            return generateResponseOpenRouter(orgId, userMessage, chatHistory, botConfig, extraContext, contactInfo);
        }
        return generateResponseGemini(orgId, userMessage, chatHistory, botConfig, extraContext, contactInfo);
    } catch (error) {
        console.error('[AIService] Fatal error routing provider:', error?.message || error);
        return '[ESCALATE]';
    }
};
