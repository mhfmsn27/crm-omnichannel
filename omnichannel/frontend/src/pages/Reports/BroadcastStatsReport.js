import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell 
} from 'recharts';
import { Loader2, RefreshCw, Download, Megaphone, CheckCircle, XCircle, Clock, AlertTriangle, MousePointer, UserMinus, Users, Trash2, X, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1'];

// Summary Card Component
const StatCard = ({ title, value, subValue, icon: Icon, color }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
            <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-extrabold text-gray-900">{value}</h3>
            {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
    </div>
);

export default function BroadcastStatsReport() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [details, setDetails] = useState(null); // For drill-down
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/broadcast/campaigns');
            setCampaigns(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load campaigns");
        } finally {
            setLoading(false);
        }
    };

    const fetchCampaignDetails = async (id) => {
        setLoadingDetails(true);
        try {
            const res = await axios.get(`/api/app/broadcast/campaigns/${id}`);
            setDetails(res.data);
            // Find the campaign object for metadata
            const camp = campaigns.find(c => c.id === id);
            setSelectedCampaign(camp);
        } catch (err) {
            toast.error("Failed to load details");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleExport = async (id, name) => {
        const toastId = toast.loading("Downloading report...");
        try {
             const res = await axios.get(`/api/app/broadcast/campaigns/${id}/export`, {
                 responseType: 'arraybuffer' // Use arraybuffer for Excel files
             });
             const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
             const url = window.URL.createObjectURL(blob);
             const link = document.createElement('a');
             link.href = url;
             link.setAttribute('download', `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.xlsx`);
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             window.URL.revokeObjectURL(url);
             toast.success("Download complete", { id: toastId });
        } catch (err) {
            console.error("Export error:", err);
            toast.error("Export Failed", { id: toastId });
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

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;

    // --- AGGREGATE STATS ---
    const totalCampaigns = campaigns.length;
    const totalMessages = campaigns.reduce((acc, c) => acc + parseInt(c.total || 0), 0);
    const totalSent = campaigns.reduce((acc, c) => acc + parseInt(c.sent || 0), 0);
    const totalFailed = campaigns.reduce((acc, c) => acc + parseInt(c.failed || 0), 0);
    const avgSuccessRate = totalMessages > 0 ? Math.round((totalSent / totalMessages) * 100) : 0;

    // Chart Data (Last 10 Campaigns)
    const chartData = campaigns.slice(0, 10).reverse().map(c => ({
        name: c.name.length > 15 ? c.name.substring(0,15)+'...' : c.name,
        Sent: parseInt(c.sent),
        Failed: parseInt(c.failed)
    }));

    // --- DRILL DOWN VIEW ---
    if (selectedCampaign && details) {
        const { recipients, stats } = details; // stats has clicks & unsubscribes
        
        // Check if finished
        const total = parseInt(selectedCampaign.total) || 0;
        const sent = parseInt(selectedCampaign.sent) || 0;
        const failed = parseInt(selectedCampaign.failed) || 0;
        const isFinished = total > 0 && (sent + failed >= total);
        const displayStatus = (selectedCampaign.status === 'processing' && isFinished) ? 'completed' : selectedCampaign.status;

        // Pie Data for this campaign
        const campaignStats = [
            { name: 'Sent', value: sent },
            { name: 'Failed', value: failed },
            { name: 'Pending', value: total - (sent + failed) }
        ];

        return (
            <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto bg-gray-50">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => { setSelectedCampaign(null); setDetails(null); }} className="text-gray-600 hover:text-indigo-600 font-bold flex items-center gap-2">
                         ← Back to Overview
                    </button>
                    <div className="flex gap-3">
                         <button onClick={() => handleExport(selectedCampaign.id, selectedCampaign.name)} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm hover:bg-green-700">
                             <Download className="w-4 h-4" /> Export Report
                         </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">{selectedCampaign.name}</h2>
                    {getStatusBadge(displayStatus)}
                </div>
                <p className="text-gray-500 mb-8 text-sm">Created on {format(new Date(selectedCampaign.created_at), 'dd MMMM yyyy, HH:mm')}</p>

                {/* Campaign Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                    <StatCard title="Total Recipients" value={selectedCampaign.total} icon={Users} color="bg-blue-500" />
                    <StatCard title="Success Rate" value={`${campaignStats[0].value > 0 ? Math.round((campaignStats[0].value / selectedCampaign.total) * 100) : 0}%`} subValue={`${campaignStats[0].value} delivered`} icon={CheckCircle} color="bg-green-500" />
                    <StatCard title="Failures" value={campaignStats[1].value} subValue="Errors or Invalid" icon={XCircle} color="bg-red-500" />
                    <StatCard title="Opens (Read)" value={stats.read || 0} subValue={selectedCampaign.read > 0 ? `${selectedCampaign.total > 0 ? Math.round((selectedCampaign.read / selectedCampaign.total) * 100) : 0}% open rate` : 'WhatsApp read receipts'} icon={Eye} color="bg-purple-500" />
                    <StatCard title="Link Clicks" value={stats.clicks} subValue={`${stats.unsubscribes} Unsubscribes`} icon={MousePointer} color="bg-indigo-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Pie Chart */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center h-80">
                        <h4 className="font-bold text-gray-700 mb-4">Delivery Status</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={campaignStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {campaignStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* Log Table */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-80">
                        <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">Recipient Log (Last 100)</div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white border-b text-gray-500 text-xs uppercase sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3">Name / Phone</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Sent At</th>
                                        <th className="px-6 py-3">Error</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recipients.slice(0, 100).map(r => (
                                        <tr key={r.phone_number} className="hover:bg-gray-50">
                                            <td className="px-6 py-3">
                                                <p className="font-bold text-gray-800">{r.name || 'Unknown'}</p>
                                                <p className="text-xs text-gray-500 font-mono">{r.phone_number}</p>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                                    r.status === 'sent' ? 'bg-green-100 text-green-700' :
                                                    r.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                                                    r.status === 'read' ? 'bg-purple-100 text-purple-700' :
                                                    r.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-xs text-gray-500 font-mono">
                                                {r.sent_at ? format(new Date(r.sent_at), 'HH:mm:ss') : '-'}
                                            </td>
                                            <td className="px-6 py-3 text-xs text-red-500 truncate max-w-[150px]" title={r.error_log}>
                                                {r.error_log || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- MAIN OVERVIEW ---
    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto bg-gray-50/50">
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Megaphone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Broadcast Analytics
                    </h2>
                    <p className="text-sm text-gray-500">Performance metrics for your mass messaging campaigns.</p>
                </div>
                <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 shadow-sm">
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
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8 h-[400px]">
                <h3 className="font-bold text-gray-700 mb-6">Recent Campaign Performance</h3>
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={chartData} barGap={0}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#6b7280'}} interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                        <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Legend verticalAlign="top" height={36} iconType="circle"/>
                        <Bar dataKey="Sent" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Campaign History</h3>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[560px]">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3">Campaign Name</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-center">Total</th>
                            <th className="px-6 py-3 text-center">Sent</th>
                            <th className="px-6 py-3 text-center">Failed</th>
                            {campaigns.some(c => parseInt(c.read || 0) > 0) && <th className="px-6 py-3 text-center">Read</th>}
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {campaigns.map(c => {
                            const total = parseInt(c.total) || 0;
                            const sent = parseInt(c.sent) || 0;
                            const failed = parseInt(c.failed) || 0;
                            const read = parseInt(c.read) || 0;
                            const isFinished = total > 0 && (sent + failed >= total);
                            const displayStatus = (c.status === 'processing' && isFinished) ? 'completed' : c.status;

                            return (
                                <tr key={c.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => fetchCampaignDetails(c.id)}>
                                    <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center font-mono">{c.total}</td>
                                    <td className="px-6 py-4 text-center font-bold text-green-600">{c.sent}</td>
                                    <td className="px-6 py-4 text-center font-bold text-red-600">{c.failed}</td>
                                    {read > 0 && <td className="px-6 py-4 text-center font-bold text-purple-600">{read}</td>}
                                    <td className="px-6 py-4 text-center">
                                        {getStatusBadge(displayStatus)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-indigo-600 hover:underline text-xs font-bold">View Report</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {campaigns.length === 0 && (
                            <tr>
                                <td colSpan="7" className="p-12 text-center text-gray-400">No campaigns found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}
