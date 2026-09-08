import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Shield, Search, Download, RefreshCw, Filter, Calendar,
    User, AlertTriangle, CheckCircle2, Info, Eye, X,
    FileSpreadsheet, ArrowUpDown, ChevronLeft, ChevronRight,
    LogIn, Trash2, Edit, PlusCircle, Play, Settings
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usePageTitle } from '../../context/HeaderContext';

export default function AuditLogPage() {
    usePageTitle('AUDIT LOGS & COMPLIANCE');

    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Selected Log Detail Modal
    const [selectedLog, setSelectedLog] = useState(null);

    const fetchLogs = useCallback(async (targetPage = page) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {
                page: targetPage,
                limit,
                search: search.trim() || undefined,
                action: actionFilter || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            };

            const res = await axios.get('/api/app/audit-logs', {
                params,
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (res.data && res.data.success) {
                setLogs(res.data.logs || []);
                setTotal(res.data.pagination?.total || 0);
                setPage(res.data.pagination?.page || targetPage);
            }
        } catch (err) {
            console.error('[AuditLogPage] Fetch error:', err);
            toast.error(err.response?.data?.error || 'Gagal memuat log audit aktivitas');
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, actionFilter, startDate, endDate]);

    useEffect(() => {
        fetchLogs(1);
    }, [actionFilter, startDate, endDate]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchLogs(1);
    };

    const handleExport = async () => {
        setExporting(true);
        const toastId = toast.loading('Menyiapkan file ekspor audit logs...');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/app/audit-logs/export', {
                params: {
                    action: actionFilter || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined
                },
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                responseType: 'blob'
            });

            const blob = new Blob([res.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success('Audit logs berhasil diekspor ke Excel', { id: toastId });
        } catch (err) {
            console.error('[AuditLogPage] Export error:', err);
            toast.error('Gagal mengekspor audit logs', { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    const totalPages = Math.ceil(total / limit) || 1;

    // Helper for Action Badge
    const getActionBadge = (action) => {
        const act = (action || '').toUpperCase();
        if (act.includes('LOGIN')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <LogIn className="w-3 h-3" /> {action}
                </span>
            );
        }
        if (act.includes('DELETE')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    <Trash2 className="w-3 h-3" /> {action}
                </span>
            );
        }
        if (act.includes('CREATE') || act.includes('ADD')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <PlusCircle className="w-3 h-3" /> {action}
                </span>
            );
        }
        if (act.includes('MACRO')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <Play className="w-3 h-3" /> {action}
                </span>
            );
        }
        if (act.includes('UPDATE') || act.includes('SETTINGS')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <Edit className="w-3 h-3" /> {action}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300 border border-gray-200 dark:border-slate-700">
                <Info className="w-3 h-3" /> {action}
            </span>
        );
    };

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            Enterprise Audit Trail & Security Logs
                        </h1>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-11">
                        Rekam jejak setiap aktivitas akun, mutasi data sensitif, eksekusi workflow, dan otentikasi login pengguna.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 ml-11 md:ml-0">
                    <button
                        onClick={() => fetchLogs(page)}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        {exporting ? 'Mengekspor...' : 'Ekspor Excel (.xlsx)'}
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Search query */}
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari user, action, tipe entitas, atau IP..."
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>

                    {/* Action Filter */}
                    <div>
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            <option value="">Semua Aktivitas</option>
                            <option value="USER_LOGIN">Otentikasi Login</option>
                            <option value="DELETE_CONTACT">Hapus Kontak</option>
                            <option value="BULK_DELETE_CONTACTS">Hapus Kontak Massal</option>
                            <option value="EXECUTE_MACRO">Eksekusi Agent Macro</option>
                            <option value="CREATE_CAMPAIGN">Buat Campaign Broadcast</option>
                            <option value="UPDATE_ORGANIZATION_SETTINGS">Update Pengaturan Organisasi</option>
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                </form>
            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/75 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <th className="py-3.5 px-4">Waktu (WIB)</th>
                                <th className="py-3.5 px-4">Pengguna</th>
                                <th className="py-3.5 px-4">Aktivitas / Event</th>
                                <th className="py-3.5 px-4">Entitas Target</th>
                                <th className="py-3.5 px-4">IP Address</th>
                                <th className="py-3.5 px-4 text-right">Rincian</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80 text-xs">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-gray-400">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                                        Memuat log aktivitas...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-gray-400">
                                        Tidak ada log audit ditemukan untuk filter saat ini.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="py-3 px-4 font-mono text-[11px] text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString('id-ID', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit'
                                            })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                                                {log.user_name || 'System / Auto'}
                                            </div>
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500">
                                                {log.user_email || 'automated'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            {getActionBadge(log.action)}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                            {log.entity_type ? (
                                                <span className="font-mono text-[11px] bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                    {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                                            {log.ip_address || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-3 h-3" />
                                                Detail
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 text-xs text-gray-500 dark:text-gray-400">
                    <div>
                        Menampilkan {logs.length > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, total)} dari {total} aktivitas
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                            }}
                            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs"
                        >
                            <option value={10}>10 / hal</option>
                            <option value={25}>25 / hal</option>
                            <option value={50}>50 / hal</option>
                            <option value={100}>100 / hal</option>
                        </select>
                        <button
                            onClick={() => fetchLogs(page - 1)}
                            disabled={page <= 1 || loading}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => fetchLogs(page + 1)}
                            disabled={page >= totalPages || loading}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2.5">
                                <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                                    Detail Audit Log #{selectedLog.id}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                            <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-gray-200/80 dark:border-slate-800">
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Pengguna</div>
                                    <div className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                                        {selectedLog.user_name || 'System'} ({selectedLog.user_email || 'automated'})
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Waktu Tercatat</div>
                                    <div className="font-mono text-gray-700 dark:text-gray-300 mt-0.5">
                                        {new Date(selectedLog.created_at).toLocaleString('id-ID')}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Tipe Aksi</div>
                                    <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase font-semibold">IP Address</div>
                                    <div className="font-mono text-gray-700 dark:text-gray-300 mt-0.5">
                                        {selectedLog.ip_address || '-'}
                                    </div>
                                </div>
                                {selectedLog.entity_type && (
                                    <div className="col-span-2">
                                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Entitas Terkait</div>
                                        <div className="font-mono text-gray-700 dark:text-gray-300 mt-0.5">
                                            {selectedLog.entity_type} {selectedLog.entity_id ? `(ID: ${selectedLog.entity_id})` : ''}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Details Payload */}
                            <div>
                                <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Payload Rincian Aktivitas (JSON)
                                </div>
                                <pre className="bg-slate-950 text-emerald-400 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-800">
                                    {JSON.stringify(selectedLog.details || {}, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-200/80 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
