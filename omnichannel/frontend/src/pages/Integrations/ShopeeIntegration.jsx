import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ShoppingBag, ShieldCheck, Key, RefreshCw, Copy, Check, 
    CheckCircle2, ExternalLink, Send 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/common/Button';

export default function ShopeeIntegration() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [channelId, setChannelId] = useState(null);
    const [copied, setCopied] = useState(false);

    const [form, setForm] = useState({
        name: 'Shopee Official Store',
        account_identifier: 'ID_SHOP_12345',
        partner_id: '',
        partner_key: '',
        shop_id: '',
        access_token: '',
        sandbox_mode: false
    });

    const webhookUrl = `${window.location.origin}/webhook/shopee`;

    useEffect(() => {
        fetchIntegration();
    }, []);

    const fetchIntegration = async () => {
        try {
            const res = await axios.get('/api/app/integrations/channels');
            const shopeeChannel = (res.data || []).find(c => c.channel_type === 'shopee');
            if (shopeeChannel) {
                setChannelId(shopeeChannel.id);
                setForm(prev => ({
                    ...prev,
                    name: shopeeChannel.name,
                    account_identifier: shopeeChannel.account_identifier,
                    partner_id: shopeeChannel.credentials?.partner_id || '',
                    partner_key: shopeeChannel.credentials?.partner_key || '',
                    shop_id: shopeeChannel.credentials?.shop_id || shopeeChannel.account_identifier,
                    access_token: shopeeChannel.credentials?.access_token || '',
                    sandbox_mode: shopeeChannel.credentials?.sandbox_mode || false
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
                channel_type: 'shopee',
                name: form.name,
                account_identifier: form.shop_id || form.account_identifier,
                credentials: {
                    partner_id: form.partner_id,
                    partner_key: form.partner_key,
                    shop_id: form.shop_id,
                    access_token: form.access_token,
                    sandbox_mode: form.sandbox_mode
                },
                is_active: true
            };

            await axios.post('/api/app/integrations/channels', payload);
            toast.success("Konfigurasi Shopee Seller Chat berhasil disimpan");
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
                    <div className="p-2 bg-[#EE4D2D] text-white rounded-2xl shadow-md">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    Shopee Seller Chat Bridge
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Terima dan balas pesan pembeli Shopee langsung dari Unified Inbox CRMHUB secara real-time via Shopee Open Platform V2 Seller Chat API.
                </p>
            </div>

            {/* Config Form */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Nama Toko</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="Contoh: Official Store Shopee"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Shopee Shop ID</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="12345678"
                            value={form.shop_id}
                            onChange={e => setForm({ ...form, shop_id: e.target.value, account_identifier: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Partner ID</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="partner_id..."
                            value={form.partner_id}
                            onChange={e => setForm({ ...form, partner_id: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Partner Key (App Secret)</label>
                        <input
                            type="password"
                            className="w-full border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="••••••••"
                            value={form.partner_key}
                            onChange={e => setForm({ ...form, partner_key: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Seller Access Token (OAuth 2.0)</label>
                    <textarea
                        rows={2}
                        className="w-full border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                        placeholder="shopee_access_token_..."
                        value={form.access_token}
                        onChange={e => setForm({ ...form, access_token: e.target.value })}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Dapatkan kredensial Seller Chat API dari Shopee Open Platform Console (open.shopee.com).</p>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.sandbox_mode}
                            onChange={e => setForm({ ...form, sandbox_mode: e.target.checked })}
                            className="rounded text-[#EE4D2D] focus:ring-[#EE4D2D]"
                        />
                        <span className="text-xs font-bold text-gray-800 dark:text-white">Gunakan Shopee Test Environment (Sandbox)</span>
                    </label>
                </div>

                <div className="pt-2">
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="!bg-[#EE4D2D] hover:!bg-[#d83c1d] text-white font-bold"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan Kredensial Shopee'}
                    </Button>
                </div>
            </div>

            {/* Webhook Callback Settings */}
            <div className="p-5 rounded-2xl bg-orange-50/70 dark:bg-slate-800/80 border border-orange-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#EE4D2D]" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">Webhook Push URL Shopee</h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                    Masukkan URL Push Webhook berikut ke Shopee Open Platform pada bagian <i>Webhook Subscriptions ➔ Code 10 (Chat Message)</i>:
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
