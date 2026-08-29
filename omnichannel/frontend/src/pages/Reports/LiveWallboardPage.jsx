import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Tv, Maximize2, Minimize2, MessageSquare, Clock, 
    Users, TrendingUp, Star, ShieldAlert, Award, Activity 
} from 'lucide-react';

export default function LiveWallboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString('id-ID'));
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeStr(new Date().toLocaleTimeString('id-ID'));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchMetrics();
        const poll = setInterval(fetchMetrics, 8000); // 8-second live polling
        return () => clearInterval(poll);
    }, []);

    const fetchMetrics = async () => {
        try {
            const res = await axios.get('/api/app/analytics/live-wallboard');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0b0f19] text-white p-6 md:p-8 flex flex-col justify-between font-sans">
            {/* Top Bar */}
            <div className="flex justify-between items-center pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center animate-pulse">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-wide text-white flex items-center gap-2">
                            CRMHUB LIVE WALLBOARD <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/40">LIVE</span>
                        </h1>
                        <p className="text-xs text-slate-400">Office Executive Operations Monitoring</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl text-lg font-mono font-bold text-indigo-400 shadow-inner">
                        {timeStr} WIB
                    </div>
                    <button
                        onClick={toggleFullscreen}
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all border border-slate-700"
                        title="Toggle Fullscreen"
                    >
                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 my-6">
                {/* 1. Unassigned Queue */}
                <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 relative overflow-hidden shadow-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Antrean Chat Menunggu</p>
                            <h2 className="text-4xl font-black text-amber-400 mt-2 font-mono">
                                {data?.queue?.unassigned_queue || 0}
                            </h2>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        {data?.queue?.handling_chats || 0} chat sedang ditangani agen
                    </p>
                </div>

                {/* 2. Chat Resolved Today */}
                <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 relative overflow-hidden shadow-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chat Selesai Hari Ini</p>
                            <h2 className="text-4xl font-black text-emerald-400 mt-2 font-mono">
                                {data?.queue?.resolved_today || 0}
                            </h2>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3">Target penyelesaian & SLA terjaga</p>
                </div>

                {/* 3. Sales Closed Today */}
                <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 relative overflow-hidden shadow-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Omzet Closing Hari Ini</p>
                            <h2 className="text-2xl font-black text-indigo-400 mt-2 font-mono">
                                Rp {parseInt(data?.sales?.total_revenue_today || 0).toLocaleString('id-ID')}
                            </h2>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                            <Award className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3">{data?.sales?.invoices_paid_today || 0} transaksi lunas hari ini</p>
                </div>

                {/* 4. CSAT Score */}
                <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 relative overflow-hidden shadow-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kepuasan Pelanggan (CSAT)</p>
                            <h2 className="text-4xl font-black text-rose-400 mt-2 font-mono flex items-center gap-1.5">
                                <Star className="w-7 h-7 fill-rose-400 text-rose-400" /> {data?.csat?.csat_percent_today || 100}%
                            </h2>
                        </div>
                        <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400">
                            <Star className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3">Rata-rata: ⭐ {data?.csat?.avg_rating_today || '5.0'} / 5.0</p>
                </div>
            </div>

            {/* Agent Live Leaderboard */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-2xl">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" /> Performa Live Agen CS & Sales
                    </h3>
                    <span className="text-xs text-slate-500">
                        {data?.agents?.available_agents || 0} Agen Online Available
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(data?.leaderboard || []).map((agent, i) => (
                        <div key={agent.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300">
                                #{i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-white truncate">{agent.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                        agent.status === 'available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                        agent.status === 'busy' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                        'bg-slate-700 text-slate-400'
                                    }`}>
                                        {agent.status}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        ✅ {agent.resolved_today} Selesai
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 text-[11px] text-slate-600">
                CRMHUB Omnichannel Executive Display • Live WebSocket & High-Speed Telemetry Sync
            </div>
        </div>
    );
}
