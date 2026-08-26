import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Send, Bot, Mail, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, Save,
    Loader2, Bell, ExternalLink, Copy, Check, Info, Sparkles, MessageSquare,
    ChevronRight, ArrowRight, Smartphone, Inbox, CheckSquare, Settings2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function BroadcastSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingTg, setTestingTg] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [activeGuideStep, setActiveGuideStep] = useState(1);
    const [copiedCmd, setCopiedCmd] = useState(false);
    const [previewChannel, setPreviewChannel] = useState('telegram'); // 'telegram' | 'email'
    const [previewType, setPreviewType] = useState('completed'); // 'completed' | 'paused' | 'cancelled'

    // Telegram State
    const [botToken, setBotToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [notifyOnComplete, setNotifyOnComplete] = useState(true);
    const [notifyOnPause, setNotifyOnPause] = useState(true);
    const [notifyOnCancel, setNotifyOnCancel] = useState(true);

    // Email State
    const [emailRecipient, setEmailRecipient] = useState('');
    const [emailNotifyOnComplete, setEmailNotifyOnComplete] = useState(true);
    const [emailNotifyOnPause, setEmailNotifyOnPause] = useState(true);
    const [emailNotifyOnCancel, setEmailNotifyOnCancel] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/app/broadcasts/settings');
            const data = res.data || {};
            // Telegram
            setBotToken(data.telegram_bot_token || '');
            setChatId(data.telegram_chat_id || '');
            setNotifyOnComplete(data.telegram_notify_on_complete !== false);
            setNotifyOnPause(data.telegram_notify_on_pause !== false);
            setNotifyOnCancel(data.telegram_notify_on_cancel !== false);
            // Email
            setEmailRecipient(data.email_recipient || '');
            setEmailNotifyOnComplete(data.email_notify_on_complete !== false);
            setEmailNotifyOnPause(data.email_notify_on_pause !== false);
            setEmailNotifyOnCancel(data.email_notify_on_cancel !== false);
        } catch (err) {
            console.error('Failed to fetch broadcast settings:', err);
            toast.error('Gagal memuat pengaturan broadcast');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        const toastId = toast.loading('Menyimpan pengaturan...');
        try {
            await axios.put('/api/app/broadcasts/settings', {
                telegram_bot_token: botToken.trim(),
                telegram_chat_id: chatId.trim(),
                telegram_notify_on_complete: notifyOnComplete,
                telegram_notify_on_pause: notifyOnPause,
                telegram_notify_on_cancel: notifyOnCancel,
                email_recipient: emailRecipient.trim(),
                email_notify_on_complete: emailNotifyOnComplete,
                email_notify_on_pause: emailNotifyOnPause,
                email_notify_on_cancel: emailNotifyOnCancel
            });
            toast.success('Pengaturan Notifikasi (Telegram & Email) berhasil disimpan!', { id: toastId });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal menyimpan pengaturan', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleTestTelegram = async () => {
        if (!botToken.trim() || !chatId.trim()) {
            toast.error('Harap isi Bot Token dan Chat ID terlebih dahulu');
            return;
        }
        setTestingTg(true);
        const toastId = toast.loading('Mengirim pesan tes ke Telegram...');
        try {
            await axios.post('/api/app/broadcasts/settings/telegram/test', {
                bot_token: botToken.trim(),
                chat_id: chatId.trim()
            });
            toast.success('Pesan tes berhasil terkirim! Periksa Telegram Anda.', { id: toastId });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal mengirim pesan tes. Pastikan Bot Token & Chat ID benar, dan Anda sudah klik START pada bot di Telegram.', { id: toastId, duration: 6000 });
        } finally {
            setTestingTg(false);
        }
    };

    const handleTestEmail = async () => {
        if (!emailRecipient.trim()) {
            toast.error('Harap isi alamat email penerima terlebih dahulu');
            return;
        }
        setTestingEmail(true);
        const toastId = toast.loading('Mengirim email uji coba...');
        try {
            await axios.post('/api/app/broadcasts/settings/email/test', {
                email_recipient: emailRecipient.trim()
            });
            toast.success('Email uji coba berhasil dikirim! Periksa Kotak Masuk / Spam email Anda.', { id: toastId });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal mengirim email uji coba. Pastikan konfigurasi SMTP di server sudah aktif.', { id: toastId, duration: 6000 });
        } finally {
            setTestingEmail(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedCmd(true);
        toast.success('Perintah disalin ke clipboard!');
        setTimeout(() => setCopiedCmd(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                <span className="text-sm font-medium text-gray-500">Memuat pengaturan...</span>
            </div>
        );
    }

    const isTgConfigured = Boolean(botToken.trim() && chatId.trim());
    const isEmailConfigured = Boolean(emailRecipient.trim());

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-slate-800">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
                            <Settings2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
                                Pengaturan Laporan Broadcast (Telegram & Email)
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                Dapatkan laporan real-time otomatis saat broadcast Selesai, Terjeda (Auto-Pause), atau Dibatalkan.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isTgConfigured 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' 
                            : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                    }`}>
                        <Bot className="w-3.5 h-3.5" />
                        {isTgConfigured ? 'Telegram Aktif' : 'Telegram Nonaktif'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isEmailConfigured 
                            ? 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' 
                            : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                    }`}>
                        <Mail className="w-3.5 h-3.5" />
                        {isEmailConfigured ? 'Email Aktif' : 'Email Nonaktif'}
                    </span>
                </div>
            </div>

            {/* STEP-BY-STEP VISUAL SETUP WIZARD (Interactive Guide) */}
            <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white dark:from-slate-900/80 dark:via-slate-800/40 dark:to-slate-900/80 rounded-2xl border border-blue-100/80 dark:border-blue-900/30 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#229ED9]" />
                        <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
                            Panduan Cepat Setup Saluran Laporan (Telegram & Email)
                        </h2>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full">
                        Mudah & Fleksibel
                    </span>
                </div>

                {/* Step Tabs Navigation */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
                    <button
                        type="button"
                        onClick={() => setActiveGuideStep(1)}
                        className={`text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                            activeGuideStep === 1
                                ? 'bg-white dark:bg-slate-800 border-[#229ED9] shadow-md shadow-blue-500/10 ring-2 ring-blue-100 dark:ring-blue-900/30'
                                : 'bg-white/60 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            activeGuideStep === 1 ? 'bg-[#229ED9] text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                        }`}>
                            1
                        </div>
                        <div>
                            <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Bot Telegram</div>
                            <div className="text-[11px] text-gray-400 dark:text-gray-500">Token & Chat ID</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveGuideStep(2)}
                        className={`text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                            activeGuideStep === 2
                                ? 'bg-white dark:bg-slate-800 border-purple-500 shadow-md shadow-purple-500/10 ring-2 ring-purple-100 dark:ring-purple-900/30'
                                : 'bg-white/60 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            activeGuideStep === 2 ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                        }`}>
                            2
                        </div>
                        <div>
                            <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Notifikasi Email</div>
                            <div className="text-[11px] text-gray-400 dark:text-gray-500">Alamat Email Tim / PIC</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveGuideStep(3)}
                        className={`text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                            activeGuideStep === 3
                                ? 'bg-white dark:bg-slate-800 border-green-500 shadow-md shadow-green-500/10 ring-2 ring-green-100 dark:ring-green-900/30'
                                : 'bg-white/60 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            activeGuideStep === 3 ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                        }`}>
                            3
                        </div>
                        <div>
                            <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Uji Coba & Simpan</div>
                            <div className="text-[11px] text-gray-400 dark:text-gray-500">Verifikasi pengiriman</div>
                        </div>
                    </button>
                </div>

                {/* Step Content Details */}
                <div className="bg-white dark:bg-slate-800/80 p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-slate-700/80">
                    {activeGuideStep === 1 && (
                        <div className="space-y-3 animate-in fade-in duration-200 text-xs text-gray-600 dark:text-gray-300">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <Bot className="w-4 h-4 text-[#229ED9]" /> Setup Bot Telegram (Gratis & Cepat)
                                </span>
                                <a
                                    href="https://t.me/BotFather"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#229ED9] hover:bg-[#1c8ec4] text-white rounded-lg text-xs font-bold shadow-sm transition-transform active:scale-95"
                                >
                                    Buka @BotFather di Telegram <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <ol className="list-decimal list-inside space-y-2 pl-1 leading-relaxed">
                                <li>Buka <b>@BotFather</b> di Telegram lalu kirim perintah <code>/newbot</code>.</li>
                                <li>Beri nama bot & salin <b>HTTP API Token</b> yang diberikan.</li>
                                <li>Buka <b>@userinfobot</b> untuk melihat Chat ID Anda (atau masukkan bot ke Grup dan jadikan Admin untuk kirim ke Grup).</li>
                                <li className="text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800/40">
                                    ⚠️ WAJIB: Buka bot baru Anda di Telegram, lalu klik tombol "START" agar bot diizinkan mengirim notifikasi ke Anda.
                                </li>
                            </ol>
                        </div>
                    )}

                    {activeGuideStep === 2 && (
                        <div className="space-y-3 animate-in fade-in duration-200 text-xs text-gray-600 dark:text-gray-300">
                            <span className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-purple-600" /> Setup Laporan via Email
                            </span>
                            <p className="leading-relaxed">
                                1. Masukkan alamat email admin/manajer di kolom <b>Email Penerima Laporan</b>.<br />
                                2. Anda dapat memasukkan lebih dari satu email (pisahkan dengan tanda koma <code>,</code>), contoh: <code>owner@toko.com, manager@toko.com</code>.<br />
                                3. Server akan otomatis mengirimkan email rekap HTML lengkap dengan statistik kartu target, rasio sukses, dan status.
                            </p>
                        </div>
                    )}

                    {activeGuideStep === 3 && (
                        <div className="space-y-3 animate-in fade-in duration-200 text-xs text-gray-600 dark:text-gray-300">
                            <span className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" /> Uji Coba Pesan & Simpan
                            </span>
                            <p className="leading-relaxed">
                                Gunakan tombol <b>"Kirim Pesan Uji Coba"</b> pada masing-masing saluran (Telegram / Email) untuk memastikan pesan masuk, lalu klik <b>"Simpan Pengaturan Global"</b>.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN TWO-COLUMN SECTION (Form on Left, Live Mockup Preview on Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT COLUMN: Settings Form (7 Cols) */}
                <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
                    {/* SECTION 1: TELEGRAM BOT */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-5">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-700">
                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Bot className="w-5 h-5 text-[#229ED9]" />
                                Saluran 1: Bot Telegram
                            </h2>
                            <span className="text-xs font-semibold text-gray-400">Opsional / Disarankan</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Bot Token */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                    Telegram Bot Token
                                </label>
                                <input
                                    type="password"
                                    value={botToken}
                                    onChange={(e) => setBotToken(e.target.value)}
                                    placeholder="cth: 123456789:ABCdef..."
                                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#229ED9] outline-none"
                                />
                            </div>

                            {/* Chat ID */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                    Telegram Chat ID / Group ID
                                </label>
                                <input
                                    type="text"
                                    value={chatId}
                                    onChange={(e) => setChatId(e.target.value)}
                                    placeholder="cth: 123456789 atau -100..."
                                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#229ED9] outline-none"
                                />
                            </div>
                        </div>

                        {/* Telegram Triggers */}
                        <div className="pt-1 space-y-2">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Pemicu Telegram:</span>
                            <div className="grid grid-cols-3 gap-2">
                                <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900">
                                    <input type="checkbox" checked={notifyOnComplete} onChange={e => setNotifyOnComplete(e.target.checked)} className="text-[#229ED9] rounded" />
                                    <span>Selesai</span>
                                </label>
                                <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900">
                                    <input type="checkbox" checked={notifyOnPause} onChange={e => setNotifyOnPause(e.target.checked)} className="text-[#229ED9] rounded" />
                                    <span>Terjeda</span>
                                </label>
                                <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900">
                                    <input type="checkbox" checked={notifyOnCancel} onChange={e => setNotifyOnCancel(e.target.checked)} className="text-[#229ED9] rounded" />
                                    <span>Dibatalkan</span>
                                </label>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-start">
                            <button
                                type="button"
                                onClick={handleTestTelegram}
                                disabled={testingTg || !botToken.trim() || !chatId.trim()}
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 text-[#229ED9] hover:bg-blue-100 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                                {testingTg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                Uji Kirim Pesan Telegram
                            </button>
                        </div>
                    </div>

                    {/* SECTION 2: EMAIL NOTIFICATION */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-5">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-700">
                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-purple-600" />
                                Saluran 2: Notifikasi Email
                            </h2>
                            <span className="text-xs font-semibold text-gray-400">Opsional</span>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Email Penerima Laporan
                            </label>
                            <input
                                type="text"
                                value={emailRecipient}
                                onChange={(e) => setEmailRecipient(e.target.value)}
                                placeholder="cth: admin@toko.com, supervisor@toko.com"
                                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <p className="text-[11px] text-gray-400">
                                Masukkan 1 atau beberapa email dipisah koma.
                            </p>
                        </div>

                        {/* Email Triggers */}
                        <div className="pt-1 space-y-2">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Pemicu Email:</span>
                            <div className="grid grid-cols-3 gap-2">
                                <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900">
                                    <input type="checkbox" checked={emailNotifyOnComplete} onChange={e => setEmailNotifyOnComplete(e.target.checked)} className="text-purple-600 rounded" />
                                    <span>Selesai</span>
                                </label>
                                <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900">
                                    <input type="checkbox" checked={emailNotifyOnPause} onChange={e => setEmailNotifyOnPause(e.target.checked)} className="text-purple-600 rounded" />
                                    <span>Terjeda</span>
                                </label>
                                <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900">
                                    <input type="checkbox" checked={emailNotifyOnCancel} onChange={e => setEmailNotifyOnCancel(e.target.checked)} className="text-purple-600 rounded" />
                                    <span>Dibatalkan</span>
                                </label>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-start">
                            <button
                                type="button"
                                onClick={handleTestEmail}
                                disabled={testingEmail || !emailRecipient.trim()}
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                                {testingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                                Uji Kirim Pesan Email
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-7 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan Pengaturan Global
                        </button>
                    </div>
                </form>

                {/* RIGHT COLUMN: Interactive Live Mockup Preview (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-orange-500" />
                                Simulasi Tampilan Laporan
                            </span>
                            {/* Channel Switcher */}
                            <div className="flex bg-gray-100 dark:bg-slate-900 p-0.5 rounded-lg text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => setPreviewChannel('telegram')}
                                    className={`px-2.5 py-1 rounded-md transition-all ${previewChannel === 'telegram' ? 'bg-[#229ED9] text-white shadow-sm' : 'text-gray-500'}`}
                                >
                                    Telegram
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewChannel('email')}
                                    className={`px-2.5 py-1 rounded-md transition-all ${previewChannel === 'email' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500'}`}
                                >
                                    Email
                                </button>
                            </div>
                        </div>

                        {/* Status Switcher Tabs */}
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-slate-900 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setPreviewType('completed')}
                                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    previewType === 'completed'
                                        ? 'bg-white dark:bg-slate-800 text-green-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                Selesai
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewType('paused')}
                                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    previewType === 'paused'
                                        ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                Terjeda
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewType('cancelled')}
                                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    previewType === 'cancelled'
                                        ? 'bg-white dark:bg-slate-800 text-red-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                Dibatalkan
                            </button>
                        </div>

                        {/* Channel Mockup Viewport */}
                        {previewChannel === 'telegram' ? (
                            <div className="bg-[#7595bf]/15 dark:bg-slate-950 p-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 min-h-[320px] flex flex-col justify-end relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 bg-[#229ED9] text-white px-3.5 py-2 flex items-center justify-between text-xs font-bold shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px]">🤖</div>
                                        <span>CRMHub Telegram Bot</span>
                                    </div>
                                    <span className="text-[10px] opacity-80">bot</span>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl rounded-tl-sm shadow-md border border-gray-100 dark:border-slate-700 text-xs text-gray-800 dark:text-gray-200 space-y-2 mt-8">
                                    {previewType === 'completed' && (
                                        <>
                                            <div className="font-bold text-green-600 dark:text-green-400">🎉 [BROADCAST SELESAI]</div>
                                            <div className="border-t border-gray-100 dark:border-slate-700 pt-1.5 space-y-0.5">
                                                <p>📢 <b>Kampanye:</b> Promo Flash Sale 8.8</p>
                                                <p>🏢 <b>Organisasi:</b> CRMHub Store</p>
                                                <p>📱 <b>Pengirim:</b> CS Utama (+628123456789)</p>
                                            </div>
                                            <div className="border-t border-gray-100 dark:border-slate-700 pt-1.5 space-y-0.5">
                                                <p className="font-bold">📊 RINGKASAN HASIL:</p>
                                                <p>• Total Target: 500 Kontak</p>
                                                <p>• ✅ Berhasil Terkirim: 485 (97%)</p>
                                                <p>• ❌ Gagal: 15 (3%)</p>
                                                <p>• ⏱️ Waktu Selesai: 21/08/2026, 11:30 WIB</p>
                                            </div>
                                        </>
                                    )}
                                    {previewType === 'paused' && (
                                        <>
                                            <div className="font-bold text-amber-600 dark:text-amber-400">⚠️ [PERINGATAN: BROADCAST TERJEDA]</div>
                                            <div className="border-t border-gray-100 dark:border-slate-700 pt-1.5 space-y-0.5">
                                                <p>📢 <b>Kampanye:</b> Follow Up Member VIP</p>
                                                <p className="text-red-500 font-semibold">⚠️ <b>Alasan:</b> Terdeteksi 5 pesan gagal beruntun (Circuit Breaker).</p>
                                                <p>📊 <b>Progres:</b> 120 / 300 Terkirim (175 Antrean)</p>
                                            </div>
                                        </>
                                    )}
                                    {previewType === 'cancelled' && (
                                        <>
                                            <div className="font-bold text-red-600 dark:text-red-400">🛑 [BROADCAST DIBATALKAN]</div>
                                            <div className="border-t border-gray-100 dark:border-slate-700 pt-1.5 space-y-0.5">
                                                <p>📢 <b>Kampanye:</b> Diskon Spesial</p>
                                                <p>🛑 Dibatalkan manual oleh admin.</p>
                                            </div>
                                        </>
                                    )}
                                    <div className="text-[9px] text-gray-400 text-right pt-0.5">11:30 WIB</div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-100 dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 text-xs space-y-2">
                                <div className="bg-slate-900 text-white p-3 rounded-xl text-center">
                                    <div className="font-black text-orange-500 text-sm">CRMHUB OMNICHANNEL</div>
                                    <div className="text-[10px] text-gray-400">Laporan Otomatis WhatsApp Broadcast</div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl space-y-2 shadow-sm">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                        previewType === 'completed' ? 'bg-green-100 text-green-800' :
                                        previewType === 'paused' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {previewType === 'completed' ? '✅ SELESAI' : previewType === 'paused' ? '⚠️ TERJEDA' : '🛑 DIBATALKAN'}
                                    </span>
                                    <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">Promo Flash Sale 8.8</div>
                                    <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                                        <div className="bg-gray-50 dark:bg-slate-900 p-1.5 rounded">
                                            <div className="font-black text-gray-800 dark:text-gray-200">500</div>
                                            <div className="text-[9px] text-gray-400">TARGET</div>
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-950/30 p-1.5 rounded">
                                            <div className="font-black text-green-600">485</div>
                                            <div className="text-[9px] text-green-600">SUKSES</div>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-950/30 p-1.5 rounded">
                                            <div className="font-black text-red-600">15</div>
                                            <div className="text-[9px] text-red-600">GAGAL</div>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <div className="w-full py-1.5 bg-orange-500 text-white font-bold text-center rounded-lg text-[11px]">
                                            Buka Laporan di Dashboard CRMHub &rarr;
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
