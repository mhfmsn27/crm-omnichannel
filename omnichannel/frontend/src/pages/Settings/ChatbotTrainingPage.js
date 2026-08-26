import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Brain, Plus, Trash2, Edit2, Upload, Download, Search, Filter,
    MessageSquare, Package, HelpCircle, BookOpen, Sparkles, Check, X, AlertCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal, { ModalFooter } from '../components/common/Modal';
import Button from '../components/common/Button';

const DATA_TYPES = [
    { value: 'product', label: 'Produk', icon: Package, color: 'blue' },
    { value: 'faq', label: 'FAQ', icon: HelpCircle, color: 'green' },
    { value: 'service', label: 'Layanan', icon: Sparkles, color: 'purple' },
    { value: 'knowledge', label: 'Pengetahuan', icon: BookOpen, color: 'orange' }
];

function TrainingCard({ item, onEdit, onDelete }) {
    const type = DATA_TYPES.find(t => t.value === item.data_type) || DATA_TYPES[0];

    return (
        <div className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-4 group">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        type.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                        type.color === 'green' ? 'bg-green-100 text-green-600' :
                        type.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                        'bg-orange-100 text-orange-600'
                    }`}>
                        <type.icon className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-xs font-medium text-gray-500">{type.label}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(item)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button onClick={() => onDelete(item)} className="p-1.5 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                </div>
            </div>
            <div className="mb-2">
                <p className="font-medium text-gray-900 text-sm">{item.question || item.keyword || 'Q&A Item'}</p>
            </div>
            <p className="text-sm text-gray-500 line-clamp-2">{item.answer}</p>
            <div className="mt-3 flex items-center gap-2">
                {item.keywords?.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">{kw}</span>
                ))}
            </div>
        </div>
    );
}

function AddEditModal({ item, onSave, onClose }) {
    const [form, setForm] = useState({
        data_type: item?.data_type || 'faq',
        question: item?.question || '',
        answer: item?.answer || '',
        keywords: item?.keywords?.join(', ') || '',
        category: item?.category || ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const keywords = form.keywords.split(',').map(k => k.trim()).filter(Boolean);
        onSave({ ...form, keywords });
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={item ? 'Edit Training Data' : 'Tambah Data Training'}
            size="md"
            footer={
                <ModalFooter>
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit}>Simpan</Button>
                </ModalFooter>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Data</label>
                    <select value={form.data_type} onChange={e => setForm({ ...form, data_type: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2">
                        {DATA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pertanyaan / Keyword</label>
                    <input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2" placeholder="Contoh: Cara pesan produk ABC" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jawaban / Response</label>
                    <textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} rows={4}
                        className="w-full border rounded-lg px-3 py-2 resize-none" placeholder="Jawaban yang akan diberikan AI..." />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (koma untuk pisahkan)</label>
                    <input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2" placeholder="produk, harga, order" />
                </div>
            </form>
        </Modal>
    );
}

export default function ChatbotTrainingPage() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [filter, setFilter] = useState({ type: '', search: '' });
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [stats, setStats] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [dataRes, statsRes] = await Promise.all([
                axios.get('/api/app/chatbot/training', { params: filter }),
                axios.get('/api/app/chatbot/training/stats')
            ]);
            setItems(dataRes.data);
            setStats(statsRes.data);
        } catch (e) {
            toast.error('Gagal memuat data training');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async (data) => {
        try {
            if (editing?.id) {
                await axios.put(`/api/app/chatbot/training/${editing.id}`, data);
                toast.success('Training data diperbarui');
            } else {
                await axios.post('/api/app/chatbot/training', data);
                toast.success('Training data ditambahkan');
            }
            setShowModal(false);
            setEditing(null);
            fetchData();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Gagal menyimpan');
        }
    };

    const handleDelete = async (item) => {
        if (!confirm('Hapus data training ini?')) return;
        try {
            await axios.delete(`/api/app/chatbot/training/${item.id}`);
            toast.success('Dihapus');
            fetchData();
        } catch { toast.error('Gagal menghapus'); }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2"><Brain className="w-6 h-6 text-indigo-600" /> AI Chatbot Training</h1>
                    <p className="text-sm text-gray-500 mt-1">Train chatbot dengan Q&A, produk, dan knowledge base</p>
                </div>
                <button onClick={() => { setEditing(null); setShowModal(true); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Tambah Data
                </button>
            </div>

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border p-4">
                        <p className="text-2xl font-bold text-indigo-600">{stats.total || 0}</p>
                        <p className="text-sm text-gray-500">Total Data</p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                        <p className="text-2xl font-bold text-blue-600">{stats.products || 0}</p>
                        <p className="text-sm text-gray-500">Produk</p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                        <p className="text-2xl font-bold text-green-600">{stats.fags || 0}</p>
                        <p className="text-sm text-gray-500">FAQ</p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                        <p className="text-2xl font-bold text-purple-600">{stats.services || 0}</p>
                        <p className="text-sm text-gray-500">Layanan</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border p-4">
                <div className="flex gap-4 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input placeholder="Cari training data..." value={filter.search}
                            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg" />
                    </div>
                    <select value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
                        className="border rounded-lg px-3 py-2">
                        <option value="">Semua Tipe</option>
                        {DATA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">Memuat...</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12">
                        <Brain className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400">Belum ada data training. Tambahkan Q&A, produk, atau knowledge base untuk melatih AI chatbot.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map(item => (
                            <TrainingCard key={item.id} item={item} onEdit={setEditing} onDelete={handleDelete} />
                        ))}
                    </div>
                )}
            </div>

            {showModal && <AddEditModal item={editing} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null); }} />}
        </div>
    );
}