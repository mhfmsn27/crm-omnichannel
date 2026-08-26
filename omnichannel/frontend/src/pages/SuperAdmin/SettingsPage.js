import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Image, Mail, Upload, User, Users, Megaphone, Trash2, ToggleLeft, ToggleRight, Link as LinkIcon, CreditCard, Music, Volume2, ChevronRight, LayoutTemplate, Facebook, MessageCircle, Info, Zap } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../config/api';
import PaymentSettings from './PaymentSettings';

export default function SettingsPage() {
    const { refreshConfig } = useConfig();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({ general: [], smtp: [] });
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [testEmail, setTestEmail] = useState('');

    // Profile Form
    const [profileForm, setProfileForm] = useState({
        name: '', email: '', password: '', confirmPassword: ''
    });

    // Announcement Form
    const [announcementForm, setAnnouncementForm] = useState({
        title: '', content: '', type: 'info', image_url: '', link_url: '', placement: 'dashboard'
    });
    const [bannerImage, setBannerImage] = useState(null);
    const [payoutRequests, setPayoutRequests] = useState([]);

    // Helper to extract value easily
    const getVal = (group, key) => {
        const item = settings[group]?.find(s => s.key === key);
        return item ? item.value : '';
    };

    const handleChange = (group, key, value) => {
        setSettings(prev => {
            const groupItems = prev[group] ? [...prev[group]] : [];
            const existingIndex = groupItems.findIndex(s => s.key === key);

            if (existingIndex >= 0) {
                groupItems[existingIndex] = { ...groupItems[existingIndex], value };
            } else {
                // Add new setting item if it doesn't exist in state
                groupItems.push({ key, value, group_name: group, type: 'text' });
            }

            return {
                ...prev,
                [group]: groupItems
            };
        });
    };

    useEffect(() => {
        fetchSettings();
        if (user) fetchMyProfile();
    }, [user]);

    useEffect(() => {
        if (activeTab === 'announcements') fetchAnnouncements();
        if (activeTab === 'affiliate') fetchPayoutRequests();
    }, [activeTab]);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/sa/settings');
            setSettings(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            const res = await axios.get('/api/sa/announcements');
            setAnnouncements(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPayoutRequests = async () => {
        try {
            const res = await axios.get('/api/sa/affiliate/payouts');
            setPayoutRequests(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handlePayoutAction = async (id, status) => {
        if (!confirm(`Mark this payout as ${status}?`)) return;
        try {
            await axios.put(`/api/sa/affiliate/payouts/${id}`, { status });
            fetchPayoutRequests();
            alert("Status updated");
        } catch (err) {
            alert("Error updating status");
        }
    };

    const fetchMyProfile = async () => {
        try {
            const res = await axios.get('/api/auth/me');
            setProfileForm(prev => ({
                ...prev,
                name: res.data.name,
                email: res.data.email
            }));
        } catch (err) {
            console.error("Failed to fetch profile");
        }
    };

    const handleSave = async (group) => {
        // Save only items that belong to the group
        const updates = settings[group].map(s => ({
            key: s.key,
            value: s.value,
            group: group, // Ensure group is preserved
            type: s.type || 'text'
        }));
        try {
            await axios.post('/api/sa/settings', updates);
            alert('Settings saved successfully');
            if (group === 'general') refreshConfig();
        } catch (err) {
            alert("Failed to save settings");
        }
    };

    const handleUpload = async (key, file) => {
        const formData = new FormData();
        formData.append('key', key);
        formData.append('file', file);
        try {
            const res = await axios.post('/api/sa/settings/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            handleChange('general', key, res.data.url);
            refreshConfig();
        } catch (err) {
            alert("Upload failed");
        }
    };

    const handleTestSmtp = async () => {
        if (!testEmail) return alert("Enter target email first");

        // Prepare payload from current state (allows testing unsaved values)
        const payload = {
            host: getVal('smtp', 'smtp_host'),
            port: getVal('smtp', 'smtp_port'),
            user: getVal('smtp', 'smtp_user'),
            pass: getVal('smtp', 'smtp_pass'),
            from_name: getVal('smtp', 'smtp_from_name'),
            from_email: getVal('smtp', 'smtp_from_email'),
            email: testEmail
        };

        try {
            const res = await axios.post('/api/sa/settings/test-smtp', payload);
            alert(res.data.message);
        } catch (err) {
            alert("Test failed: " + (err.response?.data?.error || err.message));
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
            return alert("Passwords do not match");
        }
        try {
            await axios.put('/api/auth/profile', {
                name: profileForm.name, email: profileForm.email, password: profileForm.password
            });
            alert("Profile updated successfully");
            setProfileForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (err) {
            alert("Update failed: " + (err.response?.data?.error || err.message));
        }
    };

    // --- ANNOUNCEMENT HANDLERS ---
    const handleAddAnnouncement = async (e) => {
        e.preventDefault();
        let finalImageUrl = announcementForm.image_url;

        if (bannerImage) {
            const formData = new FormData();
            formData.append('file', bannerImage);
            formData.append('key', 'announcement_upload');
            try {
                const uploadRes = await axios.post('/api/sa/cms/landing/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                finalImageUrl = uploadRes.data.url;
            } catch (err) {
                return alert("Image upload failed");
            }
        }

        try {
            await axios.post('/api/sa/announcements', { ...announcementForm, image_url: finalImageUrl });
            setAnnouncementForm({ title: '', content: '', type: 'info', image_url: '', link_url: '', placement: 'dashboard' });
            setBannerImage(null);
            fetchAnnouncements();
        } catch (err) {
            alert("Failed to add announcement");
        }
    };

    const handleToggleAnnouncement = async (id, currentStatus) => {
        try {
            await axios.post(`/api/sa/announcements/${id}/toggle`, { is_active: !currentStatus });
            fetchAnnouncements();
        } catch (err) { alert("Failed to toggle"); }
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!confirm("Delete this banner?")) return;
        try {
            await axios.delete(`/api/sa/announcements/${id}`);
            fetchAnnouncements();
        } catch (err) { alert("Failed to delete"); }
    };

    const playSound = (url) => {
        if (!url) return;
        const audio = new Audio(getApiUrl(url));
        audio.play();
    };

    const NavItem = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group mb-2 ${activeTab === id
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-sm'
                : 'text-gray-600 hover:bg-white hover:shadow-sm border border-transparent'
                }`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${activeTab === id ? 'bg-white' : 'bg-gray-100 group-hover:bg-indigo-50'}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm">{label}</span>
            </div>
            {activeTab === id ? (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
            ) : (
                <ChevronRight className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />
            )}
        </button>
    );

    if (loading) return <div className="p-8">Loading Settings...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row gap-8 items-start">

                {/* LEFT SIDEBAR: MENU */}
                <aside className="w-full md:w-64 flex-shrink-0 sticky top-6">
                    <div className="mb-6 px-2">
                        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                        <p className="text-xs text-gray-500 mt-1">Configure global application parameters.</p>
                    </div>

                    <div className="space-y-1">
                        <NavItem id="general" icon={Image} label="General & Branding" />
                        <NavItem id="meta_config" icon={Facebook} label="Meta App Config" />
                        <NavItem id="announcements" icon={Megaphone} label="Announcements" />
                        <NavItem id="smtp" icon={Mail} label="SMTP Configuration" />
                        {/* <NavItem id="payment" icon={CreditCard} label="Payment Gateway" /> */}
                        {/* <NavItem id="affiliate" icon={Users} label="Affiliate System" /> */}
                        <NavItem id="profile" icon={User} label="Admin Profile" />
                    </div>
                </aside>

                {/* RIGHT CONTENT */}
                <main className="flex-1 w-full bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[600px] p-8">
                    <div className="mb-8 border-b border-gray-100 pb-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 capitalize">
                                {activeTab === 'smtp' ? 'SMTP Configuration' : activeTab.replace('_', ' ')}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Manage your {activeTab.replace('_', ' ')} settings.</p>
                        </div>
                    </div>

                    {/* TAB: META CONFIG */}
                    {activeTab === 'meta_config' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-bold text-blue-800 flex items-center gap-2">
                                    <Info className="w-5 h-5" /> Important Note
                                </h4>
                                <p className="text-sm text-blue-700 mt-1">
                                    Control Meta integrations (Facebook Login, WhatsApp Cloud API, Messenger, Instagram). <br />
                                    <strong>Public App IDs</strong> are exposed to frontend. <strong>Secrets</strong> are secure backend-only.
                                </p>
                            </div>

                            {/* Facebook Login */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-[#1877F2] text-white flex items-center justify-center"><Facebook className="w-5 h-5" /></span>
                                    Facebook Login
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="block text-sm font-medium mb-1">Facebook App ID</label><input type="text" className="w-full px-3 py-2 border rounded font-mono" value={getVal('meta_config', 'facebook_app_id')} onChange={e => handleChange('meta_config', 'facebook_app_id', e.target.value)} /></div>
                                    <div><label className="block text-sm font-medium mb-1">Facebook App Secret</label><input type="password" className="w-full px-3 py-2 border rounded font-mono" value={getVal('meta_config', 'facebook_app_secret')} onChange={e => handleChange('meta_config', 'facebook_app_secret', e.target.value)} /></div>
                                </div>
                            </div>

                            {/* WhatsApp Cloud API */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center"><MessageCircle className="w-5 h-5" /></span>
                                    WhatsApp Cloud API
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="block text-sm font-medium mb-1">WA App ID</label><input type="text" className="w-full px-3 py-2 border rounded font-mono" value={getVal('meta_config', 'wa_app_id')} onChange={e => handleChange('meta_config', 'wa_app_id', e.target.value)} /></div>
                                    <div><label className="block text-sm font-medium mb-1">WA App Secret</label><input type="password" className="w-full px-3 py-2 border rounded font-mono" value={getVal('meta_config', 'wa_secret')} onChange={e => handleChange('meta_config', 'wa_secret', e.target.value)} /></div>
                                    <div><label className="block text-sm font-medium mb-1">Config ID (BYOK)</label><input type="text" className="w-full px-3 py-2 border rounded font-mono" value={getVal('meta_config', 'wa_config_id_byok')} onChange={e => handleChange('meta_config', 'wa_config_id_byok', e.target.value)} placeholder="For WhatsApp API Page" /></div>
                                    <div><label className="block text-sm font-medium mb-1">Config ID (CoEx)</label><input type="text" className="w-full px-3 py-2 border rounded font-mono" value={getVal('meta_config', 'wa_config_id_coex')} onChange={e => handleChange('meta_config', 'wa_config_id_coex', e.target.value)} placeholder="For WhatsApp CoEx Page" /></div>
                                </div>
                            </div>

                            {/* Messenger & Instagram */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center"><Zap className="w-5 h-5" /></span>
                                    Messenger & Instagram
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="block text-sm font-medium mb-1">Messenger App ID</label><input type="text" className="w-full px-3 py-2 border rounded font-mono" value={getVal('meta_config', 'messenger_app_id')} onChange={e => handleChange('meta_config', 'messenger_app_id', e.target.value)} /></div>
                                    <div><label className="block text-sm font-medium mb-1">Messenger Secret</label><input type="password" className="w-full px-3 py-2 border rounded font-mono" value={getVal('meta_config', 'messenger_secret')} onChange={e => handleChange('meta_config', 'messenger_secret', e.target.value)} /></div>
                                    <div><label className="block text-sm font-medium mb-1">Instagram App ID</label><input type="text" className="w-full px-3 py-2 border rounded font-mono" value={getVal('meta_config', 'instagram_app_id')} onChange={e => handleChange('meta_config', 'instagram_app_id', e.target.value)} /></div>
                                    <div><label className="block text-sm font-medium mb-1">Instagram Secret</label><input type="password" className="w-full px-3 py-2 border rounded font-mono" value={getVal('meta_config', 'instagram_secret')} onChange={e => handleChange('meta_config', 'instagram_secret', e.target.value)} /></div>
                                </div>

                                {/* Webhook URLs for Meta Developer Console */}
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">🔗 Webhook URLs — Daftarkan di Meta Developer Console</p>
                                    {[
                                        { label: 'Messenger Callback URL', path: '/webhook/messenger' },
                                        { label: 'Instagram Callback URL', path: '/webhook/instagram' },
                                    ].map(({ label, path }) => {
                                        const url = (import.meta.env.VITE_API_BASE_URL || window.location.origin) + path;
                                        return (
                                            <div key={path} className="flex items-center gap-2">
                                                <span className="text-xs text-blue-600 font-medium w-44 shrink-0">{label}:</span>
                                                <code className="flex-1 text-xs bg-white border border-blue-200 rounded px-2 py-1 font-mono text-gray-700 truncate">{url}</code>
                                                <button
                                                    onClick={() => { navigator.clipboard.writeText(url); }}
                                                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 shrink-0"
                                                    title="Copy URL"
                                                >Copy</button>
                                            </div>
                                        );
                                    })}
                                    <p className="text-xs text-blue-500 mt-1">Verify Token: <code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-mono">reply_saas_verify</code></p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <button onClick={() => handleSave('meta_config')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Save Meta Config
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB: GENERAL */}
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* App Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Application Name</label>
                                <input
                                    type="text"
                                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500"
                                    value={getVal('general', 'app_name')}
                                    onChange={e => handleChange('general', 'app_name', e.target.value)}
                                    placeholder="My SaaS"
                                />
                            </div>

                            {/* Branding Images */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Logo */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">App Logo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
                                            {getVal('general', 'app_logo') ? <img src={getApiUrl(getVal('general', 'app_logo'))} alt="Logo" className="w-full h-full object-contain" /> : <Image className="w-8 h-8 text-gray-400" />}
                                        </div>
                                        <div>
                                            <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2">
                                                <Upload className="w-4 h-4" /> Upload
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload('app_logo', e.target.files[0])} />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Favicon */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Favicon (.ico / .png)</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
                                            {getVal('general', 'app_favicon') ? <img src={getApiUrl(getVal('general', 'app_favicon'))} alt="Favicon" className="w-8 h-8 object-contain" /> : <div className="text-xs text-gray-400">No Icon</div>}
                                        </div>
                                        <div>
                                            <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2">
                                                <Upload className="w-4 h-4" /> Upload
                                                <input type="file" className="hidden" accept="image/x-icon,image/png" onChange={e => handleUpload('app_favicon', e.target.files[0])} />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Login Banner */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Login Banner</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-32 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url(${getApiUrl(getVal('general', 'login_banner'))})` }}>
                                            {!getVal('general', 'login_banner') && <Image className="w-8 h-8 text-gray-400" />}
                                        </div>
                                        <div>
                                            <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2">
                                                <Upload className="w-4 h-4" /> Upload
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload('login_banner', e.target.files[0])} />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Notification Sound */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Notification Sound (.mp3)</label>
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 px-4 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 gap-2 min-w-[120px]">
                                            <Music className="w-5 h-5 text-gray-400" />
                                            {getVal('general', 'notification_sound') ? (
                                                <button onClick={() => playSound(getVal('general', 'notification_sound'))} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                                    <Volume2 className="w-3 h-3" /> Play
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">Default</span>
                                            )}
                                        </div>
                                        <div>
                                            <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2">
                                                <Upload className="w-4 h-4" /> Upload
                                                <input type="file" className="hidden" accept="audio/mp3,audio/mpeg" onChange={e => handleUpload('notification_sound', e.target.files[0])} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <button onClick={() => handleSave('general')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Save General
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB: ANNOUNCEMENTS */}
                    {activeTab === 'announcements' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                <h3 className="font-bold text-gray-800 mb-4">Add New Banner</h3>
                                <form onSubmit={handleAddAnnouncement} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                                        <input
                                            className="w-full border p-2 rounded"
                                            value={announcementForm.title}
                                            onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                                            placeholder="e.g. System Maintenance"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message</label>
                                        <textarea
                                            className="w-full border p-2 rounded"
                                            value={announcementForm.content}
                                            onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                                            placeholder="Details..."
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                        <select
                                            className="w-full border p-2 rounded"
                                            value={announcementForm.type}
                                            onChange={e => setAnnouncementForm({ ...announcementForm, type: e.target.value })}
                                        >
                                            <option value="info">Info (Blue)</option>
                                            <option value="warning">Warning (Red/Orange)</option>
                                            <option value="promo">Promo (Green)</option>
                                            <option value="inbox_promo">Inbox Promo (Purple)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Placement</label>
                                        <select
                                            className="w-full border p-2 rounded"
                                            value={announcementForm.placement}
                                            onChange={e => setAnnouncementForm({ ...announcementForm, placement: e.target.value })}
                                        >
                                            <option value="dashboard">Dashboard</option>
                                            <option value="inbox">Inbox</option>
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1">Inbox placement shows grid banners before chat selection (Rec: 1280x720)</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Link URL (Optional)</label>
                                        <input
                                            className="w-full border p-2 rounded"
                                            value={announcementForm.link_url}
                                            onChange={e => setAnnouncementForm({ ...announcementForm, link_url: e.target.value })}
                                            placeholder="https://example.com/promo"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Banner Image (Optional)</label>
                                        <input type="file" className="w-full text-sm" onChange={e => setBannerImage(e.target.files[0])} />
                                    </div>
                                    <div className="col-span-2">
                                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded font-bold text-sm">Publish Banner</button>
                                    </div>
                                </form>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-800 mb-4">Active Announcements</h3>
                                <div className="space-y-3">
                                    {announcements.map(ann => (
                                        <div key={ann.id} className={`flex items-center p-4 border rounded-lg ${ann.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-70'}`}>
                                            {ann.image_url && (
                                                <img src={getApiUrl(ann.image_url)} className="w-12 h-12 rounded object-cover mr-4" alt="" />
                                            )}
                                            <div className="flex-1">
                                                <h4 className="font-bold text-sm flex items-center gap-2">
                                                    {ann.title}
                                                    <span className="text-xs font-normal text-gray-500 uppercase">({ann.type})</span>
                                                    {ann.placement === 'inbox' && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 rounded-full font-bold">INBOX</span>}
                                                    {ann.link_url && <LinkIcon className="w-3 h-3 text-indigo-400" />}
                                                </h4>
                                                <p className="text-sm text-gray-600 line-clamp-2">{ann.content}</p>
                                                {ann.link_url && <p className="text-xs text-blue-500 truncate max-w-xs">{ann.link_url}</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleToggleAnnouncement(ann.id, ann.is_active)} className={ann.is_active ? "text-green-600" : "text-gray-400"}>
                                                    {ann.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                                </button>
                                                <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-red-400 hover:text-red-600 p-1">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {announcements.length === 0 && <p className="text-gray-400 text-sm text-center">No announcements.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: SMTP */}
                    {activeTab === 'smtp' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-sm font-medium mb-1">SMTP Host</label><input type="text" className="w-full px-3 py-2 border rounded" value={getVal('smtp', 'smtp_host')} onChange={e => handleChange('smtp', 'smtp_host', e.target.value)} /></div>
                                <div><label className="block text-sm font-medium mb-1">SMTP Port</label><input type="number" className="w-full px-3 py-2 border rounded" value={getVal('smtp', 'smtp_port')} onChange={e => handleChange('smtp', 'smtp_port', e.target.value)} /></div>
                                <div><label className="block text-sm font-medium mb-1">User</label><input type="text" className="w-full px-3 py-2 border rounded" value={getVal('smtp', 'smtp_user')} onChange={e => handleChange('smtp', 'smtp_user', e.target.value)} /></div>
                                <div><label className="block text-sm font-medium mb-1">Pass</label><input type="password" className="w-full px-3 py-2 border rounded" value={getVal('smtp', 'smtp_pass')} onChange={e => handleChange('smtp', 'smtp_pass', e.target.value)} /></div>
                                <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
                                    <h4 className="text-sm font-bold text-gray-800 mb-3">Sender Identity (Optional)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Sender Name</label>
                                            <input type="text" className="w-full px-3 py-2 border rounded" placeholder="e.g. My Business" value={getVal('smtp', 'smtp_from_name')} onChange={e => handleChange('smtp', 'smtp_from_name', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Sender Email</label>
                                            <input type="email" className="w-full px-3 py-2 border rounded" placeholder="e.g. no-reply@mybusiness.com" value={getVal('smtp', 'smtp_from_email')} onChange={e => handleChange('smtp', 'smtp_from_email', e.target.value)} />
                                            <p className="text-[10px] text-gray-400 mt-1">Leave empty to use SMTP User email.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => handleSave('smtp')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Save SMTP</button>

                            {/* Test Section */}
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> Test Configuration
                                </h4>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1 max-w-md">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Send Test Email To</label>
                                        <input
                                            type="email"
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                            placeholder="your@email.com"
                                            value={testEmail}
                                            onChange={e => setTestEmail(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={handleTestSmtp}
                                        disabled={!testEmail}
                                        className="px-4 py-2 bg-gray-800 text-white rounded-lg font-bold text-sm hover:bg-black disabled:opacity-50 flex items-center gap-2"
                                    >
                                        Send Test Email
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    We will attempt to send an email using the credentials above (un-saved changes included).
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB: PAYMENT GATEWAY */}
                    {activeTab === 'payment' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <PaymentSettings isTab={true} />
                        </div>
                    )}

                    {/* TAB: AFFILIATE */}
                    {activeTab === 'affiliate' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Commission Settings */}
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                <h3 className="font-bold text-gray-800 mb-4">Commission Configuration</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Commission Rate (%)</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            value={getVal('affiliate', 'affiliate_commission_rate')}
                                            onChange={e => handleChange('affiliate', 'affiliate_commission_rate', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min Payout (IDR)</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            value={getVal('affiliate', 'affiliate_min_payout')}
                                            onChange={e => handleChange('affiliate', 'affiliate_min_payout', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button onClick={() => handleSave('affiliate')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2">
                                        <Save className="w-4 h-4" /> Save Settings
                                    </button>
                                </div>
                            </div>

                            {/* Payout Requests */}
                            <div>
                                <h3 className="font-bold text-gray-800 mb-4">Payout Requests</h3>
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                            <tr>
                                                <th className="px-6 py-3">Partner</th>
                                                <th className="px-6 py-3">Amount</th>
                                                <th className="px-6 py-3">Bank Details</th>
                                                <th className="px-6 py-3">Status</th>
                                                <th className="px-6 py-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {payoutRequests.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">No requests found.</td>
                                                </tr>
                                            ) : (
                                                payoutRequests.map(p => (
                                                    <tr key={p.id} className="hover:bg-gray-50/50">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold">{p.partner_name}</div>
                                                            <div className="text-xs text-gray-500">{p.partner_email}</div>
                                                            <div className="text-xs text-indigo-500">{new Date(p.requested_at).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-gray-900">
                                                            Rp {parseInt(p.amount).toLocaleString('id-ID')}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-xs max-w-xs whitespace-pre-wrap">{p.bank_details}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                p.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                                    'bg-red-100 text-red-700'
                                                                }`}>
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {p.status === 'pending' && (
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => handlePayoutAction(p.id, 'approved')} className="px-3 py-1 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600">Approve</button>
                                                                    <button onClick={() => handlePayoutAction(p.id, 'rejected')} className="px-3 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600">Reject</button>
                                                                </div>
                                                            )}
                                                            {p.status === 'approved' && <span className="text-xs text-gray-400 italic">Processed on {new Date(p.processed_at).toLocaleDateString()}</span>}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: PROFILE */}
                    {activeTab === 'profile' && (
                        <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <input className="w-full border p-2 rounded" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="Name" required />
                                <input className="w-full border p-2 rounded" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="Email" required />
                                <input className="w-full border p-2 rounded" type="password" value={profileForm.password} onChange={e => setProfileForm({ ...profileForm, password: e.target.value })} placeholder="New Password" />
                                <input className="w-full border p-2 rounded" type="password" value={profileForm.confirmPassword} onChange={e => setProfileForm({ ...profileForm, confirmPassword: e.target.value })} placeholder="Confirm Password" />
                                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Update Profile</button>
                            </form>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
