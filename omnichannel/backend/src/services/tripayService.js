
import axios from 'axios';
import crypto from 'crypto';
import pool from '../config/db.js';

// Get TriPay Config from DB
const getConfig = async () => {
    const res = await pool.query("SELECT key, value FROM system_settings WHERE group_name = 'tripay'");
    const config = {};
    res.rows.forEach(r => config[r.key] = r.value);
    
    const isProduction = config.tripay_mode === 'production';
    return {
        apiKey: config.tripay_api_key,
        privateKey: config.tripay_private_key,
        merchantCode: config.tripay_merchant_code,
        baseUrl: isProduction ? 'https://tripay.co.id/api' : 'https://tripay.co.id/api-sandbox',
        isConfigured: !!(config.tripay_api_key && config.tripay_private_key && config.tripay_merchant_code)
    };
};

// Generate Signature for Request
const generateSignature = (privateKey, merchantCode, merchantRef, amount) => {
    const signature = crypto.createHmac('sha256', privateKey)
        .update(merchantCode + merchantRef + amount)
        .digest('hex');
    return signature;
};

// 1. Get Payment Channels (Untuk Sync ke Database Lokal)
export const getPaymentChannels = async () => {
    const config = await getConfig();
    if (!config.isConfigured) throw new Error("TriPay credentials not configured");

    try {
        const response = await axios.get(`${config.baseUrl}/merchant/payment-channel`, {
            headers: { 'Authorization': `Bearer ${config.apiKey}` }
        });
        return response.data.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || "Failed to fetch TriPay channels");
    }
};

// 2. Request Transaction
export const requestTransaction = async (data) => {
    // data: { method, merchant_ref, amount, customer_name, customer_email, customer_phone, order_items, return_url }
    const config = await getConfig();
    if (!config.isConfigured) throw new Error("TriPay credentials not configured");

    const signature = generateSignature(config.privateKey, config.merchantCode, data.merchant_ref, data.amount);
    
    const payload = {
        method: data.method, // e.g., 'BRIVA', 'ALFAMART'
        merchant_ref: data.merchant_ref,
        amount: data.amount,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        order_items: data.order_items,
        return_url: data.return_url,
        expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        signature: signature
    };

    try {
        const response = await axios.post(`${config.baseUrl}/transaction/create`, payload, {
            headers: { 'Authorization': `Bearer ${config.apiKey}` }
        });
        return response.data.data; // contains checkout_url, pay_code, etc.
    } catch (error) {
        console.error("[TriPay] Request Error:", error.response?.data);
        throw new Error(error.response?.data?.message || "Failed to create TriPay transaction");
    }
};

// 3. Validate Callback Signature
export const validateCallback = async (req) => {
    const config = await getConfig();
    const tripaySignature = req.headers['x-callback-signature'];
    const jsonBody = JSON.stringify(req.body);

    const mySignature = crypto.createHmac('sha256', config.privateKey)
        .update(jsonBody)
        .digest('hex');

    return {
        isValid: mySignature === tripaySignature,
        data: req.body
    };
};

