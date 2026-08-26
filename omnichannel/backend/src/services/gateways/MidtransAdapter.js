/**
 * Midtrans Payment Gateway Adapter
 * Uses Midtrans Snap API for payment links
 */
import axios from 'axios';
import crypto from 'crypto';
import GatewayAdapter from './GatewayAdapter.js';

export default class MidtransAdapter extends GatewayAdapter {
    constructor(config) {
        super(config);
        const isProduction = config.is_production === true || config.is_production === 'true';
        this.baseUrl = isProduction
            ? 'https://app.midtrans.com/snap/v1'
            : 'https://app.sandbox.midtrans.com/snap/v1';
        this.coreUrl = isProduction
            ? 'https://api.midtrans.com/v2'
            : 'https://api.sandbox.midtrans.com/v2';
        this.serverKey = config.server_key;
        this.clientKey = config.client_key;
    }

    async createPaymentLink(data) {
        const payload = {
            transaction_details: {
                order_id: data.external_id,
                gross_amount: data.amount
            },
            item_details: data.items || [{ 
                id: 'item-1', 
                name: data.description, 
                quantity: 1, 
                price: data.amount 
            }],
            customer_details: {
                first_name: data.customer_name || 'Customer',
                email: data.customer_email || undefined,
                phone: data.customer_phone || undefined
            },
            callbacks: {
                finish: data.success_redirect_url || undefined
            }
        };

        try {
            const auth = Buffer.from(this.serverKey + ':').toString('base64');
            const response = await axios.post(`${this.baseUrl}/transactions`, payload, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            return {
                payment_url: response.data.redirect_url,
                gateway_invoice_id: response.data.token
            };
        } catch (error) {
            console.error('[MidtransAdapter] Create error:', error.response?.data);
            throw new Error(error.response?.data?.error_messages?.[0] || 'Failed to create Midtrans transaction');
        }
    }

    async validateWebhook(req) {
        const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = req.body;

        // Verify signature: SHA512(order_id + status_code + gross_amount + serverKey)
        const expectedSignature = crypto
            .createHash('sha512')
            .update(order_id + status_code + gross_amount + this.serverKey)
            .digest('hex');

        if (signature_key !== expectedSignature) {
            return { isValid: false };
        }

        let status = 'pending';
        if (transaction_status === 'capture' || transaction_status === 'settlement') {
            if (fraud_status === 'accept' || !fraud_status) {
                status = 'paid';
            }
        } else if (transaction_status === 'expire' || transaction_status === 'cancel') {
            status = 'expired';
        } else if (transaction_status === 'deny') {
            status = 'failed';
        }

        return {
            isValid: true,
            status,
            amount: parseInt(gross_amount) || 0,
            externalId: order_id,
            rawData: req.body
        };
    }

    getAvailableMethods() {
        return ['va', 'ewallet', 'qris', 'credit_card', 'cstore'];
    }

    getDisplayName() {
        return 'Midtrans';
    }
}
