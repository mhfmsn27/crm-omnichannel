
import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const DOKU_CLIENT_ID = process.env.DOKU_CLIENT_ID || 'MCH-0000-TEST'; // Ganti dengan Client ID Anda
const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY || 'SK-TEST-123'; // Ganti dengan Secret Key Anda
const DOKU_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://api.doku.com'
    : 'https://api-sandbox.doku.com';

// Helper: Sanitize String for DOKU
// Allowed: a-z A-Z 0-9 . - / + , = _ : ' @ and Space
const sanitizeDoku = (str) => {
    if (!str) return "";
    // Replace invalid chars with space, then collapse multiple spaces
    return String(str)
        .replace(/[^a-zA-Z0-9.\-\/\+,=_:'@\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

// Generate Random Request ID
const generateRequestId = () => {
    return crypto.randomUUID().replace(/-/g, '');
};

// Generate Digest (SHA256 Base64 of Body)
const generateDigest = (body) => {
    let bodyString;
    if (typeof body === 'string') {
        bodyString = body;
    } else {
        bodyString = JSON.stringify(body);
    }
    const hash = crypto.createHash('sha256').update(bodyString, 'utf-8').digest();
    return hash.toString('base64');
};

// Generate Signature
const generateSignature = (clientId, requestId, requestTimestamp, requestTarget, digest, secretKey) => {
    // Format: Client-Id|Request-Id|Request-Timestamp|Request-Target|Digest
    const component =
        `Client-Id:${clientId}\n` +
        `Request-Id:${requestId}\n` +
        `Request-Timestamp:${requestTimestamp}\n` +
        `Request-Target:${requestTarget}\n` +
        `Digest:${digest}`;

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(component);
    return `HMACSHA256=${hmac.digest('base64')}`;
};

// Verify Notification Signature
export const verifyNotificationSignature = (headers, body, targetPath) => {
    const clientId = headers['client-id'];
    const requestId = headers['request-id'];
    const timestamp = headers['request-timestamp'];
    const signature = headers['signature'];

    if (!clientId || !requestId || !timestamp || !signature) return false;

    const digest = generateDigest(body);
    const calculatedSignature = generateSignature(
        clientId,
        requestId,
        timestamp,
        targetPath,
        digest,
        DOKU_SECRET_KEY
    );

    return signature === calculatedSignature;
};

// Initiate Payment (DOKU Checkout)
export const initiatePayment = async (invoiceNumber, amount, customer, items) => {
    const requestTarget = '/checkout/v1/payment';
    const requestId = generateRequestId();
    const requestTimestamp = new Date().toISOString().slice(0, 19) + "Z";

    // Sanitize Inputs
    const safeInvoice = sanitizeDoku(invoiceNumber);
    const safeName = sanitizeDoku(customer.name).substring(0, 50); // Limit length
    const safeItems = items.map(item => ({
        ...item,
        name: sanitizeDoku(item.name).substring(0, 60) // Ensure item name is safe and not too long
    }));

    const requestBody = {
        order: {
            amount: amount,
            invoice_number: safeInvoice,
            currency: "IDR",
            callback_url: `${process.env.APP_URL}/inbox`,
            callback_url_cancel: `${process.env.APP_URL}/billing/checkout`,
            auto_redirect: true,
            line_items: safeItems
        },
        payment: {
            payment_due_date: 60 // 60 minutes
        },
        customer: {
            id: customer.id.toString(),
            name: safeName,
            email: customer.email,
            phone: customer.phone || '081234567890'
        }
    };

    const digest = generateDigest(requestBody);
    const signature = generateSignature(
        DOKU_CLIENT_ID,
        requestId,
        requestTimestamp,
        requestTarget,
        digest,
        DOKU_SECRET_KEY
    );

    try {
        const response = await axios.post(`${DOKU_BASE_URL}${requestTarget}`, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Client-Id': DOKU_CLIENT_ID,
                'Request-Id': requestId,
                'Request-Timestamp': requestTimestamp,
                'Signature': signature
            }
        });

        return response.data;
    } catch (error) {
        console.error("DOKU API Error:", JSON.stringify(error.response?.data, null, 2));
        throw new Error(error.response?.data?.error?.message || "Payment initiation failed");
    }
};
