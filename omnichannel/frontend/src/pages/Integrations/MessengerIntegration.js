import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, CheckCircle, RefreshCw, Zap, Lock, HelpCircle, X, AlertTriangle } from 'lucide-react';
import { MessengerIcon } from '../../components/common/ChannelIcons';
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
                    <HelpCircle className="w-5 h-5 text-indigo-600" /> Panduan Koneksi Messenger
                </div>
            }
            size="lg"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-end">
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
                        <p className="font-bold text-yellow-800 mb-1">Kenapa halaman saya tidak muncul?</p>
                        <p className="text-yellow-700 text-xs">
                            Pastikan akun Facebook pribadi Anda memiliki peran <strong>Admin</strong> atau <strong>Editor</strong> pada Halaman Facebook yang ingin dihubungkan.
                        </p>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-gray-900 mb-2">Langkah 1: Izin Login (PENTING)</h4>
                    <p className="mb-2">Saat Anda mengklik tombol "Connect Page":</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Jika muncul popup "Continue as [Nama]?", klik <strong>Edit Settings</strong>.</li>
                        <li>Pastikan Anda memilih/mencentang <strong>SEMUA Halaman (All Pages)</strong> yang ingin dikelola, termasuk yang sudah terhubung sebelumnya.</li>
                        <li>Jangan dimatikan centangnya, karena itu akan memutuskan koneksi halaman lain.</li>
                    </ul>
                </div>

                <hr />

                <div>
                    <h4 className="font-bold text-gray-900 mb-2">Langkah 2: Reset Koneksi (Jika Masih Gagal)</h4>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>Buka Facebook &gt; Settings &gt; <strong>Business Integrations</strong>.</li>
                        <li>Cari aplikasi ini, lalu klik <strong>Remove (Hapus)</strong>.</li>
                        <li>Kembali ke dashboard ini, refresh halaman, dan klik "Connect Page" lagi dari awal.</li>
                    </ol>
                </div>
            </div>
        </Modal>
    );
};

export default function MessengerIntegration() {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ allowed: true, locked: false, used: 0, limit: 0 });
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const navigate = useNavigate();
    const { config } = useConfig();

    const initFacebookSdk = () => {
        const MESSENGER_APP_ID = config.meta?.messenger_app_id;
        if (!MESSENGER_APP_ID) {
            console.warn("Messenger App ID missing in config");
            return;
        }

        if (window.FB) {
            window.FB.init({
                appId: MESSENGER_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v24.0'
            });
            return;
        }

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: MESSENGER_APP_ID,
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pagesRes, statsRes] = await Promise.all([
                axios.get('/api/app/messenger/pages'),
                axios.get('/api/app/messenger/stats')
            ]);
            setPages(pagesRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const connectPages = async (authResponse) => {
        const toastId = toast.loading("Connecting Pages...");
        try {
            const res = await axios.post('/api/app/messenger/callback', {
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
            fetchData();
        } catch (err) {
            if (err.response && err.response.status === 403) {
                toast.dismiss(toastId);
                toast.error("Failed: " + err.response.data.error);
            } else {
                toast.error("Gagal terhubung. Cek panduan.", { id: toastId });
                setIsHelpOpen(true);
            }
        }
    };

    const doFbLogin = () => {
        window.FB.login(function (response) {
            if (response.authResponse) {
                connectPages(response.authResponse);
            } else {
                toast.error("Login dibatalkan atau izin tidak diberikan.");
            }
        }, {
            scope: 'pages_show_list,pages_messaging,pages_manage_metadata,business_management',
            return_scopes: true,
            auth_type: 'reauthenticate'
        });
    };

    const handleLogin = () => {
        if (!config.meta?.messenger_app_id) {
            return toast.error("Messenger App ID belum dikonfigurasi. Hubungi administrator.");
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

    useEffect(() => {
        fetchData();
        if (config.meta?.messenger_app_id) initFacebookSdk();
    }, [config.meta]);

    const handleResubscribe = async (page) => {
        const toastId = toast.loading(`Reconnecting webhook for "${page.page_name}"...`);
        try {
            const res = await axios.post(`/api/app/messenger/pages/${page.id}/resubscribe`);
            toast.success(res.data.message, { id: toastId });
        } catch (err) {
            toast.error(err.response?.data?.error || "Reconnect failed.", { id: toastId });
        }
    };

    const handleDisconnect = async (id) => {
        if (!confirm("Disconnect this page?")) return;
        try {
            await axios.delete(`/api/app/messenger/pages/${id}`);
            setPages(prev => prev.filter(p => p.id !== id));
            toast.success("Disconnected");
            setStats(prev => ({ ...prev, used: Math.max(0, prev.used - 1), allowed: true }));
        } catch (err) { toast.error("Failed"); }
    };

    const handleToggleAi = async (page) => {
        try {
            await axios.patch(`/api/app/messenger/pages/${page.id}/toggle-ai`, {
                ai_active: !page.ai_active
            });
            setPages(prev => prev.map(p => p.id === page.id ? { ...p, ai_active: !p.ai_active } : p));
        } catch (err) { toast.error("Failed"); }
    };

    if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-300" /></div>;

    const isBlocked = false; // PERSONAL VERSION: Bypass Limit
    const isLimitReached = false;
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/+$/, '');
    const webhookUrl = baseUrl + '/webhook/messenger';

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                        <MessengerIcon className="w-8 h-8 shrink-0 shadow-xs rounded-full" /> Meta Messenger
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Connect using App ID: {config.meta?.messenger_app_id || 'Not Set'}</p>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <HelpCircle className="w-4 h-4" /> Panduan Koneksi
                    </button>
                    <div className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 bg-gray-100 text-gray-600`}>
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Active</span>
                    </div>
                </div>
            </div>

            {/* Webhook Info Box */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2">🔗 Webhook URL — Daftarkan di Meta Developer Console</p>
                <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white dark:bg-dark-surface border border-blue-200 dark:border-blue-700 rounded px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300 truncate">{webhookUrl}</code>
                    <button
                        onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('URL disalin!'); }}
                        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shrink-0"
                    >Copy</button>
                </div>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1.5">Verify Token: <code className="bg-white dark:bg-dark-surface px-1.5 py-0.5 rounded border border-blue-200 font-mono">reply_saas_verify</code></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* ALWAYS SHOW CONNECT BUTTON */}
                <div
                    onClick={handleLogin}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 cursor-pointer transition-all min-h-[240px] group bg-gray-50 dark:bg-[#1e293b]"
                >
                    <Plus className="w-10 h-10 mb-4 group-hover:scale-110" />
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-300">Connect Page</span>
                    <span className="text-[10px] text-gray-400 mt-1">Pilih "Edit Settings" untuk menambah halaman</span>
                </div>

                {pages.map(page => (
                    <div key={page.id} className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <img src={page.picture_url || getApiUrl('/icons/messenger.svg')} className="w-12 h-12 rounded-full" alt="" />
                            <div>
                                <h4 className="font-bold text-lg">{page.page_name}</h4>
                                <p className="text-xs text-gray-400">ID: {page.page_id}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <button onClick={() => handleToggleAi(page)} className={`flex items-center gap-1 text-xs font-bold ${page.ai_active ? 'text-green-600' : 'text-gray-400'}`}>
                                <Zap className="w-4 h-4" /> AI: {page.ai_active ? 'ON' : 'OFF'}
                            </button>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleResubscribe(page)} className="text-xs text-indigo-500 hover:underline flex items-center gap-1" title="Re-register webhook with Meta">
                                    <RefreshCw className="w-3 h-3" /> Reconnect
                                </button>
                                <button onClick={() => handleDisconnect(page.id)} className="text-xs text-red-500 hover:underline">Disconnect</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
}