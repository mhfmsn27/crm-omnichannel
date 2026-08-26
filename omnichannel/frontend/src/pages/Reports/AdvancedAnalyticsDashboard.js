import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
    BarChart2, TrendingUp, Clock, Users, Star, MessageSquare,
    ArrowUp, ArrowDown, Minus, RefreshCw, Calendar, Filter,
    MessageCircle, Phone, Mail, Globe, AlertCircle, CheckCircle,
    Radio, Inbox, UserCheck, AlertOctagon
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, Legend
} from 'recharts';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const formatNumber = (n) => n?.toLocaleString() || '0';
const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
};

function MetricCard({ title, value, sub, icon: Icon, color, trend, trendValue }) {
    return (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
            {trend && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {trend > 0 ? <ArrowUp className="w-3 h-3" /> : trend < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {trendValue || Math.abs(trend)}% vs prev
                </div>
            )}
        </div>
    );
}

function ChannelBadge({ channel }) {
    const colors = {
        whatsapp: 'bg-green-100 text-green-700',
        instagram: 'bg-pink-100 text-pink-700',
        facebook: 'bg-blue-100 text-blue-700',
        tiktok: 'bg-gray-900 text-white',
        telegram: 'bg-blue-500 text-white',
        shopee: 'bg-orange-100 text-orange-700',
        webchat: 'bg-purple-100 text-purple-700'
    };

    return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${colors[channel] || 'bg-gray-100 text-gray-600'}`}>
            {channel?.toUpperCase() || 'N/A'}
        </span>
    );
}

function DateRangePicker({ startDate, endDate, onStartChange, onEndChange }) {
    return (
        <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
            <Calendar className="w-4 h-4 text-gray-400 ml-2" />
            <input
                type="date"
                value={startDate}
                onChange={(e) => onStartChange(e.target.value)}
                className="border-0 text-sm p-1 focus:outline-none"
            />
            <span className="text-gray-400">-</span>
            <input
                type="date"
                value={endDate}
                onChange={(e) => onEndChange(e.target.value)}
                className="border-0 text-sm p-1 focus:outline-none"
            />
        </div>
    );
}

function SimpleChart({ data, title }) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">{title}</h3>
                <div className="text-center py-8 text-gray-400">No data available</div>
            </div>
        );
    }

    const maxValue = Math.max(...data.map(d => d.value || d.count || 1));

    return (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">{title}</h3>
            <div className="flex items-end gap-1 h-40">
                {data.slice(-14).map((item, idx) => {
                    const value = item.value || item.count || item.total || 0;
                    const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className="w-full bg-indigo-500 rounded-t transition-all hover:bg-indigo-600"
                                style={{ height: `${Math.max(height, 2)}%` }}
                                title={value}
                            />
                            <span className="text-[10px] text-gray-400">
                                {item.label || item.date?.slice(5, 10) || idx + 1}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const CHANNEL_COLORS = {
    whatsapp: '#25d366',
    instagram: '#e1306c',
    facebook: '#1877f2',
    telegram: '#2ca5e0',
    webchat: '#6366f1',
    email: '#f59e0b',
    unknown: '#9ca3af'
};

export default function AdvancedAnalyticsDashboard() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState({
        overview: null,
        conversations: null,
        responseTime: null,
        csat: null,
        channels: null
    });
    const [liveData, setLiveData] = useState(null);
    const [liveLoading, setLiveLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const liveIntervalRef = useRef(null);

    const fetchOverview = useCallback(async () => {
        try {
            const [overviewRes, convRes, responseRes, csatRes, channelRes] = await Promise.all([
                axios.get('/api/app/analytics/overview', { params: { startDate, endDate } }),
                axios.get('/api/app/analytics/conversations', { params: { startDate, endDate } }),
                axios.get('/api/app/analytics/response-time', { params: { startDate, endDate } }),
                axios.get('/api/app/analytics/csat', { params: { startDate, endDate } }),
                axios.get('/api/app/analytics/channels', { params: { startDate, endDate } })
            ]);

            setData({
                overview: overviewRes.data,
                conversations: convRes.data,
                responseTime: responseRes.data,
                csat: csatRes.data,
                channels: channelRes.data
            });
        } catch (e) {
            console.error('Analytics fetch error:', e);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    const fetchLiveData = useCallback(async () => {
        setLiveLoading(true);
        try {
            const res = await axios.get('/api/app/analytics/realtime');
            setLiveData(res.data);
            setLastUpdated(new Date());
        } catch (e) {
            console.error('Live data fetch error:', e);
        } finally {
            setLiveLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    useEffect(() => {
        if (activeTab === 'live') {
            fetchLiveData();
            liveIntervalRef.current = setInterval(fetchLiveData, 30000);
        } else {
            if (liveIntervalRef.current) {
                clearInterval(liveIntervalRef.current);
                liveIntervalRef.current = null;
            }
        }
        return () => {
            if (liveIntervalRef.current) {
                clearInterval(liveIntervalRef.current);
                liveIntervalRef.current = null;
            }
        };
    }, [activeTab, fetchLiveData]);

    const overview = data.overview;
    const conversations = data.conversations;
    const responseTime = data.responseTime;
    const csat = data.csat;
    const channels = data.channels;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-indigo-500" />
                        Advanced Analytics
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Comprehensive insights into your customer service performance
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onStartChange={setStartDate}
                        onEndChange={setEndDate}
                    />
                    <button
                        onClick={fetchOverview}
                        className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b overflow-x-auto">
                {[
                    { id: 'overview', label: 'Overview', icon: BarChart2 },
                    { id: 'conversations', label: 'Conversations', icon: MessageCircle },
                    { id: 'response', label: 'Response Time', icon: Clock },
                    { id: 'csat', label: 'CSAT', icon: Star },
                    { id: 'channels', label: 'Channels', icon: Globe },
                    { id: 'queue', label: 'Queue / Backlog', icon: Inbox },
                    { id: 'live', label: 'Live Now', icon: Radio }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 pb-3 px-2 text-sm font-medium whitespace-nowrap transition-colors ${
                            activeTab === tab.id
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            title="Active Conversations"
                            value={formatNumber(overview?.realtime?.active_conversations)}
                            sub={`${formatNumber(overview?.realtime?.unread_conversations)} unread`}
                            icon={MessageCircle}
                            color="bg-blue-50 text-blue-600"
                        />
                        <MetricCard
                            title="Resolved Today"
                            value={formatNumber(overview?.realtime?.resolved_today)}
                            sub={`${formatNumber(overview?.today?.resolved_conversations || 0)} this week`}
                            icon={CheckCircle}
                            color="bg-green-50 text-green-600"
                        />
                        <MetricCard
                            title="Avg Response Time"
                            value={formatDuration(overview?.today?.avg_first_response_time_seconds)}
                            sub="First response"
                            icon={Clock}
                            color="bg-orange-50 text-orange-600"
                        />
                        <MetricCard
                            title="CSAT Score"
                            value={`${(overview?.today?.csat_score || 0).toFixed(1)}%`}
                            sub={`${formatNumber(overview?.today?.total_ratings || 0)} ratings`}
                            icon={Star}
                            color="bg-purple-50 text-purple-600"
                        />
                    </div>

                    {/* Daily Trend */}
                    <SimpleChart
                        data={(overview?.dailyMetrics || []).map(d => ({
                            date: d.metric_date,
                            value: d.total_conversations,
                            label: d.metric_date?.slice(5, 10)
                        }))}
                        title="Daily Conversation Volume"
                    />

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border p-5 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-3">Resolution Rate</h3>
                            <div className="flex items-center justify-center h-24">
                                <div className="relative w-24 h-24">
                                    <svg className="w-24 h-24 transform -rotate-90">
                                        <circle cx="48" cy="48" r="40" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                                        <circle
                                            cx="48" cy="48" r="40"
                                            stroke="#6366F1"
                                            strokeWidth="8"
                                            fill="none"
                                            strokeDasharray={`${(conversations?.resolutionRate?.resolved || 0) / (conversations?.resolutionRate?.total || 1) * 251.2} 251.2`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xl font-bold">
                                            {conversations?.resolutionRate?.total > 0
                                                ? Math.round((conversations.resolutionRate.resolved / conversations.resolutionRate.total) * 100)
                                                : 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-center text-sm text-gray-500 mt-2">
                                {conversations?.resolutionRate?.resolved || 0} of {conversations?.resolutionRate?.total || 0} resolved
                            </p>
                        </div>

                        <div className="bg-white rounded-xl border p-5 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-3">Avg Rating</h3>
                            <div className="flex items-center justify-center h-24">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-indigo-600">
                                        {(csat?.overallCsat?.avg_rating || 0).toFixed(1)}
                                    </div>
                                    <div className="flex items-center justify-center gap-1 mt-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <Star
                                                key={i}
                                                className={`w-5 h-5 ${
                                                    i <= Math.round(csat?.overallCsat?.avg_rating || 0)
                                                        ? 'text-yellow-400 fill-yellow-400'
                                                        : 'text-gray-200'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <p className="text-center text-sm text-gray-500 mt-2">
                                {csat?.overallCsat?.total_ratings || 0} total ratings
                            </p>
                        </div>

                        <div className="bg-white rounded-xl border p-5 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-3">Unassigned</h3>
                            <div className="flex items-center justify-center h-24">
                                <div className={`text-center ${overview?.realtime?.unassigned_conversations > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                                    <div className="text-4xl font-bold">
                                        {overview?.realtime?.unassigned_conversations || 0}
                                    </div>
                                    <p className="text-sm mt-2">conversations</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Conversations Tab */}
            {activeTab === 'conversations' && (
                <div className="space-y-6">
                    <SimpleChart
                        data={(conversations?.volumeByDay || []).map(d => ({
                            date: d.date,
                            value: d.total,
                            label: d.date?.slice(5, 10)
                        }))}
                        title="Daily Conversation Volume"
                    />

                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 border-b">
                            <h3 className="font-bold text-gray-800">Volume by Channel</h3>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Channel</th>
                                    <th className="text-center p-4 text-xs font-bold text-gray-500 uppercase">Total</th>
                                    <th className="text-center p-4 text-xs font-bold text-gray-500 uppercase">Resolved</th>
                                    <th className="text-center p-4 text-xs font-bold text-gray-500 uppercase">Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(conversations?.volumeByChannel || []).map((ch, idx) => (
                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                        <td className="p-4">
                                            <ChannelBadge channel={ch.channel} />
                                        </td>
                                        <td className="p-4 text-center font-medium">{ch.total}</td>
                                        <td className="p-4 text-center">{ch.resolved}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                (ch.total > 0 && ch.resolved / ch.total > 0.7) ? 'bg-green-100 text-green-700' :
                                                (ch.total > 0 && ch.resolved / ch.total > 0.4) ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {ch.total > 0 ? Math.round((ch.resolved / ch.total) * 100) : 0}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(!conversations?.volumeByChannel || conversations.volumeByChannel.length === 0) && (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-gray-400">No channel data available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Response Time Tab */}
            {activeTab === 'response' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            title="Avg (Mean)"
                            value={formatDuration(responseTime?.firstResponse?.avg_seconds)}
                            sub="Rata-rata FRT"
                            icon={Clock}
                            color="bg-blue-50 text-blue-600"
                        />
                        <MetricCard
                            title="P50 (Median)"
                            value={formatDuration(responseTime?.firstResponse?.median_seconds)}
                            sub="50th percentile"
                            icon={Clock}
                            color="bg-green-50 text-green-600"
                        />
                        <MetricCard
                            title="P90"
                            value={formatDuration(responseTime?.firstResponse?.p90_seconds)}
                            sub="90th percentile"
                            icon={TrendingUp}
                            color="bg-orange-50 text-orange-600"
                        />
                        <MetricCard
                            title="P95"
                            value={formatDuration(responseTime?.firstResponse?.p95_seconds)}
                            sub="95th percentile"
                            icon={AlertCircle}
                            color="bg-red-50 text-red-600"
                        />
                    </div>
                    <div className="bg-white rounded-xl border p-4 shadow-sm">
                        <p className="text-xs text-gray-500">
                            <strong>Mean vs Median:</strong> Jika Mean &gt; Median, ada outlier (chat sangat lambat) yang mendongkrak rata-rata.
                            Gunakan Median (P50) sebagai acuan performa normal. P95 menunjukkan worst-case yang dialami 5% pelanggan.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border shadow-sm p-5">
                        <h3 className="font-bold text-gray-800 mb-4">Response Time by Hour</h3>
                        <div className="flex items-end gap-1 h-40">
                            {Array.from({ length: 24 }, (_, i) => {
                                const hourData = responseTime?.responseByHour?.find(h => parseInt(h.hour) === i);
                                const value = hourData?.avg_seconds || 0;
                                const maxValue = Math.max(...(responseTime?.responseByHour || []).map(h => h.avg_seconds || 0), 1);
                                const height = maxValue > 0 ? (value / maxValue) * 100 : 0;

                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                        <div
                                            className={`w-full rounded-t ${i === new Date().getHours() ? 'bg-indigo-600' : 'bg-blue-400'}`}
                                            style={{ height: `${Math.max(height, 2)}%` }}
                                            title={`${i}:00 - ${formatDuration(value)}`}
                                        />
                                        {i % 6 === 0 && (
                                            <span className="text-[10px] text-gray-400">{i}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* CSAT Tab */}
            {activeTab === 'csat' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total Ratings"
                            value={formatNumber(csat?.overallCsat?.total_ratings || 0)}
                            sub="This period"
                            icon={Star}
                            color="bg-yellow-50 text-yellow-600"
                        />
                        <MetricCard
                            title="Avg Rating"
                            value={(csat?.overallCsat?.avg_rating || 0).toFixed(1)}
                            sub="out of 5"
                            icon={Star}
                            color="bg-orange-50 text-orange-600"
                        />
                        <MetricCard
                            title="Satisfaction Rate"
                            value={`${(csat?.overallCsat?.satisfaction_rate || 0).toFixed(0)}%`}
                            sub="4-5 star ratings"
                            icon={CheckCircle}
                            color="bg-green-50 text-green-600"
                        />
                        <MetricCard
                            title="5-Star Reviews"
                            value={formatNumber(csat?.overallCsat?.five_star || 0)}
                            sub="Excellent ratings"
                            icon={Star}
                            color="bg-purple-50 text-purple-600"
                        />
                    </div>

                    <div className="bg-white rounded-xl border shadow-sm p-5">
                        <h3 className="font-bold text-gray-800 mb-4">Rating Distribution</h3>
                        <div className="space-y-3">
                            {[5, 4, 3, 2, 1].map(rating => {
                                const count = csat?.overallCsat?.[`${rating}_star`] || 0;
                                const total = csat?.overallCsat?.total_ratings || 1;
                                const pct = (count / total) * 100;

                                return (
                                    <div key={rating} className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 w-16">
                                            <span className="font-medium">{rating}</span>
                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                        </div>
                                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                                            <div
                                                className="bg-yellow-400 h-2 rounded-full transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-500 w-16 text-right">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Channels Tab */}
            {activeTab === 'channels' && (
                <div className="space-y-6">
                    {/* Bar chart comparison */}
                    {(channels?.channels || []).length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-xl border p-5 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-4">Volume Percakapan per Channel</h3>
                                <div className="h-52">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={channels.channels.map(ch => ({ name: ch.channel, total: parseInt(ch.total_conversations || 0), resolved: parseInt(ch.resolved || 0) }))}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend iconType="circle" />
                                            <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]}>
                                                {channels.channels.map((ch, i) => <Cell key={i} fill={CHANNEL_COLORS[ch.channel] || '#6366f1'} />)}
                                            </Bar>
                                            <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl border p-5 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-4">Resolution Rate & Avg Rating per Channel</h3>
                                <div className="h-52">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={channels.channels.map(ch => ({
                                            name: ch.channel,
                                            resolution_rate: ch.total_conversations > 0 ? Math.round((ch.resolved / ch.total_conversations) * 100) : 0,
                                            avg_rating: ch.avg_rating ? parseFloat(ch.avg_rating).toFixed(1) * 20 : 0
                                        }))}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                                            <Tooltip formatter={(v, n) => [
                                                n === 'avg_rating' ? `${(v / 20).toFixed(1)} / 5` : `${v}%`,
                                                n === 'avg_rating' ? 'Avg Rating' : 'Resolution Rate'
                                            ]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend iconType="circle" />
                                            <Bar dataKey="resolution_rate" name="Resolution Rate" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="avg_rating" name="Avg Rating (×20)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Channel cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(channels?.channels || []).map((ch, idx) => {
                            const total = ch.total_conversations || 0;
                            const resolved = ch.resolved || 0;
                            const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;

                            return (
                                <div key={idx} className="bg-white rounded-xl border p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <ChannelBadge channel={ch.channel} />
                                        <span className="text-2xl font-bold text-gray-900">{total}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Resolved</span>
                                            <span className="font-medium">{resolved}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Resolution Rate</span>
                                            <span className={`font-medium ${resolutionRate > 70 ? 'text-green-600' : 'text-orange-500'}`}>
                                                {resolutionRate.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Avg Rating</span>
                                            <span className="font-medium">{ch.avg_rating ? parseFloat(ch.avg_rating).toFixed(1) : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {(!channels?.channels || channels.channels.length === 0) && (
                            <div className="col-span-full text-center py-8 text-gray-400">
                                No channel data available
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Queue / Backlog Tab */}
            {activeTab === 'queue' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            title="Active"
                            value={formatNumber(overview?.realtime?.active_conversations)}
                            sub="Conversations open"
                            icon={MessageCircle}
                            color="bg-blue-50 text-blue-600"
                        />
                        <MetricCard
                            title="Unassigned"
                            value={formatNumber(overview?.realtime?.unassigned_conversations)}
                            sub="No agent yet"
                            icon={Inbox}
                            color={overview?.realtime?.unassigned_conversations > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}
                        />
                        <MetricCard
                            title="Unread"
                            value={formatNumber(overview?.realtime?.unread_conversations)}
                            sub="Waiting reply"
                            icon={AlertOctagon}
                            color="bg-red-50 text-red-600"
                        />
                        <MetricCard
                            title="Resolved Today"
                            value={formatNumber(overview?.realtime?.resolved_today)}
                            sub="Closed today"
                            icon={CheckCircle}
                            color="bg-green-50 text-green-600"
                        />
                    </div>

                    {/* Backlog by Channel */}
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-gray-800">Backlog per Channel</h3>
                            <span className="text-xs text-gray-400">Percakapan yang belum selesai</span>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Channel</th>
                                    <th className="text-center p-4 text-xs font-bold text-gray-500 uppercase">Total</th>
                                    <th className="text-center p-4 text-xs font-bold text-gray-500 uppercase">Unresolved</th>
                                    <th className="text-center p-4 text-xs font-bold text-gray-500 uppercase">Backlog %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(channels?.channels || []).map((ch, idx) => {
                                    const total = parseInt(ch.total_conversations || 0);
                                    const resolved = parseInt(ch.resolved || 0);
                                    const unresolved = total - resolved;
                                    const backlogPct = total > 0 ? Math.round((unresolved / total) * 100) : 0;
                                    return (
                                        <tr key={idx} className="border-b hover:bg-gray-50">
                                            <td className="p-4"><ChannelBadge channel={ch.channel} /></td>
                                            <td className="p-4 text-center font-medium">{total}</td>
                                            <td className="p-4 text-center">
                                                <span className={`font-medium ${unresolved > 0 ? 'text-orange-600' : 'text-green-600'}`}>{unresolved}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center gap-2 justify-center">
                                                    <div className="w-20 bg-gray-100 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full transition-all ${backlogPct > 50 ? 'bg-red-500' : backlogPct > 30 ? 'bg-orange-400' : 'bg-green-400'}`}
                                                            style={{ width: `${backlogPct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-500 w-8">{backlogPct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {(!channels?.channels || channels.channels.length === 0) && (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-gray-400">No data available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Queue health indicator */}
                    <div className="bg-white rounded-xl border p-5 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4">Queue Health</h3>
                        <div className="space-y-3">
                            {[
                                {
                                    label: 'Unassigned Rate',
                                    value: overview?.realtime?.active_conversations > 0
                                        ? Math.round((overview.realtime.unassigned_conversations / overview.realtime.active_conversations) * 100)
                                        : 0,
                                    threshold: [10, 25],
                                    suffix: '%'
                                },
                                {
                                    label: 'Unread Rate',
                                    value: overview?.realtime?.active_conversations > 0
                                        ? Math.round((overview.realtime.unread_conversations / overview.realtime.active_conversations) * 100)
                                        : 0,
                                    threshold: [20, 50],
                                    suffix: '%'
                                }
                            ].map(item => {
                                const color = item.value <= item.threshold[0] ? 'bg-green-400' : item.value <= item.threshold[1] ? 'bg-yellow-400' : 'bg-red-500';
                                const status = item.value <= item.threshold[0] ? 'Healthy' : item.value <= item.threshold[1] ? 'Warning' : 'Critical';
                                const statusColor = item.value <= item.threshold[0] ? 'text-green-600' : item.value <= item.threshold[1] ? 'text-yellow-600' : 'text-red-600';
                                return (
                                    <div key={item.label} className="flex items-center gap-4">
                                        <span className="text-sm text-gray-600 w-36">{item.label}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                                            <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${Math.min(item.value, 100)}%` }} />
                                        </div>
                                        <span className="text-sm font-bold w-12 text-right">{item.value}{item.suffix}</span>
                                        <span className={`text-xs font-medium w-16 ${statusColor}`}>{status}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Live Now Tab */}
            {activeTab === 'live' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm text-gray-500">
                                {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
                            </span>
                        </div>
                        <button
                            onClick={fetchLiveData}
                            disabled={liveLoading}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${liveLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>

                    {liveLoading && !liveData ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <>
                            {/* Live metric cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <MetricCard
                                    title="Active Now"
                                    value={formatNumber(liveData?.active_conversations)}
                                    sub="Open conversations"
                                    icon={MessageCircle}
                                    color="bg-blue-50 text-blue-600"
                                />
                                <MetricCard
                                    title="Unassigned"
                                    value={formatNumber(liveData?.unassigned_conversations)}
                                    sub="Needs agent"
                                    icon={Inbox}
                                    color={liveData?.unassigned_conversations > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}
                                />
                                <MetricCard
                                    title="Agents Online"
                                    value={formatNumber(liveData?.online_agents)}
                                    sub="Active right now"
                                    icon={UserCheck}
                                    color="bg-green-50 text-green-600"
                                />
                                <MetricCard
                                    title="Resolved Today"
                                    value={formatNumber(liveData?.resolved_today)}
                                    sub="Closed today"
                                    icon={CheckCircle}
                                    color="bg-purple-50 text-purple-600"
                                />
                            </div>

                            {/* Agent live status table */}
                            {liveData?.agent_workload && liveData.agent_workload.length > 0 && (
                                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                                    <div className="p-4 border-b">
                                        <h3 className="font-bold text-gray-800">Agent Workload (Live)</h3>
                                    </div>
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Agent</th>
                                                <th className="text-center p-4 text-xs font-bold text-gray-500 uppercase">Active</th>
                                                <th className="text-center p-4 text-xs font-bold text-gray-500 uppercase">Unread</th>
                                                <th className="text-center p-4 text-xs font-bold text-gray-500 uppercase">Load</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {liveData.agent_workload.map((agent, idx) => {
                                                const maxLoad = Math.max(...liveData.agent_workload.map(a => a.active_count || 0), 1);
                                                const loadPct = Math.round((agent.active_count / maxLoad) * 100);
                                                return (
                                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                                                                    {agent.agent_name?.charAt(0)?.toUpperCase() || '?'}
                                                                </div>
                                                                <span className="text-sm font-medium">{agent.agent_name || 'Unknown'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center font-medium">{agent.active_count || 0}</td>
                                                        <td className="p-4 text-center text-orange-600 font-medium">{agent.unread_count || 0}</td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                                    <div
                                                                        className={`h-2 rounded-full transition-all ${loadPct > 75 ? 'bg-red-500' : loadPct > 50 ? 'bg-yellow-400' : 'bg-green-400'}`}
                                                                        style={{ width: `${loadPct}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs text-gray-400 w-8">{loadPct}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {!liveData && (
                                <div className="text-center py-12 text-gray-400">
                                    <Radio className="w-8 h-8 mx-auto mb-3 opacity-40" />
                                    <p>Live data unavailable. Click Refresh to try again.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}