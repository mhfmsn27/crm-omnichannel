import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Ticket, AlertTriangle, Clock, CheckCircle, Search,
    Filter, ChevronLeft, ChevronRight, MessageSquare, User,
    ArrowUpCircle, Loader2, RefreshCw
} from 'lucide-react';

const PRIORITY_CONFIG = {
    urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
    high:   { label: 'High',   color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
    medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
    low:    { label: 'Low',    color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
};

const STATUS_CONFIG = {
    open:     { label: 'Open',     color: 'bg-blue-100 text-blue-700' },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
    closed:   { label: 'Closed',   color: 'bg-gray-100 text-gray-600' },
};

const CHANNEL_ICONS = {
    whatsapp:  '💬',
    messenger: '📘',
    instagram: '📷',
    telegram:  '✈️',
    webchat:   '🌐',
};

function SLABadge({ sla_deadline_at, sla_breached, status }) {
    if (status === 'resolved') return <span className="text-xs text-gray-400">—</span>;
    if (sla_breached) return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Breached
        </span>
    );
    if (!sla_deadline_at) return <span className="text-xs text-gray-400">No SLA</span>;
    const remaining = new Date(sla_deadline_at) - Date.now();
    const minutes = Math.floor(remaining / 60000);
    if (minutes < 0) return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Overdue
        </span>
    );
    if (minutes < 30) return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> {minutes}m left
        </span>
    );
    const hours = Math.floor(minutes / 60);
    return (
        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" /> {hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`}
        </span>
    );
}

function StatCard({ icon: Icon, label, value, color, onClick, active }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left w-full
                ${active ? 'ring-2 ring-offset-1 ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                         : 'bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border hover:shadow-md'}`}
        >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{value ?? '—'}</p>
            </div>
        </button>
    );
}

export default function TicketListPage() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const LIMIT = 20;

    const [filters, setFilters] = useState({ status: '', priority: '', sla_breached: '', search: '' });
    const [searchInput, setSearchInput] = useState('');

    const fetchStats = useCallback(async () => {
        try {
            const res = await axios.get('/api/app/tickets/stats');
            setStats(res.data);
        } catch { /* silent */ }
    }, []);

    const fetchTickets = useCallback(async (currentPage, currentFilters) => {
        setLoading(true);
        try {
            const params = { page: currentPage, limit: LIMIT, ...currentFilters };
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const res = await axios.get('/api/app/tickets', { params });
            setTickets(res.data.tickets);
            setTotal(res.data.total);
        } catch (err) {
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        fetchTickets(1, filters);
    }, []);

    const applyFilter = (newFilters) => {
        setFilters(newFilters);
        setPage(1);
        fetchTickets(1, newFilters);
    };

    const handleStatClick = (filterKey, filterVal) => {
        const newFilters = { ...filters, [filterKey]: filters[filterKey] === filterVal ? '' : filterVal };
        applyFilter(newFilters);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const newFilters = { ...filters, search: searchInput };
        applyFilter(newFilters);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        fetchTickets(newPage, filters);
    };

    const openInInbox = (ticketId) => {
        navigate(`/inbox?id=${ticketId}`);
    };

    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Ticket className="w-6 h-6 text-indigo-500" /> Tickets
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Kelola tiket dukungan dan pantau SLA
                    </p>
                </div>
                <button
                    onClick={() => { fetchStats(); fetchTickets(page, filters); }}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard icon={MessageSquare} label="Open" value={stats.open}
                    color="bg-blue-100 text-blue-600"
                    active={filters.status === 'open'}
                    onClick={() => handleStatClick('status', 'open')} />
                <StatCard icon={AlertTriangle} label="SLA Breached" value={stats.sla_breached}
                    color="bg-red-100 text-red-600"
                    active={filters.sla_breached === 'true'}
                    onClick={() => handleStatClick('sla_breached', 'true')} />
                <StatCard icon={ArrowUpCircle} label="Urgent" value={stats.urgent_open}
                    color="bg-orange-100 text-orange-600"
                    active={filters.priority === 'urgent'}
                    onClick={() => handleStatClick('priority', 'urgent')} />
                <StatCard icon={CheckCircle} label="Resolved" value={stats.resolved}
                    color="bg-green-100 text-green-600"
                    active={filters.status === 'resolved'}
                    onClick={() => handleStatClick('status', 'resolved')} />
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl p-3 mb-4 flex flex-wrap gap-2 items-center">
                <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-48">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Cari tiket, kontak..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                        />
                    </div>
                </form>

                <select
                    value={filters.status}
                    onChange={e => applyFilter({ ...filters, status: e.target.value })}
                    className="text-sm border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 bg-gray-50 dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                    <option value="">Semua Status</option>
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                </select>

                <select
                    value={filters.priority}
                    onChange={e => applyFilter({ ...filters, priority: e.target.value })}
                    className="text-sm border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 bg-gray-50 dark:bg-dark-bg dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                    <option value="">Semua Prioritas</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>

                {(filters.status || filters.priority || filters.sla_breached || filters.search) && (
                    <button
                        onClick={() => { setFilters({ status: '', priority: '', sla_breached: '', search: '' }); setSearchInput(''); fetchTickets(1, {}); setPage(1); }}
                        className="text-xs text-indigo-600 hover:underline px-2"
                    >
                        Reset Filter
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat tiket...
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Ticket className="w-10 h-10 mb-3 opacity-30" />
                        <p className="font-medium">Tidak ada tiket</p>
                        <p className="text-sm mt-1">Tiket muncul otomatis dari percakapan masuk</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <th className="text-left px-4 py-3">Tiket</th>
                                <th className="text-left px-4 py-3">Kontak</th>
                                <th className="text-left px-4 py-3 hidden md:table-cell">Channel</th>
                                <th className="text-left px-4 py-3">Prioritas</th>
                                <th className="text-left px-4 py-3 hidden lg:table-cell">Status</th>
                                <th className="text-left px-4 py-3 hidden lg:table-cell">SLA</th>
                                <th className="text-left px-4 py-3 hidden xl:table-cell">Agen</th>
                                <th className="text-left px-4 py-3 hidden xl:table-cell">Pesan Terakhir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-dark-border">
                            {tickets.map(ticket => {
                                const pconf = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                                const sconf = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                                return (
                                    <tr
                                        key={ticket.id}
                                        onClick={() => openInInbox(ticket.id)}
                                        className="hover:bg-gray-50 dark:hover:bg-dark-bg cursor-pointer transition-colors group"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {ticket.sla_breached && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                                                <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline text-xs">
                                                    {ticket.ticket_number || `#${ticket.id}`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-3.5 h-3.5 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 dark:text-white text-xs">{ticket.contact_name || 'Unknown'}</p>
                                                    <p className="text-gray-400 text-xs">{ticket.contact_phone || ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <span className="text-base">{CHANNEL_ICONS[ticket.channel] || '💬'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${pconf.color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${pconf.dot}`} />
                                                {pconf.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sconf.color}`}>
                                                {sconf.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <SLABadge
                                                sla_deadline_at={ticket.sla_deadline_at}
                                                sla_breached={ticket.sla_breached}
                                                status={ticket.status}
                                            />
                                        </td>
                                        <td className="px-4 py-3 hidden xl:table-cell text-xs text-gray-500 dark:text-gray-400">
                                            {ticket.assigned_to_name || <span className="text-gray-300">Unassigned</span>}
                                        </td>
                                        <td className="px-4 py-3 hidden xl:table-cell max-w-xs">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ticket.last_message || '—'}</p>
                                            {ticket.last_message_at && (
                                                <p className="text-xs text-gray-300 dark:text-gray-600">
                                                    {new Date(ticket.last_message_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-dark-border">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Menampilkan {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total} tiket
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            <span className="text-xs px-2 text-gray-600 dark:text-gray-400">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
