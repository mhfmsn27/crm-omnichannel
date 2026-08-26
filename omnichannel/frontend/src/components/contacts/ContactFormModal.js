
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, Plus, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../common/Modal';
import Button from '../common/Button';

const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
];

// Inline custom-field value editor (used inside the contact form)
function CustomFieldInput({ field, value, onChange }) {
    const { field_type, field_label, field_key, is_required, field_options } = field;

    const baseClass = "w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:bg-dark-bg dark:text-white";

    if (field_type === 'textarea') {
        return (
            <textarea
                rows={2}
                required={is_required}
                className={baseClass}
                value={value || ''}
                onChange={e => onChange(field_key, e.target.value)}
            />
        );
    }
    if (field_type === 'checkbox') {
        return (
            <div className="flex items-center gap-2 pt-1">
                <input
                    type="checkbox"
                    id={`cf_${field_key}`}
                    className="w-4 h-4 accent-indigo-600"
                    checked={value === 'true' || value === true}
                    onChange={e => onChange(field_key, e.target.checked ? 'true' : 'false')}
                />
                <label htmlFor={`cf_${field_key}`} className="text-sm text-gray-600 dark:text-gray-300">{field_label}</label>
            </div>
        );
    }
    if (field_type === 'select') {
        const options = Array.isArray(field_options) ? field_options : [];
        return (
            <select
                required={is_required}
                className={baseClass}
                value={value || ''}
                onChange={e => onChange(field_key, e.target.value)}
            >
                <option value="">— Pilih —</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }
    return (
        <input
            type={field_type === 'number' ? 'number' : field_type === 'date' ? 'date' : 'text'}
            required={is_required}
            className={baseClass}
            value={value || ''}
            onChange={e => onChange(field_key, e.target.value)}
        />
    );
}

// ── Custom Field Manager Modal ──────────────────────────────────────────────
function FieldManagerModal({ isOpen, onClose, onSaved }) {
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ field_key: '', field_label: '', field_type: 'text', field_options: '', is_required: false });
    const [editingId, setEditingId] = useState(null);

    const fetchFields = async () => {
        const r = await axios.get('/api/app/contacts/custom-fields');
        setFields(r.data);
    };

    useEffect(() => {
        if (isOpen) fetchFields();
    }, [isOpen]);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...form,
                field_options: form.field_type === 'select'
                    ? form.field_options.split('\n').map(s => s.trim()).filter(Boolean)
                    : null,
            };
            if (editingId) {
                await axios.put(`/api/app/contacts/custom-fields/${editingId}`, payload);
            } else {
                await axios.post('/api/app/contacts/custom-fields', payload);
            }
            setForm({ field_key: '', field_label: '', field_type: 'text', field_options: '', is_required: false });
            setEditingId(null);
            await fetchFields();
            onSaved?.();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal menyimpan field');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (f) => {
        setEditingId(f.id);
        setForm({
            field_key: f.field_key,
            field_label: f.field_label,
            field_type: f.field_type,
            field_options: Array.isArray(f.field_options) ? f.field_options.join('\n') : '',
            is_required: f.is_required,
        });
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus field ini? Semua data nilai yang tersimpan juga akan dihapus.')) return;
        try {
            await axios.delete(`/api/app/contacts/custom-fields/${id}`);
            fetchFields();
            onSaved?.();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal menghapus field');
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-500" />
                    Kelola Custom Field
                </div>
            }
            size="lg"
        >
            <div className="space-y-4">
                    {/* Existing Fields */}
                    {fields.length > 0 && (
                        <div className="space-y-2">
                            {fields.map(f => (
                                <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border dark:border-dark-border">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 dark:text-white">{f.field_label}
                                            {f.is_required && <span className="text-red-500 ml-1">*</span>}
                                        </p>
                                        <p className="text-xs text-gray-400">{f.field_key} · {f.field_type}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(f)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                                        <button onClick={() => handleDelete(f.id)} className="text-xs text-red-500 hover:underline">Hapus</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add/Edit Form */}
                    <form onSubmit={handleSave} className="border dark:border-dark-border rounded-lg p-4 space-y-3 bg-indigo-50/50 dark:bg-dark-bg">
                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                            {editingId ? 'Edit Field' : 'Tambah Field Baru'}
                        </p>
                        {!editingId && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Field Key (auto-generated)</label>
                                <input
                                    type="text" required
                                    placeholder="e.g. industry, budget"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    value={form.field_key}
                                    onChange={e => setForm({ ...form, field_key: e.target.value })}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Label</label>
                            <input
                                type="text" required
                                placeholder="e.g. Industri, Budget"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={form.field_label}
                                onChange={e => setForm({ ...form, field_label: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipe</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    value={form.field_type}
                                    onChange={e => setForm({ ...form, field_type: e.target.value })}
                                >
                                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="flex items-end pb-0.5">
                                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-indigo-600"
                                        checked={form.is_required}
                                        onChange={e => setForm({ ...form, is_required: e.target.checked })}
                                    />
                                    Wajib diisi
                                </label>
                            </div>
                        </div>
                        {form.field_type === 'select' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pilihan (satu per baris)</label>
                                <textarea
                                    rows={3}
                                    placeholder={"Pilihan 1\nPilihan 2\nPilihan 3"}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm dark:bg-dark-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    value={form.field_options}
                                    onChange={e => setForm({ ...form, field_options: e.target.value })}
                                />
                            </div>
                        )}
                        <div className="flex gap-2 justify-end pt-1">
                            {editingId && (
                                <Button type="button" onClick={() => { setEditingId(null); setForm({ field_key: '', field_label: '', field_type: 'text', field_options: '', is_required: false }); }}
                                    variant="ghost" size="sm">
                                    Batal
                                </Button>
                            )}
                            <Button type="submit" disabled={loading} size="sm" leftIcon={<Plus className="w-3 h-3" />}>
                                {editingId ? 'Simpan Perubahan' : 'Tambah Field'}
                            </Button>
                        </div>
                    </form>
            </div>
        </Modal>
    );
}

// ── Main Contact Form Modal ──────────────────────────────────────────────────
export default function ContactFormModal({ isOpen, onClose, onSubmit, initialData, labels }) {
    const [form, setForm] = useState({
        name: '', phone: '', email: '', label_ids: [],
        birth_date: '', country: '', province: '', city: '', postal_code: '', po_box: '', address: '', address_line_2: ''
    });
    const [customFields, setCustomFields] = useState([]);
    const [customValues, setCustomValues] = useState({});
    const [showFieldManager, setShowFieldManager] = useState(false);
    const [savingCustom, setSavingCustom] = useState(false);

    const fetchCustomFields = async () => {
        try {
            const r = await axios.get('/api/app/contacts/custom-fields');
            setCustomFields(r.data);
        } catch {}
    };

    const fetchCustomValues = async (contactId) => {
        try {
            const r = await axios.get(`/api/app/contacts/${contactId}/field-values`);
            const map = {};
            r.data.forEach(f => { map[f.field_key] = f.value; });
            setCustomValues(map);
        } catch {}
    };

    useEffect(() => {
        if (isOpen) {
            fetchCustomFields();
            if (initialData) {
                const rawPhone = String(initialData.phone_number || '');
                const cleanPhone = rawPhone
                    .replace('@s.whatsapp.net', '')
                    .replace('@c.us', '')
                    .replace(/[^0-9]/g, '');

                setForm({
                    name: initialData.name,
                    phone: cleanPhone,
                    email: initialData.email || '',
                    label_ids: initialData.labels?.map(l => l.id) || [],
                    birth_date: initialData.birth_date ? initialData.birth_date.split('T')[0] : '',
                    country: initialData.country || '',
                    province: initialData.province || '',
                    city: initialData.city || '',
                    postal_code: initialData.postal_code || '',
                    po_box: initialData.po_box || '',
                    address: initialData.address || '',
                    address_line_2: initialData.address_line_2 || ''
                });
                fetchCustomValues(initialData.id);
            } else {
                setForm({ name: '', phone: '', email: '', label_ids: [], birth_date: '', country: '', province: '', city: '', postal_code: '', po_box: '', address: '', address_line_2: '' });
                setCustomValues({});
            }
        }
    }, [initialData, isOpen]);

    const handleLabelToggle = (id) => {
        setForm(prev => {
            const ids = prev.label_ids.includes(id)
                ? prev.label_ids.filter(l => l !== id)
                : [...prev.label_ids, id];
            return { ...prev, label_ids: ids };
        });
    };

    const handleCustomValueChange = (field_key, value) => {
        setCustomValues(prev => ({ ...prev, [field_key]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // First save core contact data
        await onSubmit(form, customValues);
    };

    if (!isOpen) return null;

    return (
        <>
            <FieldManagerModal
                isOpen={showFieldManager}
                onClose={() => setShowFieldManager(false)}
                onSaved={fetchCustomFields}
            />

            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={initialData ? 'Edit Contact' : 'Add New Contact'}
                size="2xl"
                footer={
                    <ModalFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" onClick={handleSubmit} leftIcon={<Save className="w-4 h-4" />}>
                            Save Contact
                        </Button>
                    </ModalFooter>
                }
            >
                <form id="contact-form" onSubmit={handleSubmit} className="space-y-4 py-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                                <input
                                    type="text" required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-dark-bg dark:text-white"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WhatsApp Number</label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-500 text-sm font-bold">
                                        +
                                    </span>
                                    <input
                                        type="number" required
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-r-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-dark-bg dark:text-white"
                                        placeholder="6281234567890"
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Format: Country code + Number (e.g., 62812...)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (Optional)</label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-dark-bg dark:text-white"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Labels</label>
                                <div className="flex flex-wrap gap-2">
                                    {labels.map(l => (
                                        <button
                                            key={l.id} type="button"
                                            onClick={() => handleLabelToggle(l.id)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${form.label_ids.includes(l.id)
                                                ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                                                : 'bg-white dark:bg-dark-bg border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                                                }`}
                                        >
                                            {l.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Personal Info */}
                            <div className="border-t border-gray-100 dark:border-dark-border pt-4">
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">Informasi Pribadi</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Tanggal Lahir</label>
                                        <input type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:bg-dark-bg dark:text-white" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Negara</label>
                                        <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:bg-dark-bg dark:text-white" placeholder="Negara" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Provinsi</label>
                                        <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:bg-dark-bg dark:text-white" placeholder="Provinsi" value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Kota</label>
                                        <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:bg-dark-bg dark:text-white" placeholder="Kota" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Kode Pos</label>
                                        <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:bg-dark-bg dark:text-white" placeholder="Kode Pos" value={form.postal_code} onChange={e => setForm({ ...form, postal_code: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">PO Box</label>
                                        <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:bg-dark-bg dark:text-white" placeholder="PO Box" value={form.po_box} onChange={e => setForm({ ...form, po_box: e.target.value })} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Alamat</label>
                                    <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:bg-dark-bg dark:text-white" placeholder="Alamat" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                                </div>
                                <div className="mt-4">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Baris Alamat 2</label>
                                    <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:bg-dark-bg dark:text-white" placeholder="Baris Alamat 2" value={form.address_line_2} onChange={e => setForm({ ...form, address_line_2: e.target.value })} />
                                </div>
                            </div>

                            {/* Custom Fields */}
                            {(customFields.length > 0 || true) && (
                                <div className="border-t border-gray-100 dark:border-dark-border pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Custom Fields</h4>
                                        <button type="button" onClick={() => setShowFieldManager(true)}
                                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                            <Settings className="w-3 h-3" />
                                            Kelola Fields
                                        </button>
                                    </div>
                                    {customFields.length === 0 ? (
                                        <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 dark:border-dark-border rounded-lg">
                                            Belum ada custom field. Klik "Kelola Fields" untuk menambahkan.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            {customFields.map(field => (
                                                <div key={field.id} className={field.field_type === 'textarea' ? 'col-span-2' : ''}>
                                                    {field.field_type !== 'checkbox' && (
                                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                                            {field.field_label}
                                                            {field.is_required && <span className="text-red-500 ml-1">*</span>}
                                                        </label>
                                                    )}
                                                    <CustomFieldInput
                                                        field={field}
                                                        value={customValues[field.field_key]}
                                                        onChange={handleCustomValueChange}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                        </form>
            </Modal>
        </>
    );
}
