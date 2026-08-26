
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import {
    Loader2, User, Clock, MessageSquare, Star, CheckCircle,
    AlertCircle, ChevronDown, Filter, Download, TrendingUp
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import DateRangeFilter from '../../components/analytics/DateRangeFilter';

// --- MOCK DATA GENERATORS (To match UI while backend catches up) ---
// Dalam implementasi nyata, data ini harus dihitung di backend
const generateHourlyData = () => {
    return Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        total: Math.floor(Math.random() * 10),
        new: Math.floor(Math.random() * 5),
        rating: (Math.random() * 2 + 3).toFixed(1),
        assigned: Math.floor(Math.random() * 8),
        unassigned: Math.floor(Math.random() * 3)
    }));
};

const COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

// --- COMPONENTS ---

const MetricCard = ({ title, value, subValue, icon: Icon, trend }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</span>
            <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400">
                <Icon className="w-4 h-4" />
            </div>
        </div>
        <div>
            <h3 className="text-2xl font-extrabold text-gray-900">{value}</h3>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600">{subValue}</span>
            </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
            <span className="text-xs text-gray-400">vs Kemarin</span>
            <span className={`text-xs font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? '+' : ''}{trend}%
            </span>
        </div>
    </div>
);

export default function AgentPerformance() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [loading, setLoading] = useState(true);

    // Data States
    const [agents, setAgents] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [summary, setSummary] = useState({});

    // Filters
    const [selectedAgent, setSelectedAgent] = useState('all');
    const [selectedChannel, setSelectedChannel] = useState('all');

    useEffect(() => {
        fetchData();
    }, [startDate, endDate, selectedAgent, selectedChannel]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = { startDate, endDate };
            if (selectedAgent !== 'all') params.agentId = selectedAgent;
            if (selectedChannel !== 'all') params.channel = selectedChannel;

            const res = await axios.get('/api/app/analytics', { params });

            // Transform API data to fit UI
            setAgents(res.data.agent_performance || []);
            setSummary(res.data.summary || {});

            // Use real chart data
            setChartData(res.data.main_chart || []);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Derived Metrics for UI
    const totalChats = summary.total_conversations?.value || 0;
    const newChats = summary.new_conversations?.value || 0;
    const resolved = summary.counts?.resolved || 0;
    const unresolved = totalChats - resolved;
    const avgRating = summary.csat_score?.value || 0;

    // Real Data Mappings
    const avgResponse = summary.avg_response_time?.value || '0m';
    const avgWait = summary.avg_wait_time?.value || '0m';
    const avgDuration = summary.avg_duration_time?.value || '0m';

    const [downloading, setDownloading] = useState(false);

    const handleExport = async () => {
        setDownloading(true);
        try {
            const res = await axios.get('/api/app/analytics/export/agents', {
                params: { startDate, endDate },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Agent_Performance_${startDate}_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error("Export failed", err);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto bg-gray-50 space-y-6">

            {/* 1. FILTERS HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex gap-3 w-full md:w-auto">
                    {/* Agent Select */}
                    <div className="relative min-w-[200px]">
                        <select
                            className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 pr-8"
                            value={selectedAgent}
                            onChange={(e) => setSelectedAgent(e.target.value)}
                        >
                            <option value="all">Semua Agen</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.agent_name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Channel Select */}
                    <div className="relative min-w-[160px]">
                        <select
                            className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 pr-8"
                            value={selectedChannel}
                            onChange={(e) => setSelectedChannel(e.target.value)}
                        >
                            <option value="all">Semua Channel</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="telegram">Telegram</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="flex gap-2">
                    <DateRangeFilter startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
                    <button
                        onClick={handleExport}
                        disabled={downloading}
                        className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-50"
                        title="Export to Excel"
                    >
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* 2. SUMMARY CARDS & PIE CHART */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Left: 6 Grid Metrics */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard
                        title="Total Percakapan"
                        value={totalChats}
                        subValue="Percakapan"
                        icon={MessageSquare}
                        trend={summary.total_conversations?.trend || 0}
                    />
                    <MetricCard
                        title="Total Percakapan Baru"
                        value={newChats}
                        subValue="Percakapan baru"
                        icon={AlertCircle}
                        trend={summary.new_conversations?.trend || 0}
                    />
                    <MetricCard
                        title="Rating Percakapan"
                        value={avgRating}
                        subValue="/ 5.0 Rating"
                        icon={Star}
                        trend={summary.csat_score?.trend || 0}
                    />
                    <MetricCard
                        title="Rata-rata Response"
                        value={avgResponse}
                        subValue="Detik/Menit"
                        icon={Clock}
                        trend={summary.avg_response_time?.trend || 0}
                    />
                    <MetricCard
                        title="Rata-rata Menunggu"
                        value={avgWait}
                        subValue="Waktu tunggu (FRT)"
                        icon={Clock}
                        trend={0}
                    />
                    <MetricCard
                        title="Rata-rata Selesai"
                        value={avgDuration}
                        subValue="Durasi chat"
                        icon={CheckCircle}
                        trend={0}
                    />
                </div>

                {/* Right: Donut Chart (Selesai vs Belum) */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center relative">
                    <div className="flex justify-between w-full mb-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase">Selesai vs Belum</h4>
                        <Download className="w-4 h-4 text-gray-400 cursor-pointer" />
                    </div>

                    <div className="h-48 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Selesai', value: summary.counts?.resolved || 0 },
                                        { name: 'Belum', value: (summary.total_conversations?.value || 0) - (summary.counts?.resolved || 0) }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell key="cell-0" fill="#3b82f6" />
                                    <Cell key="cell-1" fill="#a855f7" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Centered Text */}
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                            <span className="text-3xl font-extrabold text-gray-900">
                                {summary.total_conversations?.value ? Math.round(((summary.counts?.resolved || 0) / summary.total_conversations.value) * 100) : 0}%
                            </span>
                            <span className="text-xs text-gray-500">Completion</span>
                        </div>
                    </div>

                    <div className="w-full mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-gray-600">Total Selesai</span>
                            </div>
                            <span className="font-bold text-gray-900">{summary.counts?.resolved || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                <span className="text-gray-600">Total Belum</span>
                            </div>
                            <span className="font-bold text-gray-900">{(summary.total_conversations?.value || 0) - (summary.counts?.resolved || 0)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Chart 1: Rincian Percakapan */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800">Rincian Percakapan</h3>
                        <Download className="w-4 h-4 text-gray-400 cursor-pointer" />
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Line type="monotone" dataKey="total" name="Total Percakapan" stroke="#a855f7" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="new" name="Percakapan Baru" stroke="#3b82f6" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="rating" name="Rating (Scale)" stroke="#10b981" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: Unassigned vs Assigned */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800">Unassigned vs. Assigned</h3>
                        <Download className="w-4 h-4 text-gray-400 cursor-pointer" />
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Line type="monotone" dataKey="unassigned" name="Unassigned" stroke="#a855f7" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="assigned" name="Assigned" stroke="#3b82f6" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 4. WORKLOAD DISTRIBUTION CHART */}
            {agents.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-800 mb-4">Distribusi Beban Kerja (Open Saat Ini)</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agents.filter(a => a.open_count > 0 || a.resolved_count > 0).slice(0, 10)}
                                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="agent_name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false}
                                    tickFormatter={v => v.split(' ')[0]} />
                                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend iconType="circle" />
                                <Bar dataKey="open_count" name="Chat Aktif" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="resolved_count" name="Diselesaikan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* 5. AGENT PERFORMANCE TABLE */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-lg">Detail Performa Agen</h3>
                    <button onClick={handleExport} disabled={downloading}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 disabled:opacity-50">
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                </div>

                {agents.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">No agent data available for this period.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase">Agen</th>
                                    <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">Diselesaikan</th>
                                    <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">Total Assign</th>
                                    <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">Resolution Rate</th>
                                    <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">Avg FRT</th>
                                    <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">FCR</th>
                                    <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">SLA FRT</th>
                                    <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">Res. SLA (8h)</th>
                                    <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">Avg Rating</th>
                                    <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">Open Saat Ini</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {agents.map((agent, idx) => {
                                    const slaTotal = (parseInt(agent.sla_ok || 0) + parseInt(agent.sla_fail || 0));
                                    const slaFrtPct = slaTotal > 0 ? Math.round((parseInt(agent.sla_ok || 0) / slaTotal) * 100) : null;
                                    const resSlaTotal = (parseInt(agent.res_sla_ok || 0) + parseInt(agent.res_sla_fail || 0));
                                    const resSlaPct = resSlaTotal > 0 ? Math.round((parseInt(agent.res_sla_ok || 0) / resSlaTotal) * 100) : null;
                                    const fcrPct = parseInt(agent.resolved_count || 0) > 0
                                        ? Math.round((parseInt(agent.fcr_count || 0) / parseInt(agent.resolved_count || 0)) * 100)
                                        : null;

                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                                                        {agent.agent_name?.charAt(0) || '?'}
                                                    </div>
                                                    <span className="font-semibold text-gray-800 text-xs">{agent.agent_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-blue-600">{agent.resolved_count}</td>
                                            <td className="px-4 py-3 text-center text-gray-500">{agent.total_assigned || 0}</td>
                                            <td className="px-4 py-3 text-center">
                                                {agent.resolution_rate != null ? (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${agent.resolution_rate >= 70 ? 'bg-green-100 text-green-700' : agent.resolution_rate >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                        {agent.resolution_rate}%
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-600 text-xs">
                                                {agent.avg_frt_mins != null ? `${agent.avg_frt_mins}m` : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {fcrPct != null ? (
                                                    <span className={`text-xs font-bold ${fcrPct >= 70 ? 'text-green-600' : fcrPct >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                                                        {fcrPct}%
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {slaFrtPct != null ? (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${slaFrtPct >= 80 ? 'bg-green-100 text-green-700' : slaFrtPct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                        {slaFrtPct}%
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {resSlaPct != null ? (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${resSlaPct >= 80 ? 'bg-green-100 text-green-700' : resSlaPct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                        {resSlaPct}%
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1 font-bold text-gray-800 text-xs">
                                                    {agent.avg_rating}
                                                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs font-bold ${parseInt(agent.open_count || 0) > 10 ? 'text-red-500' : parseInt(agent.open_count || 0) > 5 ? 'text-yellow-500' : 'text-gray-600'}`}>
                                                    {agent.open_count || 0}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}
