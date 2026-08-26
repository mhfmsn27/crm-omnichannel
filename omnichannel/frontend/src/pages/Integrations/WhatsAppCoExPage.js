import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BadgeCheck, Facebook, Plus, X, Lock, Loader2, CheckCircle, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import FeatureMaintenance from '../../components/FeatureMaintenance';
import { useConfig } from '../../context/ConfigContext';
import Modal, { ModalFooter } from '../../components/common/Modal';

// Removed static VITE_WA_* constants

const ConnectModal = ({ isOpen, onClose, onConnect, sdkLoaded, config }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derived from config
    const WA_APP_ID = config.meta?.wa_app_id;
    const CONFIG_ID = config.meta?.wa_config_id_coex;

    if (!isOpen) return null;

    const handleFacebookLogin = () => {
        if (!sdkLoaded || !window.FB) return toast.error("Facebook SDK sedang dimuat, coba sesaat lagi...");
        if (!WA_APP_ID || !CONFIG_ID) return toast.error("Missing App ID or Config ID (Check Admin Settings)");

        setIsSubmitting(true);

        // Standard extras for Embedded Signup v3 with Granular Permissions
        const extrasConfig = {
            "featureType": "whatsapp_business_app_onboarding",
            "sessionInfoVersion": "3"
        };

        // Launch Facebook Login
        window.FB.login(function (response) {
            if (response.authResponse) {
                const { code } = response.authResponse;
                const redirectUri = window.location.origin + window.location.pathname;

                toast.success("Login Berhasil! Menghubungkan...");

                onConnect({ code, redirect_uri: redirectUri, mode: 'coex' })
                    .then(() => {
                        toast.success("WhatsApp CoEx Terhubung!");
                        onClose();
                    })
                    .catch((err) => {
                        console.error("CoEx Auth Error:", err);
                        if (err.response?.status === 403) {
                            toast.error("Failed: " + err.response.data.error);
                        } else {
                            toast.error("Gagal: " + (err.response?.data?.error || err.message));
                        }
                    })
                    .finally(() => setIsSubmitting(false));
            } else {
                console.log('User cancelled login or did not fully authorize.');
                setIsSubmitting(false);
            }
        }, {
            config_id: CONFIG_ID,
            response_type: 'code',
            override_default_response_type: true,
            extras: JSON.stringify(extrasConfig), // Some SDK versions prefer stringified JSON
            scope: 'public_profile,whatsapp_business_management,whatsapp_business_messaging'
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Connect WA CoEx"
            size="md"
            className="p-0 max-h-[90vh] flex flex-col overflow-hidden"
        >
            <div className="p-8 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Facebook className="w-10 h-10 text-blue-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Login with Facebook</h4>
                <p className="text-gray-500 text-sm mb-8">
                    Gunakan metode Embedded Signup untuk onboarding instan. Pastikan Anda menyetujui semua izin yang diminta di popup.
                </p>
                <button
                    onClick={handleFacebookLogin}
                    disabled={isSubmitting || !sdkLoaded}
                    className="bg-[#1877F2] text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-[#166fe5] w-full max-w-sm flex items-center justify-center gap-3 mx-auto disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Menghubungkan...</span>
                        </>
                    ) : (
                        <>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" className="w-6 h-6 bg-white rounded-full border border-white" alt="FB" />
                            <span>Continue with Facebook</span>
                        </>
                    )}
                </button>
                <p className="text-xs text-gray-400 mt-4">
                    {!sdkLoaded ? "Memuat Facebook SDK..." : "Popup akan muncul dari Facebook."}
                </p>
            </div>
        </Modal>
    );
};

const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-indigo-600" /> Panduan Koneksi WhatsApp CoEx
                </div>
            }
            size="lg"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-end">
                        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">
                            Saya Mengerti
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4 text-sm text-gray-600">
                <p className="mb-2">WhatsApp CoEx (Co-Extension) memungkinkan Anda menggunakan nomor resmi dengan proses pendaftaran instan.</p>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-700 mb-4">
                    <strong>Keuntungan:</strong> Tidak perlu verifikasi bisnis di awal, limit pesan lebih tinggi, dan risiko banned lebih rendah (Green Tick eligible).
                </div>

                <h4 className="font-bold text-gray-900 mb-2">Langkah-langkah Koneksi:</h4>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Siapkan nomor HP baru yang <strong>belum ada WhatsApp-nya</strong> (atau hapus akun WA yang ada di HP).</li>
                    <li>Pastikan Anda login ke Facebook pribadi yang memiliki akses Admin ke Meta Business Manager.</li>
                    <li>Klik <strong>"Connect Number"</strong> di halaman ini.</li>
                    <li>Ikuti wizard:
                        <ul className="list-disc pl-5 mt-1 text-xs text-gray-500">
                            <li>Isi nama bisnis & kategori.</li>
                            <li>Masukkan nomor HP & Verifikasi OTP.</li>
                        </ul>
                    </li>
                </ol>
                <p className="mt-4 text-xs italic">Jika sukses, status akan langsung "Connected" dalam beberapa detik.</p>
            </div>
        </Modal>
    );
};

const OfficialCard = ({ session, onDisconnect }) => (
    <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6 flex items-center gap-4 border-b border-gray-50 dark:border-dark-border">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center border-4 border-green-50 dark:border-green-900/10">
                <BadgeCheck className="w-8 h-8 text-green-600 dark:text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 dark:text-white text-lg truncate">{session.name}</h4>
                <p className="text-xs text-gray-400 font-mono truncate">{session.whatsapp_number}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        CoEx
                    </span>
                    <span className={`text-[10px] font-bold ${session.quality_rating === 'GREEN' ? 'text-green-600' : 'text-yellow-600'}`}>{session.quality_rating || 'UNKNOWN'} Quality</span>
                </div>
            </div>
        </div>
        <div className="p-6 flex justify-between items-center bg-gray-50 dark:bg-dark-bg">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${session.status?.toLowerCase() === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300 capitalize">{session.status}</span>
            </div>
            <button onClick={() => onDisconnect(session.id)} className="text-xs text-red-500 hover:underline font-medium">Disconnect</button>
        </div>
    </div>
);

export default function WhatsAppCoExPage() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [stats, setStats] = useState({ feature: { allowed: true }, limit: { allowed: true } });
    const [sdkLoaded, setSdkLoaded] = useState(false);
    const navigate = useNavigate();
    const { config } = useConfig();

    useEffect(() => {
        fetchData();
        if (config.meta?.wa_app_id) loadFacebookSDK();
    }, [config.meta]);

    const fetchData = async () => {
        try {
            const [sessRes, statsRes] = await Promise.all([
                axios.get('/api/app/devices'),
                axios.get(`/api/app/meta/stats?mode=coex`)
            ]);

            const official = sessRes.data.filter(d => {
                if (d.type !== 'official') return false;
                // Include explicit 'coex' OR legacy (undefined/null mode)
                const mode = d.device_info?.mode;
                return mode === 'coex' || !mode;
            });
            setSessions(official);
            setStats(statsRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadFacebookSDK = () => {
        if (window.FB) {
            setSdkLoaded(true);
            return;
        }

        const WA_APP_ID = config.meta?.wa_app_id;
        if (!WA_APP_ID) return;

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: WA_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v24.0'
            });
            setSdkLoaded(true);
        };

        (function (d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) { return; }
            js = d.createElement(s); js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    };

    const handleConnect = async (payload) => {
        return axios.post('/api/app/meta/auth', payload).then(() => fetchData());
    };

    const handleDisconnect = async (id) => {
        if (!confirm("Disconnect?")) return;
        try {
            await axios.delete(`/api/app/devices/${id}`);
            fetchData();
            toast.success("Disconnected");
        } catch (e) { toast.error("Failed"); }
    };

    const isBlocked = false; // PERSONAL VERSION: Bypass Limit
    const isLimitReached = false;

    if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    if (stats.feature.maintenance) {
        return (
            <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
                <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BadgeCheck className="w-8 h-8 text-green-600" /> WhatsApp CoEx
                        </h2>
                        <p className="text-sm text-gray-500">Embedded Signup (Pendaftaran Instan via Facebook)</p>
                    </div>
                </div>
                <FeatureMaintenance message={stats.feature.message} />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BadgeCheck className="w-8 h-8 text-green-600" /> WhatsApp CoEx
                    </h2>
                    <p className="text-sm text-gray-500">Embedded Signup (Pendaftaran Instan via Facebook)</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* ALWAYS ENABLED ADD CARD */}
                <div
                    onClick={() => setIsModalOpen(true)}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 cursor-pointer transition-all min-h-[240px] group bg-gray-50 dark:bg-[#1e293b]"
                >
                    <Plus className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-sm">Connect Number</span>
                </div>
                {sessions.map(s => <OfficialCard key={s.id} session={s} onDisconnect={handleDisconnect} />)}
            </div>

            <ConnectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConnect={handleConnect}
                sdkLoaded={sdkLoaded}
                config={config}
            />
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
}