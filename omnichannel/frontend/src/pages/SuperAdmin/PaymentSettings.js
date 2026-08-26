import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ToggleLeft, ToggleRight, Edit, Save, Plus, Trash2, RefreshCw, CreditCard, Info, Banknote, Percent, Tag, Check, X } from 'lucide-react';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';

export default function PaymentSettings({ isTab = false }) {
    const [channels, setChannels] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [isCreating, setIsCreating] = useState(false);

    // Tax & Promos State
    const [taxRate, setTaxRate] = useState(0);
    const [promos, setPromos] = useState([]);
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [promoForm, setPromoForm] = useState({ type: 'percent', max_uses: 0, is_active: true });

    // TriPay Config
    const [tripayConfig, setTripayConfig] = useState({
        tripay_api_key: '',
        tripay_private_key: '',
        tripay_merchant_code: '',
        tripay_mode: 'sandbox',
        enable_tripay: false // Default off
    });

    // Xendit Config
    const [xenditConfig, setXenditConfig] = useState({
        xendit_api_key: '',
        xendit_callback_token: '',
        enable_xendit: false // Default off
    });

    const [activeTab, setActiveTab] = useState('manual'); // manual, tripay, xendit, tax_promo
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        fetchChannels();
        fetchSettings();
        fetchPromos();
    }, []);

    const fetchChannels = async () => {
        try {
            const res = await axios.get('/api/sa/payment-channels');
            setChannels(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/sa/settings');
            const config = {};
            if (res.data.tripay) {
                res.data.tripay.forEach(s => config[s.key] = s.value);
                // Convert string 'true'/'1' to boolean for toggle
                config.enable_tripay = config.enable_tripay === 'true' || config.enable_tripay === '1';
                setTripayConfig(prev => ({ ...prev, ...config }));
            }
            if (res.data.xendit) {
                res.data.xendit.forEach(s => config[s.key] = s.value);
                config.enable_xendit = config.enable_xendit === 'true' || config.enable_xendit === '1';
                setXenditConfig(prev => ({ ...prev, ...config }));
            }
            // Tax
            if (res.data.general) {
                const tax = res.data.general.find(s => s.key === 'tax_rate');
                if (tax) setTaxRate(tax.value);
            }
        } catch (err) { console.error(err); }
    };

    const fetchPromos = async () => {
        try {
            const res = await axios.get('/api/sa/promos');
            setPromos(res.data);
        } catch (err) { console.error(err); }
    };

    // --- MANUAL CHANNELS LOGIC ---
    const handleToggle = async (channel) => {
        try {
            await axios.put(`/api/sa/payment-channels/${channel.id}`, {
                ...channel,
                is_active: !channel.is_active
            });
            fetchChannels();
        } catch (err) { alert("Failed to update"); }
    };

    const handleEdit = (channel) => {
        setEditingId(channel.id);
        setEditForm(channel);
    };

    const handleSaveChannel = async () => {
        try {
            if (isCreating) {
                await axios.post('/api/sa/payment-channels', editForm);
            } else {
                await axios.put(`/api/sa/payment-channels/${editingId}`, editForm);
            }
            setEditingId(null);
            setIsCreating(false);
            setEditForm({});
            fetchChannels();
        } catch (err) { alert("Failed to save"); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this channel?")) return;
        try {
            await axios.delete(`/api/sa/payment-channels/${id}`);
            fetchChannels();
        } catch (err) { alert("Failed to delete"); }
    };

    const startCreate = () => {
        setIsCreating(true);
        setEditingId('new');
        setEditForm({ type: 'manual_bank', is_active: true });
    };

    const handleTypeChange = (e) => {
        const newType = e.target.value;
        setEditForm(prev => ({
            ...prev,
            type: newType,
            provider_name: newType === 'doku' ? 'DOKU Payment' : prev.provider_name
        }));
    };

    // --- TRIPAY LOGIC ---
    const handleSaveTripay = async () => {
        const updates = Object.keys(tripayConfig).map(key => ({
            key,
            value: tripayConfig[key],
            group: 'tripay'
        }));

        try {
            await axios.post('/api/sa/settings', updates);
            alert('TriPay settings saved successfully');
        } catch (err) { alert("Failed to save"); }
    };

    const handleSyncTripay = async () => {
        setIsSyncing(true);
        try {
            const res = await axios.post('/api/sa/payment-channels/sync-tripay');
            alert(res.data.message);
            fetchChannels();
        } catch (err) {
            alert("Sync Failed: " + (err.response?.data?.error || err.message));
        } finally {
            setIsSyncing(false);
        }
    };

    // --- XENDIT LOGIC ---
    const handleSaveXendit = async () => {
        const updates = Object.keys(xenditConfig).map(key => ({
            key,
            value: xenditConfig[key],
            group: 'xendit'
        }));

        try {
            await axios.post('/api/sa/settings', updates);
            alert('Xendit settings saved successfully');
        } catch (err) { alert("Failed to save"); }
    };



    // --- TAX & PROMO LOGIC ---
    const handleSaveTax = async () => {
        try {
            await axios.post('/api/sa/settings', [{ key: 'tax_rate', value: taxRate, group: 'general' }]);
            alert("Tax rate updated!");
        } catch (err) { alert("Failed to save tax"); }
    };

    const handleCreatePromo = async () => {
        try {
            await axios.post('/api/sa/promos', promoForm);
            setIsPromoModalOpen(false);
            setPromoForm({ type: 'percent', max_uses: 0, is_active: true });
            fetchPromos();
        } catch (err) { alert("Failed to create promo: " + (err.response?.data?.error || err.message)); }
    };

    const handleDeletePromo = async (id) => {
        if (!confirm("Delete this promo code?")) return;
        try {
            await axios.delete(`/api/sa/promos/${id}`);
            fetchPromos();
        } catch (err) { alert("Failed delete"); }
    };

    const handleTogglePromo = async (id) => {
        try {
            await axios.put(`/api/sa/promos/${id}/toggle`);
            fetchPromos();
        } catch (err) { alert("Failed toggle"); }
    };

    return (
        <div className={isTab ? "" : "p-8"}>
            {!isTab && (
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
                </div>
            )}

            <div className="flex border-b border-gray-200 mb-6">
                <button onClick={() => setActiveTab('manual')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'manual' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                    Integrated Channels
                </button>
                <button onClick={() => setActiveTab('tripay')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tripay' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                    TriPay (Add On)
                </button>
                <button onClick={() => setActiveTab('xendit')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'xendit' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                    Xendit (New)
                </button>
                <button onClick={() => setActiveTab('tax_promo')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tax_promo' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
                    Tax & Promos
                </button>
            </div>

            {/* TAB CONTENT */}

            {/* 1. TAX & PROMOS TAB */}
            {activeTab === 'tax_promo' && (
                <div className="grid gap-8 max-w-4xl">
                    {/* Tax Settings */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Percent className="w-5 h-5 text-indigo-600" />
                            Tax Settings
                        </h3>
                        <div className="flex items-end gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Global Tax Rate (PPN)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        className="border p-2 pr-8 rounded-lg w-32 font-mono text-center"
                                        value={taxRate}
                                        onChange={e => setTaxRate(e.target.value)}
                                    />
                                    <span className="absolute right-3 top-2 text-gray-400 font-bold">%</span>
                                </div>
                            </div>
                            <button onClick={handleSaveTax} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 mb-0.5">
                                Update Rate
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            This tax rate will be applied to the subtotal (after discounts) during checkout.
                        </p>
                    </div>

                    {/* Promo Codes */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Tag className="w-5 h-5 text-green-600" />
                                Promo Codes
                            </h3>
                            <button onClick={() => setIsPromoModalOpen(true)} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm">
                                <Plus className="w-4 h-4" /> Create Promo
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                    <tr>
                                        <th className="p-3">Code</th>
                                        <th className="p-3">Discount</th>
                                        <th className="p-3">Usage</th>
                                        <th className="p-3">Expires</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {promos.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3 font-mono font-bold text-gray-800">{p.code}</td>
                                            <td className="p-3">
                                                <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">
                                                    {p.type === 'percent' ? `${p.value}%` : `IDR ${parseInt(p.value).toLocaleString()}`}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-600">
                                                {p.used_count} / {p.max_uses || '∞'}
                                            </td>
                                            <td className="p-3 text-gray-600">
                                                {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : 'Never'}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => handleTogglePromo(p.id)}>
                                                    {p.is_active ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-red-400 mx-auto" />}
                                                </button>
                                            </td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleDeletePromo(p.id)} className="text-gray-400 hover:text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {promos.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-400 italic">
                                                No promo codes active.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE PROMO MODAL */}
            <Modal
                isOpen={isPromoModalOpen}
                onClose={() => setIsPromoModalOpen(false)}
                title="Create Promo Code"
                size="md"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setIsPromoModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreatePromo}>Save Promo</Button>
                    </ModalFooter>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Promo Code</label>
                        <input
                            className="w-full border p-2 rounded-lg font-mono uppercase bg-gray-50 focus:bg-white transition-colors"
                            placeholder="SUMMER2025"
                            value={promoForm.code || ''}
                            onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                            <select
                                className="w-full border p-2 rounded-lg"
                                value={promoForm.type}
                                onChange={e => setPromoForm({ ...promoForm, type: e.target.value })}
                            >
                                <option value="percent">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (IDR)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Value</label>
                            <input
                                type="number"
                                className="w-full border p-2 rounded-lg"
                                placeholder={promoForm.type === 'percent' ? "50" : "15000"}
                                value={promoForm.value || ''}
                                onChange={e => setPromoForm({ ...promoForm, value: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Uses (Optional)</label>
                            <input
                                type="number"
                                className="w-full border p-2 rounded-lg"
                                placeholder="100"
                                value={promoForm.max_uses || ''}
                                onChange={e => setPromoForm({ ...promoForm, max_uses: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry Date (Optional)</label>
                            <input
                                type="date"
                                className="w-full border p-2 rounded-lg"
                                value={promoForm.expires_at || ''}
                                onChange={e => setPromoForm({ ...promoForm, expires_at: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {activeTab === 'tripay' && (
                <div className="max-w-2xl">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${tripayConfig.enable_tripay ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">TriPay Integration</h3>
                                    <p className="text-xs text-gray-500">Enable or disable TriPay gateway globally.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setTripayConfig(prev => ({ ...prev, enable_tripay: !prev.enable_tripay }))}
                                className={`text-3xl transition-colors ${tripayConfig.enable_tripay ? 'text-green-500' : 'text-gray-300'}`}
                            >
                                {tripayConfig.enable_tripay ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                            </button>
                        </div>

                        <div className={`space-y-6 transition-opacity ${!tripayConfig.enable_tripay ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-700">Credentials</h4>
                                <button
                                    onClick={handleSyncTripay}
                                    disabled={isSyncing}
                                    className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-100 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Channels
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Mode</label>
                                <select
                                    className="w-full border p-2 rounded-lg"
                                    value={tripayConfig.tripay_mode}
                                    onChange={e => setTripayConfig({ ...tripayConfig, tripay_mode: e.target.value })}
                                >
                                    <option value="sandbox">Sandbox (Testing)</option>
                                    <option value="production">Production (Live)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Merchant Code</label>
                                <input
                                    className="w-full border p-2 rounded-lg"
                                    value={tripayConfig.tripay_merchant_code}
                                    onChange={e => setTripayConfig({ ...tripayConfig, tripay_merchant_code: e.target.value })}
                                    placeholder="T..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">API Key</label>
                                <input
                                    className="w-full border p-2 rounded-lg"
                                    type="password"
                                    value={tripayConfig.tripay_api_key}
                                    onChange={e => setTripayConfig({ ...tripayConfig, tripay_api_key: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Private Key</label>
                                <input
                                    className="w-full border p-2 rounded-lg"
                                    type="password"
                                    value={tripayConfig.tripay_private_key}
                                    onChange={e => setTripayConfig({ ...tripayConfig, tripay_private_key: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50">
                            <button onClick={handleSaveTripay} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
                                <Save className="w-4 h-4" /> Save Configuration
                            </button>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h4 className="font-bold text-gray-700 mb-4">Synced TriPay Channels</h4>
                        <div className="space-y-2">
                            {channels.filter(c => c.type === 'tripay').map(c => (
                                <div key={c.id} className="flex justify-between items-center bg-white p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">{c.provider_name}</span>
                                        <span className="text-sm text-gray-600">{c.account_number === 'Automated' ? 'Auto' : c.account_number}</span>
                                    </div>
                                    <button onClick={() => handleToggle(c)} className={`text-2xl ${c.is_active ? 'text-green-500' : 'text-gray-300'}`}>
                                        {c.is_active ? <ToggleRight /> : <ToggleLeft />}
                                    </button>
                                </div>
                            ))}
                            {channels.filter(c => c.type === 'tripay').length === 0 && (
                                <p className="text-sm text-gray-400 italic">No channels synced. Click "Sync Channels" above.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'xendit' && (
                <div className="max-w-2xl">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${xenditConfig.enable_xendit ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">Xendit Integration</h3>
                                    <p className="text-xs text-gray-500">Enable or disable Xendit gateway globally.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setXenditConfig(prev => ({ ...prev, enable_xendit: !prev.enable_xendit }))}
                                className={`text-3xl transition-colors ${xenditConfig.enable_xendit ? 'text-green-500' : 'text-gray-300'}`}
                            >
                                {xenditConfig.enable_xendit ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                            </button>
                        </div>

                        <div className={`space-y-6 transition-opacity ${!xenditConfig.enable_xendit ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Xendit API Key (Secret Key)</label>
                                <input
                                    className="w-full border p-2 rounded-lg"
                                    type="password"
                                    value={xenditConfig.xendit_api_key}
                                    onChange={e => setXenditConfig({ ...xenditConfig, xendit_api_key: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Callback Verification Token</label>
                                <input
                                    className="w-full border p-2 rounded-lg"
                                    type="password"
                                    value={xenditConfig.xendit_callback_token}
                                    onChange={e => setXenditConfig({ ...xenditConfig, xendit_callback_token: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50">
                            <button onClick={handleSaveXendit} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
                                <Save className="w-4 h-4" /> Save Configuration
                            </button>
                        </div>
                    </div>

                    <div className="mt-6">
                        <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <Info className="w-4 h-4 inline mr-2 text-indigo-500" />
                            Xendit integration is active. A single "Online Payment" option will appear on the checkout page, handling all Xendit payment methods (Virtual Accounts, E-Wallets, Retail Outlets, QRIS).
                        </p>
                    </div>
                </div>
            )}

            {activeTab === 'manual' && (
                <div className="grid gap-6">
                    <div className="flex justify-end">
                        <button onClick={startCreate} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
                            <Plus className="w-4 h-4" /> Add Bank Account
                        </button>
                    </div>

                    {/* CREATION FORM */}
                    {isCreating && (
                        <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                {editForm.type === 'doku' ? <RefreshCw className="w-5 h-5 text-purple-600" /> : <Banknote className="w-5 h-5 text-green-600" />}
                                Add New Channel
                            </h3>

                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Type</label>
                                <select
                                    className="border p-2 rounded w-full"
                                    value={editForm.type}
                                    onChange={handleTypeChange}
                                >
                                    <option value="manual_bank">Manual Bank Transfer</option>
                                    <option value="doku">DOKU (Automated)</option>
                                </select>
                            </div>

                            {editForm.type === 'manual_bank' ? (
                                <>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bank Name</label>
                                            <input className="border p-2 rounded w-full" placeholder="e.g. BCA" value={editForm.provider_name || ''} onChange={e => setEditForm({ ...editForm, provider_name: e.target.value })} />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Number</label>
                                            <input className="border p-2 rounded w-full" placeholder="1234567890" value={editForm.account_number || ''} onChange={e => setEditForm({ ...editForm, account_number: e.target.value })} />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Holder</label>
                                            <input className="border p-2 rounded w-full" placeholder="John Doe" value={editForm.account_holder || ''} onChange={e => setEditForm({ ...editForm, account_holder: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Instructions</label>
                                        <textarea className="w-full border p-2 rounded h-20 text-sm" placeholder="Transfer instructions..." value={editForm.instructions || ''} onChange={e => setEditForm({ ...editForm, instructions: e.target.value })} />
                                    </div>
                                </>
                            ) : (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 mb-4 flex items-start gap-3">
                                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <strong>Automated Payment</strong><br />
                                        DOKU configuration is handled via system environment variables (API Keys).
                                        No manual bank details are required here.
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setIsCreating(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">Cancel</button>
                                <button onClick={handleSaveChannel} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 text-sm shadow-sm">Save Channel</button>
                            </div>
                        </div>
                    )}

                    {channels.filter(c => c.type !== 'tripay' && c.type !== 'xendit').map(c => (
                        <div key={c.id} className={`bg-white p-6 rounded-xl border ${c.is_active ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-75'} shadow-sm flex justify-between items-start transition-all hover:shadow-md`}>
                            {editingId === c.id ? (
                                <div className="w-full mr-8">
                                    <h4 className="font-bold text-gray-800 mb-4">Edit {c.provider_name}</h4>

                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Provider Name</label>
                                        <input className="border p-2 rounded w-full" value={editForm.provider_name} onChange={e => setEditForm({ ...editForm, provider_name: e.target.value })} />
                                    </div>

                                    {c.type === 'manual_bank' ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Number</label>
                                                    <input className="border p-2 rounded w-full" value={editForm.account_number} onChange={e => setEditForm({ ...editForm, account_number: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Holder</label>
                                                    <input className="border p-2 rounded w-full" value={editForm.account_holder} onChange={e => setEditForm({ ...editForm, account_holder: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Instructions</label>
                                                <textarea className="w-full border p-2 rounded h-24 text-sm" value={editForm.instructions} onChange={e => setEditForm({ ...editForm, instructions: e.target.value })} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-4 flex items-center gap-2">
                                            <RefreshCw className="w-4 h-4" />
                                            Automated Channel active.
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button onClick={handleSaveChannel} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">Save Changes</button>
                                        <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${c.type === 'doku' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {c.type === 'doku' ? 'Automated' : 'Manual Transfer'}
                                        </span>
                                        <h3 className="font-bold text-lg text-gray-900">{c.provider_name}</h3>
                                    </div>

                                    {c.type === 'manual_bank' ? (
                                        <div className="text-gray-600 text-sm space-y-1 ml-1">
                                            <p className="flex items-center gap-2"><span className="font-medium w-20 text-gray-500">No. Rek:</span> <span className="font-mono font-bold bg-gray-100 px-2 rounded">{c.account_number}</span></p>
                                            <p className="flex items-center gap-2"><span className="font-medium w-20 text-gray-500">A.N:</span> <span>{c.account_holder}</span></p>
                                            <p className="text-xs text-gray-400 mt-2 line-clamp-2 italic border-l-2 border-gray-200 pl-2">{c.instructions}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                            <RefreshCw className="w-3 h-3" /> System managed integration.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col items-end gap-3 ml-4">
                                <button onClick={() => handleToggle(c)} className={`text-2xl transition-colors ${c.is_active ? 'text-green-500 hover:text-green-600' : 'text-gray-300 hover:text-gray-400'}`} title={c.is_active ? "Deactivate" : "Activate"}>
                                    {c.is_active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(c)} className="p-2 text-gray-400 hover:text-indigo-600 bg-white border border-gray-200 hover:border-indigo-200 rounded-lg transition-colors shadow-sm" title="Edit">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(c.id)} className="p-2 text-gray-400 hover:text-red-600 bg-white border border-gray-200 hover:border-red-200 rounded-lg transition-colors shadow-sm" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
