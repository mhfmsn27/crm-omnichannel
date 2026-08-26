import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isFirebaseInitialized = false;

try {
    // 1. Try Loading from Environment Variable (JSON String)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        isFirebaseInitialized = true;
        console.log('[Firebase] Initialized via Environment Variable.');
    }
    // 2. Try Loading from File
    else {
        const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            // Read and parse manually to ensure it works with ES modules if imports fail
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            isFirebaseInitialized = true;
            console.log('[Firebase] Initialized via serviceAccountKey.json.');
        } else {
            console.warn('[Firebase] Warning: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT env not set. Notifications will not be sent.');
        }
    }
} catch (error) {
    console.error('[Firebase] Initialization Error:', error.message);
}

export { admin, isFirebaseInitialized };
