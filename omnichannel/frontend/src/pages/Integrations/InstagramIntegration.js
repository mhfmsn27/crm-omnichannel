import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Instagram, Plus, RefreshCw, Zap, ToggleLeft, ToggleRight, Lock, CheckCircle, Info, ExternalLink, HelpCircle, X, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../config/api';
import { useConfig } from '../../context/ConfigContext';
import Modal, { ModalFooter } from '../../components/common/Modal';

// Removed static env var

const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-indigo-600" /> Panduan Koneksi Instagram
                </div>
            }
            size="lg"
            footer={
                <ModalFooter>
                    <div className="w-full text-right">
                        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">
                            Saya Mengerti, Coba Lagi
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4 text-sm text-gray-600">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0" />
                    <div>
                        <p className="font-bold text-yellow-800 mb-1">Kenapa akun saya tidak muncul?</p>
                        <p className="text-yellow-700 text-xs">
                            API Meta memerlukan akun Instagram Bisnis yang <strong>sudah terhubung (Linked)</strong> ke Halaman Facebook.
                        </p>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-gray-900 mb-2">Langkah 1: Cek Koneksi Halaman Facebook</h4>
                    <ol className="list-decimal pl-5 space-y-2">
                        <li>Buka <strong>Facebook Page</strong> Anda (via Desktop/Laptop lebih mudah).</li>
                        <li>Masuk ke <strong>Settings (Pengaturan)</strong> &gt; <strong>Linked Accounts (Akun Terkait)</strong>.</li>
                        <li>Pilih <strong>Instagram</strong>.</li>
                        <li>Pastikan statusnya <strong>"Connected"</strong>. Jika belum, klik tombol Connect Account.</li>
                    </ol>
                </div>

                <hr />

                <div>
                    <h4 className="font-bold text-gray-900 mb-2">Langkah 2: Izin Login (PENTING)</h4>
                    <p className="mb-2">Saat Anda mengklik tombol "Connect Instagram" di aplikasi ini:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Jika muncul popup "Continue as [Nama Anda]?", pilih <strong>Edit Settings</strong> (jika ada) atau pastikan Anda memilih opsi untuk memberikan akses ke <strong>SEMUA Halaman (All Pages)</strong>.</li>
                        <li>Jangan uncheck (hapus centang) pada Halaman Facebook apapun, karena API perlu memindai halaman untuk menemukan akun Instagramnya.</li>
                    </ul>
                </div>
            </div>
        </Modal>
    );
};

export default function InstagramIntegration() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ allowed: true, locked: false, used: 0, limit: 0 });
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const navigate = useNavigate();
    const { config } = useConfig();

    useEffect(() => {
        fetchAccounts();
        if (config.meta?.instagram_app_id) initFacebookSdk();
    }, [config.meta]);

    const initFacebookSdk = () => {
        const INSTAGRAM_APP_ID = config.meta?.instagram_app_id;
        if (!INSTAGRAM_APP_ID) {
            console.warn("Instagram App ID missing in config");
            return;
        }

        if (window.FB) {
            window.FB.init({
                appId: INSTAGRAM_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v24.0'
            });
            return;
        }

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: INSTAGRAM_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v24.0'
            });
        };
        (function (d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) { return; }
            js = d.createElement(s); js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    };

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const [accRes, statsRes] = await Promise.all([
                axios.get('/api/app/instagram/accounts'),
                axios.get('/api/app/instagram/stats')
            ]);
            setAccounts(accRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const doFbLogin = () => {
        window.FB.login(function (response) {
            if (response.authResponse) {
                connectAccounts(response.authResponse);
            } else {
                toast.error("Login dibatalkan.");
            }
        }, {
            scope: 'instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata,pages_read_engagement,business_management',
            return_scopes: true,
            auth_type: 'reauthenticate'
        });
    };

    const handleLogin = () => {
        if (!config.meta?.instagram_app_id) {
            return toast.error("Instagram App ID belum dikonfigurasi. Hubungi administrator.");
        }
        if (window.FB) {
            doFbLogin();
            return;
        }
        // SDK masih loading — retry sekali setelah 2 detik
        const toastId = toast.loading("Memuat Facebook SDK...");
        setTimeout(() => {
            if (window.FB) {
                toast.dismiss(toastId);
                doFbLogin();
            } else {
                toast.error("Gagal memuat Facebook SDK. Coba refresh halaman.", { id: toastId });
            }
        }, 2000);
    };

    const connectAccounts = async (authResponse) => {
        const toastId = toast.loading("Menghubungkan Instagram...");
        try {
            const res = await axios.post('/api/app/instagram/callback', {
                access_token: authResponse.accessToken,
                userID: authResponse.userID
            });
            if (res.data.warning) {
                toast.dismiss(toastId);
                toast.success(res.data.message);
                toast.error(res.data.warning, { duration: 8000 });
            } else {
                toast.success(res.data.message, { id: toastId });
            }
            fetchAccounts();
        } catch (err) {
            if (err.response && err.response.status === 403) {
                toast.dismiss(toastId);
                toast.error("Failed: " + err.response.data.error);
            } else {
                toast.error("Gagal terhubung. Cek panduan.", { id: toastId });
                if (err.response?.data?.error?.includes('Tidak ada akun')) {
                    setIsHelpOpen(true);
                }
            }
        }
    };

    const handleResubscribe = async (acc) => {
        const toastId = toast.loading(`Reconnecting webhook untuk "@${acc.username}"...`);
        try {
            const res = await axios.post(`/api/app/instagram/accounts/${acc.id}/resubscribe`);
            toast.success(res.data.message, { id: toastId });
        } catch (err) {
            toast.error(err.response?.data?.error || "Reconnect gagal.", { id: toastId });
        }
    };

    const handleDisconnect = async (id) => {
        if (!confirm("Disconnect account?")) return;
        try {
            await axios.delete(`/api/app/instagram/accounts/${id}`);
            setAccounts(prev => prev.filter(a => a.id !== id));
            toast.success("Disconnected");
            setStats(prev => ({ ...prev, used: Math.max(0, prev.used - 1), allowed: true }));
        } catch (err) { toast.error("Failed"); }
    };

    const handleToggleAi = async (acc) => {
        try {
            await axios.patch(`/api/app/instagram/accounts/${acc.id}/toggle-ai`, {
                ai_active: !acc.ai_active
            });
            setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, ai_active: !a.ai_active } : a));
        } catch (err) { toast.error("Failed"); }
    };

    if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-300" /></div>;

    const isBlocked = false; // PERSONAL VERSION: Bypass Limit
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/+$/, '');
    const webhookUrl = baseUrl + '/webhook/instagram';

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <div className="bg-pink-500 text-white p-1.5 rounded-lg">
                            <Instagram className="w-6 h-6" />
                        </div>
                        Instagram Direct
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Connect using App ID: {config.meta?.instagram_app_id || 'Not Set'}</p>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <HelpCircle className="w-4 h-4" /> Panduan Koneksi
                    </button>
                    <div className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 bg-gray-100 text-gray-600">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Active</span>
                    </div>
                </div>
            </div>

            {/* Webhook Info Box */}
            <div className="mb-6 p-4 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-700 rounded-xl">
                <p className="text-xs font-bold text-pink-700 dark:text-pink-300 mb-2">🔗 Webhook URL — Daftarkan di Meta Developer Console</p>
                <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white dark:bg-dark-surface border border-pink-200 dark:border-pink-700 rounded px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300 truncate">{webhookUrl}</code>
                    <button
                        onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('URL disalin!'); }}
                        className="text-xs px-3 py-1.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium shrink-0"
                    >Copy</button>
                </div>
                <p className="text-xs text-pink-500 dark:text-pink-400 mt-1.5">Verify Token: <code className="bg-white dark:bg-dark-surface px-1.5 py-0.5 rounded border border-pink-200 font-mono">reply_saas_verify</code></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* ALWAYS SHOW CONNECT BUTTON */}
                <div
                    onClick={handleLogin}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 cursor-pointer transition-all min-h-[240px] group bg-gray-50 dark:bg-[#1e293b]"
                >
                    <Plus className="w-10 h-10 mb-4 group-hover:scale-110" />
                    <span className="font-bold text-sm">Connect Instagram</span>
                    <span className="text-[10px] mt-1 text-gray-400">Pastikan akun Bisnis & Terhubung ke FB Page</span>
                </div>

                {accounts.map(acc => (
                    <div key={acc.id} className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <img src={acc.profile_picture_url || getApiUrl('/icons/instagram.svg')} className="w-12 h-12 rounded-full border" alt="" />
                            <div>
                                <h4 className="font-bold text-lg">@{acc.username}</h4>
                                <p className="text-xs text-gray-400">ID: {acc.ig_id}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <button onClick={() => handleToggleAi(acc)} className={`flex items-center gap-1 text-xs font-bold ${acc.ai_active ? 'text-green-600' : 'text-gray-400'}`}>
                                <Zap className="w-4 h-4" /> AI: {acc.ai_active ? 'ON' : 'OFF'}
                            </button>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleResubscribe(acc)} className="text-xs text-indigo-500 hover:underline flex items-center gap-1" title="Re-register webhook with Meta">
                                    <RefreshCw className="w-3 h-3" /> Reconnect
                                </button>
                                <button onClick={() => handleDisconnect(acc.id)} className="text-xs text-red-500 hover:underline">Disconnect</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
}