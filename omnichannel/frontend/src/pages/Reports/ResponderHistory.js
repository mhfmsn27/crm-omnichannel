import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import { Loader2, Star, User, Download } from 'lucide-react';
import DateRangeFilter from '../../components/analytics/DateRangeFilter';

export default function ResponderHistory() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // Use dedicated endpoint for full history
        axios.get('/api/app/analytics/responder-history', { params: { startDate, endDate } })
            .then(res => setFeedbacks(res.data || []))
            .catch(err => console.error("Failed to load history", err))
            .finally(() => setLoading(false));
    }, [startDate, endDate]);

    const [downloading, setDownloading] = useState(false);

    const handleExport = async () => {
        setDownloading(true);
        try {
            const res = await axios.get('/api/app/analytics/export/history', {
                params: { startDate, endDate },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Responder_History_${startDate}_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error("Export failed", err);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <h2 className="text-xl font-bold text-gray-900">Responder History CSAT</h2>
                <div className="flex items-center gap-2">
                    <DateRangeFilter startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
                    <button
                        onClick={handleExport}
                        disabled={downloading}
                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-50"
                        title="Export History"
                    >
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[480px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase">Customer</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase">Agent</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase">Rating</th>
                            <th className="px-6 py-4 font-bold text-gray-500 uppercase">Comment</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {feedbacks.map((fb, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                                    {format(new Date(fb.closed_at), 'dd MMM yyyy HH:mm')}
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-800">{fb.contact_name}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 bg-indigo-100 text-indigo-600 rounded-full">
                                            <User className="w-3 h-3" />
                                        </div>
                                        <span>{fb.agent_name || 'System'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1 text-yellow-500 font-bold">
                                        {fb.rating_score} <Star className="w-4 h-4 fill-current" />
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600 italic max-w-xs truncate">
                                    "{fb.rating_feedback || '-'}"
                                </td>
                            </tr>
                        ))}
                        {feedbacks.length === 0 && (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-400">No ratings found in this period.</td></tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}