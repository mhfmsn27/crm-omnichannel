import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Search, RefreshCw, Brain, BookOpen, Upload, FileSpreadsheet, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';

const DATA_TYPES = [
    { id: 'faq', label: 'FAQ' },
    { id: 'product', label: 'Produk' },
    { id: 'service', label: 'Layanan' },
    { id: 'knowledge', label: 'Knowledge' }
];

function TypeBadge({ type }) {
    const colors = { faq: 'bg-blue-100 text-blue-700', product: 'bg-green-100 text-green-700', service: 'bg-purple-100 text-purple-700', knowledge: 'bg-orange-100 text-orange-700' };
    const t = DATA_TYPES.find(d => d.id === type) || DATA_TYPES[0];
    return <span className={`px-2 py-1 rounded text-xs font-medium ${colors[t.id]}`}>{t.label}</span>;
}

function TrainingCard({ item, onDelete }) {
    return (
        <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
                <TypeBadge type={item.data_type} />
                <div className="flex gap-1">
                    <button onClick={() => onDelete(item)} className="p-1.5 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                </div>
            </div>
            <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{item.question}</h4>
            <p className="text-sm text-gray-600 line-clamp-3">{item.answer}</p>
            {item.keywords?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
                    {item.keywords.slice(0, 3).map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">#{kw}</span>
                    ))}
                    {item.keywords.length > 3 && (
                        <span className="text-xs text-gray-400">+{item.keywords.length - 3}</span>
                    )}
                </div>
            )}
        </div>
    );
}

function AddTrainingModal({ onSave }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ data_type: 'faq', question: '', answer: '', keywords: '' });

    const handleSave = () => {
        if (!form.question || !form.answer) {
            toast.error('Pertanyaan & jawaban harus diisi');
            return;
        }
        onSave({
            ...form,
            keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean)
        });
        setForm({ data_type: 'faq', question: '', answer: '', keywords: '' });
        setOpen(false);
    };

    if (!open) {
        return (
            <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg">
                <Plus className="w-4 h-4" /> Tambah Training
            </button>
        );
    }

    return (
        <Modal
            isOpen={open}
            onClose={() => setOpen(false)}
            title="Tambah Training Data AI"
            size="md"
            footer={
                <ModalFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                    <Button onClick={handleSave}>Simpan</Button>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Tipe Data</label>
                    <select value={form.data_type} onChange={e => setForm({ ...form, data_type: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2">
                        {DATA_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Pertanyaan (Q)</label>
                    <textarea value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
                        rows={2} className="w-full border rounded-lg px-3 py-2" placeholder="Contoh: Harga produk X?" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Jawaban (A)</label>
                    <textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })}
                        rows={4} className="w-full border rounded-lg px-3 py-2" placeholder="Contoh: Harga produk X adalah Rp 100.000" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Keywords (opsional)</label>
                    <input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })}
                        placeholder="produk, harga, promo" className="w-full border rounded-lg px-3 py-2" />
                    <p className="text-xs text-gray-400 mt-1">Pisahkan dengan koma</p>
                </div>
            </div>
        </Modal>
    );
}

export default function ChatbotTrainingPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/chatbot/training', {
                params: { type: typeFilter || undefined }
            });
            setItems(res.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [typeFilter]);

    const handleSave = async (formData) => {
        try {
            await axios.post('/api/app/chatbot/training', formData);
            toast.success('Training ditambahkan');
            fetchData();
        } catch (e) { toast.error('Gagal menyimpan'); }
    };

    const handleDelete = async (item) => {
        if (!confirm('Hapus training ini?')) return;
        try {
            await axios.delete(`/api/app/chatbot/training/${item.id}`);
            toast.success('Dihapus');
            fetchData();
        } catch (e) { toast.error('Gagal hapus'); }
    };

    const filtered = items.filter(i =>
        !search || i.question?.toLowerCase().includes(search.toLowerCase()) || i.answer?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Brain className="w-6 h-6 text-indigo-600" /> AI Chatbot Training
                    </h1>
                    <p className="text-sm text-gray-500">Train chatbot dengan Q&A data</p>
                </div>
                <AddTrainingModal onSave={handleSave} />
            </div>

            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari training..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg" />
                </div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border rounded-lg px-3 py-2">
                    <option value="">Semua Tipe</option>
                    {DATA_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <button onClick={fetchData} className="p-2 border rounded-lg hover:bg-gray-50">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-400">Memuat...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-gray-400">Belum ada training data</p>
                    <p className="text-sm text-gray-400 mt-1">Klik tombol "Tambah Training" untuk mulai</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(item => (
                        <TrainingCard key={item.id} item={item} onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </div>
    );
}