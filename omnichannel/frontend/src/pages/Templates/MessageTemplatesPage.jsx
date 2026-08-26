import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, ExternalLink } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const TEMPLATE_TYPES = [
    { id: 'product_card', label: 'Product Card', icon: 'package' },
    { id: 'cta_button', label: 'CTA Button', icon: 'mouse-pointer-click' },
    { id: 'gallery', label: 'Image Gallery', icon: 'images' },
    { id: 'rich_link', label: 'Rich Link', icon: 'link' }
];

function TemplateCard({ template, onDelete }) {
    return (
        <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                    {TEMPLATE_TYPES.find(t => t.id === template.template_type)?.label}
                </span>
                <button onClick={() => onDelete(template)} className="p-1 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4 text-red-400" />
                </button>
            </div>
            {template.image_url && (
                <img src={template.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
            )}
            <h4 className="font-medium text-gray-900">{template.title}</h4>
            {template.description && <p className="text-sm text-gray-500 line-clamp-2 mt-1">{template.description}</p>}
            {template.cta_text && (
                <a href={template.cta_url} target="_blank" rel="noopener"
                    className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg">
                    <ExternalLink className="w-3 h-3" /> {template.cta_text}
                </a>
            )}
        </div>
    );
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [show, setShow] = useState(false);
    const [form, setForm] = useState({
        name: '', template_type: 'product_card', title: '', description: '', image_url: '', cta_text: '', cta_url: ''
    });

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/templates');
            setTemplates(res.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchTemplates(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name) return toast.error('Nama template wajib diisi');

        try {
            await axios.post('/api/app/templates', form);
            toast.success('Template ditambahkan');
            setShow(false);
            fetchTemplates();
        } catch (e) {
            toast.error('Gagal menyimpan');
        }
    };

    const handleDelete = async (template) => {
        if (!confirm(`Hapus template "${template.name}?`)) return;
        try {
            await axios.delete(`/api/app/templates/${template.id}`);
            toast.success('Dihapus');
            fetchTemplates();
        } catch (e) { toast.error('Gagal hapus');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-indigo-600" /> Message Templates
                    </h1>
                    <p className="text-sm text-gray-500">CTA Buttons, Product Cards, Rich Links</p>
                </div>
                <button onClick={() => setShow(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg">
                    <Plus className="w-4 h-4" /> Tambah Template
                </button>
            </div>

            {show && (
                <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6">
                    <h3 className="font-bold mb-4">Template Baru</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nama Template</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tipe</label>
                            <select value={form.template_type} onChange={e => setForm({ ...form, template_type: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2">
                                {TEMPLATE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Judul</label>
                            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Deskripsi</label>
                            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                rows={2} className="w-full border rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Image URL</label>
                            <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })}
                                placeholder="https://..." className="w-full border rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">CTA Button</label>
                            <input value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })}
                                placeholder="Beli Sekarang" className="w-full border rounded-lg px-3 py-2" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setShow(false)} className="px-4 py-2 border rounded-lg">Batal</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Simpan</button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="text-center py-12 text-gray-400">Memuat...</div>
            ) : templates.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada template</p>
                    <button onClick={() => setShow(true)} className="mt-2 text-indigo-600">Buat pertama</button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {templates.map(t => (
                        <TemplateCard key={t.id} template={t} onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </div>
    );
}