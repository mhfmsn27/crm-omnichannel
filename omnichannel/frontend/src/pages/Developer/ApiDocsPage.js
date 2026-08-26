import React, { useState } from 'react';
import { 
    Code, Copy, Check, Terminal, Globe, Smartphone, Send, Facebook, Instagram, 
    Shield, AlertTriangle, Server, Activity, Lock, ChevronRight, Box 
} from 'lucide-react';

const SECTIONS = [
    { id: 'intro', label: 'Introduction', icon: BookIcon },
    { id: 'auth', label: 'Authentication', icon: Lock },
    { id: 'messaging', label: 'Send Messages', icon: Send },
    { id: 'webhooks', label: 'Webhooks', icon: Globe },
    { id: 'errors', label: 'Error Codes', icon: AlertTriangle },
];

function BookIcon(props) { return <Box {...props} />; }

const CodeBlock = ({ code, language = 'bash' }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative bg-slate-900 rounded-lg overflow-hidden my-4 border border-slate-700 shadow-lg group">
            <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                <span className="text-xs text-slate-400 font-mono lowercase">{language}</span>
                <button onClick={handleCopy} className="text-slate-400 hover:text-white transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed">
                {code}
            </pre>
        </div>
    );
};

const Badge = ({ children, color = 'blue' }) => {
    const colors = {
        blue: 'bg-blue-100 text-blue-800',
        green: 'bg-green-100 text-green-800',
        yellow: 'bg-yellow-100 text-yellow-800',
        red: 'bg-red-100 text-red-800',
        gray: 'bg-gray-100 text-gray-800',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${colors[color] || colors.gray}`}>
            {children}
        </span>
    );
};

export default function ApiDocsPage() {
    const [activeSection, setActiveSection] = useState('intro');
    const [selectedChannel, setSelectedChannel] = useState('whatsapp');
    const [selectedLang, setSelectedLang] = useState('curl'); // curl, node, php, python
    
    const baseUrl = window.location.origin;

    // --- SNIPPET GENERATORS ---
    const getMessagePayload = () => {
        const base = {
            channel: selectedChannel,
            type: "text",
            content: { text: "Hello from API!" }
        };
        
        if (selectedChannel === 'whatsapp') base.to = "6281234567890";
        else if (selectedChannel === 'telegram') base.to = "123456789 (Chat ID)";
        else if (selectedChannel === 'messenger') base.to = "PSID_12345";
        else if (selectedChannel === 'instagram') base.to = "IG_USER_ID";
        
        return JSON.stringify(base, null, 2);
    };

    const getCodeSnippet = () => {
        const url = `${baseUrl}/api/public/v1/messages`;
        const token = "YOUR_API_KEY";
        const payload = getMessagePayload();

        switch (selectedLang) {
            case 'node':
                return `const axios = require('axios');

const data = ${payload};

axios.post('${url}', data, {
  headers: {
    'Authorization': 'Bearer ${token}',
    'Content-Type': 'application/json'
  }
})
.then((response) => {
  console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});`;

            case 'php':
                return `<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => '${url}',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => '${payload.replace(/\n/g, '')}',
  CURLOPT_HTTPHEADER => array(
    'Authorization: Bearer ${token}',
    'Content-Type: application/json'
  ),
));

$response = curl_exec($curl);
curl_close($curl);
echo $response;`;

            case 'python':
                return `import requests
import json

url = "${url}"

payload = json.dumps(${payload})
headers = {
  'Authorization': 'Bearer ${token}',
  'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)`;

            default: // curl
                return `curl --location '${url}' \\
--header 'Authorization: Bearer ${token}' \\
--header 'Content-Type: application/json' \\
--data '${payload.replace(/\n/g, '')}'`;
        }
    };

    return (
        <div className="flex h-full bg-white overflow-hidden">
            {/* SIDEBAR */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0 overflow-y-auto p-6 hidden lg:block">
                <h3 className="font-bold text-gray-900 mb-6 text-sm uppercase tracking-wider px-2">Documentation</h3>
                <nav className="space-y-1">
                    {SECTIONS.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                activeSection === section.id 
                                ? 'bg-indigo-50 text-indigo-700' 
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            <section.icon className={`w-4 h-4 ${activeSection === section.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                            {section.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-10 px-3">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-3">Tools</p>
                    <a href="https://www.postman.com/downloads/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-orange-600 hover:text-orange-700 font-medium p-2 bg-orange-50 rounded-lg border border-orange-100 hover:border-orange-200 transition-colors">
                        <img src="https://www.vectorlogo.zone/logos/getpostman/getpostman-icon.svg" className="w-4 h-4" alt="" />
                        Run in Postman
                    </a>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
                <div className="max-w-4xl mx-auto space-y-16 pb-20">
                    
                    {/* INTRODUCTION */}
                    <section id="intro" className={activeSection === 'intro' ? 'block' : 'hidden'}>
                        <div className="border-b border-gray-100 pb-6 mb-6">
                            <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Unified Developer API</h1>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                Integrate WhatsApp, Telegram, Messenger, and Instagram into your applications using a single, unified API. 
                                Manage conversations, send broadcasts, and handle webhooks effortlessly.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                                <Activity className="w-8 h-8 text-indigo-600 mb-3" />
                                <h3 className="font-bold text-gray-900">Rate Limits</h3>
                                <p className="text-sm text-gray-500 mt-1">60 requests per minute per App.</p>
                            </div>
                            <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                                <Server className="w-8 h-8 text-green-600 mb-3" />
                                <h3 className="font-bold text-gray-900">Base URL</h3>
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 block w-fit">{baseUrl}/api/public/v1</code>
                            </div>
                            <div className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                                <Globe className="w-8 h-8 text-blue-600 mb-3" />
                                <h3 className="font-bold text-gray-900">Protocols</h3>
                                <p className="text-sm text-gray-500 mt-1">HTTPS (TLS 1.2+) & JSON.</p>
                            </div>
                        </div>
                    </section>

                    {/* AUTHENTICATION */}
                    <section id="auth" className={activeSection === 'auth' ? 'block' : 'hidden'}>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication</h2>
                        <p className="text-gray-600 mb-6">
                            Authenticate your requests using the <code className="text-red-600 font-mono bg-red-50 px-1 rounded">Authorization</code> header with your API Key.
                        </p>

                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-6">
                            <div className="flex gap-3">
                                <Lock className="w-5 h-5 text-yellow-600 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-yellow-800 text-sm">Keep your API Key secret!</h4>
                                    <p className="text-sm text-yellow-700 mt-1">Do not share it in client-side code (browsers/apps). If compromised, regenerate it in the App Settings.</p>
                                </div>
                            </div>
                        </div>

                        <CodeBlock code={`Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxxxxxx`} language="http" />
                    </section>

                    {/* MESSAGING */}
                    <section id="messaging" className={activeSection === 'messaging' ? 'block' : 'hidden'}>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Send Messages</h2>
                        <p className="text-gray-600 mb-6">
                            Send text or media messages to any supported channel. The system automatically handles channel-specific logic.
                        </p>

                        {/* Channel Selector */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            {['whatsapp', 'telegram', 'messenger', 'instagram'].map(ch => (
                                <button 
                                    key={ch}
                                    onClick={() => setSelectedChannel(ch)}
                                    className={`px-4 py-2 rounded-full border text-sm font-bold flex items-center gap-2 transition-all ${selectedChannel === ch ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {ch === 'whatsapp' && <Smartphone className="w-4 h-4" />}
                                    {ch === 'telegram' && <Send className="w-4 h-4" />}
                                    {ch === 'messenger' && <Facebook className="w-4 h-4" />}
                                    {ch === 'instagram' && <Instagram className="w-4 h-4" />}
                                    {ch.charAt(0).toUpperCase() + ch.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Endpoint Badge */}
                        <div className="flex items-center gap-3 mb-4 font-mono text-sm">
                            <Badge color="green">POST</Badge>
                            <span className="text-gray-700 bg-gray-100 px-2 py-1 rounded">/messages</span>
                        </div>

                        {/* Language Tabs */}
                        <div className="border-b border-gray-200 mb-0 flex">
                            {['curl', 'node', 'php', 'python'].map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => setSelectedLang(lang)}
                                    className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors ${selectedLang === lang ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    {lang === 'curl' ? 'cURL' : lang === 'node' ? 'Node.js' : lang.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        
                        <CodeBlock code={getCodeSnippet()} language={selectedLang === 'curl' ? 'bash' : selectedLang} />

                        {/* Response Example */}
                        <div className="mt-8">
                            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">Example Response (200 OK)</h3>
                            <CodeBlock code={`{
  "success": true,
  "data": {
    "id": "msg_123456789",
    "status": "queued",
    "timestamp": 1700000000
  }
}`} language="json" />
                        </div>
                    </section>

                    {/* WEBHOOKS */}
                    <section id="webhooks" className={activeSection === 'webhooks' ? 'block' : 'hidden'}>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Webhooks</h2>
                        <p className="text-gray-600 mb-6">
                            Receive real-time updates for incoming messages and status changes.
                        </p>

                        <div className="space-y-8">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg mb-3">1. Event Payload</h3>
                                <p className="text-gray-600 text-sm mb-3">Example of an incoming text message event.</p>
                                <CodeBlock code={`{
  "event": "message.received",
  "id": "evt_123456",
  "timestamp": 1700000000,
  "channel": "whatsapp",
  "session_id": "uuid-session-001",
  "data": {
    "from": "6281234567890",
    "pushName": "John Doe",
    "text": "Hello world!",
    "type": "text",
    "mediaUrl": null
  }
}`} language="json" />
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-900 text-lg mb-3">2. Verifying Signatures</h3>
                                <p className="text-gray-600 text-sm mb-4">
                                    Verify the <code className="bg-gray-100 px-1 rounded font-mono text-red-600">X-Reply-Signature</code> header to ensure the request came from us.
                                    Calculate the HMAC SHA256 of the JSON payload using your Webhook Secret.
                                </p>
                                
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Node.js Example</h4>
                                    <CodeBlock code={`const crypto = require('crypto');

function verifySignature(req, secret) {
  const signature = req.headers['x-reply-signature'];
  const payload = JSON.stringify(req.body);
  
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === expected;
}`} language="javascript" />
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-900 text-lg mb-3">3. Retry Policy</h3>
                                <ul className="list-disc pl-5 space-y-2 text-gray-600 text-sm">
                                    <li>We expect a <code className="font-bold">200 OK</code> response within 5 seconds.</li>
                                    <li>If your server fails (5xx) or times out, we retry <strong className="text-gray-900">3 times</strong>.</li>
                                    <li>Retries use exponential backoff (2s, 4s, 8s).</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* ERRORS */}
                    <section id="errors" className={activeSection === 'errors' ? 'block' : 'hidden'}>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Error Reference</h2>
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 font-bold text-gray-500">Code</th>
                                        <th className="px-6 py-3 font-bold text-gray-500">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-red-600 font-bold">400 Bad Request</td>
                                        <td className="px-6 py-4 text-gray-600">Missing parameters or invalid JSON body.</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-red-600 font-bold">401 Unauthorized</td>
                                        <td className="px-6 py-4 text-gray-600">Missing API Key in Authorization header.</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-red-600 font-bold">403 Forbidden</td>
                                        <td className="px-6 py-4 text-gray-600">Invalid API Key, App disabled, or access to channel denied.</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-red-600 font-bold">429 Too Many Requests</td>
                                        <td className="px-6 py-4 text-gray-600">Rate limit exceeded (60 req/min).</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-red-600 font-bold">500 Internal Error</td>
                                        <td className="px-6 py-4 text-gray-600">Server error or upstream provider failure.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}