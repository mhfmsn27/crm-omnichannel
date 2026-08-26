import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { TrendingUp, Flame, Thermometer, Snowflake, User, RefreshCw, ChevronLeft, ChevronRight, Loader2, Star } from 'lucide-react';

const LEAD_STATUS_CONFIG = {
    hot:       { label: 'Hot',       icon: '🔥', color: 'bg-red-100 text-red-700 border-red-200' },
    warm:      { label: 'Warm',      icon: '🌡️', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    cold:      { label: 'Cold',      icon: '❄️', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    converted: { label: 'Converted', icon: '✅', color: 'bg-green-100 text-green-700 border-green-200' },
    unqualified: { label: 'Unqualified', icon: '—', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function LeadScoreBar({ score }) {
    const color = score >= 61 ? 'bg-red-500' : score >= 31 ? 'bg-orange-400' : 'bg-blue-400';
    return (
        <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-xs font-mono font-semibold text-gray-600">{score}</span>
        </div>
    );
}

export default function LeadListPage() {
    const navigate = useNavigate();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const LIMIT = 25;

    const [stats, setStats] = useState({ hot: 0, warm: 0, cold: 0, converted: 0 });

    const fetchLeads = useCallback(async (p = 1, status = '') => {
        setLoading(true);
        try {
            const params = { page: p, limit: LIMIT };
            if (status) params.status = status;
            const res = await axios.get('/api/app/contacts/leads', { params });
            setLeads(res.data.leads);
            setTotal(res.data.total);
        } catch { toast.error('Gagal memuat leads'); }
        finally { setLoading(false); }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const [hot, warm, cold, conv] = await Promise.all([
                axios.get('/api/app/contacts/leads', { params: { status: 'hot', limit: 1 } }),
                axios.get('/api/app/contacts/leads', { params: { status: 'warm', limit: 1 } }),
                axios.get('/api/app/contacts/leads', { params: { status: 'cold', limit: 1 } }),
                axios.get('/api/app/contacts/leads', { params: { status: 'converted', limit: 1 } }),
            ]);
            setStats({
                hot: hot.data.total,
                warm: warm.data.total,
                cold: cold.data.total,
                converted: conv.data.total
            });
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchLeads(1, '');
        fetchStats();
    }, []);

    const handleStatusFilter = (s) => {
        const newStatus = statusFilter === s ? '' : s;
        setStatusFilter(newStatus);
        setPage(1);
        fetchLeads(1, newStatus);
    };

    const handleRequalify = async (contactId, e) => {
        e.stopPropagation();
        try {
            const res = await axios.post(`/api/app/contacts/${contactId}/qualify`);
            toast.success(`Skor diperbarui: ${res.data.score} (${res.data.status})`);
            fetchLeads(page, statusFilter);
            fetchStats();
        } catch { toast.error('Gagal re-qualify'); }
    };

    const handleStatusChange = async (contactId, newStatus, e) => {
        e.stopPropagation();
        try {
            await axios.patch(`/api/app/contacts/${contactId}/lead-status`, { lead_status: newStatus });
            toast.success('Status diperbarui');
            fetchLeads(page, statusFilter);
            fetchStats();
        } catch { toast.error('Gagal update'); }
    };

    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-indigo-500" /> Lead Qualification
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Kontak diqualifikasi otomatis berdasarkan pola percakapan
                    </p>
                </div>
                <button onClick={() => { fetchLeads(page, statusFilter); fetchStats(); }}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-surface">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                    { key: 'hot', label: 'Hot Leads', icon: '🔥', color: 'bg-red-50 border-red-200 text-red-600' },
                    { key: 'warm', label: 'Warm Leads', icon: '🌡️', color: 'bg-orange-50 border-orange-200 text-orange-600' },
                    { key: 'cold', label: 'Cold Leads', icon: '❄️', color: 'bg-blue-50 border-blue-200 text-blue-600' },
                    { key: 'converted', label: 'Converted', icon: '✅', color: 'bg-green-50 border-green-200 text-green-600' },
                ].map(s => (
                    <button key={s.key} onClick={() => handleStatusFilter(s.key)}
                        className={`p-4 rounded-xl border text-left transition-all ${s.color} ${statusFilter === s.key ? 'ring-2 ring-offset-1 ring-indigo-400' : 'hover:shadow-md bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border'}`}>
                        <div className="text-2xl mb-1">{s.icon}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats[s.key]}</p>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat leads...
                    </div>
                ) : leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
                        <p className="font-medium">Belum ada leads terqualifikasi</p>
                        <p className="text-sm mt-1">Lead muncul otomatis setelah 5+ pesan percakapan masuk</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <th className="text-left px-4 py-3">Kontak</th>
                                <th className="text-left px-4 py-3">Status</th>
                                <th className="text-left px-4 py-3">Skor</th>
                                <th className="text-left px-4 py-3 hidden md:table-cell">Terqualifikasi</th>
                                <th className="text-left px-4 py-3">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-dark-border">
                            {leads.map(lead => {
                                const sconf = LEAD_STATUS_CONFIG[lead.lead_status] || LEAD_STATUS_CONFIG.unqualified;
                                return (
                                    <tr key={lead.id} onClick={() => navigate(`/contacts?id=${lead.id}`)}
                                        className="hover:bg-gray-50 dark:hover:bg-dark-bg cursor-pointer transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 dark:text-white text-sm">{lead.name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-400">{lead.phone_number}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${sconf.color}`}>
                                                {sconf.icon} {sconf.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <LeadScoreBar score={lead.lead_score || 0} />
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500 dark:text-gray-400">
                                            {lead.lead_qualified_at
                                                ? new Date(lead.lead_qualified_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                <select
                                                    value={lead.lead_status}
                                                    onChange={e => handleStatusChange(lead.id, e.target.value, e)}
                                                    className="text-xs border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1 bg-white dark:bg-dark-bg dark:text-white focus:outline-none"
                                                >
                                                    <option value="cold">❄️ Cold</option>
                                                    <option value="warm">🌡️ Warm</option>
                                                    <option value="hot">🔥 Hot</option>
                                                    <option value="converted">✅ Converted</option>
                                                    <option value="unqualified">— Unqualified</option>
                                                </select>
                                                <button
                                                    onClick={e => handleRequalify(lead.id, e)}
                                                    title="Re-qualify dengan data terbaru"
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-dark-border">
                        <span className="text-xs text-gray-500">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total} leads</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => { setPage(p => p - 1); fetchLeads(page - 1, statusFilter); }} disabled={page === 1}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="text-xs px-2 text-gray-600">{page}/{totalPages}</span>
                            <button onClick={() => { setPage(p => p + 1); fetchLeads(page + 1, statusFilter); }} disabled={page === totalPages}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
