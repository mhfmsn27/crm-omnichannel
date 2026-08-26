import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { usePageTitle } from '../../context/HeaderContext';
import { Plus, Edit2, Trash2, GripVertical, X, Check, ChevronDown, Info } from 'lucide-react';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';

const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox (Yes/No)' },
    { value: 'textarea', label: 'Text Area' },
];

export default function CustomFieldsSettings() {
    usePageTitle('CUSTOM FIELDS');
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [form, setForm] = useState({
        field_key: '',
        field_label: '',
        field_type: 'text',
        field_options: '',
        is_required: false,
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchFields();
    }, []);

    const fetchFields = async () => {
        try {
            const res = await axios.get('/api/app/contacts/custom-fields');
            setFields(res.data || []);
        } catch (e) {
            toast.error('Failed to load custom fields');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({
            field_key: '',
            field_label: '',
            field_type: 'text',
            field_options: '',
            is_required: false,
        });
        setErrors({});
        setEditingField(null);
    };

    const openCreate = () => {
        resetForm();
        setModalOpen(true);
    };

    const openEdit = (field) => {
        setEditingField(field);
        setForm({
            field_key: field.field_key,
            field_label: field.field_label,
            field_type: field.field_type,
            field_options: Array.isArray(field.field_options) ? field.field_options.join(', ') : '',
            is_required: field.is_required || false,
        });
        setErrors({});
        setModalOpen(true);
    };

    const validate = () => {
        const errs = {};
        if (!form.field_key.trim()) errs.field_key = 'Field key is required';
        else if (!/^[a-z][a-z0-9_]*$/.test(form.field_key.trim())) {
            errs.field_key = 'Key must start with letter, lowercase, alphanumeric + underscore only';
        }
        if (!form.field_label.trim()) errs.field_label = 'Label is required';
        if (form.field_type === 'dropdown' && !form.field_options.trim()) {
            errs.field_options = 'Options required for dropdown';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                field_key: form.field_key.trim().toLowerCase().replace(/\s+/g, '_'),
                field_label: form.field_label.trim(),
                field_type: form.field_type,
                field_options: form.field_type === 'dropdown'
                    ? form.field_options.split(',').map(o => o.trim()).filter(Boolean)
                    : null,
                is_required: form.is_required,
            };
            if (editingField) {
                await axios.put(`/api/app/contacts/custom-fields/${editingField.id}`, payload);
                toast.success('Field updated');
            } else {
                await axios.post('/api/app/contacts/custom-fields', payload);
                toast.success('Field created');
            }
            setModalOpen(false);
            fetchFields();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (field) => {
        if (!confirm(`Delete field "${field.field_label}"? All values for this field will be deleted.`)) return;
        try {
            await axios.delete(`/api/app/contacts/custom-fields/${field.id}`);
            toast.success('Field deleted');
            fetchFields();
        } catch (e) {
            toast.error('Failed to delete');
        }
    };

    const handleReorder = async (fieldId, direction) => {
        const idx = fields.findIndex(f => f.id === fieldId);
        if (idx === -1) return;
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= fields.length) return;

        const newFields = [...fields];
        [newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[idx]];
        setFields(newFields);

        const order = newFields.map((f, i) => ({ id: f.id, position: i }));
        try {
            await axios.put('/api/app/contacts/custom-fields/reorder', { order });
        } catch (e) {
            toast.error('Failed to reorder');
            fetchFields();
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Memuat...</div>;

    return (
        <div className="p-6 md:p-8 max-w-3xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Custom Fields</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Tambah kolom tambahan untuk profil kontak Anda
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Tambah Field
                </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p><strong>Custom Fields</strong> adalah kolom tambahan yang bisa Anda tambahkan ke profil kontak.</p>
                    <p className="mt-1">Field akan muncul di panel info kontak dan bisa diedit langsung dari percakapan.</p>
                </div>
            </div>

            {fields.length === 0 ? (
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">📋</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Belum ada Custom Fields</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                        Tambahkan field kustom untuk menyimpan informasi tambahan tentang kontak Anda
                    </p>
                    <button
                        onClick={openCreate}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                    >
                        Tambah Field Pertama
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Order</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Label</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Key</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Required</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fields.map((field, idx) => (
                                <tr key={field.id} className="border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleReorder(field.id, 'up')}
                                                disabled={idx === 0}
                                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-4 h-4 rotate-180" />
                                            </button>
                                            <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                                            <button
                                                onClick={() => handleReorder(field.id, 'down')}
                                                disabled={idx === fields.length - 1}
                                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{field.field_label}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <code className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-gray-600 dark:text-slate-400">
                                            {field.field_key}
                                        </code>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-gray-600 dark:text-slate-400">
                                            {FIELD_TYPES.find(t => t.value === field.field_type)?.label || field.field_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {field.is_required ? (
                                            <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">Required</span>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEdit(field)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(field)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingField ? 'Edit Field' : 'Tambah Field Baru'}
                size="md"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSubmit} disabled={saving} icon={!saving && <Check className="w-4 h-4"/>}>
                            {saving ? 'Menyimpan...' : (editingField ? 'Update' : 'Simpan')}
                        </Button>
                    </ModalFooter>
                }
            >
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                                    Field Label *
                                </label>
                                <input
                                    type="text"
                                    value={form.field_label}
                                    onChange={e => setForm({ ...form, field_label: e.target.value })}
                                    placeholder="e.g., Company Name"
                                    className={`w-full border ${errors.field_label ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none`}
                                />
                                {errors.field_label && <p className="text-xs text-red-500 mt-1">{errors.field_label}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                                    Field Key *
                                </label>
                                <input
                                    type="text"
                                    value={form.field_key}
                                    onChange={e => setForm({ ...form, field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                    placeholder="e.g., company_name"
                                    className={`w-full border ${errors.field_key ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono`}
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Lowercase, letters, numbers, underscore only</p>
                                {errors.field_key && <p className="text-xs text-red-500 mt-1">{errors.field_key}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                                    Field Type
                                </label>
                                <select
                                    value={form.field_type}
                                    onChange={e => setForm({ ...form, field_type: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {FIELD_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            {form.field_type === 'dropdown' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                                        Dropdown Options *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.field_options}
                                        onChange={e => setForm({ ...form, field_options: e.target.value })}
                                        placeholder="Option 1, Option 2, Option 3"
                                        className={`w-full border ${errors.field_options ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none`}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Comma-separated values</p>
                                    {errors.field_options && <p className="text-xs text-red-500 mt-1">{errors.field_options}</p>}
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_required"
                                    checked={form.is_required}
                                    onChange={e => setForm({ ...form, is_required: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="is_required" className="text-sm text-gray-700 dark:text-slate-300">
                                    Wajib diisi (required)
                                </label>
                            </div>

                        </form>
            </Modal>
        </div>
    );
}
