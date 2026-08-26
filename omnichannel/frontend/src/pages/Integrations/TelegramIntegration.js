import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, Plus, Trash2, RefreshCw, Zap, ToggleLeft, ToggleRight, Link, Lock, Crown, ArrowRight, CheckCircle, AlertTriangle, HelpCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../config/api';
import Modal, { ModalFooter } from '../../components/common/Modal';

const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-indigo-600" /> Panduan Koneksi Telegram
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
                <div>
                    <h4 className="font-bold text-gray-900 mb-2">Langkah 1: Buat Bot Baru</h4>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>Buka aplikasi Telegram dan cari <strong>@BotFather</strong> (yang ada centang biru).</li>
                        <li>Ketik perintah <code>/newbot</code>.</li>
                        <li>Beri nama untuk bot Anda (misal: "CS Toko Saya").</li>
                        <li>Beri username untuk bot Anda (harus berakhiran 'bot', misal: <code>tokosaya_bot</code>).</li>
                    </ol>
                </div>
                <div>
                    <h4 className="font-bold text-gray-900 mb-2">Langkah 2: Ambil Token</h4>
                    <p>Setelah bot berhasil dibuat, BotFather akan memberikan <strong>HTTP API Token</strong>.</p>
                    <div className="bg-gray-100 p-2 rounded border border-gray-200 font-mono text-xs mt-2 text-gray-700">
                        123456789:ABCdefGhIJKlmNoPQRstUVwxyZ
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-gray-900 mb-2">Langkah 3: Paste Token</h4>
                    <p>Copy token tersebut, lalu Paste di kolom "Bot Token" di aplikasi ini.</p>
                </div>
            </div>
        </Modal>
    );
};

export default function TelegramIntegration() {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [bots, setBots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [token, setToken] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stats, setStats] = useState({ allowed: true, locked: false, used: 0, limit: 0 });
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [botsRes, statsRes] = await Promise.all([
                axios.get('/api/app/telegram/bots'),
                axios.get('/api/app/telegram/stats')
            ]);
            setBots(botsRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleConnect = async () => {
        if (!token) return toast.error("Token required");
        setIsSubmitting(true);
        try {
            const res = await axios.post('/api/app/telegram/connect', { token });
            toast.success(res.data.message);
            setToken('');
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            if (err.response && err.response.status === 403) {
                setIsModalOpen(false);
                if (confirm(`⚠️ LIMIT REACHED / LOCKED!\n\n${err.response.data.error} \n\nUpgrade your plan ? `)) {
                    navigate('/order');
                }
            } else {
                toast.error("Failed: " + (err.response?.data?.error || err.message));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDisconnect = async (id) => {
        if (!confirm("Disconnect this bot?")) return;
        try {
            await axios.delete(`/api/app/telegram/${id}`);
            setBots(prev => prev.filter(b => b.id !== id));
            toast.success("Bot Deleted");
            setStats(prev => ({ ...prev, used: Math.max(0, prev.used - 1), allowed: true }));
        } catch (err) { toast.error("Failed"); }
    };

    const handleToggleAi = async (bot) => {
        try {
            await axios.patch(`/api/app/telegram/${bot.id}/toggle-ai`, {
                ai_active: !bot.ai_active
            });
            setBots(prev => prev.map(b => b.id === bot.id ? { ...b, ai_active: !bot.ai_active } : b));
        } catch (err) { toast.error("Failed"); }
    };

    if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-300" /></div>;

    const isBlocked = false; // PERSONAL VERSION: Bypass Limit
    const isLimitReached = false;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <div className="bg-sky-500 text-white p-1.5 rounded-lg">
                            <Send className="w-6 h-6" />
                        </div>
                        Telegram Bot
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Connect your Telegram Bots to manage chats in Unified Inbox.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <HelpCircle className="w-4 h-4" /> Panduan
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
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/10 cursor-pointer transition-all min-h-[240px] group bg-gray-50 dark:bg-[#1e293b]"
                >
                    <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:shadow-md transition-all shadow-sm">
                        <Plus className="w-8 h-8" />
                    </div>
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-300">Connect Telegram</span>
                    <span className="text-xs mt-2 text-center px-4 opacity-70">Add Bot Token</span>
                </div>

                {bots.map(bot => (
                    <div key={bot.id} className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className="p-6 flex items-center gap-4 border-b border-gray-50 dark:border-dark-border">
                            <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 text-2xl font-bold border-4 border-white dark:border-dark-surface shadow-sm">
                                {bot.first_name?.charAt(0) || 'B'}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 dark:text-white text-lg">{bot.first_name}</h4>
                                <p className="text-xs text-gray-500 font-mono">@{bot.username}</p>
                            </div>
                            <button
                                onClick={() => handleDisconnect(bot.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Bot"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-dark-bg p-3 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${bot.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{bot.is_active ? 'Active' : 'Error'}</span>
                                </div>
                                <button onClick={() => handleDisconnect(bot.id)} className="text-xs text-red-500 hover:underline font-medium">Disconnect</button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                                    <Zap className={`w-4 h-4 ${bot.ai_active ? 'text-green-500' : 'text-gray-400 dark:text-slate-600'}`} />
                                    <span>AI Chatbot</span>
                                </div>
                                <button onClick={() => handleToggleAi(bot)} className={`text-2xl ${bot.ai_active ? 'text-green-500' : 'text-gray-300 dark:text-slate-600'}`}>
                                    {bot.ai_active ? <ToggleRight /> : <ToggleLeft />}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Connect Telegram Bot"
                size="md"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Bot Token</label>
                        <input
                            className="w-full border dark:border-dark-border p-3 rounded-lg font-mono text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                            placeholder="123456:ABC-DEF1234ghIkl..."
                            value={token}
                            onChange={e => setToken(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                            Get this token from <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">@BotFather</a> on Telegram.
                        </p>
                    </div>
                    <button
                        onClick={handleConnect}
                        disabled={isSubmitting}
                        className="w-full py-3 bg-sky-500 text-white rounded-lg font-bold hover:bg-sky-600 flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isSubmitting ? 'Verifying...' : 'Connect Bot'}
                    </button>
                    <button onClick={() => setIsModalOpen(false)} className="w-full py-2 text-gray-500 dark:text-slate-400 text-sm hover:text-gray-800 dark:hover:text-white">Cancel</button>
                </div>
            </Modal>
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );

}