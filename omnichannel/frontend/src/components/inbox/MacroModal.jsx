import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Zap, X, Plus, Search, Tag, MessageSquare, CheckCircle2,
    Play, ChevronRight, RefreshCw, AlertCircle, ArrowRight,
    SlidersHorizontal, Layers, Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MacroModal({ isOpen, onClose, conversationId, contactId, onExecuted }) {
    const [macros, setMacros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [executingId, setExecutingId] = useState(null);
    const [search, setSearch] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Form state for creating a new macro
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formMessage, setFormMessage] = useState('');
    const [formStatus, setFormStatus] = useState('');
    const [formLabel, setFormLabel] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchMacros = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/app/macros', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const list = res.data?.macros || (Array.isArray(res.data) ? res.data : (res.data?.data || []));
            setMacros(list.map(m => ({
                ...m,
                name: m.name || m.title || 'Macro'
            })));
        } catch (err) {
            console.error('[MacroModal] Fetch error:', err);
            toast.error('Gagal memuat daftar macro workflow');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMacros();
            setShowCreateForm(false);
            setSearch('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleExecute = async (macro) => {
        if (!conversationId) {
            toast.error('Percakapan aktif tidak ditemukan');
            return;
        }

        const macroName = macro.name || macro.title || 'Workflow';
        setExecutingId(macro.id);
        const toastId = toast.loading(`Mengeksekusi macro "${macroName}"...`);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`/api/app/macros/${macro.id}/execute`, {
                conversationId,
                contactId
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (res.data && res.data.success) {
                toast.success(`Macro "${macroName}" berhasil dijalankan!`, { id: toastId });
                if (onExecuted) {
                    onExecuted(res.data.results || res.data.executedActions);
                }
                onClose();
            }
        } catch (err) {
            console.error('[MacroModal] Execution error:', err);
            toast.error(err.response?.data?.error || 'Gagal mengeksekusi macro', { id: toastId });
        } finally {
            setExecutingId(null);
        }
    };

    const handleCreateMacro = async (e) => {
        e.preventDefault();
        if (!formName.trim()) {
            toast.error('Nama macro wajib diisi');
            return;
        }

        const actions = [];
        if (formMessage.trim()) {
            actions.push({ type: 'send_message', payload: { message: formMessage.trim() } });
        }
        if (formLabel.trim()) {
            actions.push({ type: 'add_label', payload: { labelName: formLabel.trim() } });
        }
        if (formStatus.trim()) {
            actions.push({ type: 'set_status', payload: { status: formStatus.trim() } });
        }

        if (actions.length === 0) {
            toast.error('Harap isi minimal 1 aksi (pesan, label, atau status)');
            return;
        }

        setSaving(true);
        const toastId = toast.loading('Menyimpan macro baru...');

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/app/macros', {
                name: formName.trim(),
                title: formName.trim(),
                description: formDescription.trim() || null,
                actions
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (res.data && (res.data.success || res.data.id || res.data.macro)) {
                toast.success('Macro workflow berhasil dibuat!', { id: toastId });
                setFormName('');
                setFormDescription('');
                setFormMessage('');
                setFormStatus('');
                setFormLabel('');
                setShowCreateForm(false);
                fetchMacros();
            }
        } catch (err) {
            console.error('[MacroModal] Save error:', err);
            toast.error(err.response?.data?.error || 'Gagal membuat macro', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const filteredMacros = macros.filter(m => {
        const nameVal = (m.name || m.title || '').toLowerCase();
        const descVal = (m.description || '').toLowerCase();
        const searchLower = search.toLowerCase();
        return nameVal.includes(searchLower) || descVal.includes(searchLower);
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-sm">
                            <Zap className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                1-Click Agent Workflow Macros
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                                    ENTERPRISE
                                </span>
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                Jalankan serangkaian aksi (kirim pesan, pasang label, ubah stage) secara instan.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Subheader / Search & Create Toggle */}
                {!showCreateForm && (
                    <div className="p-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari macro..."
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Buat Macro
                        </button>
                    </div>
                )}

                {/* Content Area */}
                <div className="p-4 overflow-y-auto flex-1 space-y-3">
                    {showCreateForm ? (
                        /* Create Form */
                        <form onSubmit={handleCreateMacro} className="space-y-3 text-xs">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                    Konfigurasi Macro Baru
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                >
                                    Batal
                                </button>
                            </div>

                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                                    Nama Macro <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Contoh: Closing Deal & Label VIP"
                                    required
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                                    Deskripsi Singkat
                                </label>
                                <input
                                    type="text"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Opsional: penjelasan tujuan macro ini"
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                />
                            </div>

                            <div className="bg-purple-50/50 dark:bg-purple-950/20 p-3 rounded-xl border border-purple-100 dark:border-purple-900/30 space-y-3">
                                <span className="block font-bold text-purple-900 dark:text-purple-300">
                                    Aksi yang Dijalankan Bersamaan:
                                </span>

                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                                        1. Kirim Pesan Otomatis (Opsional)
                                    </label>
                                    <textarea
                                        value={formMessage}
                                        onChange={(e) => setFormMessage(e.target.value)}
                                        rows={2}
                                        placeholder="Pesan yang langsung terkirim ke customer..."
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                                            2. Sematkan Label (Opsional)
                                        </label>
                                        <input
                                            type="text"
                                            value={formLabel}
                                            onChange={(e) => setFormLabel(e.target.value)}
                                            placeholder="Contoh: VIP / Deal Closed"
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                                            3. Ubah Status Chat (Opsional)
                                        </label>
                                        <select
                                            value={formStatus}
                                            onChange={(e) => setFormStatus(e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        >
                                            <option value="">Jangan ubah status</option>
                                            <option value="resolved">Resolved (Selesai)</option>
                                            <option value="pending">Pending</option>
                                            <option value="open">Open (Buka Kembali)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan Macro'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Macro List */
                        loading ? (
                            <div className="py-12 text-center text-gray-400">
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-500" />
                                Memuat daftar macro...
                            </div>
                        ) : filteredMacros.length === 0 ? (
                            <div className="py-12 text-center text-gray-400">
                                <Zap className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                <p className="font-semibold text-xs text-gray-600 dark:text-gray-400">
                                    Belum ada macro workflow yang cocok.
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Klik tombol "Buat Macro" di atas untuk menambahkan shortcut aksi otomatis.
                                </p>
                            </div>
                        ) : (
                            filteredMacros.map((macro) => {
                                const actions = Array.isArray(macro.actions) ? macro.actions : [];
                                const isExecuting = executingId === macro.id;

                                return (
                                    <div
                                        key={macro.id}
                                        className="p-3.5 bg-white dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-600/50 shadow-sm transition-all group"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                                                        {macro.name}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        ({actions.length} aksi)
                                                    </span>
                                                </div>
                                                {macro.description && (
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {macro.description}
                                                    </p>
                                                )}

                                                {/* Action Badges */}
                                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                    {actions.map((act, idx) => {
                                                        if (act.type === 'send_message') {
                                                            return (
                                                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                                                                    <MessageSquare className="w-2.5 h-2.5" />
                                                                    Kirim Pesan
                                                                </span>
                                                            );
                                                        }
                                                        if (act.type === 'add_label') {
                                                            return (
                                                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                                                                    <Tag className="w-2.5 h-2.5" />
                                                                    Label: {act.payload?.labelName || 'Tag'}
                                                                </span>
                                                            );
                                                        }
                                                        if (act.type === 'set_status') {
                                                            return (
                                                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                                                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                                                    Status: {act.payload?.status}
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                </div>
                                            </div>

                                            {/* Execute Button */}
                                            <button
                                                onClick={() => handleExecute(macro)}
                                                disabled={isExecuting}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white rounded-xl border border-purple-200 dark:border-purple-800/60 transition-all shadow-sm shrink-0 disabled:opacity-50"
                                            >
                                                {isExecuting ? (
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Play className="w-3.5 h-3.5 fill-current" />
                                                )}
                                                <span>Eksekusi</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-[11px]">
                        Semua aksi dicatat ke audit security log secara otomatis.
                    </span>
                    <button
                        onClick={onClose}
                        className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}
