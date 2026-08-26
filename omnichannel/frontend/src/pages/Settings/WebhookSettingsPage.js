import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, Play, ChevronDown, ChevronUp, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { usePageTitle } from '../../context/HeaderContext';

const ALL_EVENTS = [
    { id: 'message.received',      label: 'Pesan Masuk' },
    { id: 'message.sent',          label: 'Pesan Terkirim' },
    { id: 'conversation.created',  label: 'Percakapan Baru' },
    { id: 'conversation.assigned', label: 'Percakapan Di-assign' },
    { id: 'conversation.resolved', label: 'Percakapan Diselesaikan' },
    { id: 'contact.created',       label: 'Kontak Baru' },
    { id: 'contact.updated',       label: 'Kontak Diperbarui' },
];

function WebhookForm({ initial, onSave, onCancel }) {
    const [name, setName] = useState(initial?.name || '');
    const [url, setUrl] = useState(initial?.url || '');
    const [events, setEvents] = useState(initial?.events || []);

    const toggleEvent = (id) =>
        setEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);

    const handleSave = () => {
        if (!name.trim() || !url.trim()) return toast.error('Nama dan URL wajib diisi');
        try { new URL(url); } catch { return toast.error('URL tidak valid'); }
        onSave({ name, url, events });
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Nama Webhook</label>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Contoh: Notifikasi Slack"
                    className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">URL Endpoint</label>
                <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://hooks.example.com/..."
                    className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Event yang Dipantau</label>
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">Kosongkan untuk menerima semua event.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_EVENTS.map(ev => (
                        <label key={ev.id} className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={events.includes(ev.id)}
                                onChange={() => toggleEvent(ev.id)}
                                className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-gray-700 dark:text-slate-300">{ev.label}</span>
                            <code className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">{ev.id}</code>
                        </label>
                    ))}
                </div>
            </div>
            <div className="flex gap-2 pt-2">
                <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">
                    Simpan
                </button>
                <button onClick={onCancel} className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    Batal
                </button>
            </div>
        </div>
    );
}

function LogsPanel({ webhookId, onClose }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`/api/app/webhooks/${webhookId}/logs`)
            .then(res => setLogs(res.data))
            .catch(() => toast.error('Gagal memuat log'))
            .finally(() => setLoading(false));
    }, [webhookId]);

    return (
        <div className="mt-3 border-t border-gray-100 dark:border-dark-border pt-3">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Delivery Logs (50 Terakhir)</span>
                <button onClick={onClose} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Tutup</button>
            </div>
            {loading ? (
                <div className="py-4 text-center text-xs text-gray-400">Memuat...</div>
            ) : logs.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-400">Belum ada log pengiriman.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-gray-400 dark:text-slate-500 text-left border-b border-gray-100 dark:border-dark-border">
                                <th className="pb-1 pr-3">Waktu</th>
                                <th className="pb-1 pr-3">Event</th>
                                <th className="pb-1 pr-3">Status</th>
                                <th className="pb-1 pr-3">HTTP</th>
                                <th className="pb-1">ms</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-dark-border">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                    <td className="py-1.5 pr-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="py-1.5 pr-3 font-mono text-gray-700 dark:text-slate-300">{log.event}</td>
                                    <td className="py-1.5 pr-3">
                                        {log.status === 'success' ? (
                                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                <CheckCircle className="w-3 h-3" /> OK
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-500 dark:text-red-400" title={log.error_message}>
                                                <XCircle className="w-3 h-3" /> Gagal
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-1.5 pr-3 text-gray-500 dark:text-slate-400">{log.status_code || '-'}</td>
                                    <td className="py-1.5 text-gray-500 dark:text-slate-400">{log.response_ms ?? '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function WebhookSettingsPage() {
    usePageTitle('WEBHOOK OUTBOUND');
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [expandedLogs, setExpandedLogs] = useState(null);
    const [showSecrets, setShowSecrets] = useState({});
    const [testing, setTesting] = useState(null);

    const load = () => {
        axios.get('/api/app/webhooks')
            .then(res => setWebhooks(res.data))
            .catch(() => toast.error('Gagal memuat webhook'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async (data) => {
        try {
            await axios.post('/api/app/webhooks', data);
            toast.success('Webhook ditambahkan');
            setShowForm(false);
            load();
        } catch { toast.error('Gagal menambah webhook'); }
    };

    const handleUpdate = async (id, data) => {
        try {
            await axios.put(`/api/app/webhooks/${id}`, data);
            toast.success('Webhook diperbarui');
            setEditingId(null);
            load();
        } catch { toast.error('Gagal memperbarui webhook'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus webhook ini?')) return;
        try {
            await axios.delete(`/api/app/webhooks/${id}`);
            toast.success('Webhook dihapus');
            load();
        } catch { toast.error('Gagal menghapus'); }
    };

    const handleTest = async (id) => {
        setTesting(id);
        try {
            const res = await axios.post(`/api/app/webhooks/${id}/test`);
            if (res.data.success) {
                toast.success(`Test berhasil (${res.data.status_code}, ${res.data.response_ms}ms)`);
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Tidak dapat menjangkau endpoint';
            toast.error(`Test gagal: ${msg}`);
        } finally {
            setTesting(null);
        }
    };

    const toggleActive = async (wh) => {
        try {
            await axios.put(`/api/app/webhooks/${wh.id}`, { ...wh, is_active: !wh.is_active });
            load();
        } catch { toast.error('Gagal mengubah status'); }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Memuat...</div>;

    return (
        <div className="p-6 md:p-8">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Webhook Outbound</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                        Kirim event secara real-time ke sistem eksternal (Slack, n8n, Google Sheet, ERP, dll).
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm flex-shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Tambah Webhook
                    </button>
                )}
            </div>

            {showForm && (
                <div className="bg-white dark:bg-dark-surface rounded-xl border-2 border-indigo-200 dark:border-indigo-800 p-6 mb-6 shadow-sm">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">Webhook Baru</h3>
                    <WebhookForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
                </div>
            )}

            {webhooks.length === 0 && !showForm ? (
                <div className="text-center py-12 text-gray-400 dark:text-slate-500 border-2 border-dashed border-gray-200 dark:border-dark-border rounded-xl">
                    <p className="text-sm">Belum ada webhook terdaftar.</p>
                    <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                        + Tambah webhook pertama
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {webhooks.map(wh => (
                        <div key={wh.id} className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
                            {editingId === wh.id ? (
                                <div className="p-5">
                                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">Edit Webhook</h3>
                                    <WebhookForm
                                        initial={wh}
                                        onSave={data => handleUpdate(wh.id, data)}
                                        onCancel={() => setEditingId(null)}
                                    />
                                </div>
                            ) : (
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${wh.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}></div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-sm text-gray-800 dark:text-white">{wh.name}</span>
                                                    {!wh.is_active && (
                                                        <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">NONAKTIF</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-xs text-gray-500 dark:text-slate-400 font-mono truncate max-w-[280px]">{wh.url}</code>
                                                    <button
                                                        onClick={() => setShowSecrets(p => ({ ...p, [wh.id]: !p[wh.id] }))}
                                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                                                        title="Lihat secret"
                                                    >
                                                        {showSecrets[wh.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                                {showSecrets[wh.id] && (
                                                    <code className="text-[10px] text-gray-400 dark:text-slate-500 font-mono block mt-1">{wh.secret}</code>
                                                )}
                                                {wh.events?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {wh.events.map(ev => (
                                                            <span key={ev} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-mono">{ev}</span>
                                                        ))}
                                                    </div>
                                                )}
                                                {(!wh.events || wh.events.length === 0) && (
                                                    <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">Semua event</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => handleTest(wh.id)}
                                                disabled={testing === wh.id}
                                                className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                                title="Test webhook"
                                            >
                                                <Play className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setExpandedLogs(expandedLogs === wh.id ? null : wh.id)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                                title="Lihat log"
                                            >
                                                {expandedLogs === wh.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                            <button
                                                onClick={() => toggleActive(wh)}
                                                className={`w-8 h-5 rounded-full flex items-center p-0.5 transition-colors ${wh.is_active ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                                                title={wh.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${wh.is_active ? 'translate-x-3' : ''}`}></div>
                                            </button>
                                            <button onClick={() => setEditingId(wh.id)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors">
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(wh.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    {expandedLogs === wh.id && (
                                        <LogsPanel webhookId={wh.id} onClose={() => setExpandedLogs(null)} />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-dark-border">
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Format Payload</p>
                <pre className="text-xs font-mono text-gray-600 dark:text-slate-300 overflow-x-auto">{`{
  "event": "message.received",
  "id": "evt_1234567890",
  "timestamp": 1712345678,
  "data": { ... }
}`}</pre>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                    Setiap request disertai header <code className="font-mono">X-Reply-Signature</code> (HMAC-SHA256) menggunakan secret Anda untuk verifikasi keaslian.
                </p>
            </div>
        </div>
    );
}
