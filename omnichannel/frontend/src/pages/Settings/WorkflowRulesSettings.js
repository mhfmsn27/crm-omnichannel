import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { usePageTitle } from '../../context/HeaderContext';
import { Plus, Edit2, Trash2, X, Check, Zap, ToggleLeft, ToggleRight, Play, FileText } from 'lucide-react';

const TRIGGER_TYPES = [
    { value: 'message_received', label: 'Pesan Masuk' },
    { value: 'conversation_created', label: 'Percakapan Baru' },
    { value: 'keyword_detected', label: 'Keyword Terdeteksi' },
    { value: 'sentiment_detected', label: 'Sentimen Terdeteksi' },
];

const ACTION_TYPES = [
    { value: 'add_tag', label: 'Tambah Label' },
    { value: 'remove_tag', label: 'Hapus Label' },
    { value: 'set_priority', label: 'Ubah Prioritas' },
    { value: 'send_message', label: 'Kirim Pesan' },
    { value: 'notify', label: 'Kirim Notifikasi' },
    { value: 'assign_agent', label: 'Tugaskan ke Agent' },
];

export default function WorkflowRulesSettings() {
    usePageTitle('WORKFLOW RULES');
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [form, setForm] = useState({
        name: '',
        description: '',
        trigger_type: 'message_received',
        trigger_conditions: {},
        actions: [],
        priority: 0,
        stop_on_match: false,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const res = await axios.get('/api/app/workflow/rules');
            setRules(res.data || []);
        } catch (e) {
            toast.error('Failed to load rules');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (rule) => {
        try {
            await axios.post(`/api/app/workflow/rules/${rule.id}/toggle`);
            fetchRules();
            toast.success(rule.is_active ? 'Rule disabled' : 'Rule enabled');
        } catch (e) {
            toast.error('Failed to toggle rule');
        }
    };

    const handleDelete = async (rule) => {
        if (!confirm(`Delete rule "${rule.name}"?`)) return;
        try {
            await axios.delete(`/api/app/workflow/rules/${rule.id}`);
            fetchRules();
            toast.success('Rule deleted');
        } catch (e) {
            toast.error('Failed to delete rule');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name) {
            toast.error('Name is required');
            return;
        }
        setSaving(true);
        try {
            if (editingRule) {
                await axios.put(`/api/app/workflow/rules/${editingRule.id}`, form);
                toast.success('Rule updated');
            } else {
                await axios.post('/api/app/workflow/rules', form);
                toast.success('Rule created');
            }
            setModalOpen(false);
            fetchRules();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to save rule');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Memuat...</div>;

    return (
        <div className="p-6 md:p-8 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Workflow Rules</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Otomatisasi aksi berdasarkan trigger tertentu
                    </p>
                </div>
                <button
                    onClick={() => { setEditingRule(null); setForm({ name: '', description: '', trigger_type: 'message_received', trigger_conditions: {}, actions: [], priority: 0, stop_on_match: false }); setModalOpen(true); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Tambah Rule
                </button>
            </div>

            {rules.length === 0 ? (
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Belum ada Workflow Rules</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                        Buat rules untuk mengotomatisasi aksi berdasarkan trigger
                    </p>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                    >
                        Buat Rule Pertama
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {rules.map(rule => (
                        <div key={rule.id} className={`bg-white dark:bg-dark-surface rounded-xl border ${rule.is_active ? 'border-gray-200 dark:border-dark-border' : 'border-gray-100 opacity-60'} p-5`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white">{rule.name}</h3>
                                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-xs">
                                            {TRIGGER_TYPES.find(t => t.value === rule.trigger_type)?.label || rule.trigger_type}
                                        </span>
                                        {rule.stop_on_match && (
                                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded text-xs">
                                                Stop on Match
                                            </span>
                                        )}
                                    </div>
                                    {rule.description && (
                                        <p className="text-sm text-gray-500 dark:text-slate-400">{rule.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-xs text-gray-400">
                                            {rule.actions?.length || 0} actions
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {rule.execution_count || 0} executions
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleToggle(rule)} className="p-2">
                                        {rule.is_active ? (
                                            <ToggleRight className="w-6 h-6 text-green-500" />
                                        ) : (
                                            <ToggleLeft className="w-6 h-6 text-gray-400" />
                                        )}
                                    </button>
                                    <button onClick={() => { setEditingRule(rule); setForm({ name: rule.name, description: rule.description || '', trigger_type: rule.trigger_type, trigger_conditions: rule.trigger_conditions || {}, actions: rule.actions || [], priority: rule.priority || 0, stop_on_match: rule.stop_on_match || false }); setModalOpen(true); }} className="p-2 text-gray-400 hover:text-indigo-600">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(rule)} className="p-2 text-gray-400 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingRule ? 'Edit Rule' : 'Workflow Rule Baru'}
                size="md"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Menyimpan...' : (editingRule ? 'Update' : 'Simpan')}</Button>
                    </ModalFooter>
                }
            >
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Nama Rule *</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white" placeholder="e.g., Auto-label pertanyaan produk" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Deskripsi</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white" rows={2} placeholder="Optional description..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Trigger Type</label>
                                <select value={form.trigger_type} onChange={e => setForm({ ...form, trigger_type: e.target.value })} className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white">
                                    {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="stop_on_match" checked={form.stop_on_match} onChange={e => setForm({ ...form, stop_on_match: e.target.checked })} className="w-4 h-4" />
                                <label htmlFor="stop_on_match" className="text-sm text-gray-700 dark:text-slate-300">Stop processing other rules when this matches</label>
                            </div>
                        </form>
            </Modal>
        </div>
    );
}
