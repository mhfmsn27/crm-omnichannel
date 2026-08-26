import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell 
} from 'recharts';
import { Download, Loader2, Star, MessageSquare, User, Trophy } from 'lucide-react';
import DateRangeFilter from '../components/analytics/DateRangeFilter';
import SummaryCard from '../components/analytics/SummaryCard';

// Colors for Charts
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
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

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
    }

    if (!data) return <div className="p-8">Failed to load data</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen h-full overflow-y-auto">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics & Performance</h1>
                    <p className="text-sm text-gray-500">Deep dive into your conversation metrics and customer satisfaction.</p>
                </div>
                <div className="flex gap-3">
                    <DateRangeFilter startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium text-sm transition-colors">
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            {/* 1. SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                <SummaryCard title="Total Chats" value={data.summary.total_conversations.value} trend={data.summary.total_conversations.trend} />
                <SummaryCard title="New" value={data.summary.new_conversations.value} trend={data.summary.new_conversations.trend} />
                <SummaryCard title="Incoming" value={data.summary.incoming_messages.value} trend={data.summary.incoming_messages.trend} />
                <SummaryCard title="Outgoing" value={data.summary.outgoing_messages.value} trend={data.summary.outgoing_messages.trend} />
                <SummaryCard title="Avg Response" value={data.summary.avg_response_time.value} trend={data.summary.avg_response_time.trend} />
                
                {/* CSAT CARD */}
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Star className="w-16 h-16 text-yellow-500" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium mb-1">CSAT Score</p>
                    <div className="flex items-end gap-2">
                         <h3 className="text-2xl font-bold text-gray-900">{data.summary.csat_score.value}</h3>
                         <span className="text-sm text-gray-400 mb-1">/ 5.0</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                         {[1,2,3,4,5].map(i => (
                             <Star key={i} className={`w-3 h-3 ${i <= Math.round(data.summary.csat_score.value) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                         ))}
                    </div>
                </div>
            </div>

            {/* 2. AGENT PERFORMANCE & CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                
                {/* AGENT LEADERBOARD */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                     <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-orange-500" /> Agent Leaderboard
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {data.agent_performance && data.agent_performance.length > 0 ? (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="pb-2 pt-2 pl-2 font-medium text-gray-500">Agent</th>
                                        <th className="pb-2 pt-2 font-medium text-gray-500 text-center">Resolved</th>
                                        <th className="pb-2 pt-2 pr-2 font-medium text-gray-500 text-right">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.agent_performance.map((agent, idx) => (
                                        <tr key={agent.id} className="hover:bg-gray-50">
                                            <td className="py-3 pl-2 flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                                                    {idx + 1}
                                                </div>
                                                <span className="font-medium text-gray-800 truncate max-w-[100px]">{agent.agent_name}</span>
                                            </td>
                                            <td className="py-3 text-center font-bold text-indigo-600">{agent.resolved_count}</td>
                                            <td className="py-3 pr-2 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="font-bold text-gray-800">{agent.avg_rating}</span>
                                                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                                </div>
                                                <span className="text-[10px] text-gray-400">({agent.rated_count} reviews)</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             <div className="text-center py-10 text-gray-400 text-sm">No agent performance data available.</div>
                        )}
                    </div>
                </div>

                 {/* MAIN CHART */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6">Conversation Volume</h3>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.main_chart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Legend verticalAlign="top" height={36}/>
                                <Line type="monotone" dataKey="incoming" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} name="Incoming" />
                                <Line type="monotone" dataKey="outgoing" stroke="#10b981" strokeWidth={3} name="Outgoing" />
                                <Line type="monotone" dataKey="conversations" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Active Chats" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 3. SECONDARY CHARTS & FEEDBACK */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status Distribution */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[300px]">
                    <h3 className="font-bold text-gray-800 mb-4">Conversation Status</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                            <Pie
                                data={data.distributions.status}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="status"
                            >
                                {data.distributions.status.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Labels Distribution */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[300px]">
                    <h3 className="font-bold text-gray-800 mb-4">Top Labels</h3>
                    {data.distributions.labels.length > 0 ? (
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart layout="vertical" data={data.distributions.labels}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                <Tooltip cursor={{fill: '#f9fafb'}} />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">No label data available</div>
                    )}
                </div>
                
                {/* Recent Feedback */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[300px] flex flex-col">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-yellow-500" /> Recent Feedback
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                        {data.recent_feedback && data.recent_feedback.length > 0 ? (
                            data.recent_feedback.map((fb, idx) => (
                                <div key={idx} className="border-b border-gray-50 last:border-0 pb-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3 h-3 text-gray-400" />
                                            <span className="text-sm font-bold text-gray-700 truncate max-w-[120px]">{fb.contact_name}</span>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            <span className="text-sm font-bold text-gray-800">{fb.rating_score}</span>
                                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 italic mb-2">"{fb.rating_feedback || 'No comment'}"</p>
                                    <div className="flex justify-between text-[10px] text-gray-400">
                                        <span>Agent: {fb.agent_name || 'System'}</span>
                                        <span>{new Date(fb.closed_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-400 text-sm">
                                No feedback received.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}