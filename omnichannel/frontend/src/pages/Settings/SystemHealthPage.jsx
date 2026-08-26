import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Activity, HardDrive, Cpu, Server, Database, RefreshCw, 
    Download, ShieldCheck, Zap, AlertTriangle, Layers, Clock, 
    CheckCircle2, FolderArchive, Terminal, Copy, Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SystemHealthPage() {
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
            if (isManual) toast.success('Telemetri server diperbarui!');
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
        const toastId = toast.loading('Menyiapkan full database snapshot SQL...');
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

            toast.success('Backup database berhasil diunduh!', { id: toastId });
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
        toast.success('Perintah restore disalin ke clipboard!');
        setTimeout(() => setCopiedCmd(false), 2500);
    };

    if (loading && !health) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                    <span className="text-sm font-bold text-gray-500">Menganalisa performa & sumber daya VPS...</span>
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
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-indigo-900/40">
                <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                                <Activity className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-black tracking-wider uppercase text-indigo-400">System Telemetry & Health</span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${isOptimal ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                                <span className={`w-2 h-2 rounded-full ${isOptimal ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                                {isOptimal ? 'All Systems Optimal' : 'Degraded Performance'}
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                            Status Server VPS & Disaster Recovery
                        </h1>
                        <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
                            Monitoring beban prosesor, penggunaan memori RAM, database PostgreSQL, Redis cache, antrean background worker, dan pencadangan instan.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchHealth(true)}
                            disabled={refreshing}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition-all shadow-sm"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
                            <span>Perbarui Data</span>
                        </button>
                        <button
                            onClick={handleDownloadBackup}
                            disabled={backingUp}
                            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-black text-xs rounded-xl shadow-lg hover:shadow-amber-500/20 flex items-center gap-2 transition-all shrink-0"
                        >
                            <Download className={`w-4 h-4 ${backingUp ? 'animate-bounce' : ''}`} />
                            <span>{backingUp ? 'Mengunduh...' : 'Unduh DB Backup (.sql)'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. CPU & OS */}
                <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider">CPU & Node Engine</span>
                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                                <Cpu className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-gray-900 dark:text-white">
                            {server.cpu?.cores || 1} Cores CPU
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {server.cpu?.model}
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-500">
                        <span>Load: {server.cpu?.load_avg_1m} (1m)</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{server.node_version}</span>
                    </div>
                </div>

                {/* 2. RAM Memory */}
                <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider">Memori RAM (VPS)</span>
                            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                                <Server className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-gray-900 dark:text-white">
                            {server.memory?.used_percent || 0}% Digunakan
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            {server.memory?.used_pretty} / {server.memory?.total_pretty}
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${
                                    (server.memory?.used_percent || 0) > 85 ? 'bg-rose-500' : (server.memory?.used_percent || 0) > 65 ? 'bg-amber-500' : 'bg-indigo-500'
                                }`} 
                                style={{ width: `${server.memory?.used_percent || 0}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1.5">
                            <span>Free: {server.memory?.free_pretty}</span>
                            <span>Node RSS: {server.memory?.rss_mb} MB</span>
                        </div>
                    </div>
                </div>

                {/* 3. PostgreSQL Database */}
                <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider">Database PostgreSQL</span>
                            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                                <Database className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-gray-900 dark:text-white">
                            {database.size_pretty || '0 MB'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{database.total_tables || 0} Tabel Aktif</span>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-500">
                        <span>Latency: {database.latency || '0ms'}</span>
                        <span className="text-emerald-600 font-bold">{database.active_connections} Koneksi</span>
                    </div>
                </div>

                {/* 4. Uploads Storage */}
                <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider">Penyimpanan Media</span>
                            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                                <HardDrive className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-black text-gray-900 dark:text-white">
                            {storage.uploads_size_pretty || '0 MB'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Folder <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">uploads/</code>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-500">
                        <span>Redis Latency: {redis.latency || '0ms'}</span>
                        <span className="font-bold text-indigo-600">{redis.keys_count || 0} Cache Keys</span>
                    </div>
                </div>
            </div>

            {/* Middle Section: Queue Pipeline Activity & Disaster Recovery Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left (2 cols): Queue Pipeline Telemetry */}
                <div className="lg:col-span-2 bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-base font-black text-gray-900 dark:text-white">Antrean Background Workers (BullMQ)</h2>
                        </div>
                        <span className="text-xs text-gray-400">Status antrean real-time</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {queues.map((q, idx) => (
                            <div key={idx} className="p-4 rounded-2xl bg-gray-50/70 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/60 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-xs text-gray-900 dark:text-white">{q.label}</h3>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            {q.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center mt-3 pt-3 border-t border-gray-200/60 dark:border-slate-700">
                                        <div>
                                            <div className="text-[10px] text-gray-400">Waiting</div>
                                            <div className="text-xs font-black text-gray-800 dark:text-gray-200">{q.waiting ?? 0}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-400">Active</div>
                                            <div className="text-xs font-black text-blue-600">{q.active ?? 0}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-400">Done</div>
                                            <div className="text-xs font-black text-emerald-600">{q.completed ?? 0}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-400">Failed</div>
                                            <div className="text-xs font-black text-rose-500">{q.failed ?? 0}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-3">
                        <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div className="text-xs text-indigo-900 dark:text-indigo-200">
                            <span className="font-bold">Server Uptime:</span> Aktif tanpa henti selama <span className="font-black text-indigo-700 dark:text-indigo-300">{server.uptime_formatted || '0s'}</span>.
                        </div>
                    </div>
                </div>

                {/* Right (1 col): Disaster Recovery Box */}
                <div className="bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/20 p-6 rounded-3xl border border-amber-200 dark:border-amber-900/40 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 mb-2">
                            <FolderArchive className="w-5 h-5" />
                            <h2 className="text-base font-black">Disaster Recovery</h2>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                            Unduh salinan penuh seluruh data kontak, obrolan, bot configuration, database Q&A, invoice, produk, dan deals ke dalam file SQL standar.
                        </p>

                        <button
                            onClick={handleDownloadBackup}
                            disabled={backingUp}
                            className="mt-4 w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                        >
                            <Download className="w-4 h-4" />
                            <span>{backingUp ? 'Memproses SQL...' : 'Download Full Backup (.sql)'}</span>
                        </button>

                        <div className="mt-6 pt-4 border-t border-amber-200/60 dark:border-amber-900/40">
                            <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                <div className="flex items-center gap-1">
                                    <Terminal className="w-3.5 h-3.5" />
                                    <span>Restore Command</span>
                                </div>
                                <button onClick={copyRestoreCommand} className="text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1">
                                    {copiedCmd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedCmd ? 'Tersalin' : 'Salin'}</span>
                                </button>
                            </div>
                            <div className="bg-slate-900 text-slate-200 p-2.5 rounded-xl font-mono text-[11px] select-all break-all border border-slate-800">
                                psql -U postgres -d crmhub &lt; crmhub_backup.sql
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
