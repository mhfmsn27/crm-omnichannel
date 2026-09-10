import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#334155] rounded-xl shadow-lg p-2.5 sm:p-3 text-xs">
            <p className="font-bold text-gray-700 dark:text-slate-300 mb-1.5">{label}</p>
            {payload.map(p => (
                <p key={p.name} className="flex items-center gap-1.5 my-0.5" style={{ color: p.color }}>
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="font-medium text-gray-600 dark:text-slate-400">{p.name === 'in' ? 'Masuk' : 'Keluar'}:</span>
                    <span className="font-bold ml-0.5">{p.value?.toLocaleString('id-ID')}</span>
                </p>
            ))}
        </div>
    );
};

export default function ChatVolumeChart({ data, stats }) {
    const totalIn  = data?.reduce((s, d) => s + (d.in  || 0), 0) ?? 0;
    const totalOut = data?.reduce((s, d) => s + (d.out || 0), 0) ?? 0;

    return (
        <div className="bg-white dark:bg-[#1e293b] p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm h-full transition-colors duration-200 flex flex-col">
            {/* Header: Title + Summary Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-base sm:text-lg">Volume Pesan</h3>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Aktivitas 7 hari terakhir</p>
                </div>

                {/* Stat badges */}
                <div className="flex items-center gap-3 sm:gap-5 bg-gray-50 dark:bg-slate-800/80 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-gray-100 dark:border-slate-700 self-start sm:self-auto">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                        <div>
                            <p className="text-[10px] text-gray-400 dark:text-slate-400 leading-tight">Masuk</p>
                            <p className="text-xs sm:text-sm font-extrabold text-indigo-600 dark:text-indigo-400 leading-tight">
                                {totalIn.toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>
                    <div className="w-[1px] h-6 bg-gray-200 dark:bg-slate-700"></div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <div>
                            <p className="text-[10px] text-gray-400 dark:text-slate-400 leading-tight">Keluar</p>
                            <p className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">
                                {totalOut.toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 min-h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickFormatter={str => {
                                if (!str) return '';
                                try {
                                    const d = new Date(str);
                                    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                                } catch {
                                    return str;
                                }
                            }}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            width={30}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                            formatter={(value) => value === 'in' ? 'Masuk' : 'Keluar'}
                        />
                        <Area type="monotone" dataKey="in"  stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIn)"  name="in" />
                        <Area type="monotone" dataKey="out" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOut)" name="out" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
