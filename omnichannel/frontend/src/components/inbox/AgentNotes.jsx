import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Check, Trash2, AlertCircle, User } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const NOTE_TYPES = [
    { id: 'general', label: 'General', color: 'gray' },
    { id: 'complaint', label: 'Complaint', color: 'red' },
    { id: 'feedback', label: 'Feedback', color: 'blue' },
    { id: 'action_item', label: 'Action Item', color: 'orange' },
    { id: 'internal', label: 'Internal', color: 'purple' }
];

function NoteTypeBadge({ type }) {
    const t = NOTE_TYPES.find(n => n.id === type) || NOTE_TYPES[0];
    const colors = {
        gray: 'bg-gray-100 text-gray-600',
        red: 'bg-red-100 text-red-600',
        blue: 'bg-blue-100 text-blue-600',
        orange: 'bg-orange-100 text-orange-600',
        purple: 'bg-purple-100 text-purple-600'
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[t.color]}`}>{t.label}</span>;
}

export default function AgentNotes({ conversationId, contactId, isInternal = false }) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ note: '', note_type: 'general' });

    const fetchNotes = async () => {
        if (!conversationId) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/app/notes/${conversationId}`);
            setNotes(res.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchNotes(); }, [conversationId]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.note.trim()) return;
        try {
            await axios.post(`/api/app/notes/${conversationId}`, {
                note: form.note,
                note_type: form.note_type,
                is_internal: isInternal,
                contact_id: contactId
            });
            setForm({ note: '', note_type: 'general' });
            setShowAdd(false);
            toast.success('Catatan ditambahkan');
            fetchNotes();
        } catch (e) { toast.error('Gagal menambah catatan'); }
    };

    const handleResolve = async (noteId) => {
        try {
            await axios.post(`/api/app/notes/${noteId}/resolve`);
            toast.success('Resolved');
            fetchNotes();
        } catch (e) { toast.error('Gagal'); }
    };

    const handleDelete = async (noteId) => {
        if (!confirm('Hapus catatan ini?')) return;
        try {
            await axios.delete(`/api/app/notes/${noteId}`);
            toast.success('Dihapus');
            fetchNotes();
        } catch (e) { toast.error('Gagal hapus');
        }
    };

    if (!conversationId) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" /> Catatan Agent
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{notes.length}</span>
                </h3>
                <button onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg">
                    <Plus className="w-4 h-4" />
                    {showAdd ? 'Batal' : 'Tambah'}
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleAdd} className="bg-gray-50 rounded-lg p-3 space-y-3">
                    <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                        rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Tambahkan catatan..." />
                    <div className="flex items-center justify-between">
                        <select value={form.note_type} onChange={e => setForm({ ...form, note_type: e.target.value })}
                            className="border rounded-lg px-2 py-1 text-sm">
                            {NOTE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={form.is_internal} onChange={e => setForm({ ...form, is_internal: e.target.checked }) />
                                Internal only
                            </label>
                            <button type="submit" disabled={!form.note.trim()}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
                                Simpan
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="text-center py-4 text-gray-400">Memuat...</div>
            ) : notes.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">Belum ada catatan</div>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notes.map(note => (
                        <div key={note.id} className="bg-white border rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <NoteTypeBadge type={note.note_type} />
                                        <span className="text-xs text-gray-400">
                                            {note.created_by_name || 'Agent'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(note.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-800">{note.note}</p>
                                </div>
                                <div className="flex gap-1">
                                    {!note.is_resolved && (
                                        <button onClick={() => handleResolve(note.id)}
                                            className="p-1 hover:bg-green-50 rounded text-green-600" title="Mark resolved">
                                            <Check className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(note.id)}
                                        className="p-1 hover:bg-red-50 rounded text-red-400">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {note.is_resolved && (
                                <div className="text-xs text-green-600 mt-1">Resolved by {note.resolved_by_name}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}