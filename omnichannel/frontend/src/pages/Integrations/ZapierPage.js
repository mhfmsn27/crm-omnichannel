import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Copy, CheckCircle, ChevronDown, ChevronUp, ExternalLink, Plus, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
        </button>
    );
};

const EventCard = ({ event, isOpen, onToggle }) => (
    <div className="border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden">
        <button
            onClick={onToggle}
            className="w-full px-4 py-3 flex items-center justify-between bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-left"
        >
            <div className="flex items-center gap-3">
                <code className="text-xs font-mono bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">
                    {event.event}
                </code>
                <span className="text-sm text-gray-700 dark:text-gray-300">{event.description}</span>
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </button>
        {isOpen && (
            <div className="border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg p-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contoh Payload</p>
                    <CopyButton text={JSON.stringify(event.sample, null, 2)} />
                </div>
                <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto leading-relaxed bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-lg p-3">
                    {JSON.stringify(event.sample, null, 2)}
                </pre>
                <div className="mt-2 flex flex-wrap gap-1">
                    {event.channels.map(ch => (
                        <span key={ch} className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded-full font-medium">
                            {ch}
                        </span>
                    ))}
                </div>
            </div>
        )}
    </div>
);

export default function ZapierPage() {
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [openEvent, setOpenEvent] = useState(null);
    const [activeTab, setActiveTab] = useState('zapier'); // 'zapier' | 'make'

    useEffect(() => {
        axios.get('/api/app/webhooks/event-catalog')
            .then(r => setEvents(r.data))
            .catch(() => toast.error('Gagal memuat event catalog'))
            .finally(() => setLoadingEvents(false));
    }, []);

    const steps = {
        zapier: [
            { num: 1, title: 'Buat Zap baru di Zapier', desc: 'Login ke zapier.com → Klik "Create Zap" → Pilih trigger "Webhooks by Zapier" → Pilih event "Catch Hook".' },
            { num: 2, title: 'Copy Webhook URL dari Zapier', desc: 'Zapier akan memberikan URL webhook unik. Copy URL tersebut.' },
            { num: 3, title: 'Tambahkan Webhook di CRMHUB', desc: 'Pergi ke Settings → Webhooks → Klik "+ Tambah Webhook" → Paste URL Zapier, pilih events yang ingin di-trigger.' },
            { num: 4, title: 'Test Koneksi', desc: 'Klik tombol "Test" pada webhook yang dibuat. Zapier akan menerima event test.ping.' },
            { num: 5, title: 'Lanjutkan ke Action Zapier', desc: 'Di Zapier, lanjutkan ke tahap Action — pilih aplikasi tujuan (Google Sheets, Slack, dll) dan petakan field dari payload CRMHUB.' },
        ],
        make: [
            { num: 1, title: 'Buat Scenario baru di Make.com', desc: 'Login ke make.com → Klik "Create a new scenario" → Tambahkan modul "Webhooks" → Pilih "Custom Webhook".' },
            { num: 2, title: 'Copy Webhook URL dari Make', desc: 'Make akan generate URL webhook. Copy URL tersebut.' },
            { num: 3, title: 'Tambahkan Webhook di CRMHUB', desc: 'Pergi ke Settings → Webhooks → Klik "+ Tambah Webhook" → Paste URL Make, pilih events yang ingin di-trigger.' },
            { num: 4, title: 'Jalankan Test', desc: 'Klik "Test" di CRMHUB. Make akan menangkap sample data dan otomatis mengenali struktur payload.' },
            { num: 5, title: 'Sambungkan ke Modul Lain', desc: 'Tambahkan modul berikutnya di Make (Google Sheets, Notion, Email, dll) dan petakan field dari data CRMHUB.' },
        ],
    };

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
                    <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zapier & Make Integration</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Hubungkan CRMHUB ke 5000+ aplikasi menggunakan sistem outbound webhook yang sudah terintegrasi — tanpa coding.
                    </p>
                </div>
            </div>

            {/* How it works */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">Cara Kerja</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    Setiap kali event terjadi di CRMHUB (pesan masuk, percakapan diselesaikan, kontak baru, dll), sistem akan mengirim data JSON ke URL webhook yang Anda daftarkan. Zapier/Make menerima data ini dan memicu automation Anda secara otomatis.
                </p>
            </div>

            {/* Tab selector */}
            <div className="flex bg-gray-100 dark:bg-dark-bg rounded-xl p-1 w-fit">
                {['zapier', 'make'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white dark:bg-dark-surface text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        {tab === 'zapier' ? 'Zapier' : 'Make.com'}
                    </button>
                ))}
            </div>

            {/* Steps */}
            <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-white mb-4">
                    Cara Setup {activeTab === 'zapier' ? 'Zapier' : 'Make.com'}
                </h2>
                <div className="space-y-3">
                    {steps[activeTab].map(step => (
                        <div key={step.num} className="flex gap-4 items-start">
                            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                {step.num}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{step.title}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex gap-3">
                    <a
                        href={activeTab === 'zapier' ? 'https://zapier.com' : 'https://make.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Buka {activeTab === 'zapier' ? 'Zapier' : 'Make.com'}
                    </a>
                    <a
                        href="/settings?tab=webhooks"
                        className="inline-flex items-center gap-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg text-gray-700 dark:text-gray-200 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Kelola Webhooks
                    </a>
                </div>
            </div>

            {/* Signature verification */}
            <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-white mb-3">Verifikasi Signature (Opsional)</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Setiap request dikirim dengan header <code className="bg-gray-100 dark:bg-dark-bg px-1.5 py-0.5 rounded font-mono text-xs">X-Reply-Signature</code> yang berisi HMAC-SHA256 dari payload menggunakan secret key webhook Anda. Gunakan ini untuk memverifikasi keaslian request.
                </p>
                <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400 font-mono">Node.js Example</span>
                        <CopyButton text={`const crypto = require('crypto');\nconst signature = req.headers['x-reply-signature'];\nconst computed = crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');\nconst isValid = signature === computed;`} />
                    </div>
                    <pre className="text-xs text-green-300 leading-relaxed">{`const crypto = require('crypto');
const signature = req.headers['x-reply-signature'];
const computed = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');
const isValid = signature === computed;`}</pre>
                </div>
            </div>

            {/* Event Catalog */}
            <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-white mb-1">Available Events</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Klik event untuk melihat contoh payload JSON yang akan diterima Zapier/Make Anda.
                </p>
                {loadingEvents ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="space-y-2">
                        {events.map(event => (
                            <EventCard
                                key={event.event}
                                event={event}
                                isOpen={openEvent === event.event}
                                onToggle={() => setOpenEvent(openEvent === event.event ? null : event.event)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
