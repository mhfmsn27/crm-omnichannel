import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ShoppingBag, ShieldCheck, Key, RefreshCw, Copy, Check, 
    CheckCircle2, ExternalLink 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/common/Button';

export default function TokopediaIntegration() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [channelId, setChannelId] = useState(null);
    const [copied, setCopied] = useState(false);

    const [form, setForm] = useState({
        name: 'Tokopedia Official Store',
        account_identifier: 'FS_12345',
        fs_id: '',
        client_id: '',
        client_secret: '',
        shop_id: ''
    });

    const webhookUrl = `${window.location.origin}/webhook/tokopedia`;

    useEffect(() => {
        fetchIntegration();
    }, []);

    const fetchIntegration = async () => {
        try {
            const res = await axios.get('/api/app/integrations/channels');
            const tokpedChannel = (res.data || []).find(c => c.channel_type === 'tokopedia');
            if (tokpedChannel) {
                setChannelId(tokpedChannel.id);
                setForm(prev => ({
                    ...prev,
                    name: tokpedChannel.name,
                    account_identifier: tokpedChannel.account_identifier,
                    fs_id: tokpedChannel.credentials?.fs_id || tokpedChannel.account_identifier,
                    client_id: tokpedChannel.credentials?.client_id || '',
                    client_secret: tokpedChannel.credentials?.client_secret || '',
                    shop_id: tokpedChannel.credentials?.shop_id || ''
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
                channel_type: 'tokopedia',
                name: form.name,
                account_identifier: form.fs_id || form.account_identifier,
                credentials: {
                    fs_id: form.fs_id,
                    client_id: form.client_id,
                    client_secret: form.client_secret,
                    shop_id: form.shop_id
                },
                is_active: true
            };

            await axios.post('/api/app/integrations/channels', payload);
            toast.success("Konfigurasi Tokopedia Seller Chat berhasil disimpan");
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
                    <div className="p-2 bg-[#03AC0E] text-white rounded-2xl shadow-md">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    Tokopedia Seller Chat Bridge
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Terima dan balas pesan pembeli Tokopedia langsung dari Unified Inbox CRMHUB secara real-time via GoTo Seller Open API.
                </p>
            </div>

            {/* Config Form */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Nama Toko</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="Contoh: Official Store Tokopedia"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Fulfillment ID (FS ID)</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="12345"
                            value={form.fs_id}
                            onChange={e => setForm({ ...form, fs_id: e.target.value, account_identifier: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Client ID</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="client_id..."
                            value={form.client_id}
                            onChange={e => setForm({ ...form, client_id: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Client Secret</label>
                        <input
                            type="password"
                            className="w-full border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="••••••••"
                            value={form.client_secret}
                            onChange={e => setForm({ ...form, client_secret: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Shop ID (Opsional)</label>
                    <input
                        className="w-full border p-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                        placeholder="Contoh: 9876543"
                        value={form.shop_id}
                        onChange={e => setForm({ ...form, shop_id: e.target.value })}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Dapatkan kredensial Seller API dari Tokopedia Developer Console (developer.tokopedia.com).</p>
                </div>

                <div className="pt-2">
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="!bg-[#03AC0E] hover:!bg-[#028b0b] text-white font-bold"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan Kredensial Tokopedia'}
                    </Button>
                </div>
            </div>

            {/* Webhook Callback Settings */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-slate-800/80 border border-emerald-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#03AC0E]" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">Webhook URL Tokopedia</h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                    Masukkan URL Webhook berikut ke Tokopedia Developer Console pada modul <i>Chat Interaction Notification Webhook</i>:
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
