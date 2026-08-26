import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Phone, Mail, Key, Save, MessageSquare, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../../config/api';
import Modal, { ModalFooter } from '../../components/common/Modal';

export default function AccountProfilePage() {
    const [form, setForm] = useState({
        name: '', email: '', phone: '', password: '', confirmPassword: '', closing_message: ''
    });
    const [userAvatar, setUserAvatar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await axios.get('/api/auth/me');
            setForm(prev => ({
                ...prev,
                name: res.data.name || '',
                email: res.data.email || '',
                phone: res.data.phone || '',
                closing_message: res.data.closing_message || ''
            }));
            setUserAvatar(res.data.profile_pic_url);
        } catch (err) {
            toast.error('Gagal memuat data profil');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (form.password && form.password !== form.confirmPassword) {
            return toast.error('Password tidak cocok');
        }
        try {
            await axios.put('/api/auth/profile', {
                name: form.name,
                email: form.email,
                phone: form.phone,
                password: form.password,
                closing_message: form.closing_message
            });
            toast.success('Profil berhasil diupdate');
            setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            toast.error('Gagal update: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        const toastId = toast.loading('Mengupload foto...');
        try {
            const res = await axios.post('/api/auth/profile-pic', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUserAvatar(res.data.url);
            toast.success('Foto berhasil diupdate!', { id: toastId });
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            toast.error('Upload gagal', { id: toastId });
        }
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        if (!deletePassword) return toast.error('Password wajib diisi');
        if (!window.confirm('Yakin ingin hapus akun? Tindakan ini tidak bisa dibatalkan.')) return;
        setDeleting(true);
        try {
            await axios.delete('/api/auth/profile', { data: { password: deletePassword } });
            toast.success('Akun berhasil dihapus.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal hapus akun');
            setDeleting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Memuat profil...</div>;

    return (
        <div className="p-6 space-y-6">

            {/* PROFILE FORM */}
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                    <User className="w-5 h-5 text-indigo-600" /> Profil Saya
                </h3>

                {/* AVATAR */}
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
                        <p className="text-sm font-bold text-gray-800">Foto Profil</p>
                        <p className="text-xs text-gray-500 mt-1">Klik foto untuk mengupload gambar baru.</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nama Lengkap</label>
                            <input
                                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="Nama lengkap"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">No. WhatsApp</label>
                            <input
                                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                placeholder="62812345678"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Alamat Email</label>
                        <input
                            className="w-full border border-gray-300 p-2.5 rounded-lg outline-none bg-gray-50"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            placeholder="email@perusahaan.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-400" /> Template Pesan Penutup
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Digunakan saat menyelesaikan chat.</p>
                        <textarea
                            className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                            value={form.closing_message}
                            onChange={e => setForm({ ...form, closing_message: e.target.value })}
                            placeholder="Terima kasih telah menghubungi kami. Semoga harimu menyenangkan!"
                        />
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <Key className="w-4 h-4 text-indigo-500" /> Ganti Password
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Password Baru</label>
                                <input
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    type="password"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Konfirmasi Password</label>
                                <input
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    type="password"
                                    value={form.confirmPassword}
                                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-transform active:scale-95">
                            <Save className="w-4 h-4" /> Simpan Perubahan
                        </button>
                    </div>
                </form>
            </div>

            {/* DANGER ZONE */}
            <div className="bg-red-50 p-8 rounded-xl border border-red-100 shadow-sm">
                <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> Danger Zone
                </h3>
                <p className="text-red-600/80 text-sm mb-6">
                    Setelah akun dihapus, tidak ada jalan kembali. Pastikan Anda yakin.
                </p>
                <div className="flex justify-end">
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="px-6 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" /> Hapus Akun
                    </button>
                </div>
            </div>

            {/* DELETE MODAL */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Hapus Akun"
                size="sm"
            >
                <p className="text-gray-500 text-sm mb-6">
                    Masukkan password Anda untuk konfirmasi. Tindakan ini tidak bisa dibatalkan.
                </p>
                <form onSubmit={handleDeleteAccount}>
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password</label>
                        <input
                            type="password"
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Masukkan password Anda"
                            required
                            autoFocus
                        />
                    </div>
                    <ModalFooter>
                        <div className="w-full flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={deleting}
                                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleting ? 'Menghapus...' : 'Konfirmasi Hapus'}
                            </button>
                        </div>
                    </ModalFooter>
                </form>
            </Modal>
        </div>
    );
}
