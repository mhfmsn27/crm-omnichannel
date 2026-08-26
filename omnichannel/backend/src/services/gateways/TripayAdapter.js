/**
 * TriPay Payment Gateway Adapter
 * Uses TriPay Closed Transaction API
 */
import axios from 'axios';
import crypto from 'crypto';
import GatewayAdapter from './GatewayAdapter.js';

export default class TripayAdapter extends GatewayAdapter {
    constructor(config) {
        super(config);
        const isProduction = config.is_production === true || config.is_production === 'true';
        this.baseUrl = isProduction
            ? 'https://tripay.co.id/api'
            : 'https://tripay.co.id/api-sandbox';
        this.apiKey = config.api_key;
        this.privateKey = config.private_key;
        this.merchantCode = config.merchant_code;
    }

    async createPaymentLink(data) {
        const signature = crypto.createHmac('sha256', this.privateKey)
            .update(this.merchantCode + data.external_id + String(data.amount))
            .digest('hex');

        const payload = {
            method: data.payment_method || 'BRIVA', // Default to BRI VA if no method specified
            merchant_ref: data.external_id,
            amount: data.amount,
            customer_name: data.customer_name || 'Customer',
            customer_email: data.customer_email || `noreply+${data.external_id}@crmhub.id`,
            customer_phone: data.customer_phone || '08000000000',
            order_items: data.items || [{
                name: data.description,
                quantity: 1,
                price: data.amount,
                sku: 'INV-ITEM'
            }],
            return_url: data.success_redirect_url,
            expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
            signature
        };

        try {
            const response = await axios.post(`${this.baseUrl}/transaction/create`, payload, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });
            return {
                payment_url: response.data.data.checkout_url,
                gateway_invoice_id: response.data.data.reference
            };
        } catch (error) {
            console.error('[TripayAdapter] Create error:', error.response?.data);
            throw new Error(error.response?.data?.message || 'Failed to create TriPay transaction');
        }
    }

    async validateWebhook(req) {
        const tripaySignature = req.headers['x-callback-signature'];
        const jsonBody = JSON.stringify(req.body);

        const expectedSignature = crypto.createHmac('sha256', this.privateKey)
            .update(jsonBody)
            .digest('hex');

        if (tripaySignature !== expectedSignature) {
            return { isValid: false };
        }

        const { merchant_ref, status, total_amount } = req.body;
        let normalizedStatus = 'pending';
        if (status === 'PAID') normalizedStatus = 'paid';
        else if (status === 'EXPIRED' || status === 'FAILED') normalizedStatus = 'expired';

        return {
            isValid: true,
            status: normalizedStatus,
            amount: parseInt(total_amount) || 0,
            externalId: merchant_ref,
            rawData: req.body
        };
    }

    getAvailableMethods() {
        return ['va', 'ewallet', 'qris', 'retail'];
    }

    getDisplayName() {
        return 'TriPay';
    }
}
