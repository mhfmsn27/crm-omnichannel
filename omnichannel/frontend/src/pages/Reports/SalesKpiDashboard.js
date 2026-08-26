import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, CheckCircle, Clock, AlertCircle, Wallet } from 'lucide-react';

const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

function StatCard({ title, value, icon: Icon, color, bg }) {
    return (
        <div className="bg-white rounded-xl p-6 border shadow-sm flex items-center gap-4">
            <div className={`p-4 rounded-full ${bg} ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm font-bold text-gray-500 uppercase">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}

export default function SalesKpiDashboard() {
    const [data, setData] = useState({ overview: {}, topAgents: [], trend: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/app/invoices/kpi')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading KPI Data...</div>;

    const won = parseInt(data.overview?.won_deals || 0);
    const pending = parseInt(data.overview?.pending_deals || 0);
    const winRate = won > 0 ? Math.round((won / (won + pending)) * 100) : 0;
    
    const revenue = parseFloat(data.overview?.total_revenue || 0);
    const cogs = parseFloat(data.overview?.total_cogs || 0);
    const grossProfit = revenue - cogs;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Sales KPI Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                <StatCard 
                    title="Total Revenue" 
                    value={formatIDR(revenue)}
                    icon={TrendingUp}
                    color="text-green-600"
                    bg="bg-green-100"
                />
                <StatCard 
                    title="Gross Profit" 
                    value={formatIDR(grossProfit)}
                    icon={Wallet}
                    color="text-emerald-600"
                    bg="bg-emerald-100"
                />
                <StatCard 
                    title="Win Rate" 
                    value={`${winRate}%`}
                    icon={CheckCircle}
                    color="text-indigo-600"
                    bg="bg-indigo-100"
                />
                <StatCard 
                    title="Pending Deals" 
                    value={data.overview.pending_deals || 0}
                    icon={Clock}
                    color="text-orange-600"
                    bg="bg-orange-100"
                />
                <StatCard 
                    title="Open Quotations" 
                    value={data.overview.open_quotations || 0}
                    icon={AlertCircle}
                    color="text-blue-600"
                    bg="bg-blue-100"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl p-6 border shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Revenue Trend (Last 7 Days)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.trend}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', { weekday: 'short' })} 
                                    tick={{fontSize: 12}}
                                />
                                <YAxis 
                                    tickFormatter={(val) => `Rp ${val/1000}k`} 
                                    tick={{fontSize: 12}}
                                />
                                <Tooltip formatter={(val) => formatIDR(val)} />
                                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-500" />
                        Top Sales Agents
                    </h3>
                    <div className="space-y-4">
                        {data.topAgents.length === 0 && (
                            <p className="text-gray-500 text-sm">No closed deals yet.</p>
                        )}
                        {data.topAgents.map((agent, i) => (
                            <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{agent.name}</p>
                                        <p className="text-xs text-gray-500">{agent.deals_closed} deals closed</p>
                                    </div>
                                </div>
                                <div className="font-bold text-indigo-600 text-sm">
                                    {formatIDR(agent.revenue)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
