
import axios from 'axios';
import pool from '../config/db.js';

// Get Xendit Config
const getConfig = async () => {
    const res = await pool.query("SELECT key, value FROM system_settings WHERE group_name = 'xendit'");
    const config = {};
    res.rows.forEach(r => config[r.key] = r.value);

    return {
        apiKey: config.xendit_api_key,
        callbackToken: config.xendit_callback_token,
        baseUrl: 'https://api.xendit.co',
        isConfigured: !!(config.xendit_api_key)
    };
};

// 1. Get Payment Channels (Using Balance or specific endpoint as proxy, or just returning static list for now)
// Xendit doesn't have a direct "payment channels" list endpoint like TriPay that returns exactly what we need for the UI easily without setup.
// We will return a static list of popular Xendit channels or fetch from specific endpoint if needed.
// For now, let's fetch 'available banks' or just rely on manual mapping.
// Actually Xendit has 'v2/available_virtual_account_banks'.
export const getPaymentChannels = async () => {
    const config = await getConfig();
    if (!config.isConfigured) throw new Error("Xendit credentials not configured");

    try {
        const response = await axios.get(`${config.baseUrl}/available_virtual_account_banks`, {
            auth: { username: config.apiKey, password: '' }
        });

        // Map to standard format
        return response.data.map(bank => ({
            code: bank.code,
            name: bank.name,
            type: 'VA',
            group: 'Virtual Account',
            fee: 4500 // Estimate or fetch?
        }));
    } catch (error) {
        throw new Error(error.response?.data?.message || "Failed to fetch Xendit channels");
    }
};

// 2. Create Invoice
export const createInvoice = async (data) => {
    // data: { external_id, amount, payer_email, description, items, success_redirect_url }
    const config = await getConfig();
    if (!config.isConfigured) throw new Error("Xendit credentials not configured");

    const payload = {
        external_id: data.external_id,
        amount: data.amount,
        payer_email: data.payer_email,
        description: data.description,
        invoice_duration: data.invoice_duration || 86400,
        success_redirect_url: data.success_redirect_url,
        failure_redirect_url: data.failure_redirect_url,
        items: data.items,
        currency: 'IDR'
    };

    try {
        const response = await axios.post(`${config.baseUrl}/v2/invoices`, payload, {
            auth: { username: config.apiKey, password: '' }
        });
        return response.data; // contains invoice_url
    } catch (error) {
        console.error("[Xendit] Create Invoice Error:", error.response?.data);
        throw new Error(error.response?.data?.message || "Failed to create Xendit invoice");
    }
};

// 3. Validate Callback
export const validateCallback = async (req) => {
    const config = await getConfig();
    const xenditToken = req.headers['x-callback-token'];

    // If a callback token is set in settings, verify it.
    // Xendit sends this token in headers.
    if (config.callbackToken && xenditToken !== config.callbackToken) {
        return { isValid: false };
    }

    return {
        isValid: true,
        data: req.body
    };
};
