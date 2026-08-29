import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Video, ShieldCheck, Key, RefreshCw, Copy, Check, 
    CheckCircle2, ShoppingBag, ExternalLink 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/common/Button';

export default function TikTokIntegration() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [channelId, setChannelId] = useState(null);
    const [copied, setCopied] = useState(false);

    const [form, setForm] = useState({
        name: 'TikTok Shop Official',
        account_identifier: 'ID_TIKTOK_SHOP_1',
        app_key: '',
        app_secret: '',
        shop_id: '',
        access_token: '',
        sandbox_mode: false
    });

    const webhookUrl = `${window.location.origin}/webhook/tiktok`;

    useEffect(() => {
        fetchIntegration();
    }, []);

    const fetchIntegration = async () => {
        try {
            const res = await axios.get('/api/app/integrations/channels');
            const ttChannel = (res.data || []).find(c => c.channel_type === 'tiktok');
            if (ttChannel) {
                setChannelId(ttChannel.id);
                setForm(prev => ({
                    ...prev,
                    name: ttChannel.name,
                    account_identifier: ttChannel.account_identifier,
                    app_key: ttChannel.credentials?.app_key || '',
                    app_secret: ttChannel.credentials?.app_secret || '',
                    shop_id: ttChannel.credentials?.shop_id || ttChannel.account_identifier,
                    access_token: ttChannel.credentials?.access_token || '',
                    sandbox_mode: ttChannel.credentials?.sandbox_mode || false
                }));
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
                channel_type: 'tiktok',
                name: form.name,
                account_identifier: form.shop_id || form.account_identifier,
                credentials: {
                    app_key: form.app_key,
                    app_secret: form.app_secret,
                    shop_id: form.shop_id,
                    access_token: form.access_token,
                    sandbox_mode: form.sandbox_mode
                },
                is_active: true
            };

            await axios.post('/api/app/integrations/channels', payload);
            toast.success("Konfigurasi TikTok Shop & Messaging berhasil disimpan");
            fetchIntegration();
        } catch (err) {
            toast.error("Gagal menyimpan: " + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        toast.success("Webhook URL disalin ke clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                    <div className="p-2 bg-black text-white rounded-2xl shadow-md">
                        <Video className="w-6 h-6" />
                    </div>
                    TikTok Shop & Direct Messaging Integration
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Kelola seluruh chat pesan pelanggan dari TikTok Shop Seller Center & TikTok Direct Messaging langsung di dalam Unified Inbox CRMHUB.
                </p>
            </div>

            {/* Config Form */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Nama Toko / Channel</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="Contoh: Official Store TikTok"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">TikTok Shop ID</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="Contoh: ID_SHOP_88291"
                            value={form.shop_id}
                            onChange={e => setForm({ ...form, shop_id: e.target.value, account_identifier: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">TikTok App Key</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="app_key_..."
                            value={form.app_key}
                            onChange={e => setForm({ ...form, app_key: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">TikTok App Secret</label>
                        <input
                            type="password"
                            className="w-full border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="••••••••"
                            value={form.app_secret}
                            onChange={e => setForm({ ...form, app_secret: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Seller Access Token</label>
                    <textarea
                        rows={2}
                        className="w-full border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                        placeholder="ROW_access_token_..."
                        value={form.access_token}
                        onChange={e => setForm({ ...form, access_token: e.target.value })}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Dapatkan kredensial API dari TikTok Shop Open Platform (partner.tiktokshop.com).</p>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.sandbox_mode}
                            onChange={e => setForm({ ...form, sandbox_mode: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-gray-800 dark:text-white">Gunakan Mode Simulasi / Sandbox</span>
                    </label>
                </div>

                <div className="pt-2">
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="!bg-black hover:!bg-gray-800 text-white font-bold"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan Kredensial TikTok'}
                    </Button>
                </div>
            </div>

            {/* Webhook Callback Settings */}
            <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">Webhook Callback URL</h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                    Masukkan Callback URL berikut ke dashboard TikTok Developer Anda pada bagian <i>Customer Service Webhook Events</i>:
                </p>
                <div className="flex gap-2">
                    <input 
                        readOnly 
                        className="flex-1 border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300"
                        value={webhookUrl}
                    />
                    <Button onClick={handleCopyWebhook} variant="secondary" leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
                        {copied ? 'Tersalin' : 'Salin URL'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
