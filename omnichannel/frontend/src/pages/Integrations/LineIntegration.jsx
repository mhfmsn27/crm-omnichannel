import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    MessageSquare, ShieldCheck, Key, RefreshCw, Copy, Check, 
    CheckCircle2, Send 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/common/Button';

export default function LineIntegration() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [channelId, setChannelId] = useState(null);
    const [copied, setCopied] = useState(false);
    const [testUserId, setTestUserId] = useState('');

    const [form, setForm] = useState({
        name: 'LINE Official Account',
        account_identifier: '@line_brand',
        channel_id: '',
        channel_secret: '',
        channel_access_token: ''
    });

    const webhookUrl = `${window.location.origin}/webhook/line`;

    useEffect(() => {
        fetchIntegration();
    }, []);

    const fetchIntegration = async () => {
        try {
            const res = await axios.get('/api/app/integrations/channels');
            const lineChannel = (res.data || []).find(c => c.channel_type === 'line');
            if (lineChannel) {
                setChannelId(lineChannel.id);
                setForm(prev => ({
                    ...prev,
                    name: lineChannel.name,
                    account_identifier: lineChannel.account_identifier,
                    channel_id: lineChannel.credentials?.channel_id || '',
                    channel_secret: lineChannel.credentials?.channel_secret || '',
                    channel_access_token: lineChannel.credentials?.channel_access_token || ''
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
                channel_type: 'line',
                name: form.name,
                account_identifier: form.channel_id || form.account_identifier,
                credentials: {
                    channel_id: form.channel_id,
                    channel_secret: form.channel_secret,
                    channel_access_token: form.channel_access_token
                },
                is_active: true
            };

            await axios.post('/api/app/integrations/channels', payload);
            toast.success("Konfigurasi LINE Official Account berhasil disimpan");
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
                test_recipient: testUserId
            });
            toast.success("Koneksi LINE Messaging API terverifikasi!");
        } catch (err) {
            toast.error("Uji coba gagal: " + (err.response?.data?.error || err.message));
        } finally {
            setTesting(false);
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
                    <div className="p-2 bg-[#06C755] text-white rounded-2xl shadow-md">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    LINE Official Account (Messaging API)
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Hubungkan akun LINE Official Account (LINE OA) bisnis Anda agar tim CS dapat merespons chat LINE langsung dari Unified Inbox CRMHUB.
                </p>
            </div>

            {/* Config Form */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Nama Channel</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="Contoh: LINE Official Store"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">LINE Channel ID</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="1651234567"
                            value={form.channel_id}
                            onChange={e => setForm({ ...form, channel_id: e.target.value, account_identifier: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">LINE Channel Secret</label>
                    <input
                        type="password"
                        className="w-full border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                        placeholder="••••••••"
                        value={form.channel_secret}
                        onChange={e => setForm({ ...form, channel_secret: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Channel Access Token (Long-Lived)</label>
                    <textarea
                        rows={3}
                        className="w-full border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                        placeholder="eyJhbGciOiJIUzI1NiI..."
                        value={form.channel_access_token}
                        onChange={e => setForm({ ...form, channel_access_token: e.target.value })}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Dapatkan kredensial Messaging API dari LINE Developers Console (developers.line.biz).</p>
                </div>

                <div className="pt-2">
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="!bg-[#06C755] hover:!bg-[#05a847] text-white font-bold"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan Kredensial LINE'}
                    </Button>
                </div>
            </div>

            {/* Webhook Callback Settings */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-slate-800/80 border border-emerald-100 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">Webhook URL LINE</h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                    Salin URL Webhook di bawah ini ke menu <i>Messaging API ➔ Webhook settings</i> di LINE Developers Console dan aktifkan opsi <b>"Use webhook"</b>:
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

            {/* Test Connection */}
            {channelId && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-3">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Send className="w-4 h-4 text-emerald-600" /> Uji Coba Pengiriman Pesan LINE
                    </h3>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 border p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="Masukkan LINE User ID tujuan uji coba (opsional, contoh: U123456789...)"
                            value={testUserId}
                            onChange={e => setTestUserId(e.target.value)}
                        />
                        <Button 
                            onClick={handleTestConnection} 
                            disabled={testing}
                            className="!bg-[#06C755] hover:!bg-[#05a847] text-white font-bold"
                        >
                            {testing ? 'Menguji...' : 'Uji Koneksi'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
