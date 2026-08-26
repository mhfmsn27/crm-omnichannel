import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    Bell, Send, Mail, CheckCircle2, AlertTriangle, ShieldCheck,
    HelpCircle, Loader2, Save, ExternalLink, RefreshCw, Radio
} from 'lucide-react';

export default function BroadcastSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingTg, setTestingTg] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);

    const [settings, setSettings] = useState({
        telegram_bot_token: '',
        telegram_chat_id: '',
        telegram_notify_on_complete: true,
        telegram_notify_on_pause: true,
        telegram_notify_on_cancel: true,
        email_recipient: '',
        email_notify_on_complete: true,
        email_notify_on_pause: true,
        email_notify_on_cancel: true
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/broadcast/settings');
            if (res.data) {
                setSettings({
                    telegram_bot_token: res.data.telegram_bot_token || '',
                    telegram_chat_id: res.data.telegram_chat_id || '',
                    telegram_notify_on_complete: res.data.telegram_notify_on_complete !== false,
                    telegram_notify_on_pause: res.data.telegram_notify_on_pause !== false,
                    telegram_notify_on_cancel: res.data.telegram_notify_on_cancel !== false,
                    email_recipient: res.data.email_recipient || '',
                    email_notify_on_complete: res.data.email_notify_on_complete !== false,
                    email_notify_on_pause: res.data.email_notify_on_pause !== false,
                    email_notify_on_cancel: res.data.email_notify_on_cancel !== false
                });
            }
        } catch (err) {
            console.error('Failed to load broadcast settings:', err);
            toast.error('Gagal memuat pengaturan broadcast');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e?.preventDefault();
        setSaving(true);
        try {
            await axios.put('/api/app/broadcast/settings', settings);
            toast.success('Pengaturan notifikasi broadcast berhasil disimpan!');
        } catch (err) {
            toast.error('Gagal menyimpan: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleTestTelegram = async () => {
        if (!settings.telegram_bot_token || !settings.telegram_chat_id) {
            toast.error('Harap isi Token Bot Telegram dan Chat ID terlebih dahulu!');
            return;
        }

        setTestingTg(true);
        try {
            const res = await axios.post('/api/app/broadcast/settings/test-telegram', {
                bot_token: settings.telegram_bot_token,
                chat_id: settings.telegram_chat_id
            });
            toast.success(res.data.message || 'Pesan tes berhasil dikirim ke Telegram!');
        } catch (err) {
            toast.error('Tes Telegram Gagal: ' + (err.response?.data?.error || err.message));
        } finally {
            setTestingTg(false);
        }
    };

    const handleTestEmail = async () => {
        if (!settings.email_recipient || !settings.email_recipient.includes('@')) {
            toast.error('Harap isi alamat Email Penerima yang valid terlebih dahulu!');
            return;
        }

        setTestingEmail(true);
        try {
            const res = await axios.post('/api/app/broadcast/settings/test-email', {
                email_recipient: settings.email_recipient
            });
            toast.success(res.data.message || 'Pesan tes berhasil dikirim ke Email!');
        } catch (err) {
            toast.error('Tes Email Gagal: ' + (err.response?.data?.error || err.message));
        } finally {
            setTestingEmail(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                <p className="text-sm text-gray-500">Memuat pengaturan notifikasi broadcast...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                        <Bell className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                        Pengaturan Laporan & Bot Notifikasi
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Konfigurasi bot Telegram dan Email otomatis untuk menerima laporan saat broadcast selesai, terjeda, atau dibatalkan.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Pengaturan
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. TELEGRAM BOT SETTINGS */}
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="p-5 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 border-b border-sky-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-sky-500 text-white rounded-xl shadow-sm">
                                    <Send className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Bot Telegram</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Laporan instan ke Chat Pribadi / Grup Telegram</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 px-2.5 py-1 rounded-full">
                                Real-time
                            </span>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Bot Token */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                                    Telegram Bot Token
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                                    value={settings.telegram_bot_token}
                                    onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                                    className="w-full text-sm px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none dark:text-white font-mono"
                                />
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                                    <HelpCircle className="w-3 h-3" /> Buat bot via <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline inline-flex items-center gap-0.5">@BotFather <ExternalLink className="w-2.5 h-2.5" /></a> untuk mendapatkan token.
                                </p>
                            </div>

                            {/* Chat ID */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                                    Telegram Chat ID / Group ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: 987654321 atau -1001234567890 (Grup)"
                                    value={settings.telegram_chat_id}
                                    onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                                    className="w-full text-sm px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none dark:text-white font-mono"
                                />
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                                    Untuk grup, masukkan bot ke grup dan gunakan awalan minus (contoh: <code>-100...</code>).
                                </p>
                            </div>

                            {/* Event Triggers */}
                            <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-2">
                                    Kirim Notifikasi Pada Kondisi:
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.telegram_notify_on_complete}
                                            onChange={(e) => setSettings({ ...settings, telegram_notify_on_complete: e.target.checked })}
                                            className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                                        />
                                        <span>✅ <strong>Selesai (Completed):</strong> Ringkasan total terkirim & persentase sukses</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.telegram_notify_on_pause}
                                            onChange={(e) => setSettings({ ...settings, telegram_notify_on_pause: e.target.checked })}
                                            className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                                        />
                                        <span>⏸️ <strong>Terjeda (Paused):</strong> Peringatan auto-pause / manual pause & alasannya</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.telegram_notify_on_cancel}
                                            onChange={(e) => setSettings({ ...settings, telegram_notify_on_cancel: e.target.checked })}
                                            className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                                        />
                                        <span>🛑 <strong>Dibatalkan (Cancelled):</strong> Laporan pembatalan kampanye</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Test Action */}
                    <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs text-gray-500">Uji coba token & chat ID</span>
                        <button
                            type="button"
                            onClick={handleTestTelegram}
                            disabled={testingTg || !settings.telegram_bot_token || !settings.telegram_chat_id}
                            className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40"
                        >
                            {testingTg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Tes Kirim Telegram
                        </button>
                    </div>
                </div>

                {/* 2. EMAIL REPORT SETTINGS */}
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b border-emerald-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-sm">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Laporan Email</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Template HTML laporan performa lengkap via SMTP</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full">
                                HTML Report
                            </span>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Email Recipient */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                                    Email Penerima Laporan
                                </label>
                                <input
                                    type="email"
                                    placeholder="Contoh: admin@perusahaan.com atau manager@crmhub.id"
                                    value={settings.email_recipient}
                                    onChange={(e) => setSettings({ ...settings, email_recipient: e.target.value })}
                                    className="w-full text-sm px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                                />
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                                    Email pengirim menggunakan pengaturan SMTP global yang aktif di sistem.
                                </p>
                            </div>

                            {/* Event Triggers */}
                            <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-2">
                                    Kirim Notifikasi Pada Kondisi:
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.email_notify_on_complete}
                                            onChange={(e) => setSettings({ ...settings, email_notify_on_complete: e.target.checked })}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        />
                                        <span>✅ <strong>Selesai (Completed):</strong> Tabel metrik lengkap & tautan ke dashboard</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.email_notify_on_pause}
                                            onChange={(e) => setSettings({ ...settings, email_notify_on_pause: e.target.checked })}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        />
                                        <span>⏸️ <strong>Terjeda (Paused):</strong> Informasi auto-pause / alasan jeda</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.email_notify_on_cancel}
                                            onChange={(e) => setSettings({ ...settings, email_notify_on_cancel: e.target.checked })}
                                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        />
                                        <span>🛑 <strong>Dibatalkan (Cancelled):</strong> Rekap status saat pembatalan</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Test Action */}
                    <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-xs text-gray-500">Uji coba pengiriman email</span>
                        <button
                            type="button"
                            onClick={handleTestEmail}
                            disabled={testingEmail || !settings.email_recipient || !settings.email_recipient.includes('@')}
                            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40"
                        >
                            {testingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                            Tes Kirim Email
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                <div className="text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
                    <p className="font-bold">Pengaturan Fleksibel (Per-Kampanye)</p>
                    <p className="text-indigo-700 dark:text-indigo-400">
                        Pengaturan di halaman ini adalah <strong>default organisasi</strong>. Saat membuat kampanye baru di menu <strong>Create Campaign</strong>, Anda juga dapat mengkustomisasi atau menonaktifkan bot notifikasi khusus untuk kampanye tersebut.
                    </p>
                </div>
            </div>
        </div>
    );
}
