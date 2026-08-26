import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, Zap, AlertTriangle, HelpCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function ChatbotStatsReport() {
    const [summary, setSummary] = useState(null);
    const [kbStats, setKbStats] = useState({ top_qna: [], missed_questions: [] });
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        try {
            const [sumRes, kbRes, trendRes] = await Promise.all([
                axios.get('/api/app/chatbot/report/summary'),
                axios.get('/api/app/chatbot/report/kb-performance'),
                axios.get('/api/app/chatbot/report/trends')
            ]);
            setSummary(sumRes.data);
            setKbStats(kbRes.data);
            setTrends(trendRes.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Loading Report...</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto custom-scrollbar">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Chatbot AI Performance</h2>
                <button onClick={fetchData} className="text-sm text-indigo-600 font-bold hover:underline">Refresh Data</button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card
                    icon={<Bot className="w-8 h-8 text-indigo-600" />}
                    bg="bg-indigo-50"
                    label="Total Interactions"
                    value={summary?.total_interactions}
                />
                <Card
                    icon={<Zap className="w-8 h-8 text-green-600" />}
                    bg="bg-green-50"
                    label="Handled by AI"
                    value={summary?.handled_by_ai}
                    sub={`${summary?.automation_rate}% Automation Rate`}
                    subColor="text-green-600"
                />
                <Card
                    icon={<AlertTriangle className="w-8 h-8 text-orange-600" />}
                    bg="bg-orange-50"
                    label="Fallback / Missed"
                    value={summary?.fallback_count}
                    sub="Needs Attention"
                    subColor="text-orange-600"
                />
                <Card
                    icon={<TrendingUp className="w-8 h-8 text-blue-600" />}
                    bg="bg-blue-50"
                    label="Avg Confidence"
                    value={summary?.avg_confidence ? `${(summary.avg_confidence * 100).toFixed(1)}%` : '-'}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6">Interaction Trends (7 Days)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="total" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="fallback" stroke="#F97316" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6">Response Distribution</h3>
                    <div className="h-64 flex items-center justify-center">
                        {/* Simple Bar Chart for Handled vs Fallback */}
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{ name: 'Interactions', handled: summary?.handled_by_ai, fallback: summary?.fallback_count }]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" hide />
                                <YAxis />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="handled" fill="#22c55e" radius={[4, 4, 0, 0]} name="Handled" />
                                <Bar dataKey="fallback" fill="#f97316" radius={[4, 4, 0, 0]} name="Fallback" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tables Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Q&A */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-600" /> Frequently Triggered Rules</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Keyword</th>
                                    <th className="px-4 py-3">Response Preview</th>
                                    <th className="px-4 py-3 text-right rounded-r-lg">Hits</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {kbStats.top_qna.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-indigo-600">{item.keyword}</td>
                                        <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{item.response_content}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{item.hit_count}</td>
                                    </tr>
                                ))}
                                {kbStats.top_qna.length === 0 && <tr><td colSpan="3" className="text-center py-4 text-gray-400">No data available</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Unanswered / Missed */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-orange-600" /> Unanswered Questions (Fallback)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">User Message</th>
                                    <th className="px-4 py-3 text-right rounded-r-lg">Frequency</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {kbStats.missed_questions.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-700">{item.message_content}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{item.count}</td>
                                    </tr>
                                ))}
                                {kbStats.missed_questions.length === 0 && <tr><td colSpan="2" className="text-center py-4 text-gray-400">No data available</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

const Card = ({ icon, bg, label, value, sub, subColor }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
        <div className={`p-4 ${bg} rounded-full`}>{icon}</div>
        <div>
            <p className="text-xs text-gray-500 uppercase font-bold text-nowrap">{label}</p>
            <p className="text-2xl font-extrabold text-gray-900">{value !== undefined ? value : '-'}</p>
            {sub && <p className={`text-xs font-bold ${subColor}`}>{sub}</p>}
        </div>
    </div>
);