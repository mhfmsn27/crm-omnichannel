import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Phone, Mail, Key, Save, MessageSquare, Upload, Trash2, AlertTriangle, Palette, Sun, Moon, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../../config/api';
import { useTheme, THEME_PRESETS } from '../../context/ThemeContext';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';

export default function ProfileSettings() {
    const { themePreset, setThemePreset, isDark, toggleTheme } = useTheme();
    const [profileForm, setProfileForm] = useState({
        name: '', email: '', phone: '', password: '', confirmPassword: '', closing_message: ''
    });
    const [userAvatar, setUserAvatar] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const profileRes = await axios.get('/api/auth/me');

            // Set Profile Data
            setProfileForm(prev => ({
                ...prev,
                name: profileRes.data.name || '',
                email: profileRes.data.email || '',
                phone: profileRes.data.phone || '',
                closing_message: profileRes.data.closing_message || ''
            }));

            // Set Avatar
            setUserAvatar(profileRes.data.profile_pic_url);

        } catch (err) {
            console.error("Failed to fetch data");
            toast.error("Gagal memuat data profil");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
            return toast.error("Passwords do not match");
        }
        try {
            await axios.put('/api/auth/profile', {
                name: profileForm.name,
                email: profileForm.email,
                phone: profileForm.phone,
                password: profileForm.password,
                closing_message: profileForm.closing_message
            });
            toast.success("Profile updated successfully");
            setProfileForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
            // Trigger a reload to update header via context refresh (if implemented) or simple reload
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            toast.error("Update failed: " + (err.response?.data?.error || err.message));
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const toastId = toast.loading("Uploading avatar...");
        try {
            const res = await axios.post('/api/auth/profile-pic', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUserAvatar(res.data.url);
            toast.success("Avatar updated successfully!", { id: toastId });
            // Reload page to update header context
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            toast.error("Upload failed", { id: toastId });
        }
    };

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        if (!deletePassword) return toast.error("Password required");

        if (!confirm("Are you absolutely sure? This action cannot be undone.")) return;

        setDeleting(true);
        try {
            await axios.delete('/api/auth/profile', {
                data: { password: deletePassword }
            });
            toast.success("Account deleted.");
            // Logout and redirect
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete account");
            setDeleting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading profile...</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Profile & Settings</h2>
                <p className="text-gray-500 text-sm">Update your personal information.</p>
            </div>

            <div className="w-full space-y-8">

                {/* PROFILE FORM */}
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm w-full">
                    {/* ... (Existing profile form content - keeping it clean, but I'm inside the return block so I need to be careful with replacement) ... */}
                    {/* Instead of replacing the whole return, I will target the end of the previous form and append Danger Zone */}

                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                        <User className="w-5 h-5 text-indigo-600" /> My Profile
                    </h3>

                    {/* AVATAR SECTION */}
                    <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
                        <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden relative group">
                            {userAvatar ? (
                                <img src={getApiUrl(userAvatar)} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <User className="w-8 h-8" />
                                </div>
                            )}
                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                <Upload className="w-6 h-6 text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            </label>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Profile Picture</p>
                            <p className="text-xs text-gray-500 mt-1">Click the image to upload a new avatar.</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                    Full Name
                                </label>
                                <input
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                                    value={profileForm.name}
                                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                    WhatsApp Number
                                </label>
                                <input
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                                    value={profileForm.phone}
                                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                                    placeholder="62812345678"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                Email Address
                            </label>
                            <input
                                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50"
                                value={profileForm.email}
                                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-gray-400" /> Closing Message Template
                            </label>
                            <p className="text-xs text-gray-500 mb-2">Used when resolving chats.</p>
                            <textarea
                                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                                value={profileForm.closing_message}
                                onChange={e => setProfileForm({ ...profileForm, closing_message: e.target.value })}
                                placeholder="Terima kasih telah menghubungi kami. Semoga harimu menyenangkan!"
                            />
                        </div>

                        <div className="border-t border-gray-100 pt-6 mt-6">
                            <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <Key className="w-4 h-4 text-indigo-500" /> Change Password
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
                                    <input
                                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        type="password"
                                        value={profileForm.password}
                                        onChange={e => setProfileForm({ ...profileForm, password: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Confirm Password</label>
                                    <input
                                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        type="password"
                                        value={profileForm.confirmPassword}
                                        onChange={e => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-transform active:scale-95">
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </form>
                </div>

                {/* THEME & APPEARANCE SECTION */}
                <div className="bg-white dark:bg-dark-surface p-8 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm w-full space-y-6">
                    <div className="flex items-center gap-3 border-b border-gray-100 dark:border-dark-border pb-4">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Palette className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white text-base">Tema & Tampilan Antarmuka (UI)</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Pilih tema nuansa formal korporat dan mode pencahayaan aplikasi Anda.</p>
                        </div>
                    </div>

                    {/* Mode Terang / Gelap */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-3">
                            Mode Pencahayaan
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => isDark && toggleTheme()}
                                className={`p-4 rounded-xl border flex items-center justify-between font-semibold text-xs transition-all ${
                                    !isDark 
                                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-sm ring-2 ring-indigo-500/20' 
                                        : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Sun className="w-4 h-4 text-amber-500" />
                                    <span>Light Mode (Terang)</span>
                                </div>
                                {!isDark && <Check className="w-4 h-4 text-indigo-600" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => !isDark && toggleTheme()}
                                className={`p-4 rounded-xl border flex items-center justify-between font-semibold text-xs transition-all ${
                                    isDark 
                                        ? 'border-sky-500 bg-slate-800 text-sky-300 shadow-sm ring-2 ring-sky-500/20' 
                                        : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Moon className="w-4 h-4 text-indigo-400" />
                                    <span>Dark Mode (Gelap)</span>
                                </div>
                                {isDark && <Check className="w-4 h-4 text-sky-400" />}
                            </button>
                        </div>
                    </div>

                    {/* Presets Grid */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-3">
                            Pilihan Tema Desain Korporat
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {THEME_PRESETS.map((preset) => {
                                const isSelected = themePreset === preset.id;
                                return (
                                    <div
                                        key={preset.id}
                                        onClick={() => setThemePreset(preset.id)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between group ${
                                            isSelected 
                                                ? 'border-indigo-600 dark:border-sky-500 bg-indigo-50/40 dark:bg-slate-800/80 shadow-md ring-2 ring-indigo-500/20' 
                                                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm flex flex-col border border-black/10 shrink-0">
                                                <div className="h-2/3 w-full" style={{ backgroundColor: preset.sidebarColor }} />
                                                <div className="h-1/3 w-full" style={{ backgroundColor: preset.accentColor }} />
                                            </div>
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                                isSelected 
                                                    ? 'bg-indigo-600 dark:bg-sky-500 border-transparent text-white' 
                                                    : 'border-gray-300 dark:border-slate-700'
                                            }`}>
                                                {isSelected && <Check className="w-3 h-3" />}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <h4 className="font-bold text-xs text-gray-900 dark:text-white">
                                                    {preset.name}
                                                </h4>
                                                {preset.badge && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                                        {preset.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-normal">
                                                {preset.tagline}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* DANGER ZONE */}
                <div className="bg-red-50 p-8 rounded-xl border border-red-100 shadow-sm w-full">
                    <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Danger Zone
                    </h3>
                    <p className="text-red-600/80 text-sm mb-6">
                        Once you delete your account, there is no going back. Please be certain.
                    </p>

                    <div className="flex justify-end">
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="px-6 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <Trash2 className="w-4 h-4" /> Delete Account
                        </button>
                    </div>
                </div>

                {/* DELETE MODAL */}
                <Modal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    title="Delete Account"
                    size="md"
                    footer={
                        <ModalFooter>
                            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDeleteAccount} disabled={deleting}>
                                {deleting ? 'Deleting...' : 'Confirm Delete'}
                            </Button>
                        </ModalFooter>
                    }
                >
                    <form onSubmit={handleDeleteAccount} className="p-2">
                        <p className="text-gray-500 text-sm mb-6">
                            To confirm deletion, type your password below. This action cannot be undone.
                        </p>
                        <div className="mb-6">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password</label>
                                    <input
                                        type="password"
                                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                        autoFocus
                                    />
                                </div>

                            </form>
                </Modal>
            </div>
        </div>
    );
}
