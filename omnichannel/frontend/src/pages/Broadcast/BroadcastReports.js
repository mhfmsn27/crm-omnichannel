import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Download, RefreshCw, X, PlayCircle, Loader2, PauseCircle, Clock, Trash2, StopCircle, Archive, MessageSquare, AlertTriangle, Play, Pause, CheckCircle2, MoreVertical, Send, CheckCircle, XCircle, RotateCcw, MousePointer, UserMinus, Users, Megaphone, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';

// Stats Pie Chart Colors
const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b'];

// Details Modal
const CampaignDetailModal = ({ campaign, onClose }) => {
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([]);
    const [clickStats, setClickStats] = useState({ clicks: 0, unsubscribes: 0, read: 0 });
    const [showFailedOnly, setShowFailedOnly] = useState(false);

    // Non-retryable error patterns (invalid numbers, number not registered, etc.)
    const isNonRetryableError = (errorLog) => {
        if (!errorLog) return false;
        const errorLower = errorLog.toLowerCase();
        const patterns = [
            'not registered', 'tidak terdaftar', 'invalid number', 'nomor tidak valid',
            'number blocked', 'nomor diblokir', 'cannot send to', 'phone number',
            'nomor hp', '@s.whatsapp', 'wa.id', 'does not exist', 'tidak ditemukan'
        ];
        return patterns.some(p => errorLower.includes(p.toLowerCase()));
    };

    useEffect(() => {
        if (campaign) fetchDetails();
    }, [campaign]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            // Fetch recipients & stats
            const res = await axios.get(`/api/app/broadcast/campaigns/${campaign.id}`);

            // New Response Structure: { recipients: [], stats: { clicks: 0, unsubscribes: 0, read: 0 } }
            const recipients = res.data.recipients || [];
            const serverStats = res.data.stats || { clicks: 0, unsubscribes: 0, read: 0 };

            setDetails(recipients);
            setClickStats(serverStats);

            // Compute Chart Stats
            const read = recipients.filter(r => r.status === 'read').length;
            const delivered = recipients.filter(r => r.status === 'delivered').length;
            const sent = recipients.filter(r => r.status === 'sent').length;
            const failed = recipients.filter(r => r.status === 'failed' || r.status === 'cancelled').length;
            const pending = recipients.filter(r => r.status === 'queued' || r.status === 'processing').length;

            setStats([
                { name: 'Read', value: read, color: '#3b82f6' },
                { name: 'Delivered', value: delivered, color: '#10b981' },
                { name: 'Sent', value: sent, color: '#8b5cf6' },
                { name: 'Failed', value: failed, color: '#ef4444' },
                { name: 'Pending', value: pending, color: '#f59e0b' }
            ]);

        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat detail");
        } finally {
            setLoading(false);
        }
    };

    const handleRetrySingle = async (recipientId, phoneNumber) => {
        if (!confirm(`Retry pesan ke ${phoneNumber}?`)) return;

        try {
            const res = await axios.post(`/api/app/broadcast/campaigns/${campaign.id}/recipients/${recipientId}/retry`);
            toast.success(res.data.message || `Pesan ke ${phoneNumber} di-retry`);
            fetchDetails(); // Refresh the list
        } catch (err) {
            toast.error(err.response?.data?.error || `Gagal retry ${phoneNumber}`);
        }
    };

    const handleExport = async () => {
        try {
            const res = await axios.get(`/api/app/broadcast/campaigns/${campaign.id}/export`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${campaign.name}-report.xlsx`);
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            toast.error("Gagal mengekspor");
        }
    };

    if (!campaign) return null;

    // Calculate stats for header
    const total = parseInt(campaign.total) || 0;
    const sent = parseInt(campaign.sent) || 0;
    const failed = parseInt(campaign.failed) || 0;
    const read = parseInt(campaign.read) || 0;
    const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;
    const failureRate = total > 0 ? Math.round((failed / total) * 100) : 0;
    const readRate = sent > 0 ? Math.round((read / sent) * 100) : 0;
    const pieData = stats;

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={
                <div>
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white">{campaign.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-normal">Delivery Statistics & Analytics</p>
                </div>
            }
            size="2xl"
            className="max-w-5xl flex flex-col p-0 max-h-[90vh]"
            footer={
                <ModalFooter>
                    <div className="w-full flex justify-end">
                        <button onClick={handleExport} className="px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-sm transition-colors">
                            <Download className="w-4 h-4" /> Download
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900 custom-scrollbar">
                {/* Top Section: Charts & Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {/* Chart */}
                    <div className="md:col-span-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center h-64">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Delivery Overview</h4>
                        {loading ? (
                            <div className="animate-pulse w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                        ) : (
                            <div className="w-full h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Total Target</p>
                            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">{total}</h3>
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                            <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Delivered</p>
                            <h3 className="text-3xl font-extrabold text-green-600 dark:text-green-400">{sent}</h3>
                            <p className="text-xs text-green-500/70 mt-1">{successRate}% success rate</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase mb-1 flex items-center gap-1"><Eye className="w-3 h-3" /> Read</p>
                            <h3 className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{read}</h3>
                            <p className="text-xs text-purple-500/70 mt-1">{readRate}% read rate</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                            <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase mb-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</p>
                            <h3 className="text-3xl font-extrabold text-red-600 dark:text-red-400">{failed}</h3>
                            <p className="text-xs text-red-500/70 mt-1">{failureRate}% failure rate</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase mb-1 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Retryable</p>
                            <h3 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                                {details.filter(r => r.status === 'failed' && !isNonRetryableError(r.error_log)).length}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Detailed Logs Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                        <h4 className="font-bold text-gray-900 dark:text-white">Detailed Recipient Log</h4>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowFailedOnly(!showFailedOnly)}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${showFailedOnly ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                            >
                                {showFailedOnly ? 'Show All' : 'Show Failed Only'}
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar max-h-96">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">Recipient</th>
                                    <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">Status</th>
                                    <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs text-center">Is Read</th>
                                    <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">Sent At</th>
                                    <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">Sent From</th>
                                    <th className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 uppercase text-xs text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-gray-400 dark:text-gray-500">Loading details...</td></tr>
                                ) : (
                                    details
                                        .filter(row => !showFailedOnly || row.status === 'failed')
                                        .map((row) => {
                                            const isRetryable = row.status === 'failed' && !isNonRetryableError(row.error_log);
                                            return (
                                                <tr key={row.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${row.status === 'failed' && isRetryable ? 'bg-orange-50/30 dark:bg-orange-900/10' : ''}`}>
                                                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                                                        <div className="font-bold">{row.name || 'Unknown'}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{row.phone_number}</div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                                                            row.status === 'read' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                            row.status === 'delivered' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' :
                                                            row.status === 'sent' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            row.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                            }`}>
                                                            {row.status === 'failed' && isRetryable && <RefreshCw className="w-3 h-3" />}
                                                            {row.status}
                                                        </span>
                                                        {row.error_log && (
                                                            <p className={`text-[10px] mt-1 max-w-xs truncate ${isRetryable ? 'text-orange-500' : 'text-gray-400'}`} title={row.error_log}>
                                                                {isRetryable ? '↻ Bisa di-retry' : '✗ Tidak bisa di-retry'}
                                                                <span className="block text-gray-400">{row.error_log}</span>
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        {row.status === 'read' ? (
                                                            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-xs bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                                                <CheckCircle2 className="w-3 h-3" /> Yes
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 dark:text-gray-500 font-medium text-xs">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                                                        {row.sent_at ? format(new Date(row.sent_at), 'HH:mm:ss dd/MM') : '-'}
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">
                                                        {row.device_name || '-'}
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        {isRetryable && (
                                                            <button
                                                                onClick={() => handleRetrySingle(row.id, row.phone_number)}
                                                                className="px-3 py-1.5 text-xs font-bold bg-orange-500 text-white rounded-lg flex items-center gap-1 hover:bg-orange-600 transition-colors mx-auto"
                                                                title={`Retry ${row.phone_number}`}
                                                            >
                                                                <RotateCcw className="w-3 h-3" /> Retry
                                                            </button>
                                                        )}
                                                        {!isRetryable && row.status === 'failed' && (
                                                            <span className="text-xs text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                )}
                                {!loading && details.length === 0 && (
                                    <tr><td colSpan="5" className="p-8 text-center text-gray-400">No recipients found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Modal>  );
};

// Summary Card Component
const StatCard = ({ title, value, subValue, icon: Icon, color }) => (
    <div className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group">
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 tracking-tight">{title}</p>
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{value}</h3>
            {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
        <div className={`p-4 rounded-xl transition-colors duration-300 ${color} bg-opacity-10 dark:bg-opacity-20 group-hover:scale-110`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
    </div>
);

export default function BroadcastReports() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCampaign, setSelectedCampaign] = useState(null);

    useEffect(() => {
        fetchCampaigns();
        const timer = setInterval(() => {
            if (campaigns.some(c => c.status === 'processing')) {
                fetchCampaigns(true);
            }
        }, 5000);
        return () => clearInterval(timer);
    }, [campaigns.some(c => c.status === 'processing')]);

    const fetchCampaigns = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await axios.get('/api/app/broadcast/campaigns');
            setCampaigns(res.data);
        } catch (err) {
            console.error(err);
            if (!silent) toast.error("Gagal memuat kampanye");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleAction = async (e, id, action) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to ${action} this campaign?`)) return;
        try {
            await axios.post(`/api/app/broadcast/campaigns/${id}/action`, { action });
            const actionMap = { pause: 'dijeda', resume: 'dilanjutkan', cancel: 'dibatalkan' };
            toast.success(`Kampanye ${actionMap[action] || action}`);
            fetchCampaigns();
        } catch (err) {
            toast.error("Tindakan gagal");
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this campaign history? This action cannot be undone.")) return;
        try {
            await axios.delete(`/api/app/broadcast/campaigns/${id}`);
            toast.success("Kampanye dihapus");
            fetchCampaigns(true);
        } catch (err) {
            toast.error("Gagal menghapus");
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            completed: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
            processing: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 animate-pulse',
            paused: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
            cancelled: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
            queued: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
        };

        // Indonesian Status Mapping
        const labels = {
            completed: 'Selesai',
            processing: 'Diproses',
            paused: 'Jeda',
            cancelled: 'Dibatalkan',
            queued: 'Antrian',
            draft: 'Draft'
        };

        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${styles[status] || styles.queued}`}>
                {labels[status] || status}
            </span>
        );
    };

    if (loading) return <div className="p-8 text-center text-gray-400 flex flex-col items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mb-4"></div>Loading reports...</div>;

    // --- AGGREGATE STATS ---
    const totalCampaigns = campaigns.length;
    const totalSent = campaigns.reduce((acc, c) => acc + parseInt(c.sent || 0), 0);
    const totalFailed = campaigns.reduce((acc, c) => acc + parseInt(c.failed || 0), 0);
    const totalMessages = campaigns.reduce((acc, c) => acc + parseInt(c.total || 0), 0);
    const avgSuccessRate = totalMessages > 0 ? Math.round((totalSent / totalMessages) * 100) : 0;

    // Chart Data (Last 10 Campaigns)
    const chartData = campaigns.slice(0, 10).reverse().map(c => ({
        name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
        Sent: parseInt(c.sent || 0),
        Failed: parseInt(c.failed || 0)
    }));

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Megaphone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Broadcast Analytics
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Performance metrics for your mass messaging campaigns.</p>
                </div>
                <button onClick={() => fetchCampaigns()} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-sm transition-colors">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Campaigns" value={totalCampaigns} subValue="All time" icon={Megaphone} color="bg-blue-500" />
                <StatCard title="Messages Sent" value={totalSent.toLocaleString()} subValue="Successfully delivered" icon={CheckCircle} color="bg-green-500" />
                <StatCard title="Failed Messages" value={totalFailed.toLocaleString()} subValue="Errors or Invalid Numbers" icon={AlertTriangle} color="bg-red-500" />
                <StatCard title="Avg Success Rate" value={`${avgSuccessRate}%`} subValue="Global delivery rate" icon={Clock} color="bg-purple-500" />
            </div>

            {/* Chart */}
            <div className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all mb-8 h-[400px]">
                <h3 className="font-bold text-gray-800 dark:text-white mb-6 tracking-tight">Recent Campaign Performance</h3>
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={chartData} barGap={0}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                        <RechartsTooltip
                            cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                        <Bar dataKey="Sent" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* List Table */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-white/90 dark:bg-dark-surface/90 backdrop-blur sticky top-0 z-10 shadow-sm">
                    <h3 className="font-bold text-gray-800 dark:text-white tracking-tight">Campaign History</h3>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-gray-50/80 dark:bg-dark-bg/80 border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 text-xs uppercase sticky top-0">
                        <tr>
                            <th className="px-6 py-3">Campaign Name</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-center">Total</th>
                            <th className="px-6 py-3 text-center">Sent</th>
                            <th className="px-6 py-3 text-center">Failed</th>
                            <th className="px-6 py-3 text-center">Read</th>
                            <th className="px-6 py-3 text-center">Sender</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {campaigns.map(c => {
                            const total = parseInt(c.total) || 0;
                            const sent = parseInt(c.sent) || 0;
                            const failed = parseInt(c.failed) || 0;
                            const read = parseInt(c.read) || 0;

                            // Logic: If processed + failed >= total, consider completed even if status says processing
                            const isFinished = total > 0 && (sent + failed >= total);
                            const displayStatus = (c.status === 'processing' && isFinished) ? 'completed' : c.status;

                            let isThrottled = false;
                            if (c.delay_settings) {
                                try {
                                    const ds = typeof c.delay_settings === 'string' ? JSON.parse(c.delay_settings) : c.delay_settings;
                                    isThrottled = ds.isThrottled === true;
                                } catch(e){}
                            }

                            return (
                                <tr
                                    key={c.id}
                                    className="hover:bg-gray-50/80 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer border-b border-gray-100 dark:border-slate-700/50 last:border-0"
                                    onClick={() => setSelectedCampaign(c)}
                                >
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                        {c.name}
                                        {isThrottled && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200" title="Kecepatan dibatasi sementara karena antrean global penuh (>800)">
                                                🐢 Melambat
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center font-mono text-gray-700 dark:text-gray-300">{c.total}</td>
                                    <td className="px-6 py-4 text-center font-bold text-green-600 dark:text-green-400">{c.sent}</td>
                                    <td className="px-6 py-4 text-center font-bold text-red-600 dark:text-red-400">{c.failed}</td>
                                    <td className="px-6 py-4 text-center font-bold text-purple-600 dark:text-purple-400">{read}</td>
                                    <td className="px-6 py-4 text-center text-xs text-gray-600 dark:text-gray-400">
                                        {c.rotator_group_id ? (
                                            <span className="flex items-center justify-center gap-1 font-bold text-indigo-600">
                                                <RefreshCw className="w-3 h-3" /> {c.rotator_name}
                                            </span>
                                        ) : (
                                            c.device_name || '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {getStatusBadge(displayStatus)}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                                        {c.status === 'processing' && !isFinished && (
                                            <>
                                                <button onClick={(e) => handleAction(e, c.id, 'pause')} className="text-orange-500 hover:text-orange-700 text-xs font-bold mr-2" title="Pause">
                                                    <Pause className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => handleAction(e, c.id, 'cancel')} className="text-red-500 hover:text-red-700 text-xs font-bold mr-2" title="Stop">
                                                    <StopCircle className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                        {c.status === 'paused' && (
                                            <button onClick={(e) => handleAction(e, c.id, 'resume')} className="text-green-500 hover:text-green-700 text-xs font-bold mr-2" title="Resume">
                                                <Play className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-bold mr-2"
                                            onClick={(e) => { e.stopPropagation(); setSelectedCampaign(c); }}
                                        >
                                            View Report
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, c.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-all shadow-sm"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {campaigns.length === 0 && (
                            <tr>
                                <td colSpan="7" className="p-12 text-center text-gray-400 dark:text-gray-500">No campaigns found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            {/* DETAIL MODAL */}
            {selectedCampaign && (
                <CampaignDetailModal
                    campaign={selectedCampaign}
                    onClose={() => setSelectedCampaign(null)}
                />
            )}
        </div>
    );
}
