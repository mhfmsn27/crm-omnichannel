import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { 
    FileText, Download, Send, Edit, Search, CheckCircle, XCircle, 
    Smartphone, X, Trash2, QrCode, ArrowRight, DollarSign, 
    Bell, RefreshCw, Layers, ShieldCheck, CheckCircle2, Clock 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';

const DeviceSelectorModal = ({ isOpen, onClose, devices, onSelect }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Pilih Perangkat WhatsApp Pengirim"
            size="md"
        >
            <div className="space-y-2">
                {devices.map(d => (
                    <button
                        key={d.id}
                        onClick={() => onSelect(d.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 border border-gray-200 dark:border-slate-700 hover:border-indigo-200 rounded-xl transition-all text-left group"
                    >
                        <div className="p-2 bg-green-100 text-green-600 rounded-full group-hover:bg-indigo-100 group-hover:text-indigo-600">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white text-sm">{d.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{d.whatsapp_number}</p>
                        </div>
                    </button>
                ))}
            </div>
        </Modal>
    );
};

// Modal for Recording Partial Payments / DP
const RecordPartialPaymentModal = ({ isOpen, onClose, invoice, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (invoice) {
            setAmount(invoice.balance_due || invoice.total_amount || '');
            setPaymentMethod('bank_transfer');
            setReference('');
            setNotes('');
        }
    }, [invoice]);

    if (!isOpen || !invoice) return null;

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val || 0);

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) return toast.error("Masukkan nominal pembayaran yang valid");
        setSubmitting(true);
        try {
            await axios.post(`/api/app/invoices/${invoice.id}/partial-payment`, {
                amount: parseFloat(amount),
                payment_method: paymentMethod,
                payment_reference: reference,
                notes
            });
            toast.success("Pembayaran berhasil dicatat");
            onSuccess();
            onClose();
        } catch (err) {
            toast.error("Gagal mencatat: " + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={`Catat Pembayaran / DP — ${invoice.invoice_number}`}
            size="md"
            footer={
                <ModalFooter className="w-full flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                    <Button variant="outline" onClick={onClose} fullWidth className="sm:w-auto">Batal</Button>
                    <Button onClick={handleSubmit} disabled={submitting} fullWidth className="sm:w-auto !bg-emerald-600 hover:!bg-emerald-700 text-white font-bold">
                        {submitting ? 'Menyimpan...' : 'Simpan Pembayaran'}
                    </Button>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Total Nilai Faktur:</span>
                        <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(invoice.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Sudah Terbayar:</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(invoice.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 border-gray-200 dark:border-slate-700">
                        <span className="text-gray-500 font-bold">Sisa Tagihan (Balance Due):</span>
                        <span className="font-black text-rose-600">{formatCurrency(invoice.balance_due || invoice.total_amount)}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Nominal Pembayaran (Rp)</label>
                    <input
                        type="number"
                        className="w-full border p-2.5 rounded-xl text-sm font-black text-indigo-600 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                        placeholder="Contoh: 500000"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Metode</label>
                        <select
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                            value={paymentMethod}
                            onChange={e => setPaymentMethod(e.target.value)}
                        >
                            <option value="bank_transfer">Transfer Bank</option>
                            <option value="qris">QRIS / E-Wallet</option>
                            <option value="cash">Tunai / Cash</option>
                            <option value="gateway">Payment Gateway</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">No. Referensi / Bukti</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                            placeholder="TRX-123456"
                            value={reference}
                            onChange={e => setReference(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Catatan</label>
                    <input
                        className="w-full border p-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                        placeholder="Contoh: Pembayaran DP 50% tahap 1"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default function InvoiceList() {
    const [invoices, setInvoices] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [documentType, setDocumentType] = useState('all'); // 'all', 'invoice', 'quotation'

    // Device Selection State
    const [availableDevices, setAvailableDevices] = useState([]);
    const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
    const [sendType, setSendType] = useState('text');

    // Partial Payment State
    const [isPartialModalOpen, setIsPartialModalOpen] = useState(false);
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchInvoices();
        fetchDevices();
    }, [documentType]);

    const fetchDevices = async () => {
        try {
            const res = await axios.get('/api/app/devices');
            const connected = res.data.filter(d => d.status === 'connected');
            setAvailableDevices(connected);
        } catch (e) {
            console.error("Failed to fetch devices", e);
        }
    };

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/app/invoices?document_type=${documentType}`);
            setInvoices(res.data.data || res.data.invoices || []);
            setStats(res.data.stats || {});
        } catch (err) {
            toast.error("Gagal memuat daftar faktur");
        } finally {
            setLoading(false);
        }
    };

    const handleSendClick = (id) => {
        setSelectedInvoiceId(id);
        setSendType('text');
        if (availableDevices.length === 0) {
            toast.error("Tidak ada perangkat WhatsApp yang terhubung.");
            return;
        }
        if (availableDevices.length === 1) {
            processSend(id, availableDevices[0].id, 'text');
        } else {
            setIsDeviceModalOpen(true);
        }
    };

    const handleSendQrisClick = (id) => {
        setSelectedInvoiceId(id);
        setSendType('qris');
        if (availableDevices.length === 0) {
            toast.error("Tidak ada perangkat WhatsApp yang terhubung.");
            return;
        }
        if (availableDevices.length === 1) {
            processSend(id, availableDevices[0].id, 'qris');
        } else {
            setIsDeviceModalOpen(true);
        }
    };

    const processSend = async (invoiceId, deviceId, type) => {
        try {
            const endpoint = type === 'qris' ? `/api/app/invoices/${invoiceId}/send-qris` : `/api/app/invoices/${invoiceId}/send`;
            await axios.post(endpoint, { session_id: deviceId });
            toast.success(type === 'qris' ? "QRIS berhasil dikirim ke WhatsApp" : "Faktur berhasil dikirim ke WhatsApp");
            setIsDeviceModalOpen(false);
            fetchInvoices();
        } catch (err) {
            toast.error("Gagal mengirim: " + (err.response?.data?.error || err.message));
        }
    };

    const handleSendDunningReminder = async (id) => {
        try {
            await axios.post(`/api/app/invoices/${id}/send-reminder`);
            toast.success("Pengingat tagihan WA berhasil dikirim");
            fetchInvoices();
        } catch (err) {
            toast.error("Gagal kirim pengingat: " + (err.response?.data?.error || err.message));
        }
    };

    const handleConvertToInvoice = async (id) => {
        try {
            await axios.post(`/api/app/invoices/${id}/convert-to-invoice`);
            toast.success("Surat Penawaran berhasil dikonversi ke Faktur Penjualan!");
            fetchInvoices();
        } catch (err) {
            toast.error("Gagal konversi: " + (err.response?.data?.error || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Hapus faktur ini?")) return;
        try {
            await axios.delete(`/api/app/invoices/${id}`);
            toast.success("Faktur dihapus");
            fetchInvoices();
        } catch (err) {
            toast.error("Gagal menghapus");
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val || 0);

    const filteredInvoices = invoices.filter(inv => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            (inv.invoice_number || '').toLowerCase().includes(s) ||
            (inv.contact_name || '').toLowerCase().includes(s) ||
            (inv.contact_phone || '').includes(s)
        );
    });

    const getStatusBadge = (inv) => {
        if (inv.document_type === 'quotation') {
            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">SPO / Penawaran</span>;
        }
        if (inv.status === 'paid') {
            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Lunas</span>;
        }
        if (inv.status === 'partially_paid') {
            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">DP / Sebagian</span>;
        }
        if (inv.status === 'overdue') {
            return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">Jatuh Tempo</span>;
        }
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">Belum Bayar</span>;
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header & Tabs */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-md">
                            <FileText className="w-6 h-6" />
                        </div>
                        Faktur Penjualan & Penawaran (SPO)
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Kelola faktur, surat penawaran harga, pembayaran bertahap (DP), dan penagihan otomatis via WhatsApp.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={() => navigate('/invoicing/create')}
                        className="!bg-indigo-600 hover:!bg-indigo-700 text-white font-bold shadow-md"
                    >
                        + Buat Faktur / SPO
                    </Button>
                </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-200 dark:border-slate-800">
                <div className="flex gap-1.5">
                    <button
                        onClick={() => setDocumentType('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            documentType === 'all'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        Semua Dokumen
                    </button>
                    <button
                        onClick={() => setDocumentType('invoice')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            documentType === 'invoice'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        Faktur Penjualan
                    </button>
                    <button
                        onClick={() => setDocumentType('quotation')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            documentType === 'quotation'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        Surat Penawaran (Quotation)
                    </button>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        className="w-full pl-9 pr-3 py-1.5 border rounded-xl text-xs bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Cari nomor faktur / kontak..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* List / Table */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : filteredInvoices.length === 0 ? (
                <EmptyState
                    title="Belum Ada Dokumen"
                    description="Buat faktur penjualan atau surat penawaran harga pertama Anda untuk dikirimkan ke pelanggan via WhatsApp."
                    icon="plus"
                    action={{
                        label: 'Buat Faktur Baru',
                        onClick: () => navigate('/invoicing/create'),
                        icon: FileText
                    }}
                />
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 uppercase font-black text-[10px] tracking-wider border-b border-gray-100 dark:border-slate-800">
                                <tr>
                                    <th className="p-4">No. Dokumen</th>
                                    <th className="p-4">Pelanggan</th>
                                    <th className="p-4">Tanggal / Jatuh Tempo</th>
                                    <th className="p-4">Total Nilai</th>
                                    <th className="p-4">Status & Sisa</th>
                                    <th className="p-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {filteredInvoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="p-4 font-black text-gray-900 dark:text-white">
                                            {inv.invoice_number}
                                            {inv.is_recurring && (
                                                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 text-[9px] font-bold">
                                                    Recurring
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800 dark:text-gray-200">{inv.contact_name || 'Tanpa Nama'}</div>
                                            <div className="text-[11px] text-gray-400 font-mono">{inv.contact_phone || '-'}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-gray-700 dark:text-slate-300">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('id-ID') : '-'}</div>
                                            <div className="text-[10px] text-gray-400">Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '-'}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-black text-indigo-600 dark:text-indigo-400 text-sm">{formatCurrency(inv.total_amount)}</div>
                                            {inv.payment_type === 'partial' && (
                                                <div className="text-[10px] text-amber-600 font-bold">Min DP: {formatCurrency(inv.down_payment_amount)}</div>
                                            )}
                                        </td>
                                        <td className="p-4 space-y-1">
                                            <div>{getStatusBadge(inv)}</div>
                                            {inv.status !== 'paid' && inv.balance_due > 0 && (
                                                <div className="text-[11px] text-gray-500">
                                                    Sisa: <span className="font-bold text-rose-600">{formatCurrency(inv.balance_due)}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {inv.document_type === 'quotation' ? (
                                                    <button
                                                        onClick={() => handleConvertToInvoice(inv.id)}
                                                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all"
                                                        title="Konversi ke Faktur Penjualan"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Konversi ke Faktur
                                                    </button>
                                                ) : (
                                                    inv.status !== 'paid' && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedInvoiceForPayment(inv);
                                                                    setIsPartialModalOpen(true);
                                                                }}
                                                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-lg font-bold text-[11px] flex items-center gap-1"
                                                                title="Catat Pembayaran DP / Sebagian"
                                                            >
                                                                <DollarSign className="w-3.5 h-3.5" /> Catat Bayar
                                                            </button>
                                                            <button
                                                                onClick={() => handleSendDunningReminder(inv.id)}
                                                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                title="Kirim Pengingat Tagihan WhatsApp"
                                                            >
                                                                <Bell className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )
                                                )}

                                                <button
                                                    onClick={() => handleSendClick(inv.id)}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Kirim ke WhatsApp"
                                                >
                                                    <Send className="w-3.5 h-3.5" />
                                                </button>

                                                <button
                                                    onClick={() => handleSendQrisClick(inv.id)}
                                                    className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                    title="Kirim QRIS ke WhatsApp"
                                                >
                                                    <QrCode className="w-3.5 h-3.5" />
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(inv.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            <DeviceSelectorModal
                isOpen={isDeviceModalOpen}
                onClose={() => setIsDeviceModalOpen(false)}
                devices={availableDevices}
                onSelect={(deviceId) => processSend(selectedInvoiceId, deviceId, sendType)}
            />

            <RecordPartialPaymentModal
                isOpen={isPartialModalOpen}
                onClose={() => {
                    setIsPartialModalOpen(false);
                    setSelectedInvoiceForPayment(null);
                }}
                invoice={selectedInvoiceForPayment}
                onSuccess={fetchInvoices}
            />
        </div>
    );
}