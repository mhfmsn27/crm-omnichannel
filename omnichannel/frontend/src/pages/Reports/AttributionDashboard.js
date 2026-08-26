import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    BarChart2, TrendingUp, DollarSign, Users, MousePointerClick,
    ArrowUp, ArrowDown, Minus, Filter, RefreshCw, ExternalLink, Copy,
    Plus, Edit2, Trash2, Link2, Calendar, PieChart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

function StatCard({ label, value, icon: Icon, color, sub, trend }) {
    return (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
            {trend !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {trend > 0 ? <ArrowUp className="w-3 h-3" /> : trend < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {Math.abs(trend)}% vs prev period
                </div>
            )}
        </div>
    );
}

function DateRangeFilter({ startDate, endDate, onStartChange, onEndChange }) {
    return (
        <div className="flex items-center gap-2">
            <input
                type="date"
                value={startDate}
                onChange={(e) => onStartChange(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-400">-</span>
            <input
                type="date"
                value={endDate}
                onChange={(e) => onEndChange(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
            />
        </div>
    );
}

function SourceTableRow({ source, clicks, uniqueVisitors, conversions, conversionRate }) {
    const sources = {
        'whatsapp': { color: '#25D366', name: 'WhatsApp' },
        'instagram': { color: '#E4405F', name: 'Instagram' },
        'facebook': { color: '#1877F2', name: 'Facebook' },
        'tiktok': { color: '#000000', name: 'TikTok' },
        'shopee': { color: '#EE4D2D', name: 'Shopee' },
        'google': { color: '#4285F4', name: 'Google Ads' },
        'direct': { color: '#6B7280', name: 'Direct' },
        'website': { color: '#6366F1', name: 'Website' },
    };

    const sourceInfo = sources[source] || { color: '#6B7280', name: source || 'Unknown' };

    return (
        <tr className="border-b hover:bg-gray-50">
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sourceInfo.color }} />
                    <span className="font-medium text-sm">{sourceInfo.name}</span>
                </div>
            </td>
            <td className="py-3 px-4 text-center">{clicks}</td>
            <td className="py-3 px-4 text-center">{uniqueVisitors}</td>
            <td className="py-3 px-4 text-center font-medium text-indigo-600">{conversions}</td>
            <td className="py-3 px-4 text-center">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                    conversionRate >= 5 ? 'bg-green-100 text-green-700' :
                    conversionRate >= 2 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                }`}>
                    {conversionRate}%
                </span>
            </td>
        </tr>
    );
}

function TopLinksTable({ links }) {
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    };

    return (
        <div className="bg-white rounded-xl border shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Top Performing Links
            </h3>
            {links.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No links yet</p>
            ) : (
                <div className="space-y-3">
                    {links.map((link, idx) => (
                        <div key={link.slug} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                                    {idx + 1}
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <code className="text-sm font-medium bg-white px-2 py-0.5 rounded border">
                                            {window.location.origin}/r/{link.slug}
                                        </code>
                                        <button onClick={() => copyToClipboard(`${window.location.origin}/r/${link.slug}`)} className="text-gray-400 hover:text-indigo-600">
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {link.utm_source || 'direct'} / {link.utm_medium || 'link'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="text-center">
                                    <span className="font-bold text-gray-900">{link.click_count}</span>
                                    <p className="text-xs text-gray-400">clicks</p>
                                </div>
                                <div className="text-center">
                                    <span className="font-bold text-green-600">{link.conversions}</span>
                                    <p className="text-xs text-gray-400">convs</p>
                                </div>
                                <div className="text-center">
                                    <span className={`font-bold ${
                                        link.conversion_rate >= 5 ? 'text-green-600' : 'text-gray-600'
                                    }`}>
                                        {link.conversion_rate}%
                                    </span>
                                    <p className="text-xs text-gray-400">rate</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AttributionDashboard() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { startDate, endDate };
            const res = await axios.get('/api/app/attribution/stats', { params });
            setStats(res.data);
        } catch (e) {
            toast.error('Failed to load attribution data');
            setStats({
                summary: { total_clicks: 0, unique_visitors: 0, total_conversions: 0 },
                bySource: [],
                topLinks: []
            });
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const summary = stats?.summary || { total_clicks: 0, unique_visitors: 0, total_conversions: 0 };
    const bySource = stats?.bySource || [];
    const topLinks = stats?.topLinks || [];

    const totalClicks = parseInt(summary.total_clicks) || 0;
    const uniqueVisitors = parseInt(summary.unique_visitors) || 0;
    const totalConversions = parseInt(summary.total_conversions) || 0;
    const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-indigo-500" />
                        Source Attribution
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track where your customers come from and measure campaign performance
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangeFilter startDate={startDate} endDate={endDate}
                        onStartChange={setStartDate} onEndChange={setEndDate} />
                    <button onClick={fetchData} className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b">
                <button onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-2 text-sm font-medium transition-colors ${activeTab === 'overview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    Overview
                </button>
                <button onClick={() => setActiveTab('sources')}
                    className={`pb-3 px-2 text-sm font-medium transition-colors ${activeTab === 'sources' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <PieChart className="w-4 h-4 inline mr-1" />
                    By Source
                </button>
                <button onClick={() => setActiveTab('links')}
                    className={`pb-3 px-2 text-sm font-medium transition-colors ${activeTab === 'links' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Link2 className="w-4 h-4 inline mr-1" />
                    Top Links
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    Loading...
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total Clicks" value={totalClicks.toLocaleString()}
                            icon={MousePointerClick} color="bg-blue-50 text-blue-600"
                            sub="Link clicks" />
                        <StatCard label="Unique Visitors" value={uniqueVisitors.toLocaleString()}
                            icon={Users} color="bg-purple-50 text-purple-600"
                            sub="Unique visitors" />
                        <StatCard label="Conversions" value={totalConversions.toLocaleString()}
                            icon={TrendingUp} color="bg-green-50 text-green-600"
                            sub="Contact created" />
                        <StatCard label="Conv. Rate" value={`${conversionRate}%`}
                            icon={PieChart} color="bg-orange-50 text-orange-600"
                            sub="Click to conversion" />
                    </div>

                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <TopLinksTable links={topLinks} />

                            {/* Source Breakdown */}
                            <div className="bg-white rounded-xl border shadow-sm p-5">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <PieChart className="w-4 h-4" />
                                    Traffic by Source
                                </h3>
                                {bySource.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-8">No data available</p>
                                ) : (
                                    <div className="space-y-4">
                                        {bySource.slice(0, 8).map((row, idx) => {
                                            const maxClicks = Math.max(...bySource.map(r => parseInt(r.clicks)));
                                            const barWidth = maxClicks > 0 ? (parseInt(row.clicks) / maxClicks) * 100 : 0;

                                            return (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div className="w-24 text-sm font-medium">{row.source || 'direct'}</div>
                                                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                        <div
                                                            className="bg-indigo-500 h-2 rounded-full transition-all"
                                                            style={{ width: `${barWidth}%` }}
                                                        />
                                                    </div>
                                                    <div className="w-16 text-right text-sm text-gray-600">
                                                        {row.clicks}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* By Source Tab */}
                    {activeTab === 'sources' && (
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Source</th>
                                        <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase">Clicks</th>
                                        <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase">Unique</th>
                                        <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase">Conversions</th>
                                        <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase">Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bySource.map((row, idx) => (
                                        <SourceTableRow
                                            key={idx}
                                            source={row.source}
                                            clicks={row.clicks}
                                            uniqueVisitors={row.unique_visitors}
                                            conversions={row.conversions}
                                            conversionRate={row.clicks > 0 ? ((row.conversions / row.clicks) * 100).toFixed(1) : 0}
                                        />
                                    ))}
                                    {bySource.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center py-8 text-gray-400">No data available</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Top Links Tab */}
                    {activeTab === 'links' && (
                        <TopLinksTable links={topLinks} />
                    )}
                </>
            )}
        </div>
    );
}