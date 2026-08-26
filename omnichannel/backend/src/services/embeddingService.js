import axios from 'axios';

const MODEL_NAME = 'models/text-embedding-004';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL_NAME}:embedContent`;

/**
 * Generates a vector embedding for the given text using Gemini REST API.
 * @param {string} text 
 * @param {string} apiKey - Google Gemini API Key (BYOK)
 * @returns {Promise<number[]>} Array of 768 floats
 */
export const generateEmbedding = async (text, apiKey) => {
    try {
        if (!text || text.trim() === '') return null;
        if (!apiKey) throw new Error("API Key is required for embedding");

        // Using REST API directly to avoid SDK version conflicts/bugs with embedding
        const response = await axios.post(
            `${API_URL}?key=${apiKey}`,
            {
                model: MODEL_NAME,
                content: {
                    parts: [{ text: text }]
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data && response.data.embedding && response.data.embedding.values) {
            return response.data.embedding.values;
        }
        
        console.error("[EmbeddingService] Unexpected response structure:", JSON.stringify(response.data));
        return null;

    } catch (error) {
        // Log detailed error from Axios if available
        const msg = error.response?.data?.error?.message || error.message;
        console.error("[EmbeddingService] Error:", msg);
        return null;
    }
};

/**
 * Format a JS array to PostgreSQL vector string format '[1.2, 3.4, ...]'
 * @param {number[]} embedding 
 * @returns {string}
 */
export const toSqlVector = (embedding) => {
    if (!embedding) return null;
    return `[${embedding.join(',')}]`;
};