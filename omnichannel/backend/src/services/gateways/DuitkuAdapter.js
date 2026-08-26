/**
 * Duitku Payment Gateway Adapter
 * Uses Duitku API v2 for payment creation
 */
import axios from 'axios';
import crypto from 'crypto';
import GatewayAdapter from './GatewayAdapter.js';

export default class DuitkuAdapter extends GatewayAdapter {
    constructor(config) {
        super(config);
        const isProduction = config.is_production === true || config.is_production === 'true';
        this.baseUrl = isProduction
            ? 'https://passport.duitku.com/webapi/api/merchant'
            : 'https://sandbox.duitku.com/webapi/api/merchant';
        this.merchantCode = config.merchant_code;
        this.apiKey = config.api_key;
    }

    async createPaymentLink(data) {
        const datetime = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const signature = crypto.createHash('md5')
            .update(this.merchantCode + data.external_id + String(data.amount) + this.apiKey)
            .digest('hex');

        const payload = {
            merchantCode: this.merchantCode,
            paymentAmount: data.amount,
            merchantOrderId: data.external_id,
            productDetails: data.description || 'Invoice Payment',
            customerVaName: data.customer_name || 'Customer',
            email: data.customer_email || `noreply+${data.external_id}@crmhub.id`,
            phoneNumber: data.customer_phone || '08000000000',
            itemDetails: data.items || [{
                name: data.description,
                quantity: 1,
                price: data.amount
            }],
            returnUrl: data.success_redirect_url || '',
            callbackUrl: data.callback_url || '',
            signature,
            expiryPeriod: 1440 // 24 hours in minutes
        };

        try {
            const response = await axios.post(`${this.baseUrl}/v2/inquiry`, payload, {
                headers: { 'Content-Type': 'application/json' }
            });
            return {
                payment_url: response.data.paymentUrl,
                gateway_invoice_id: response.data.reference
            };
        } catch (error) {
            console.error('[DuitkuAdapter] Create error:', error.response?.data);
            throw new Error(error.response?.data?.Message || 'Failed to create Duitku transaction');
        }
    }

    async validateWebhook(req) {
        const { merchantCode, amount, merchantOrderId, resultCode } = req.body;

        // Verify signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
        const expectedSignature = crypto.createHash('md5')
            .update(merchantCode + String(amount) + merchantOrderId + this.apiKey)
            .digest('hex');

        const receivedSignature = req.body.signature;
        if (receivedSignature !== expectedSignature) {
            return { isValid: false };
        }

        let status = 'pending';
        if (resultCode === '00') status = 'paid';
        else if (resultCode === '01') status = 'expired';
        else if (resultCode === '02') status = 'failed';

        return {
            isValid: true,
            status,
            amount: parseInt(amount) || 0,
            externalId: merchantOrderId,
            rawData: req.body
        };
    }

    getAvailableMethods() {
        return ['va', 'ewallet', 'qris', 'retail', 'credit_card'];
    }

    getDisplayName() {
        return 'Duitku';
    }
}
