/**
 * Base Gateway Adapter
 * All payment gateway adapters must extend this class
 */
export default class GatewayAdapter {
    constructor(config) {
        this.config = config;
    }

    /**
     * Create a payment link/invoice on the gateway
     * @param {Object} data - { external_id, amount, description, customer_name, customer_email, customer_phone, items, success_redirect_url }
     * @returns {Promise<{ payment_url: string, gateway_invoice_id: string }>}
     */
    async createPaymentLink(data) {
        throw new Error('createPaymentLink() must be implemented by adapter');
    }

    /**
     * Validate incoming webhook from gateway
     * @param {Object} req - Express request object
     * @returns {Promise<{ isValid: boolean, status: string, amount: number, externalId: string }>}
     */
    async validateWebhook(req) {
        throw new Error('validateWebhook() must be implemented by adapter');
    }

    /**
     * Get available payment methods for this gateway
     * @returns {string[]}
     */
    getAvailableMethods() {
        return [];
    }

    /**
     * Get gateway display name
     * @returns {string}
     */
    getDisplayName() {
        return 'Unknown Gateway';
    }
}
