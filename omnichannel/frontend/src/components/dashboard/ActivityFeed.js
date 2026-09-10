import React from 'react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../../config/api';

const CHANNEL_ICONS = {
    whatsapp: '/icons/whatsapp-unofficial.svg',
    whatsapp_official: '/icons/whatsapp-official.svg',
    messenger: '/icons/messenger.svg',
    instagram: '/icons/instagram.svg',
    telegram: '/icons/telegram.svg',
    webchat: '/icons/webchat.svg',
};

const STATUS_STYLE = {
    open: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50',
    resolved: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50',
    needs_agent: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50',
};

// Compact relative time formatter for neat mobile display
const formatShortTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Baru saja';
        if (diffMin < 60) return `${diffMin}m lalu`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}j lalu`;
        const diffDays = Math.floor(diffHr / 24);
        if (diffDays === 1) return 'Kemarin';
        if (diffDays < 7) return `${diffDays}h lalu`;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
        return '—';
    }
};

export default function ActivityFeed({ activities }) {
    return (
        <div className="bg-white dark:bg-[#1e293b] p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm h-full flex flex-col transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-base sm:text-lg">Percakapan Terbaru</h3>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Aktivitas pesan terkini</p>
                </div>
                <Link to="/inbox" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1">
                    Lihat Semua →
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar min-h-[220px]">
                {activities && activities.length > 0 ? (
                    activities.map((item, idx) => (
                        <Link 
                            key={idx}
                            to={item.id ? `/inbox?conversation_id=${item.id}` : '/inbox'}
                            className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:px-3 sm:py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#0f172a] active:bg-gray-100 dark:active:bg-slate-800 transition-colors group block"
                        >
                            {/* Channel icon */}
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-gray-200 dark:border-slate-700">
                                <img
                                    src={getApiUrl(CHANNEL_ICONS[item.channel] || '/icons/device.svg')}
                                    alt={item.channel}
                                    className="w-4 h-4 object-contain"
                                />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 mr-1 sm:mr-2">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {item.title}
                                    </p>
                                    {item.unread_count > 0 && (
                                        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none shrink-0">
                                            {item.unread_count}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] sm:text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
                                    {item.subtitle || '—'}
                                </p>
                            </div>

                            {/* Right side: compact time & status badge */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap font-medium">
                                    {formatShortTime(item.created_at)}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLE[item.status] || STATUS_STYLE.open}`}>
                                    {item.status === 'open' ? 'Aktif' : item.status === 'resolved' ? 'Selesai' : 'Perlu Agen'}
                                </span>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <p className="text-xs sm:text-sm text-gray-400 dark:text-slate-500">Belum ada percakapan</p>
                    </div>
                )}
            </div>
        </div>
    );
}
