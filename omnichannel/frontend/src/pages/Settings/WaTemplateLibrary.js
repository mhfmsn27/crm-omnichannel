import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { usePageTitle } from '../../context/HeaderContext';
import { Plus, Edit2, Trash2, X, Check, Search, Copy, Tag, LayoutTemplate, Star } from 'lucide-react';

const CATEGORIES = [
    { value: 'greeting', label: 'Salam & Pembuka' },
    { value: 'closing', label: 'Penutup & Tindak Lanjut' },
    { value: 'product', label: 'Produk & Harga' },
    { value: 'order', label: 'Pesanan & Pembayaran' },
    { value: 'support', label: 'Customer Support' },
    { value: 'promo', label: 'Promosi & Diskon' },
    { value: 'general', label: 'Umum' },
];

export default function WaTemplateLibrary() {
    usePageTitle('WA TEMPLATE LIBRARY');
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [form, setForm] = useState({
        name: '',
        category: '',
        content: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get('/api/app/wa-templates');
            setTemplates(res.data || []);
        } catch (e) {
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({ name: '', category: '', content: '' });
        setErrors({});
        setEditingTemplate(null);
    };

    const openCreate = () => {
        resetForm();
        setModalOpen(true);
    };

    const openEdit = (template) => {
        setEditingTemplate(template);
        setForm({
            name: template.name,
            category: template.category || '',
            content: template.content,
        });
        setErrors({});
        setModalOpen(true);
    };

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = 'Template name is required';
        if (!form.content.trim()) errs.content = 'Content is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                category: form.category || null,
                content: form.content.trim(),
            };
            if (editingTemplate) {
                await axios.put(`/api/app/wa-templates/${editingTemplate.id}`, payload);
                toast.success('Template updated');
            } else {
                await axios.post('/api/app/wa-templates', payload);
                toast.success('Template created');
            }
            setModalOpen(false);
            fetchTemplates();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (template) => {
        if (!confirm(`Delete template "${template.name}"?`)) return;
        try {
            await axios.delete(`/api/app/wa-templates/${template.id}`);
            toast.success('Template deleted');
            fetchTemplates();
        } catch (e) {
            toast.error('Failed to delete');
        }
    };

    const copyToClipboard = (content) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
    };

    const useTemplate = async (template) => {
        try {
            await axios.post(`/api/app/wa-templates/${template.id}/use`);
        } catch (e) {
            console.error('Failed to track template use');
        }
    };

    // Filter templates
    const filteredTemplates = templates.filter(t => {
        const matchSearch = !searchQuery ||
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCategory = !selectedCategory || t.category === selectedCategory;
        return matchSearch && matchCategory;
    });

    const getCategoryLabel = (cat) => CATEGORIES.find(c => c.value === cat)?.label || cat || 'Uncategorized';

    if (loading) return <div className="p-8 text-center text-gray-400">Memuat...</div>;

    return (
        <div className="p-6 md:p-8 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">WhatsApp Template Library</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Kumpulan template pesan untuk quick access agent
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Tambah Template
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>
            </div>

            {filteredTemplates.length === 0 ? (
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LayoutTemplate className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Belum ada Template</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                        {searchQuery || selectedCategory
                            ? 'Tidak ada template yang cocok dengan pencarian'
                            : 'Tambahkan template untuk quick access agent'}
                    </p>
                    <button
                        onClick={openCreate}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                    >
                        Tambah Template Pertama
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredTemplates.map(template => (
                        <div
                            key={template.id}
                            className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white">{template.name}</h3>
                                        {template.category && (
                                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-[10px] font-medium text-gray-500 dark:text-slate-400">
                                                {getCategoryLabel(template.category)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Copy className="w-3 h-3" /> {template.use_count || 0} uses
                                        </span>
                                        {template.created_by_name && (
                                            <span>by {template.created_by_name}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => { copyToClipboard(template.content); useTemplate(template); }}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Copy & Use"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => openEdit(template)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-3">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                    {template.content}
                                </p>
                            </div>
                            {template.variables && template.variables.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {template.variables.map((v, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-[10px] font-mono"
                                        >
                                            {`{{${v}}}`}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingTemplate ? 'Edit Template' : 'Tambah Template Baru'}
                size="md"
                footer={
                    <ModalFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSubmit} disabled={saving} icon={!saving && <Check className="w-4 h-4"/>}>
                            {saving ? 'Menyimpan...' : (editingTemplate ? 'Update' : 'Simpan')}
                        </Button>
                    </ModalFooter>
                }
            >
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                                    Nama Template *
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g., Salam Pagi"
                                    className={`w-full border ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none`}
                                />
                                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                                    Kategori
                                </label>
                                <select
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">Pilih kategori...</option>
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                                    Isi Pesan *
                                </label>
                                <textarea
                                    value={form.content}
                                    onChange={e => setForm({ ...form, content: e.target.value })}
                                    placeholder="Ketik template pesan Anda di sini...&#10;&#10;Gunakan {{nama_variable}} untuk variabel"
                                    rows={8}
                                    className={`w-full border ${errors.content ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none`}
                                />
                                {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Gunakan {'{{nama}}'} untuk variabel yang bisa diganti saat digunakan
                                </p>
                            </div>
                        </form>
            </Modal>
        </div>
    );
}
