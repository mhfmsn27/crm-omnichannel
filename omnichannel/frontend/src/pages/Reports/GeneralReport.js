import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import DateRangeFilter from '../../components/analytics/DateRangeFilter';
import SummaryCard from '../../components/analytics/SummaryCard';

export default function GeneralReport() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, [startDate, endDate]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/analytics', {
                params: { startDate, endDate }
            });
            setData(res.data);
        } catch (err) {
            console.error("Failed to load analytics", err);
        } finally {
            setLoading(false);
        }
    };

    const [downloading, setDownloading] = useState(false);

    const handleExport = async () => {
        setDownloading(true);
        try {
            const res = await axios.get('/api/app/analytics/export', {
                params: { startDate, endDate },
                responseType: 'blob'
            });

            // Create Blob URL
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `General_Report_${startDate}_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error("Export failed", err);
            // Optionally add toast here if available in context
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
    if (!data) return <div className="p-8">Failed to load data</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <h2 className="text-xl font-bold text-gray-900">General Overview</h2>
                <div className="flex gap-3">
                    <DateRangeFilter startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
                    <button
                        onClick={handleExport}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium text-sm transition-colors disabled:opacity-50"
                    >
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {downloading ? 'Exporting...' : 'Export'}
                    </button>
                </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <SummaryCard title="Total Chats" value={data.summary.total_conversations?.value || 0} trend={data.summary.total_conversations?.trend || 0} />
                <SummaryCard title="New Conversations" value={data.summary.new_conversations?.value || 0} trend={data.summary.new_conversations?.trend || 0} />
                <SummaryCard title="Incoming Msgs" value={data.summary.incoming_messages?.value || 0} trend={data.summary.incoming_messages?.trend || 0} />
                <SummaryCard title="Outgoing Msgs" value={data.summary.outgoing_messages?.value || 0} trend={data.summary.outgoing_messages?.trend || 0} />
                <SummaryCard title="Avg Response" value={data.summary.avg_response_time?.value || "0m"} trend={data.summary.avg_response_time?.trend || 0} />
                <SummaryCard title="CSAT Score" value={data.summary.csat_score?.value || 0} trend={data.summary.csat_score?.trend || 0} />
            </div>

            {/* CHART */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-8">
                <h3 className="font-bold text-gray-800 mb-6">Volume Percakapan</h3>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.main_chart}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend verticalAlign="top" height={36} />
                            <Line type="monotone" dataKey="incoming" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} name="Masuk" />
                            <Line type="monotone" dataKey="outgoing" stroke="#10b981" strokeWidth={3} name="Keluar" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}