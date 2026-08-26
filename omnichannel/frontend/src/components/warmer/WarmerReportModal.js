import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { X, MessageSquare, Calendar, ArrowRight } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';

export default function WarmerReportModal({ isOpen, circleId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && circleId) fetchReport();
    }, [isOpen, circleId]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/app/warmer/${circleId}/report`);
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="3xl"
            title={
                <div>
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white">Activity Report</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{data ? data.name : 'Loading...'}</p>
                </div>
            }
        >
            <div className="custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Sent (7 Days)</p>
                                        <p className="text-3xl font-extrabold text-indigo-600">{data.summary.total_7_days}</p>
                                    </div>
                                    <div className="bg-indigo-50 p-3 rounded-full text-indigo-600">
                                        <MessageSquare className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Avg Daily Volume</p>
                                        <p className="text-3xl font-extrabold text-green-600">{data.summary.avg_daily}</p>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-full text-green-600">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-80">
                                <h4 className="font-bold text-gray-700 mb-6">Message Volume History</h4>
                                <ResponsiveContainer width="100%" height="85%">
                                    <BarChart data={data.chart}>
                                        <XAxis 
                                            dataKey="date" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fontSize: 12, fill: '#9ca3af'}} 
                                            tickFormatter={(str) => str.split('-')[2]} 
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fontSize: 12, fill: '#9ca3af'}} 
                                        />
                                        <Tooltip 
                                            cursor={{fill: '#f3f4f6'}}
                                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                        />
                                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Recent Logs */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gray-50">
                                    <h4 className="font-bold text-gray-700 text-sm">Recent Activity Log</h4>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase">
                                        <tr>
                                            <th className="px-6 py-3">Time</th>
                                            <th className="px-6 py-3">Sender</th>
                                            <th className="px-6 py-3">Message Preview</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.logs.map((log, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                                                    {new Date(log.sent_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900">{log.sender_name}</span>
                                                        <span className="text-xs text-gray-400">({log.sender_phone})</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-gray-600 italic truncate max-w-xs">
                                                    "{log.message_content}"
                                                </td>
                                            </tr>
                                        ))}
                                        {data.logs.length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="p-6 text-center text-gray-400">No activity recorded yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
            </div>
        </Modal>
    );
}