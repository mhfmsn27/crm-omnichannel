
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const DOKU_CLIENT_ID = process.env.DOKU_CLIENT_ID || 'BRN-0238-1768603383904';
const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY || 'SK-ivVMLWVwqHM9T3wvDbr6';
const TARGET_PATH = '/webhook/doku';
// Priority: APP_URL (from .env) -> localhost:8998
const BASE_URL = process.env.APP_URL || 'http://localhost:8998';

console.log('Testing DOKU Webhook with config:', {
    clientId: DOKU_CLIENT_ID,
    secretKey: DOKU_SECRET_KEY ? '******' : 'MISSING',
    url: BASE_URL + TARGET_PATH
});

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

const generateSignature = (clientId, requestId, requestTimestamp, requestTarget, digest, secretKey) => {
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

const runTest = async () => {
    const payload = {
        transaction: { status: 'SUCCESS', date: new Date().toISOString() },
        order: { invoice_number: 'INV-TEST-SIGNATURE-VERIFY', amount: 10000 }
    };

    const requestId = crypto.randomUUID().replace(/-/g, '');
    const requestTimestamp = new Date().toISOString().slice(0, 19) + "Z";

    // Convert payload to string strictly for signature generation
    // In a real scenario, the raw body sent over network is what matters.
    // Axios transforms valid objects to JSON string automatically.
    // To properly simulate, we should manually verify that the string we sign IS the string that gets sent.
    // However, Axios serialization is standard JSON.stringify.
    const rawBody = JSON.stringify(payload);

    const digest = generateDigest(rawBody);
    const signature = generateSignature(
        DOKU_CLIENT_ID,
        requestId,
        requestTimestamp,
        TARGET_PATH,
        digest,
        DOKU_SECRET_KEY
    );

    try {
        console.log('Sending request...');
        // We send the object 'payload', axios will JSON.stringify it.
        // Our backend should receive it, capture the raw body (which matches JSON.stringify(payload)),
        // and verify successfully.
        const response = await axios.post(`${BASE_URL}${TARGET_PATH}`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Client-Id': DOKU_CLIENT_ID,
                'Request-Id': requestId,
                'Request-Timestamp': requestTimestamp,
                'Signature': signature
            }
        });
        console.log('Response Status:', response.status);
        console.log('Response Data:', response.data);
        if (response.status === 200) {
            console.log('SUCCESS: Signature verified and request accepted.');
        } else {
            console.log('FAILED: Request accepted but status code unexpected.');
        }
    } catch (error) {
        if (error.response) {
            console.log('FAILED with Status:', error.response.status);
            console.log('Data:', error.response.data);
        } else {
            console.log('Error:', error.message);
            console.log('Full Error:', error);
        }
    }
};

runTest();
