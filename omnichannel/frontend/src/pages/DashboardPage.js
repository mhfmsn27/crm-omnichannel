import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { MessageSquare, BarChart2 } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import AnnouncementBanner from '../components/dashboard/AnnouncementBanner';
import StatCards from '../components/dashboard/StatCards';
import ChatVolumeChart from '../components/dashboard/ChatVolumeChart';
import DeviceStatusWidget from '../components/dashboard/DeviceStatusWidget';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import QuickActions from '../components/dashboard/QuickActions';
import { Skeleton } from '../components/common/Skeleton';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../config/api';

const CHANNEL_META = {
    whatsapp:          { label: 'WhatsApp',  icon: '/icons/whatsapp-unofficial.svg', color: 'bg-green-500' },
    whatsapp_official: { label: 'WA Official', icon: '/icons/whatsapp-official.svg', color: 'bg-green-600' },
    messenger:         { label: 'Messenger', icon: '/icons/messenger.svg',           color: 'bg-blue-600'  },
    instagram:         { label: 'Instagram', icon: '/icons/instagram.svg',           color: 'bg-pink-500'  },
    telegram:          { label: 'Telegram',  icon: '/icons/telegram.svg',            color: 'bg-sky-500'   },
    webchat:           { label: 'Webchat',   icon: '/icons/webchat.svg',             color: 'bg-orange-500'},
    other:             { label: 'Lainnya',   icon: '/icons/device.svg',              color: 'bg-gray-400'  },
};

const DashboardSkeleton = () => (
    <div className="animate-pulse space-y-4 md:space-y-6">
        {/* Welcome Card Skeleton */}
        <Skeleton className="h-32 md:h-40 w-full rounded-2xl" />

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4">
            {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 md:h-24 rounded-xl" />
            ))}
        </div>

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
            {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-16 md:h-20 rounded-xl" />
            ))}
        </div>

        {/* Chart + Device Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <Skeleton className="h-64 md:h-80 lg:col-span-2 rounded-xl" />
            <Skeleton className="h-64 md:h-80 rounded-xl" />
        </div>

        {/* Activity + Channel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
        </div>
    </div>
);

export default function DashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const socket = useSocket();

    const fetchData = useCallback(async () => {
        try {
            const res = await axios.get('/api/app/dashboard');
            setData(res.data);
        } catch (err) {
            console.error("Failed to load dashboard", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!socket || !socket.on) return;
        socket.on('device_status_update', fetchData);
        return () => socket && socket.off && socket.off('device_status_update', fetchData);
    }, [socket, fetchData]);

    if (loading) return <div className="p-4 md:p-8 bg-gray-50 dark:bg-dark-bg min-h-screen"><DashboardSkeleton /></div>;

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Selamat Pagi';
        if (h < 18) return 'Selamat Siang';
        return 'Selamat Malam';
    };

    const announcementsToShow = (data?.announcements?.length > 0) ? data.announcements : [];

    const channelSummary = data?.channel_summary || [];
    const totalConvs = channelSummary.reduce((s, r) => s + parseInt(r.total_conversations), 0);

    return (
        <div className="p-4 md:p-8 bg-gray-50 dark:bg-dark-bg min-h-screen transition-colors duration-200">

            {/* WELCOME CARD */}
            <div className="mb-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#00A884] via-[#009B7C] to-[#00705A] p-8 shadow-[0_8px_30px_rgba(0,168,132,0.2)] border border-white/10">
                {/* Abstract Glassmorphic Ornaments */}
                <div className="absolute -top-24 -right-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none mix-blend-overlay" />
                <div className="absolute -bottom-24 -left-10 w-56 h-56 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none mix-blend-overlay" />
                <div className="absolute top-8 right-1/4 w-32 h-32 bg-teal-200/20 rounded-full blur-xl pointer-events-none mix-blend-soft-light" />
                
                {/* Crisp geometric lines for tech feel */}
                <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#gridPattern)" />
                </svg>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                            <span className="text-white/90 text-xs font-semibold tracking-wide uppercase">
                                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-sm">
                            {greeting()}, {user?.name?.split(' ')[0] || user?.name}! 👋
                        </h1>
                        <p className="text-white/80 text-sm md:text-base font-medium leading-relaxed max-w-lg">
                            {data?.stats?.unreplied > 0
                                ? <span className="flex items-center gap-2"><span className="bg-red-500/20 text-red-100 px-2 py-0.5 rounded-md border border-red-500/30">Ada {data.stats.unreplied} chat</span> yang menunggu respons Anda. Ayo selesaikan!</span>
                                : 'Semua percakapan sudah tertangani dengan baik. Kerja bagus! ✨'}
                        </p>
                    </div>
                    <div className="flex gap-3 flex-wrap flex-shrink-0">
                        <Link to="/inbox" className="group bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 border border-white/20 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                            <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" /> Buka Inbox
                        </Link>
                        <Link to="/reports" className="group bg-white text-[#00897B] px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 hover:bg-gray-50 flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                            <BarChart2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> Laporan
                        </Link>
                    </div>
                </div>
            </div>

            {/* ANNOUNCEMENT */}
            <AnnouncementBanner data={announcementsToShow} />

            {/* QUICK ACTIONS */}
            <QuickActions />

            {/* KEY METRICS */}
            <StatCards stats={data?.stats} />

            {/* MAIN GRID: Chart + Devices */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 h-[320px] md:h-[420px]">
                    <ChatVolumeChart data={data?.chart_data} stats={data?.stats} />
                </div>
                <div className="lg:col-span-1 h-[320px] md:h-[420px]">
                    <DeviceStatusWidget devices={data?.devices} />
                </div>
            </div>

            {/* BOTTOM GRID: Activity + Channel Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ActivityFeed activities={data?.activity_feed} />
                </div>

                {/* Channel Breakdown */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm h-full flex flex-col transition-colors duration-200">
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-5">Ringkasan Channel</h3>

                        {channelSummary.length > 0 ? (
                            <div className="flex-1 space-y-3">
                                {channelSummary.map((row, idx) => {
                                    const meta = CHANNEL_META[row.channel] || CHANNEL_META.other;
                                    const pct = totalConvs > 0 ? Math.round((parseInt(row.total_conversations) / totalConvs) * 100) : 0;
                                    return (
                                        <div key={idx}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <img src={getApiUrl(meta.icon)} alt={meta.label} className="w-4 h-4" />
                                                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{meta.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                                                    {parseInt(row.unread_count) > 0 && (
                                                        <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.5 rounded-full">
                                                            {row.unread_count} unread
                                                        </span>
                                                    )}
                                                    <span className="font-bold text-gray-700 dark:text-slate-200">{row.total_conversations}</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full transition-all duration-700 ${meta.color}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="pt-3 mt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between text-xs text-gray-500 dark:text-slate-400">
                                    <span>Total percakapan</span>
                                    <span className="font-bold text-gray-700 dark:text-slate-200">{totalConvs.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                                <p className="text-sm text-gray-400 dark:text-slate-500">Belum ada data percakapan</p>
                                <Link to="/integrations" className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                                    Hubungkan channel →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
