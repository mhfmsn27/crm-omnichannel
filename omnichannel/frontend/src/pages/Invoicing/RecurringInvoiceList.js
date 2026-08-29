import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Repeat, Plus, Trash2, Edit, Play, Pause, RefreshCw, 
    Calendar, User, CheckCircle, Clock, AlertCircle 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';

export default function RecurringInvoiceList() {
    const [recurringList, setRecurringList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [form, setForm] = useState({
        title: '',
        contact_id: '',
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        subtotal: 0,
        tax_percentage: 0,
        notes: '',
        items: [{ description: 'Biaya Langganan Bulanan', quantity: 1, unit_price: 150000 }],
        auto_send_whatsapp: true
    });

    useEffect(() => {
        fetchRecurring();
    }, []);

    const fetchRecurring = async () => {
        try {
            const res = await axios.get('/api/app/recurring-invoices');
            setRecurringList(res.data || []);
        } catch (err) {
            toast.error("Gagal memuat jadwal langganan");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (item) => {
        const newStatus = item.status === 'active' ? 'paused' : 'active';
        try {
            await axios.patch(`/api/app/recurring-invoices/${item.id}/toggle`, { status: newStatus });
            toast.success(`Langganan di-${newStatus === 'active' ? 'aktifkan' : 'jeda'}`);
            fetchRecurring();
        } catch (err) {
            toast.error("Gagal mengubah status langganan");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Hapus jadwal langganan ini?")) return;
        try {
            await axios.delete(`/api/app/recurring-invoices/${id}`);
            toast.success("Jadwal langganan berhasil dihapus");
            fetchRecurring();
        } catch (err) {
            toast.error("Gagal menghapus");
        }
    };

    const handleGenerateNow = async (id) => {
        try {
            const res = await axios.post(`/api/app/recurring-invoices/${id}/generate`);
            toast.success(res.data.message || "Faktur berhasil diterbitkan");
            fetchRecurring();
        } catch (err) {
            toast.error("Gagal generate faktur: " + (err.response?.data?.error || err.message));
        }
    };

    const handleItemChange = (idx, field, val) => {
        const updated = [...form.items];
        updated[idx][field] = val;
        setForm({ ...form, items: updated });
    };

    const addItem = () => {
        setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unit_price: 0 }] });
    };

    const removeItem = (idx) => {
        setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
    };

    const handleCreateSubmit = async () => {
        if (!form.title) return toast.error("Judul langganan wajib diisi");
        try {
            await axios.post('/api/app/recurring-invoices', form);
            toast.success("Jadwal langganan berhasil dibuat");
            setIsCreateModalOpen(false);
            fetchRecurring();
        } catch (err) {
            toast.error("Gagal membuat: " + (err.response?.data?.error || err.message));
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val || 0);

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-md">
                            <Repeat className="w-6 h-6" />
                        </div>
                        Faktur Berlangganan (Recurring Billing)
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Otomatisasi penagihan berulang (bulanan/tahunan) dan pengiriman faktur WhatsApp untuk pelanggan tetap.
                    </p>
                </div>
                <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="!bg-indigo-600 hover:!bg-indigo-700 text-white font-bold"
                >
                    Tambah Jadwal Langganan
                </Button>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : recurringList.length === 0 ? (
                <EmptyState
                    title="Belum Ada Jadwal Langganan"
                    description="Buat jadwal faktur berulang otomatis untuk tagihan bulanan, sewa, atau layanan retainer pelanggan Anda."
                    icon="plus"
                    action={{
                        label: 'Tambah Jadwal Langganan',
                        onClick: () => setIsCreateModalOpen(true),
                        icon: Plus
                    }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {recurringList.map(item => (
                        <div 
                            key={item.id} 
                            className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 transition-all ${
                                item.status === 'active' 
                                    ? 'border-indigo-200 dark:border-indigo-800/60 shadow-sm' 
                                    : 'border-gray-200 dark:border-slate-800 opacity-75'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-base">{item.title}</h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                        <User className="w-3 h-3" /> {item.contact_name || 'Pelanggan'} {item.contact_phone ? `(${item.contact_phone})` : ''}
                                    </p>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    item.status === 'active' 
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' 
                                        : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                    {item.status}
                                </span>
                            </div>

                            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 mb-4 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Frekuensi:</span>
                                    <span className="font-bold text-gray-800 dark:text-white uppercase">{item.frequency}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Nominal / Periode:</span>
                                    <span className="font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(item.total_amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Jadwal Terbit Berikutnya:</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {item.next_run_date ? new Date(item.next_run_date).toLocaleDateString('id-ID') : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Total Diterbitkan:</span>
                                    <span className="font-bold text-gray-700 dark:text-slate-300">{item.generated_count || 0} Faktur</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                                <button
                                    onClick={() => handleGenerateNow(item.id)}
                                    className="flex-1 p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                                    title="Terbitkan faktur sekarang tanpa menunggu jadwal"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" /> Terbitkan Faktur
                                </button>
                                <button
                                    onClick={() => handleToggleStatus(item)}
                                    className="p-2 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl text-xs text-gray-600 dark:text-slate-300"
                                    title={item.status === 'active' ? 'Jeda Jadwal' : 'Aktifkan Jadwal'}
                                >
                                    {item.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl text-xs"
                                    title="Hapus"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Tambah Jadwal Faktur Berlangganan"
                size="lg"
                footer={
                    <ModalFooter className="w-full flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} fullWidth className="sm:w-auto">Batal</Button>
                        <Button onClick={handleCreateSubmit} fullWidth className="sm:w-auto !bg-indigo-600 hover:!bg-indigo-700 text-white font-bold">
                            Simpan Jadwal Langganan
                        </Button>
                    </ModalFooter>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Judul Langganan</label>
                        <input 
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700" 
                            placeholder="Contoh: Langganan Internet Bulanan / Retainer Maintenance"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Frekuensi Penagihan</label>
                            <select 
                                className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
                                value={form.frequency}
                                onChange={e => setForm({ ...form, frequency: e.target.value })}
                            >
                                <option value="weekly">Mingguan (Weekly)</option>
                                <option value="monthly">Bulanan (Monthly)</option>
                                <option value="quarterly">3 Bulanan (Quarterly)</option>
                                <option value="yearly">Tahunan (Yearly)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Tanggal Mulai Tagihan Pertama</label>
                            <input 
                                type="date"
                                className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
                                value={form.start_date}
                                onChange={e => setForm({ ...form, start_date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Item List */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">Item & Layanan Tagihan</label>
                            <button type="button" onClick={addItem} className="text-xs font-bold text-indigo-600 flex items-center gap-1">+ Tambah Baris</button>
                        </div>
                        <div className="space-y-2">
                            {form.items.map((it, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input 
                                        className="flex-1 border p-2 rounded-xl text-xs bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
                                        placeholder="Deskripsi layanan"
                                        value={it.description}
                                        onChange={e => handleItemChange(idx, 'description', e.target.value)}
                                    />
                                    <input 
                                        type="number"
                                        className="w-16 border p-2 rounded-xl text-xs text-center bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
                                        placeholder="Qty"
                                        value={it.quantity}
                                        onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                                    />
                                    <input 
                                        type="number"
                                        className="w-32 border p-2 rounded-xl text-xs text-right bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 font-bold"
                                        placeholder="Harga"
                                        value={it.unit_price}
                                        onChange={e => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                    />
                                    {form.items.length > 1 && (
                                        <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-gray-400 hover:text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 bg-indigo-50/70 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={form.auto_send_whatsapp}
                                onChange={e => setForm({ ...form, auto_send_whatsapp: e.target.checked })}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs font-bold text-gray-800 dark:text-white">Otomatis kirim link tagihan via WhatsApp saat terbit</span>
                        </label>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
