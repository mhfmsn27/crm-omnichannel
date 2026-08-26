import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Building2, Mail, Phone, Globe, MapPin, Save, User,
    Clock, Shield, Building, CreditCard, ChevronRight, Share2, Upload, Target, Check, Briefcase, Plus, Edit, Trash2, X, MessageSquare, CheckCircle, PlusCircle, Lock, ShoppingCart, AlertTriangle, Key
} from 'lucide-react';
import Modal, { ModalFooter } from '../components/common/Modal';
import Button from '../components/common/Button';
import { format } from 'date-fns';
import { FEATURE_CONFIG } from '../config/featureConfig';

export default function OrgSettingsPage() {
    const [activeTab, setActiveTab] = useState('general'); // general, quick_replies, profile
    const [org, setOrg] = useState(null);
    const [addons, setAddons] = useState([]);
    const [activeFeatures, setActiveFeatures] = useState([]);
    const [webhook, setWebhook] = useState('');
    const [loading, setLoading] = useState(true);

    // Quick Reply State
    const [templates, setTemplates] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [templateForm, setTemplateForm] = useState({ id: null, shortcut: '', content: '' });

    // Profile State
    const [profileForm, setProfileForm] = useState({
        name: '', email: '', phone: '', password: '', confirmPassword: ''
    });

    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (activeTab === 'quick_replies') {
            fetchTemplates();
        }
    }, [activeTab]);

    const fetchData = async () => {
        try {
            // Using Promise.all to fetch everything needed
            const [orgRes, addonsRes, profileRes] = await Promise.all([
                axios.get('/api/app/organization'),
                axios.get('/api/app/billing/addons'),
                axios.get('/api/auth/me')
            ]);

            setOrg(orgRes.data);
            setWebhook(orgRes.data.webhook_url || '');
            setAddons(addonsRes.data.addons);
            setActiveFeatures(addonsRes.data.active_features || []);

            // Set Profile Data
            setProfileForm({
                name: profileRes.data.name || '',
                email: profileRes.data.email || '',
                phone: profileRes.data.phone || '',
                password: '',
                confirmPassword: ''
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await axios.get('/api/app/quick-replies?type=quick_reply');
            setTemplates(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveWebhook = async () => {
        try {
            await axios.put('/api/app/organization/webhook', { webhook_url: webhook });
            alert("Webhook saved!");
        } catch (err) {
            alert("Failed to save");
        }
    };

    const handleTemplateSubmit = async (e) => {
        e.preventDefault();
        try {
            if (templateForm.id) {
                await axios.put(`/api/app/quick-replies/${templateForm.id}`, templateForm);
            } else {
                await axios.post('/api/app/quick-replies', { ...templateForm, type: 'quick_reply' });
            }
            setIsModalOpen(false);
            fetchTemplates();
            setTemplateForm({ id: null, shortcut: '', content: '' });
        } catch (err) {
            alert(err.response?.data?.error || "Failed to save template");
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!confirm("Delete this template?")) return;
        try {
            await axios.delete(`/api/app/quick-replies/${id}`);
            fetchTemplates();
        } catch (err) {
            alert("Failed to delete");
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
            return alert("Passwords do not match");
        }
        try {
            await axios.put('/api/auth/profile', {
                name: profileForm.name,
                email: profileForm.email,
                phone: profileForm.phone,
                password: profileForm.password
            });
            alert("Profile updated successfully");
            setProfileForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (err) {
            alert("Update failed: " + (err.response?.data?.error || err.message));
        }
    };

    const openEditTemplate = (t) => {
        setTemplateForm(t);
        setIsModalOpen(true);
    };

    // Helper to check if addon is buyable
    const isLocked = (addon) => {
        if (!addon.prerequisite_feature_code) return false;
        return !activeFeatures.includes(addon.prerequisite_feature_code);
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Building className="w-8 h-8 text-indigo-600" /> Organization Settings
            </h1>

            <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'general' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Building className="w-4 h-4" /> General & Billing
                </button>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <User className="w-4 h-4" /> Profile Settings
                </button>
                <button
                    onClick={() => setActiveTab('quick_replies')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'quick_replies' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <MessageSquare className="w-4 h-4" /> Template Pesan
                </button>
            </div>

            {activeTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
                    {/* LEFT COL: Plan & Addons */}
                    <div className="lg:col-span-2 space-y-4 lg:space-y-8">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-gray-500" /> Subscription Plan
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <div>
                                        <p className="text-xs text-indigo-600 font-bold uppercase mb-1">Current Plan</p>
                                        <p className="text-xl font-bold text-indigo-900">{org.plan_name || 'Free Trial'}</p>
                                    </div>
                                    <div className="bg-indigo-200 p-2 rounded-full text-indigo-700">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Status:</span>
                                    <span className={`font-bold uppercase ${org.subscription_status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                                        {org.subscription_status}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Expires At:</span>
                                    <span className="font-mono">{org.expires_at ? format(new Date(org.expires_at), 'dd MMM yyyy') : 'No Expiry'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <PlusCircle className="w-5 h-5 text-green-600" /> Available Add-ons
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {addons.map(addon => {
                                    const locked = isLocked(addon);
                                    const prerequisiteName = locked ? (FEATURE_CONFIG[addon.prerequisite_feature_code]?.label || 'Required Feature') : '';

                                    return (
                                        <div key={addon.id} className={`border rounded-lg p-4 transition-shadow flex flex-col ${locked ? 'bg-gray-50 border-gray-200 opacity-80' : 'border-gray-200 hover:shadow-md bg-white'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-900">{addon.name}</h4>
                                                <span className={`text-xs px-2 py-1 rounded uppercase ${addon.type === 'boolean' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {addon.type === 'boolean' ? 'Unlock' : 'Limit'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-4 h-8 line-clamp-2">{addon.description}</p>

                                            <div className="mt-auto pt-2 border-t border-gray-100 flex justify-between items-center">
                                                <span className="font-bold text-indigo-600 text-sm">Rp {parseInt(addon.price_monthly).toLocaleString()}/mo</span>
                                                {locked ? (
                                                    <div className="relative group">
                                                        <button disabled className="p-2 bg-gray-300 text-white rounded-lg cursor-not-allowed flex items-center gap-1 text-xs font-bold">
                                                            <Lock className="w-3 h-3" /> Locked
                                                        </button>
                                                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                                            Requires: {prerequisiteName}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => navigate(`/billing/checkout?addon_id=${addon.id}`)}
                                                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1 text-xs font-bold"
                                                    >
                                                        <ShoppingCart className="w-3 h-3" /> Buy
                                                    </button>
                                                )}
                                            </div>
                                            {locked && (
                                                <div className="mt-2 text-[10px] text-red-500 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Needs {prerequisiteName}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {addons.length === 0 && <p className="text-gray-400 text-sm col-span-2">No add-ons available.</p>}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: Webhook */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-gray-500" /> Developer API
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                                <p className="text-xs text-gray-500 mb-3">We will send HTTP POST requests to this URL when you receive a new message.</p>
                                <input
                                    type="url"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 mb-3"
                                    placeholder="https://your-system.com/api/webhook"
                                    value={webhook}
                                    onChange={e => setWebhook(e.target.value)}
                                />
                                <button onClick={handleSaveWebhook} className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 text-sm flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> Save URL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'profile' && (
                <div className="max-w-2xl mx-auto bg-white p-4 sm:p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" /> Edit Profile
                    </h3>
                    <form onSubmit={handleUpdateProfile} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400" /> Name
                                </label>
                                <input
                                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={profileForm.name}
                                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                                    placeholder="Full Name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" /> WhatsApp
                                </label>
                                <input
                                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={profileForm.phone}
                                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                                    placeholder="62812345678"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" /> Email Address
                            </label>
                            <input
                                className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50"
                                value={profileForm.email}
                                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        <div className="border-t border-gray-100 pt-5 mt-5">
                            <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <Key className="w-4 h-4 text-gray-400" /> Change Password (Optional)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <input
                                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    type="password"
                                    value={profileForm.password}
                                    onChange={e => setProfileForm({ ...profileForm, password: e.target.value })}
                                    placeholder="New Password"
                                />
                                <input
                                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    type="password"
                                    value={profileForm.confirmPassword}
                                    onChange={e => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                                    placeholder="Confirm New Password"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200">
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'quick_replies' && (
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex flex-wrap justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-indigo-600" /> Template Library
                        </h3>
                        <button
                            onClick={() => { setTemplateForm({ id: null, shortcut: '', content: '' }); setIsModalOpen(true); }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-bold"
                        >
                            <PlusCircle className="w-4 h-4" /> Tambah Template
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                                    <th className="px-4 py-3">Shortcut</th>
                                    <th className="px-4 py-3">Isi Pesan</th>
                                    <th className="px-4 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {templates.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-mono text-sm font-bold">
                                                /{t.shortcut}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 max-w-lg truncate">
                                            {t.content}
                                        </td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button onClick={() => openEditTemplate(t)} className="p-1.5 hover:bg-gray-200 rounded text-gray-600"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteTemplate(t.id)} className="p-1.5 hover:bg-red-100 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {templates.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-8 text-center text-gray-400 text-sm">
                                            Belum ada template. Buat satu untuk mempercepat balasan agen!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL QUICK REPLY */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={templateForm.id ? 'Edit Template' : 'Tambah Template'}
                size="md"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                        <Button onClick={handleTemplateSubmit}>Simpan Template</Button>
                    </ModalFooter>
                }
            >
                <form onSubmit={handleTemplateSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kata Kunci (Shortcut)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold">/</span>
                                    <input
                                        type="text"
                                        className="w-full pl-6 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="salam"
                                        value={templateForm.shortcut}
                                        onChange={e => setTemplateForm({ ...templateForm, shortcut: e.target.value })}
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Hanya huruf kecil dan angka. Contoh: /rek, /salam</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Isi Pesan</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-32 outline-none"
                                    placeholder="Halo, selamat pagi! Ada yang bisa kami bantu?"
                                    value={templateForm.content}
                                    onChange={e => setTemplateForm({ ...templateForm, content: e.target.value })}
                                    required
                                />
                            </div>
                        </form>
            </Modal>
        </div>
    );
}
