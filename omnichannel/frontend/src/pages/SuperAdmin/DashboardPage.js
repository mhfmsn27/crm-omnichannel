import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    DollarSign, Users, UserPlus, AlertCircle,
    Activity, RefreshCw, Server, List, BarChart2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// --- COMPONENTS ---

const KpiCard = ({ title, value, subValue, icon: Icon, color, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white dark:bg-[#1e293b] p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{title}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
                {subValue && (
                    <p className={`text-xs mt-1 font-medium ${subValue.includes('+') ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                        {subValue}
                    </p>
                )}
            </div>
            <div className={`p-2.5 sm:p-3 rounded-xl ${color}`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
        </div>
    </div>
);

const SystemStatus = ({ status, queue }) => {
    const StatusItem = ({ label, state }) => (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl mb-2 border border-gray-100 dark:border-slate-700/50">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 font-medium">{label}</span>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${state === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-[10px] sm:text-xs font-bold uppercase ${state === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {state}
                </span>
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-[#1e293b] p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm h-full">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-base sm:text-lg">
                <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Status Sistem
            </h3>
            <StatusItem label="WA Gateway" state={status?.wa_gateway || 'offline'} />
            <StatusItem label="Redis Queue" state={status?.redis || 'offline'} />
            <StatusItem label="Main Database" state={status?.database || 'online'} />

            {queue && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Antrean Siaran</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/40">
                            <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">{queue.active}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Aktif</div>
                        </div>
                        <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/40">
                            <div className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400">{queue.waiting}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Menunggu</div>
                        </div>
                        <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/40">
                            <div className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">{queue.failed}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Gagal</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ActivityList = ({ activities }) => (
    <div className="bg-white dark:bg-[#1e293b] p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm h-full">
        <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-base sm:text-lg">Aktivitas Terkini</h3>
        <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
            {activities && activities.map((act, idx) => (
                <div key={idx} className="flex gap-2.5 sm:gap-3 items-start">
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${act.type === 'signup' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                    <div className="flex-1 border-b border-gray-50 dark:border-slate-800 pb-2.5 last:border-0 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-800 dark:text-slate-200 truncate">{act.message}</p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                            {act.created_at ? formatDistanceToNow(new Date(act.created_at), { addSuffix: true }) : 'Baru saja'}
                        </p>
                    </div>
                </div>
            ))}
            {(!activities || activities.length === 0) && (
                <p className="text-gray-400 dark:text-slate-500 text-xs sm:text-sm">Belum ada aktivitas terbaru.</p>
            )}
        </div>
    </div>
);

// --- MAIN PAGE ---

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/sa/dashboard');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return <div className="p-10 text-center text-gray-500 dark:text-gray-400">Loading Super Admin Dashboard...</div>;
    if (!data) return <div className="p-10 text-center text-red-500">Failed to load data</div>;

    return (
        <div className="p-3.5 sm:p-6 md:p-8 bg-gray-50 dark:bg-dark-bg min-h-screen">
            <div className="flex justify-between items-center mb-6 sm:mb-8 gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Super Admin Dashboard</h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Ringkasan performa dan kesehatan sistem.</p>
                </div>
                <button 
                    onClick={fetchData} 
                    className="p-2 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl hover:bg-gray-50 dark:hover:bg-[#0f172a] text-gray-600 dark:text-gray-300 active:scale-95 transition-all shadow-sm"
                    title="Muat Ulang Data"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* BOTTOM ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                    <ActivityList activities={data.recent_activities} />
                </div>
                <div>
                    <SystemStatus status={data.system_status} queue={data.queue_stats} />
                </div>
            </div>
        </div>
    );
}
