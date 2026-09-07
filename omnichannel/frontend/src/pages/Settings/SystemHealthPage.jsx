import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Activity, HardDrive, Cpu, Server, Database, RefreshCw, 
    Download, ShieldCheck, Layers, Clock, CheckCircle2, 
    FolderArchive, Terminal, Copy, Check, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usePageTitle } from '../../context/HeaderContext';

export default function SystemHealthPage() {
    usePageTitle('SERVER HEALTH & BACKUP');
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [copiedCmd, setCopiedCmd] = useState(false);

    const fetchHealth = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/app/system/health', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setHealth(res.data);
            if (isManual) toast.success('Telemetri server diperbarui');
        } catch (err) {
            console.error('Error fetching system health:', err);
            toast.error(err.response?.data?.error || 'Gagal memuat status sistem');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(() => fetchHealth(), 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleDownloadBackup = async () => {
        setBackingUp(true);
        const toastId = toast.loading('Menyiapkan snapshot SQL database...');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/app/system/backup-db', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/sql' }));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().slice(0, 10);
            link.setAttribute('download', `crmhub_backup_${dateStr}.sql`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Backup database berhasil diunduh', { id: toastId });
        } catch (err) {
            console.error('Backup download error:', err);
            toast.error('Gagal mengunduh backup database', { id: toastId });
        } finally {
            setBackingUp(false);
        }
    };

    const copyRestoreCommand = () => {
        navigator.clipboard.writeText('psql -U postgres -d crmhub < crmhub_backup.sql');
        setCopiedCmd(true);
        toast.success('Perintah restore disalin');
        setTimeout(() => setCopiedCmd(false), 2000);
    };

    if (loading && !health) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                    <span className="text-sm font-semibold text-gray-500 dark:text-slate-400">
                        Memeriksa performa & telemetri server...
                    </span>
                </div>
            </div>
        );
    }

    const server = health?.server || {};
    const database = health?.database || {};
    const redis = health?.redis || {};
    const storage = health?.storage || {};
    const queues = health?.queues || [];

    const isOptimal = health?.status === 'optimal';

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-6 pb-24 md:pb-8">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-200 dark:border-dark-border">
                <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                            <Activity className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            Server Health & Backup
                        </h1>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isOptimal 
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOptimal ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {isOptimal ? 'Sistem Optimal' : 'Degraded'}
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                        Monitoring beban prosesor, penggunaan RAM, database PostgreSQL, Redis cache, status worker antrean, dan pencadangan instan.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <button
                        onClick={() => fetchHealth(true)}
                        disabled={refreshing}
                        className="px-3.5 py-2 bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 font-semibold text-xs rounded-xl border border-gray-200 dark:border-dark-border flex items-center gap-2 transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-gray-500 dark:text-slate-400 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
                        <span>Perbarui</span>
                    </button>
                    <button
                        onClick={handleDownloadBackup}
                        disabled={backingUp}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors disabled:opacity-60 cursor-pointer shrink-0"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>{backingUp ? 'Mengunduh...' : 'Unduh DB Backup (.sql)'}</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. CPU & Engine */}
                <div className="bg-white dark:bg-dark-surface p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider">CPU & Node Engine</span>
                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                                <Cpu className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {server.cpu?.cores || 1} Cores CPU
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-1" title={server.cpu?.model}>
                            {server.cpu?.model || 'Generic Processor'}
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                        <span>Load: <strong className="text-gray-700 dark:text-slate-200">{server.cpu?.load_avg_1m ?? '0.00'}</strong> (1m)</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{server.node_version}</span>
                    </div>
                </div>

                {/* 2. RAM Memory */}
                <div className="bg-white dark:bg-dark-surface p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider">Memori RAM (VPS)</span>
                            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                                <Server className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {server.memory?.used_percent || 0}% Digunakan
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            {server.memory?.used_pretty || '0 MB'} / {server.memory?.total_pretty || '0 MB'}
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all ${
                                    (server.memory?.used_percent || 0) > 85 ? 'bg-rose-600' : (server.memory?.used_percent || 0) > 65 ? 'bg-amber-500' : 'bg-indigo-600'
                                }`} 
                                style={{ width: `${Math.min(100, server.memory?.used_percent || 0)}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-gray-500 dark:text-slate-400 mt-1.5">
                            <span>Sisa: {server.memory?.free_pretty || '0 MB'}</span>
                            <span>RSS: {server.memory?.rss_mb || 0} MB</span>
                        </div>
                    </div>
                </div>

                {/* 3. PostgreSQL Database */}
                <div className="bg-white dark:bg-dark-surface p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider">PostgreSQL</span>
                            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                <Database className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {database.size_pretty || '0 MB'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{database.total_tables || 0} Tabel Aktif ({database.name || 'crmhub'})</span>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                        <span>Latency: <strong className="text-gray-700 dark:text-slate-200">{database.latency || '0ms'}</strong></span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{database.active_connections || 0} Koneksi</span>
                    </div>
                </div>

                {/* 4. Uploads Storage & Cache */}
                <div className="bg-white dark:bg-dark-surface p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider">Media & Redis Cache</span>
                            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                <HardDrive className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {storage.uploads_size_pretty || '0 MB'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Folder <code className="bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded text-gray-700 dark:text-slate-300 font-mono">uploads/</code>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                        <span>Redis: <strong className="text-gray-700 dark:text-slate-200">{redis.latency || '0ms'}</strong></span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{redis.keys_count || 0} Cache Keys</span>
                    </div>
                </div>
            </div>

            {/* Middle Section: Queue Pipeline Activity & Disaster Recovery Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left (2 cols): Queue Pipeline Telemetry */}
                <div className="lg:col-span-2 bg-white dark:bg-dark-surface p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                                Antrean Background Workers (BullMQ)
                            </h2>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-slate-400">Status antrean real-time</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {queues.map((q, idx) => (
                            <div key={idx} className="p-3.5 sm:p-4 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-xs text-gray-900 dark:text-white">{q.label}</h3>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            {q.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center mt-3 pt-3 border-t border-gray-200/60 dark:border-slate-700">
                                        <div>
                                            <div className="text-[10px] text-gray-500 dark:text-slate-400">Waiting</div>
                                            <div className="text-xs font-bold text-gray-800 dark:text-gray-200">{q.waiting ?? 0}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-500 dark:text-slate-400">Active</div>
                                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{q.active ?? 0}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-500 dark:text-slate-400">Done</div>
                                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{q.completed ?? 0}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-500 dark:text-slate-400">Failed</div>
                                            <div className="text-xs font-bold text-rose-600 dark:text-rose-400">{q.failed ?? 0}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 flex items-center gap-3">
                        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <div className="text-xs text-gray-700 dark:text-slate-300">
                            <span className="font-semibold">Server Uptime:</span> Aktif selama <strong className="text-gray-900 dark:text-white">{server.uptime_formatted || '0s'}</strong>.
                        </div>
                    </div>
                </div>

                {/* Right (1 col): Disaster Recovery Box */}
                <div className="bg-white dark:bg-dark-surface p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white mb-2">
                            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                <FolderArchive className="w-4 h-4" />
                            </div>
                            <h2 className="text-sm sm:text-base font-bold">Disaster Recovery</h2>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                            Unduh salinan penuh seluruh data kontak, percakapan, alur bot, template, invoice, produk, dan deals ke dalam berkas SQL standar.
                        </p>

                        <button
                            onClick={handleDownloadBackup}
                            disabled={backingUp}
                            className="mt-4 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>{backingUp ? 'Memproses SQL...' : 'Download Full Backup (.sql)'}</span>
                        </button>

                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-dark-border">
                            <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">
                                <div className="flex items-center gap-1.5">
                                    <Terminal className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
                                    <span>Perintah Restore Database</span>
                                </div>
                                <button 
                                    onClick={copyRestoreCommand} 
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                    {copiedCmd ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedCmd ? 'Tersalin' : 'Salin'}</span>
                                </button>
                            </div>
                            <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-xs select-all break-all border border-slate-800">
                                psql -U postgres -d crmhub &lt; crmhub_backup.sql
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-2">
                                Jalankan perintah di atas pada terminal VPS untuk mengembalikan data backup.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
