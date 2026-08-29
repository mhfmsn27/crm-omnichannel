import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Mail, Server, Key, Send, CheckCircle2, AlertCircle, 
    ShieldCheck, RefreshCw, Copy, Check, Trash2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/common/Button';

export default function EmailIntegration() {
    const [activeTab, setActiveTab] = useState('smtp'); // 'smtp' or 'resend'
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [channelId, setChannelId] = useState(null);
    const [copied, setCopied] = useState(false);
    const [testRecipient, setTestRecipient] = useState('');

    const [form, setForm] = useState({
        name: 'Email Support',
        account_identifier: 'support@crmhub.id',
        provider: 'smtp',
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: '',
        smtp_pass: '',
        from_email: '',
        sender_name: 'Customer Support CRMHUB',
        api_key: '' // For Resend / SendGrid
    });

    const inboundWebhookUrl = `${window.location.origin}/webhook/email`;

    useEffect(() => {
        fetchIntegration();
    }, []);

    const fetchIntegration = async () => {
        try {
            const res = await axios.get('/api/app/integrations/channels');
            const emailChannel = (res.data || []).find(c => c.channel_type === 'email');
            if (emailChannel) {
                setChannelId(emailChannel.id);
                setForm(prev => ({
                    ...prev,
                    name: emailChannel.name,
                    account_identifier: emailChannel.account_identifier,
                    provider: emailChannel.credentials?.provider || 'smtp',
                    smtp_host: emailChannel.credentials?.smtp_host || 'smtp.gmail.com',
                    smtp_port: emailChannel.credentials?.smtp_port || 587,
                    smtp_secure: emailChannel.credentials?.smtp_secure || false,
                    smtp_user: emailChannel.credentials?.smtp_user || emailChannel.account_identifier,
                    smtp_pass: emailChannel.credentials?.smtp_pass || '',
                    from_email: emailChannel.credentials?.from_email || emailChannel.account_identifier,
                    sender_name: emailChannel.credentials?.sender_name || 'Customer Support',
                    api_key: emailChannel.credentials?.api_key || ''
                }));
                setActiveTab(emailChannel.credentials?.provider === 'resend' ? 'resend' : 'smtp');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                channel_type: 'email',
                name: form.name,
                account_identifier: form.account_identifier || form.from_email,
                credentials: {
                    provider: activeTab,
                    smtp_host: form.smtp_host,
                    smtp_port: form.smtp_port,
                    smtp_secure: form.smtp_secure,
                    smtp_user: form.smtp_user,
                    smtp_pass: form.smtp_pass,
                    from_email: form.from_email || form.account_identifier,
                    sender_name: form.sender_name,
                    api_key: form.api_key
                },
                is_active: true
            };

            await axios.post('/api/app/integrations/channels', payload);
            toast.success("Konfigurasi Email Channel berhasil disimpan");
            fetchIntegration();
        } catch (err) {
            toast.error("Gagal menyimpan: " + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!channelId) return toast.error("Silakan simpan konfigurasi terlebih dahulu.");
        setTesting(true);
        try {
            await axios.post(`/api/app/integrations/channels/${channelId}/test`, {
                test_recipient: testRecipient || form.account_identifier
            });
            toast.success(`Email uji coba berhasil dikirim ke ${testRecipient || form.account_identifier}!`);
        } catch (err) {
            toast.error("Uji coba gagal: " + (err.response?.data?.error || err.message));
        } finally {
            setTesting(false);
        }
    };

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(inboundWebhookUrl);
        setCopied(true);
        toast.success("Webhook URL disalin ke clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-md">
                        <Mail className="w-6 h-6" />
                    </div>
                    Email Channel (Two-Way Unified Inbox)
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Hubungkan akun email bisnis (SMTP / IMAP / Resend) agar tim CS dapat menerima dan membalas email pelanggan langsung dari Unified Inbox.
                </p>
            </div>

            {/* Provider Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800 pb-2">
                <button
                    onClick={() => setActiveTab('smtp')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'smtp'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-gray-200'
                    }`}
                >
                    <Server className="w-4 h-4" /> SMTP Standar (Gmail / Zimbra / CPanel)
                </button>
                <button
                    onClick={() => setActiveTab('resend')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'resend'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-gray-200'
                    }`}
                >
                    <Key className="w-4 h-4" /> Modern API (Resend / SendGrid)
                </button>
            </div>

            {/* Config Form Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Nama Channel</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="Contoh: Email Helpdesk / Sales Mail"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Alamat Email Bisnis (Identitas)</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="support@perusahaan.com"
                            value={form.account_identifier}
                            onChange={e => setForm({ ...form, account_identifier: e.target.value, from_email: e.target.value })}
                        />
                    </div>
                </div>

                {activeTab === 'smtp' ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">SMTP Host Server</label>
                                <input
                                    className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                    placeholder="smtp.gmail.com / mail.domain.com"
                                    value={form.smtp_host}
                                    onChange={e => setForm({ ...form, smtp_host: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">SMTP Port</label>
                                <input
                                    type="number"
                                    className="w-full border p-2.5 rounded-xl text-xs font-bold text-center bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                    placeholder="587 / 465"
                                    value={form.smtp_port}
                                    onChange={e => setForm({ ...form, smtp_port: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">SMTP Username / Akun</label>
                                <input
                                    className="w-full border p-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                    placeholder="username@domain.com"
                                    value={form.smtp_user}
                                    onChange={e => setForm({ ...form, smtp_user: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">SMTP Password / App Password</label>
                                <input
                                    type="password"
                                    className="w-full border p-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                    placeholder="••••••••"
                                    value={form.smtp_pass}
                                    onChange={e => setForm({ ...form, smtp_pass: e.target.value })}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Resend / SendGrid API Key</label>
                        <input
                            type="password"
                            className="w-full border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="re_123456789abcdef..."
                            value={form.api_key}
                            onChange={e => setForm({ ...form, api_key: e.target.value })}
                        />
                        <p className="text-[11px] text-gray-500 mt-1">Dapatkan API Key dari dashboard resend.com atau sendgrid.com.</p>
                    </div>
                )}

                <div className="pt-2">
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="!bg-indigo-600 hover:!bg-indigo-700 text-white font-bold"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan Pengaturan Email'}
                    </Button>
                </div>
            </div>

            {/* Inbound Webhook Settings */}
            <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">Inbound Webhook URL (Menerima Email Masuk)</h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                    Arahkan Inbound Webhook dari domain DNS / provider email Anda (misal: Resend Inbound / Cloudmailin) ke URL berikut agar email masuk otomatis menjadi percakapan baru di Unified Inbox:
                </p>
                <div className="flex gap-2">
                    <input 
                        readOnly 
                        className="flex-1 border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300"
                        value={inboundWebhookUrl}
                    />
                    <Button onClick={handleCopyWebhook} variant="secondary" leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
                        {copied ? 'Tersalin' : 'Salin URL'}
                    </Button>
                </div>
            </div>

            {/* Test Connection Card */}
            {channelId && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-3">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Send className="w-4 h-4 text-emerald-600" /> Uji Coba Pengiriman Email
                    </h3>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 border p-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="Masukkan email tujuan pengujian (contoh: yourname@gmail.com)"
                            value={testRecipient}
                            onChange={e => setTestRecipient(e.target.value)}
                        />
                        <Button 
                            onClick={handleTestConnection} 
                            disabled={testing}
                            className="!bg-emerald-600 hover:!bg-emerald-700 text-white font-bold"
                        >
                            {testing ? 'Mengirim...' : 'Kirim Email Tes'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
