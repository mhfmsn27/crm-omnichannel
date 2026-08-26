import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Send, Trash2, Edit2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function BroadcastSchedulePage() {
    const [broadcasts, setBroadcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [show, setShow] = useState(false);
    const [form, setForm] = useState({
        name: '', message: '', scheduled_at: '', channel: 'whatsapp', target_type: 'all'
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/app/broadcasts?status=scheduled');
            setBroadcasts(res.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.message || !form.scheduled_at) {
            return toast.error('Lengkapi form');
        }
        try {
            await axios.post('/api/app/broadcasts', form);
            toast.success('Broadcast dijadwalkan');
            setShow(false);
            fetchData();
        } catch (e) { toast.error(e.response?.data?.error || 'Gagal menyimpan broadcast'); }
    };

    const handleCancel = async (id) => {
        if (!confirm('Batalkan broadcast ini?')) return;
        try {
            await axios.put(`/api/app/broadcasts/${id}/cancel`);
            toast.success('Broadcast dibatalkan');
            fetchData();
        } catch (e) { toast.error(e.response?.data?.error || 'Gagal membatalkan broadcast'); }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                        Schedule Broadcast
                    </h1>
                    <p className="text-sm text-gray-500">Jadwalkan pesan broadcast untuk nanti</p>
                </div>
                <button onClick={() => setShow(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                    + Buat Schedule
                </button>
            </div>

            {show && (
                <div className="bg-white border rounded-xl p-6">
                    <h3 className="font-bold mb-4">Buat Broadcast Schedule</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nama Broadcast</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Promo Bulan Ini" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Pesan</label>
                            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4}
                                className="w-full border rounded-lg px-3 py-2" placeholder="Isi pesan broadcast..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Tanggal & Jam Kirim</label>
                                <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Channel</label>
                                <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="instagram">Instagram</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShow(false)} className="px-4 py-2 border rounded-lg">Batal</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Simpan Schedule</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-3">
                {broadcasts.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Belum ada broadcast terjadwal</p>
                    </div>
                ) : broadcasts.map(b => (
                    <div key={b.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Send className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="font-medium">{b.name}</p>
                                <p className="text-sm text-gray-500">{b.message?.substring(0, 50)}...</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    {new Date(b.scheduled_at).toLocaleString('id-ID')}
                                    <span className="px-1.5 bg-yellow-100 text-yellow-700 rounded text-xs">{b.channel?.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => handleCancel(b.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}