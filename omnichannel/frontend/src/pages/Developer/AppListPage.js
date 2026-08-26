import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Copy, Trash2, Edit, CheckCircle, Key, Globe, Smartphone, RefreshCw, Lock, Crown, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AppDetailModal from './AppDetailModal';

export default function AppListPage() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [copyId, setCopyId] = useState(null);
    const [stats, setStats] = useState({ locked: false }); // Gate State
    const [visibleKeys, setVisibleKeys] = useState({}); // Track which keys are visible
    const navigate = useNavigate();

    useEffect(() => {
        fetchApps();
    }, []);

    const fetchApps = async () => {
        setLoading(true);
        try {
            const [appRes, statRes] = await Promise.all([
                axios.get('/api/app/developer/apps'),
                axios.get('/api/app/developer/stats')
            ]);
            setApps(appRes.data);
            setStats(statRes.data);
        } catch (err) {
            toast.error("Failed to load apps");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this app? All associated keys will stop working.")) return;
        try {
            await axios.delete(`/api/app/developer/apps/${id}`);
            fetchApps();
            toast.success("App deleted");
        } catch (err) {
            toast.error("Delete failed");
        }
    };

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopyId(id);
        setTimeout(() => setCopyId(null), 2000);
        toast.success("Copied to clipboard");
    };

    const toggleKeyVisibility = (id) => {
        setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const isLocked = false; // PERSONAL VERSION: Bypass Limit

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto custom-scrollbar">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Key className="w-8 h-8 text-indigo-600" /> Developer Apps
                    </h2>
                    <p className="text-sm text-gray-500">Manage API keys and webhook integrations for your external apps.</p>
                </div>
                {!isLocked && (
                    <button
                        onClick={() => { setSelectedApp(null); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Create App
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* PAYWALL CARD */}
                {isLocked ? (
                    <div className="border-2 border-dashed border-red-200 bg-red-50/50 rounded-xl p-5 flex flex-col items-center justify-center text-center h-[260px] group transition-all relative overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,0,0,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] opacity-50"></div>
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-red-100 flex items-center justify-center mb-3 z-10">
                            <Lock className="w-6 h-6 text-red-400" />
                        </div>
                        <span className="font-bold text-lg text-gray-700 z-10 flex items-center gap-2">
                            <Crown className="w-5 h-5 text-yellow-500" /> Premium Feature
                        </span>
                        <span className="text-xs mt-2 text-gray-500 max-w-[80%] z-10 mb-4">
                            Unlock Developer API to integrate WhatsApp capabilities into your own applications.
                        </span>
                        <button
                            onClick={() => navigate('/order')}
                            className="z-10 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 shadow-md transition-all flex items-center gap-1 animate-pulse"
                        >
                            Upgrade Plan <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                ) : (
                    /* ADD NEW CARD placeholder */
                    <div
                        onClick={() => { setSelectedApp(null); setIsModalOpen(true); }}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-500 cursor-pointer transition-all h-[260px] bg-gray-50 hover:bg-white hover:shadow-lg group"
                    >
                        <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-lg">Create New App</span>
                        <span className="text-xs mt-1 opacity-70">Generate API Key</span>
                    </div>
                )}

                {apps.map(app => (
                    <div key={app.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all flex flex-col h-[260px] group relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Globe className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg truncate w-32" title={app.name}>{app.name}</h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`w-2 h-2 rounded-full ${app.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        <span className="text-xs text-gray-500">{app.is_active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-white pl-2">
                                <button onClick={() => { setSelectedApp(app); setIsModalOpen(true); }} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(app.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 space-y-3">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">API Key</p>
                                <div className="flex items-center justify-between font-mono text-xs text-gray-600 bg-white px-2 py-1.5 rounded border border-gray-200">
                                    <span className="truncate w-32">
                                        {visibleKeys[app.id] ? app.api_key : `${app.api_key.substring(0, 8)}••••••••`}
                                    </span>
                                    <div className="flex gap-1">
                                        <button onClick={() => toggleKeyVisibility(app.id)} className="text-gray-400 hover:text-gray-600 p-1">
                                            {visibleKeys[app.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        </button>
                                        <button onClick={() => handleCopy(app.api_key, `key-${app.id}`)} className="text-gray-400 hover:text-green-600 p-1">
                                            {copyId === `key-${app.id}` ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                                <div className="flex items-center gap-1">
                                    <Smartphone className="w-3 h-3" />
                                    <span>{app.channel_count} Channels</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" />
                                    <span>{app.daily_requests || 0} reqs</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400">
                            <span>ID: {app.id}</span>
                            <span>Created: {new Date(app.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}

                {apps.length === 0 && !loading && !isLocked && (
                    <div className="col-span-full text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 flex flex-col items-center">
                        <Key className="w-12 h-12 mb-3 opacity-50" />
                        <p>No apps created yet. Create one to get API Key.</p>
                    </div>
                )}
            </div>

            <AppDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                app={selectedApp}
                onSave={fetchApps}
            />
        </div>
    );
}
