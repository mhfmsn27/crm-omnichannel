/**
 * Xendit Payment Gateway Adapter
 */
import axios from 'axios';
import GatewayAdapter from './GatewayAdapter.js';

export default class XenditAdapter extends GatewayAdapter {
    constructor(config) {
        super(config);
        this.baseUrl = 'https://api.xendit.co';
        this.apiKey = config.api_key;
        this.callbackToken = config.callback_token || '';
    }

    async createPaymentLink(data) {
        const payload = {
            external_id: data.external_id,
            amount: data.amount,
            payer_email: data.customer_email || `noreply+${data.external_id}@crmhub.id`,
            description: data.description,
            invoice_duration: data.duration || 86400,
            success_redirect_url: data.success_redirect_url,
            failure_redirect_url: data.failure_redirect_url,
            items: data.items || [{ name: data.description, quantity: 1, price: data.amount }],
            customer: {
                given_names: data.customer_name || 'Customer',
                mobile_number: data.customer_phone || undefined,
                email: data.customer_email || undefined,
            },
            currency: 'IDR'
        };

        try {
            const response = await axios.post(`${this.baseUrl}/v2/invoices`, payload, {
                auth: { username: this.apiKey, password: '' }
            });
            return {
                payment_url: response.data.invoice_url,
                gateway_invoice_id: response.data.id
            };
        } catch (error) {
            console.error('[XenditAdapter] Create error:', error.response?.data);
            throw new Error(error.response?.data?.message || 'Failed to create Xendit invoice');
        }
    }

    async validateWebhook(req) {
        const xenditToken = req.headers['x-callback-token'];

        // If callback token is configured, verify it
        if (this.callbackToken && xenditToken !== this.callbackToken) {
            return { isValid: false };
        }

        const { external_id, status, amount } = req.body;
        const isPaid = status === 'PAID' || status === 'SETTLED';
        const isExpired = status === 'EXPIRED';

        return {
            isValid: true,
            status: isPaid ? 'paid' : isExpired ? 'expired' : status?.toLowerCase(),
            amount: parseInt(amount) || 0,
            externalId: external_id,
            rawData: req.body
        };
    }

    getAvailableMethods() {
        return ['va', 'ewallet', 'qris', 'retail', 'credit_card'];
    }

    getDisplayName() {
        return 'Xendit';
    }
}
