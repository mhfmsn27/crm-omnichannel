import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, RefreshCw, X, Copy, Trash2, Check, ExternalLink, MessageSquare, Plus, CheckCircle, Smartphone, Globe, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';

export default function AppDetailModal({ isOpen, onClose, app, onSave }) {
    const [form, setForm] = useState({ name: '', webhook_url: '', is_active: true, channels: [] });
    const [currentApiKey, setCurrentApiKey] = useState('');
    const [availableChannels, setAvailableChannels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [keyLoading, setKeyLoading] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(true);

    // Effect: Reset verification status when URL changes
    useEffect(() => {
        if (!form.webhook_url) {
            setIsVerified(false); // Webhook URL is required
            return;
        }
        // If editing and value matches original, it's valid
        if (app && form.webhook_url === app.webhook_url) {
            setIsVerified(true);
            return;
        }
        // Otherwise, it's a new or changed URL that needs verification
        setIsVerified(false);
    }, [form.webhook_url, app]);

    const handleVerifyWebhook = async () => {
        if (!form.webhook_url) return;
        setVerifying(true);
        try {
            const res = await axios.post('/api/app/developer/verify-webhook', { url: form.webhook_url });
            toast.success(res.data.message || "Webhook Valid!");
            setIsVerified(true);
        } catch (err) {
            const msg = err.response?.data?.error || "Gagal memverifikasi Webhook";
            const detail = err.response?.data?.detail ? ` (${err.response.data.detail})` : '';
            toast.error(msg + detail);
            setIsVerified(false);
        } finally {
            setVerifying(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchAvailableChannels();
            if (app) {
                fetchAppDetails(app.id);
                setCurrentApiKey(app.api_key || '');
            } else {
                setForm({ name: '', webhook_url: '', is_active: true, channels: [] });
                setCurrentApiKey('');
            }
            setShowKey(false);
        }
    }, [isOpen, app]);

    const fetchAvailableChannels = async () => {
        try {
            const [devRes, msgRes, igRes, tgRes] = await Promise.all([
                axios.get('/api/app/devices'),
                axios.get('/api/app/messenger/pages'),
                axios.get('/api/app/instagram/accounts'),
                axios.get('/api/app/telegram/bots')
            ]);

            const all = [];

            // WhatsApp
            devRes.data.forEach(d => {
                if (d.status === 'connected') all.push({ type: 'whatsapp', session_id: d.session_id, name: `WhatsApp: ${d.name}`, channel: 'whatsapp' });
            });
            // Messenger
            msgRes.data.forEach(d => {
                if (d.is_active) all.push({ type: 'messenger', session_id: d.page_id, name: `Messenger: ${d.page_name}`, channel: 'messenger' });
            });
            // Instagram
            igRes.data.forEach(d => {
                if (d.is_active) all.push({ type: 'instagram', session_id: d.ig_id, name: `Instagram: @${d.username}`, channel: 'instagram' });
            });
            // Telegram
            tgRes.data.forEach(d => {
                if (d.is_active) all.push({ type: 'telegram', session_id: d.bot_token, name: `Telegram: @${d.username}`, channel: 'telegram' });
            });

            setAvailableChannels(all);
        } catch (e) { }
    };

    const fetchAppDetails = async (id) => {
        try {
            const res = await axios.get(`/api/app/developer/apps/${id}`);
            const data = res.data;
            setForm({
                name: data.name,
                webhook_url: data.webhook_url || '',
                is_active: data.is_active,
                channels: data.channels || []
            });
            if (data.api_key) setCurrentApiKey(data.api_key);
        } catch (e) { toast.error("Failed to load app details"); }
    };

    const handleSave = async () => {
        if (!form.name) return toast.error("Name required");
        setLoading(true);
        try {
            if (app) {
                await axios.put(`/api/app/developer/apps/${app.id}`, form);
                toast.success("App updated");
            } else {
                await axios.post('/api/app/developer/apps', form);
                toast.success("App created");
            }
            onSave();
            onClose();
        } catch (err) {
            toast.error("Failed: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateKey = async () => {
        if (!confirm("Regenerate API Key? The old key will stop working immediately.")) return;
        setKeyLoading(true);
        try {
            const res = await axios.post(`/api/app/developer/apps/${app.id}/regenerate-key`);
            toast.success("Key regenerated");
            // Update local state to show new key immediately
            setCurrentApiKey(res.data.api_key);
            onSave(); // Refresh parent list
        } catch (e) { toast.error("Failed"); }
        finally { setKeyLoading(false); }
    };

    const handleCopyKey = () => {
        navigator.clipboard.writeText(currentApiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("API Key copied!");
    };

    const addChannel = (sessionId) => {
        const channelData = availableChannels.find(d => d.session_id === sessionId);
        if (!channelData) return;

        if (form.channels.some(c => c.session_id === sessionId)) return;

        setForm(prev => ({
            ...prev,
            channels: [...prev.channels, channelData]
        }));
    };

    const removeChannel = (idx) => {
        setForm(prev => ({
            ...prev,
            channels: prev.channels.filter((_, i) => i !== idx)
        }));
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={app ? 'Edit App' : 'Create New App'}
            size="lg"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-end gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onClick={handleSave} disabled={loading || !isVerified} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {app ? 'Save Changes' : 'Create App'}
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-6">
                {/* General */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">App Name</label>
                        <input className="w-full border p-2 rounded-lg text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My Online Store" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Webhook URL <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                            <Globe className="w-5 h-5 text-gray-400 mt-2" />
                            <input
                                className="flex-1 border p-2 rounded-lg text-sm font-mono"
                                value={form.webhook_url}
                                onChange={e => setForm({ ...form, webhook_url: e.target.value })}
                                placeholder="https://api.mysite.com/webhook"
                            />
                            <button
                                onClick={handleVerifyWebhook}
                                disabled={!form.webhook_url || loading || verifying}
                                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 border border-gray-200 disabled:opacity-50 flex items-center gap-1"
                            >
                                {verifying ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Verify'}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">We'll send a POST request with JSON payload for incoming messages.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
                        <span className="text-sm text-gray-700">Enable App</span>
                    </div>
                </div>

                {/* API Key (Edit Only) */}
                {app && (
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-700 text-xs uppercase flex items-center gap-1"><Lock className="w-3 h-3" /> Credentials</h4>
                            {keyLoading && <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />}
                        </div>

                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">API Key</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showKey ? "text" : "password"}
                                        readOnly
                                        value={currentApiKey}
                                        className="w-full border p-2 rounded-lg text-sm font-mono bg-white text-gray-600 pr-10"
                                    />
                                    <button
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button
                                    onClick={handleCopyKey}
                                    className="p-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-500 transition-colors"
                                    title="Copy Key"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                            <span className="text-xs text-red-600">Compromised key?</span>
                            <button
                                onClick={handleRegenerateKey}
                                disabled={keyLoading}
                                className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                            >
                                Regenerate Key
                            </button>
                        </div>
                    </div>
                )}

                {/* Channel Assignments */}
                <div>
                    <h4 className="font-bold text-gray-700 text-sm mb-3 border-b pb-2">Connected Channels</h4>

                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                        {form.channels.map((ch, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-2">
                                    {ch.channel === 'whatsapp' ? <Smartphone className="w-4 h-4 text-green-500" /> : <MessageSquare className="w-4 h-4 text-blue-500" />}
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 leading-tight">{ch.name}</p>
                                        <p className="text-xs text-gray-500 font-mono">{ch.session_id}</p>
                                    </div>
                                </div>
                                <button onClick={() => removeChannel(idx)} className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                        {form.channels.length === 0 && (
                            <div className="text-center p-4 border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm">
                                No channels connected. Select below to add.
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Available Devices</label>
                        <div className="flex gap-2 flex-wrap">
                            {availableChannels.map(ch => {
                                const isAdded = form.channels.some(c => c.session_id === ch.session_id);
                                return (
                                    <button
                                        key={ch.session_id}
                                        disabled={isAdded}
                                        onClick={() => addChannel(ch.session_id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 border transition-colors ${isAdded ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'}`}
                                    >
                                        {isAdded ? <CheckCircle className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                        {ch.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
