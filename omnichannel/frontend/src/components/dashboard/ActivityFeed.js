import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
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
    open: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    resolved: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    needs_agent: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
};

export default function ActivityFeed({ activities }) {
    return (
        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm h-full flex flex-col transition-colors duration-200">
            <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">Percakapan Terbaru</h3>
                <Link to="/inbox" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                    Lihat Semua →
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                {activities && activities.length > 0 ? (
                    activities.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[#0f172a] transition-colors group">
                            {/* Channel icon */}
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-gray-200 dark:border-slate-700">
                                <img
                                    src={getApiUrl(CHANNEL_ICONS[item.channel] || '/icons/device.svg')}
                                    alt={item.channel}
                                    className="w-4 h-4"
                                />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">
                                        {item.title}
                                    </p>
                                    {item.unread_count > 0 && (
                                        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none shrink-0">
                                            {item.unread_count}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
                                    {item.subtitle || '—'}
                                </p>
                            </div>

                            {/* Right side */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[10px] text-gray-400 dark:text-slate-500 whitespace-nowrap">
                                    {item.created_at
                                        ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: id })
                                        : '—'}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLE[item.status] || STATUS_STYLE.open}`}>
                                    {item.status === 'open' ? 'Aktif' : item.status === 'resolved' ? 'Selesai' : 'Perlu Agen'}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <p className="text-sm text-gray-400 dark:text-slate-500">Belum ada percakapan</p>
                    </div>
                )}
            </div>
        </div>
    );
}
