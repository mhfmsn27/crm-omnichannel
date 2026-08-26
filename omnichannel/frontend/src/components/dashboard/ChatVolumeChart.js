import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#334155] rounded-xl shadow-lg p-3 text-xs">
            <p className="font-bold text-gray-600 dark:text-slate-300 mb-1">{label}</p>
            {payload.map(p => (
                <p key={p.name} className="flex items-center gap-1.5" style={{ color: p.color }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                    {p.name}: <span className="font-bold ml-0.5">{p.value}</span>
                </p>
            ))}
        </div>
    );
};

export default function ChatVolumeChart({ data, stats }) {
    const totalIn  = data?.reduce((s, d) => s + (d.in  || 0), 0) ?? 0;
    const totalOut = data?.reduce((s, d) => s + (d.out || 0), 0) ?? 0;

    return (
        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm h-full transition-colors duration-200 flex flex-col">
            <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg">Volume Pesan</h3>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">7 hari terakhir</p>
                </div>
                <div className="flex gap-4 text-right">
                    <div>
                        <p className="text-xs text-gray-400 dark:text-slate-500">Masuk (7h)</p>
                        <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{totalIn.toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 dark:text-slate-500">Keluar (7h)</p>
                        <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{totalOut.toLocaleString('id-ID')}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            tickFormatter={str => {
                                const d = new Date(str);
                                return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                            }}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
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
