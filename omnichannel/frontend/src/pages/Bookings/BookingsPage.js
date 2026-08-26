import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../../config/api';
import { toast } from 'react-hot-toast';
import { Calendar, Clock, Plus, Search, Trash2, Edit } from 'lucide-react';

export default function BookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form state
    const [form, setForm] = useState({ id: null, contact_id: '', title: '', start_time: '', end_time: '', status: 'pending', notes: '' });
    const [contacts, setContacts] = useState([]);

    const toLocalISOString = (dateObj) => {
        if (!dateObj || isNaN(dateObj)) return '';
        const tzOffset = dateObj.getTimezoneOffset() * 60000; 
        return (new Date(dateObj - tzOffset)).toISOString().slice(0, 16);
    };

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const res = await axios.get(getApiUrl('/api/app/bookings'));
            setBookings(res.data);
            
            // Also fetch contacts for the dropdown
            const contactRes = await axios.get(getApiUrl('/api/app/inbox/contacts?limit=100'));
            if (contactRes.data && contactRes.data.contacts) {
                setContacts(contactRes.data.contacts);
            }
        } catch (e) {
            toast.error('Gagal memuat jadwal booking');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Menyimpan jadwal...');
        try {
            const payload = {
                ...form,
                start_time: new Date(form.start_time).toISOString(),
                end_time: new Date(form.end_time).toISOString()
            };

            if (form.id) {
                await axios.put(getApiUrl(`/api/app/bookings/${form.id}`), payload);
                toast.success('Jadwal diperbarui', { id: toastId });
            } else {
                await axios.post(getApiUrl('/api/app/bookings'), payload);
                toast.success('Jadwal dibuat', { id: toastId });
            }
            setIsModalOpen(false);
            fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal menyimpan', { id: toastId });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus jadwal ini?')) return;
        const toastId = toast.loading('Menghapus...');
        try {
            await axios.delete(getApiUrl(`/api/app/bookings/${id}`));
            toast.success('Dihapus', { id: toastId });
            fetchBookings();
        } catch (e) {
            toast.error('Gagal menghapus', { id: toastId });
        }
    };

    const openEdit = (booking) => {
        setForm({
            id: booking.id,
            contact_id: booking.contact_id,
            title: booking.title,
            start_time: toLocalISOString(new Date(booking.start_time)),
            end_time: toLocalISOString(new Date(booking.end_time)),
            status: booking.status,
            notes: booking.notes || ''
        });
        setIsModalOpen(true);
    };

    const openNew = () => {
        setForm({ id: null, contact_id: '', title: '', start_time: '', end_time: '', status: 'pending', notes: '' });
        setIsModalOpen(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                        Jadwal Reservasi (Bookings)
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Kelola jadwal pertemuan dan otomatis kirim pengingat WhatsApp H-24 dan H-1 jam.</p>
                </div>
                <button 
                    onClick={openNew}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Tambah Jadwal
                </button>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>)}
                </div>
            ) : bookings.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-gray-900 font-medium text-lg">Belum ada jadwal</h3>
                    <p className="text-gray-500 text-sm">Klik tambah jadwal untuk membuat reservasi baru.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {bookings.map(b => (
                        <div key={b.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase rounded-bl-lg border-l border-b ${getStatusColor(b.status)}`}>
                                {b.status}
                            </div>
                            
                            <h3 className="font-bold text-gray-900 text-lg pr-20">{b.title}</h3>
                            <div className="text-sm font-medium text-indigo-600 mb-4">{b.contact_name}</div>
                            
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span>{new Date(b.start_time).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(b)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800">{form.id ? 'Edit Jadwal' : 'Jadwal Baru'}</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Judul / Layanan</label>
                                <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Cth: Meeting Konsultasi VIP" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Pilih Kontak (Klien)</label>
                                <select required value={form.contact_id} onChange={e => setForm({...form, contact_id: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">-- Pilih Klien --</option>
                                    {contacts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.phone_number})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Mulai</label>
                                    <input type="datetime-local" required value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Selesai</label>
                                    <input type="datetime-local" required value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="pending">Menunggu Konfirmasi (Pending)</option>
                                    <option value="confirmed">Dikonfirmasi (Confirmed)</option>
                                    <option value="completed">Selesai (Completed)</option>
                                    <option value="cancelled">Dibatalkan (Cancelled)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Catatan Tambahan</label>
                                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"></textarea>
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Batal</button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium">Simpan Jadwal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
