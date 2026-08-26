import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

export default function AccountQuickReplies() {
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [newReply, setNewReply] = useState({ shortcut: '', message: '' });

    React.useEffect(() => {
        fetchReplies();
    }, []);

    const fetchReplies = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/quick-replies');
            setReplies(res.data || []);
        } catch (e) {
            console.error('Failed to fetch replies:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newReply.shortcut || !newReply.message) {
            toast.error('Shortcut dan pesan harus diisi');
            return;
        }

        try {
            if (editing) {
                await axios.put(`/api/app/quick-replies/${editing}`, newReply);
                toast.success('Template berhasil diupdate');
            } else {
                await axios.post('/api/app/quick-replies', newReply);
                toast.success('Template berhasil ditambahkan');
            }
            setNewReply({ shortcut: '', message: '' });
            setEditing(null);
            fetchReplies();
        } catch (e) {
            toast.error('Gagal menyimpan template');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus template ini?')) return;
        try {
            await axios.delete(`/api/app/quick-replies/${id}`);
            toast.success('Template dihapus');
            fetchReplies();
        } catch (e) {
            toast.error('Gagal hapus template');
        }
    };

    const handleEdit = (reply) => {
        setEditing(reply.id);
        setNewReply({ shortcut: reply.shortcut, message: reply.message });
    };

    return (
        <div className="p-6">
            <div className="max-w-2xl mx-auto">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Template Balasan Saya</h2>

                {/* Form */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <h3 className="font-medium text-gray-700 mb-3">{editing ? 'Edit Template' : 'Tambah Template Baru'}</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Shortcut</label>
                            <input
                                type="text"
                                value={newReply.shortcut}
                                onChange={(e) => setNewReply({ ...newReply, shortcut: e.target.value })}
                                placeholder="Contoh: /harga"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Pesan</label>
                            <textarea
                                value={newReply.message}
                                onChange={(e) => setNewReply({ ...newReply, message: e.target.value })}
                                placeholder="Isi pesan balasan..."
                                rows={3}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {editing ? 'Update' : 'Simpan'}
                            </button>
                            {editing && (
                                <button
                                    onClick={() => { setEditing(null); setNewReply({ shortcut: '', message: '' }); }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Batal
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Memuat...</div>
                    ) : replies.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">Belum ada template</div>
                    ) : (
                        replies.map((reply) => (
                            <div key={reply.id} className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-sm font-mono mb-2">
                                            {reply.shortcut}
                                        </span>
                                        <p className="text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <button onClick={() => handleEdit(reply)} className="p-1.5 text-gray-400 hover:text-indigo-600">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(reply.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}