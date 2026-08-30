#!/usr/bin/env node
/**
 * Author CLI Tool: CRMHUB RSA-2048 License Generator
 * Usage:
 *   node scripts/generate-license.js tokosaya.com --client="PT Klien Maju"
 *   node scripts/generate-license.js --generate-keys
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEYS_DIR = path.resolve(__dirname, 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'license_private.key');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'license_public.key');

// Ensure keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
}

// Function to generate RSA-2048 keypair if not exists
export function ensureKeypair() {
    if (!fs.existsSync(PRIVATE_KEY_PATH) || !fs.existsSync(PUBLIC_KEY_PATH)) {
        console.log('\n🔑 Generating new RSA-2048 Keypair...');
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, 'utf-8');
        fs.writeFileSync(PUBLIC_KEY_PATH, publicKey, 'utf-8');
        console.log('✅ Keys generated successfully:');
        console.log(`   - Private Key (KEEP SECRET): ${PRIVATE_KEY_PATH}`);
        console.log(`   - Public Key (Embedded): ${PUBLIC_KEY_PATH}\n`);
    }

    return {
        privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8'),
        publicKey: fs.readFileSync(PUBLIC_KEY_PATH, 'utf-8')
    };
}

// Function to sign a domain
export function signDomain(domain, privateKey) {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0].toLowerCase().trim();
    
    // Sign the normalized domain string
    const signer = crypto.createSign('sha256');
    signer.update(Buffer.from(cleanDomain));
    signer.end();
    
    const signature = signer.sign(privateKey, 'base64');
    return {
        domain: cleanDomain,
        signature
    };
}

// Function to verify signature with public key
export function verifyDomainSignature(domain, signature, publicKey) {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0].toLowerCase().trim();
    const verifier = crypto.createVerify('sha256');
    verifier.update(Buffer.from(cleanDomain));
    verifier.end();
    
    return verifier.verify(publicKey, Buffer.from(signature, 'base64'));
}

// CLI Execution
const args = process.argv.slice(2);

if (args.includes('--generate-keys')) {
    ensureKeypair();
    process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith('generate-license.js') && args.length > 0) {
    const rawDomain = args.find(a => !a.startsWith('--'));
    if (!rawDomain) {
        console.error('❌ Error: Harap masukkan nama domain. Contoh: node scripts/generate-license.js tokosaya.com');
        process.exit(1);
    }

    const clientArg = args.find(a => a.startsWith('--client='));
    const clientName = clientArg ? clientArg.split('=')[1].replace(/"/g, '') : 'Official Client';

    const { privateKey, publicKey } = ensureKeypair();
    const { domain, signature } = signDomain(rawDomain, privateKey);
    
    const isValid = verifyDomainSignature(domain, signature, publicKey);
    if (!isValid) {
        console.error('❌ Error: Internal signature verification failed!');
        process.exit(1);
    }

    const licenseKey = `CRMHUB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    console.log('\n================================================================');
    console.log('🛡️ CRMHUB RSA-2048 LICENSE GENERATOR (AUTHOR TOOL)');
    console.log('================================================================');
    console.log(`🌐 Target Domain : ${domain}`);
    console.log(`👤 Client Name   : ${clientName}`);
    console.log(`🔑 License Key   : ${licenseKey}`);
    console.log(`🔏 RSA Signature : ${signature}`);
    console.log('----------------------------------------------------------------');
    console.log('📋 BARIS CSV UNTUK DI-PASTE KE GOOGLE SHEETS (Baris Baru):');
    console.log('----------------------------------------------------------------');
    console.log(`${domain},${licenseKey},"${signature}","${clientName}"`);
    console.log('================================================================\n');
}
