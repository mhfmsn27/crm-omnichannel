import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { CheckSquare, Plus, Trash2, Edit, Calendar, User, AlertCircle, Clock, Search, CheckCircle2, Circle, Loader, X, Save, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';

const PRIORITY_CONFIG = {
    low:    { label: 'Rendah',  color: 'text-gray-500 bg-gray-100 dark:bg-gray-800', dot: 'bg-gray-400' },
    normal: { label: 'Normal',  color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', dot: 'bg-blue-400' },
    high:   { label: 'Tinggi',  color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30', dot: 'bg-orange-400' },
    urgent: { label: 'Urgent',  color: 'text-red-600 bg-red-50 dark:bg-red-900/30', dot: 'bg-red-500' },
};

const STATUS_CONFIG = {
    open:        { label: 'Open',       icon: Circle,       color: 'text-gray-500' },
    in_progress: { label: 'Dalam Proses', icon: Loader,     color: 'text-blue-500' },
    done:        { label: 'Selesai',    icon: CheckCircle2, color: 'text-green-500' },
    cancelled:   { label: 'Dibatalkan', icon: X,            color: 'text-gray-400' },
};

const STATUSES = Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, ...c }));
const PRIORITIES = Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({ value: v, ...c }));

function isOverdue(task) {
    return task.due_at && task.status !== 'done' && task.status !== 'cancelled' && new Date(task.due_at) < new Date();
}

function formatDue(due_at) {
    if (!due_at) return null;
    const d = new Date(due_at);
    const now = new Date();
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    if (diff < -1) return { text: `${Math.abs(Math.ceil(diff))}h lalu`, overdue: true };
    if (diff < 0) return { text: 'Terlambat', overdue: true };
    if (diff < 1) return { text: 'Hari ini', overdue: false };
    if (diff < 2) return { text: 'Besok', overdue: false };
    return { text: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), overdue: false };
}

// ── Task Form Modal ──────────────────────────────────────────────────────────
function TaskFormModal({ isOpen, onClose, onSaved, initialData, teamMembers }) {
    const [form, setForm] = useState({
        title: '', description: '', priority: 'normal', due_at: '', assigned_to: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setForm({
                title: initialData.title || '',
                description: initialData.description || '',
                priority: initialData.priority || 'normal',
                due_at: initialData.due_at ? initialData.due_at.split('T')[0] : '',
                assigned_to: initialData.assigned_to || '',
            });
        } else {
            setForm({ title: '', description: '', priority: 'normal', due_at: '', assigned_to: '' });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...form, assigned_to: form.assigned_to || null };
            if (initialData) {
                await axios.put(`/api/app/tasks/${initialData.id}`, payload);
            } else {
                await axios.post('/api/app/tasks', payload);
            }
            toast.success(initialData ? 'Task diperbarui' : 'Task dibuat');
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal menyimpan task');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Edit Task' : 'Tambah Task Baru'}
            size="md"
            footer={
                <ModalFooter>
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                </ModalFooter>
            }
        >
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Judul Task *</label>
                        <input
                            type="text" required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="Judul task..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Deskripsi</label>
                        <textarea
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Detail task..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Prioritas</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
                                value={form.priority}
                                onChange={e => setForm({ ...form, priority: e.target.value })}
                            >
                                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Tenggat</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
                                value={form.due_at}
                                onChange={e => setForm({ ...form, due_at: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Ditugaskan ke</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
                            value={form.assigned_to}
                            onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                        >
                            <option value="">Saya</option>
                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                </form>
        </Modal>
    );
};

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TaskListPage() {
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState({ open: 0, in_progress: 0, done: 0, overdue: 0 });
    const [loading, setLoading] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);

    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [search, setSearch] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const params = { limit: 100 };
            if (filterStatus) params.status = filterStatus;
            if (filterPriority) params.priority = filterPriority;
            const res = await axios.get('/api/app/tasks', { params });
            setTasks(res.data.tasks);
        } catch (e) {
            toast.error('Gagal memuat tasks');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterPriority]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await axios.get('/api/app/tasks/stats');
            setStats(res.data);
        } catch {}
    }, []);

    const fetchTeam = useCallback(async () => {
        try {
            const res = await axios.get('/api/app/team');
            setTeamMembers(res.data);
        } catch {}
    }, []);

    useEffect(() => {
        fetchTasks();
        fetchStats();
        fetchTeam();
    }, [fetchTasks, fetchStats, fetchTeam]);

    const handleRefresh = () => { fetchTasks(); fetchStats(); };

    const handleStatusToggle = async (task) => {
        const nextStatus = task.status === 'done'
            ? 'open'
            : task.status === 'open' ? 'in_progress'
            : task.status === 'in_progress' ? 'done'
            : 'open';
        try {
            await axios.put(`/api/app/tasks/${task.id}`, { status: nextStatus });
            handleRefresh();
        } catch {
            toast.error('Gagal mengubah status');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus task ini?')) return;
        try {
            await axios.delete(`/api/app/tasks/${id}`);
            toast.success('Task dihapus');
            handleRefresh();
        } catch {
            toast.error('Gagal menghapus');
        }
    };

    const filteredTasks = tasks.filter(t => {
        if (!search) return true;
        return t.title.toLowerCase().includes(search.toLowerCase()) ||
            (t.contact_name || '').toLowerCase().includes(search.toLowerCase());
    });

    const StatCard = ({ label, value, color }) => (
        <div className="bg-white dark:bg-dark-surface rounded-xl border dark:border-dark-border p-4 flex flex-col gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            <span className={`text-2xl font-bold ${color}`}>{value}</span>
        </div>
    );

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar flex flex-col pb-20 md:pb-0 bg-gray-50 dark:bg-dark-bg">
            <TaskFormModal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditingTask(null); }}
                onSaved={handleRefresh}
                initialData={editingTask}
                teamMembers={teamMembers}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CheckSquare className="w-6 h-6 text-indigo-500" />
                        Tasks & Reminders
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola tugas dan pengingat tim</p>
                </div>
                <button
                    onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                    <Plus className="w-4 h-4" /> Tambah Task
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Open" value={stats.open} color="text-gray-700 dark:text-gray-200" />
                <StatCard label="Dalam Proses" value={stats.in_progress} color="text-blue-600" />
                <StatCard label="Selesai" value={stats.done} color="text-green-600" />
                <StatCard label="Terlambat" value={stats.overdue} color="text-red-600" />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari task..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                    <option value="">Semua Status</option>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                    <option value="">Semua Prioritas</option>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
            </div>

            {/* Task List */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <Loader className="w-6 h-6 animate-spin mr-2" /> Memuat tasks...
                </div>
            ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <CheckSquare className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">Belum ada task. Tambahkan task pertama Anda.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredTasks.map(task => {
                        const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;
                        const StatusIcon = statusCfg.icon;
                        const priCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
                        const dueFmt = formatDue(task.due_at);
                        const overdue = isOverdue(task);

                        return (
                            <div
                                key={task.id}
                                className={`bg-white dark:bg-dark-surface rounded-xl border dark:border-dark-border p-4 flex items-start gap-3 group transition-all ${overdue ? 'border-l-4 border-l-red-400' : task.status === 'done' ? 'opacity-60' : ''}`}
                            >
                                {/* Status toggle */}
                                <button
                                    onClick={() => handleStatusToggle(task)}
                                    className={`flex-shrink-0 mt-0.5 ${statusCfg.color} hover:scale-110 transition-transform`}
                                    title={`Status: ${statusCfg.label}. Klik untuk ubah`}
                                >
                                    <StatusIcon className="w-5 h-5" />
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2 flex-wrap">
                                        <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-white'}`}>
                                            {task.title}
                                        </p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priCfg.color}`}>
                                            {priCfg.label}
                                        </span>
                                    </div>
                                    {task.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                        {task.assigned_name && (
                                            <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                                <User className="w-3 h-3" />{task.assigned_name}
                                            </span>
                                        )}
                                        {task.contact_name && (
                                            <span className="flex items-center gap-1 text-[10px] text-indigo-500">
                                                <User className="w-3 h-3" />{task.contact_name}
                                            </span>
                                        )}
                                        {dueFmt && (
                                            <span className={`flex items-center gap-1 text-[10px] font-medium ${dueFmt.overdue ? 'text-red-500' : 'text-gray-400'}`}>
                                                <Calendar className="w-3 h-3" />{dueFmt.text}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button
                                        onClick={() => { setEditingTask(task); setIsFormOpen(true); }}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(task.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
