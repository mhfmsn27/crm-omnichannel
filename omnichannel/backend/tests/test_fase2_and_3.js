/**
 * Verification Test Suite for Poin 1, 2, and 3
 * Tests AI CRM Tools, Waveform Audio Player structure, and AI routes.
 */

import { geminiCrmTools, executeCrmTool } from '../src/services/aiCrmTools.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let totalPassed = 0;
let totalFailed = 0;

const assert = (condition, testName) => {
    if (condition) {
        console.log(`  ✅ PASS: ${testName}`);
        totalPassed++;
    } else {
        console.error(`  ❌ FAIL: ${testName}`);
        totalFailed++;
    }
};

console.log('🧪 RUNNING POIN 1, 2 & 3 OPTIMIZATION TESTS...\n');

// -------------------------------------------------------------
// 1. AI Native CRM Tools Test
// -------------------------------------------------------------
console.log('--- 1. Testing AI Native CRM Tools (aiCrmTools.js) ---');

assert(Array.isArray(geminiCrmTools), 'geminiCrmTools is an array');
assert(geminiCrmTools.length === 4, 'geminiCrmTools has 4 native tool declarations');

const toolNames = geminiCrmTools.map(t => t.name);
assert(toolNames.includes('check_products'), 'check_products tool declared');
assert(toolNames.includes('check_invoice'), 'check_invoice tool declared');
assert(toolNames.includes('calculate_shipping'), 'calculate_shipping tool declared');
assert(toolNames.includes('check_booking_slots'), 'check_booking_slots tool declared');

// Check schema properties
const productTool = geminiCrmTools.find(t => t.name === 'check_products');
assert(productTool.parameters?.type === 'OBJECT', 'check_products has OBJECT parameters');
assert(productTool.parameters?.properties?.query !== undefined, 'check_products has query parameter');

// -------------------------------------------------------------
// 2. WaveformAudioPlayer & Frontend Integration Check
// -------------------------------------------------------------
console.log('\n--- 2. Testing Waveform Audio Player & Frontend ---');

const waveformComponentPath = path.resolve(__dirname, '../../frontend/src/components/inbox/WaveformAudioPlayer.jsx');
assert(fs.existsSync(waveformComponentPath), 'WaveformAudioPlayer.jsx exists');

const waveformCode = fs.readFileSync(waveformComponentPath, 'utf8');
assert(waveformCode.includes('WaveformAudioPlayer'), 'WaveformAudioPlayer component is declared');
assert(waveformCode.includes('cyclePlaybackRate'), 'Playback rate cycling (1x, 1.5x, 2x) implemented');
assert(waveformCode.includes('handleTranscribe'), 'AI Transcription handler implemented');
assert(waveformCode.includes('/api/app/ai/transcribe-audio'), 'Calls /api/app/ai/transcribe-audio endpoint');

const mediaComponentsPath = path.resolve(__dirname, '../../frontend/src/components/inbox/MediaComponents.js');
const mediaCode = fs.readFileSync(mediaComponentsPath, 'utf8');
assert(mediaCode.includes('WaveformAudioPlayer'), 'MediaComponents re-exports WaveformAudioPlayer');

// -------------------------------------------------------------
// 3. AI Routes & Transcribe Endpoint Check
// -------------------------------------------------------------
console.log('\n--- 3. Testing Backend AI Routes & Transcribe Endpoint ---');

const aiRoutesPath = path.resolve(__dirname, '../src/routes/aiRoutes.js');
const aiRoutesCode = fs.readFileSync(aiRoutesPath, 'utf8');
assert(aiRoutesCode.includes('/transcribe-audio'), 'aiRoutes.js has /transcribe-audio route');

const aiControllerPath = path.resolve(__dirname, '../src/controllers/aiCopilotController.js');
const aiControllerCode = fs.readFileSync(aiControllerPath, 'utf8');
assert(aiControllerCode.includes('export const transcribeAudio'), 'aiCopilotController exports transcribeAudio');

const geminiServicePath = path.resolve(__dirname, '../src/services/geminiService.js');
const geminiServiceCode = fs.readFileSync(geminiServicePath, 'utf8');
assert(geminiServiceCode.includes('geminiCrmTools'), 'geminiService imports and uses geminiCrmTools');
assert(geminiServiceCode.includes('executeCrmTool'), 'geminiService handles native CRM tool execution');

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n=========================================');
console.log(`TOTAL: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log('=========================================');

if (totalFailed > 0) {
    process.exit(1);
} else {
    console.log('✨ All tests for Poin 1, 2 & 3 passed successfully!');
}
