import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FileText, Download, Send, Edit, Search, CheckCircle, XCircle, Smartphone, X, Trash2, QrCode } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '../../components/common/Modal';

const DeviceSelectorModal = ({ isOpen, onClose, devices, onSelect }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Select Sender Device"
            size="md"
        >
            <div className="space-y-2">
                {devices.map(d => (
                    <button
                        key={d.id}
                        onClick={() => onSelect(d.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-lg transition-all text-left group"
                    >
                        <div className="p-2 bg-green-100 text-green-600 rounded-full group-hover:bg-indigo-100 group-hover:text-indigo-600">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-sm">{d.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{d.whatsapp_number}</p>
                        </div>
                    </button>
                ))}
            </div>
        </Modal>
    );
};

export default function InvoiceList() {
    const [invoices, setInvoices] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [documentType, setDocumentType] = useState('invoice');

    // Device Selection State
    const [availableDevices, setAvailableDevices] = useState([]);
    const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
    const [sendType, setSendType] = useState('text');

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
        try {
            const res = await axios.get(`/api/app/invoices?document_type=${documentType}`);
            setInvoices(res.data.invoices || []);
            setStats(res.data.stats || {});
        } catch (err) {
            toast.error("Failed to fetch invoices");
        } finally {
            setLoading(false);
        }
    };

    const handleSendClick = (id) => {
        setSelectedInvoiceId(id);
        setSendType('text');
        if (availableDevices.length === 0) {
            toast.error("No connected WhatsApp device found");
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
            toast.error("No connected WhatsApp device found");
            return;
        }
        if (availableDevices.length === 1) {
            processSend(id, availableDevices[0].id, 'qris');
        } else {
            setIsDeviceModalOpen(true);
        }
    };

    const processSend = async (invoiceId, deviceId, mode) => {
        setIsDeviceModalOpen(false);
        const currentMode = mode || sendType;
        const toastId = toast.loading(currentMode === 'qris' ? "Mengirim QRIS WhatsApp..." : "Sending Invoice...");
        try {
            const endpoint = currentMode === 'qris' 
                ? `/api/app/invoices/${invoiceId}/send-qris`
                : `/api/app/invoices/${invoiceId}/send`;

            await axios.post(endpoint, { device_id: deviceId });
            toast.success(currentMode === 'qris' ? "QRIS berhasil dikirim ke WhatsApp!" : "Sent successfully!", { id: toastId });
            fetchInvoices();
        } catch (e) {
            toast.error("Failed to send: " + (e.response?.data?.error || e.message), { id: toastId });
        }
    };

    const handleDownload = async (id, number) => {
        try {
            const res = await axios.get(`/api/app/invoices/${id}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice-${number}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (e) { toast.error("Download failed"); }
    };

    const handleMarkPaid = async (id) => {
        if (!confirm("Mark this invoice as paid?")) return;
        try {
            await axios.post(`/api/app/invoices/${id}/mark-paid`);
            toast.success("Marked as paid");
            fetchInvoices();
        } catch (e) { toast.error("Failed"); }
    };

    const handleDeleteInvoice = async (id) => {
        if (!confirm("Are you sure you want to delete this invoice? This cannot be undone.")) return;
        try {
            await axios.delete(`/api/app/invoices/${id}`);
            toast.success("Invoice deleted");
            fetchInvoices();
        } catch (e) { toast.error("Failed to delete invoice"); }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto">
            {/* TABS */}
            <div className="flex gap-4 mb-6 border-b">
                <button
                    onClick={() => setDocumentType('invoice')}
                    className={`py-2 px-4 font-bold ${documentType === 'invoice' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                >
                    Invoices
                </button>
                <button
                    onClick={() => setDocumentType('quotation')}
                    className={`py-2 px-4 font-bold ${documentType === 'quotation' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                >
                    Quotations
                </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <p className="text-xs font-bold text-green-600 uppercase">Paid Invoices</p>
                    <p className="text-2xl font-bold text-green-800">{stats.paid_count || 0}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <p className="text-xs font-bold text-red-600 uppercase">Unpaid Invoices</p>
                    <p className="text-2xl font-bold text-red-800">{stats.unpaid_count || 0}</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-600 uppercase">Total Revenue</p>
                    <p className="text-2xl font-bold text-indigo-800">Rp {parseInt(stats.total_revenue || 0).toLocaleString()}</p>
                </div>
            </div>

            <div className="flex justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">{documentType === 'invoice' ? 'Invoices' : 'Quotations'}</h2>
                <div className="flex gap-4">
                    <div className="relative">
                        <input className="border p-2 pl-8 rounded-lg text-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                        <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
                    </div>
                </div>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm min-w-[800px]">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4">Number</th>
                            <th className="p-4">Customer</th>
                            <th className="p-4">Date</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {invoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-gray-50">
                                <td className="p-4 font-mono font-bold text-indigo-600">{inv.invoice_number}</td>
                                <td className="p-4">
                                    <div className="font-bold">{inv.contact_name}</div>
                                    <div className="text-xs text-gray-500">{inv.contact_phone}</div>
                                </td>
                                <td className="p-4 text-gray-500">{new Date(inv.issue_date).toLocaleDateString()}</td>
                                <td className="p-4 text-right font-bold">Rp {parseInt(inv.total_amount).toLocaleString()}</td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {inv.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    {documentType === 'quotation' && (
                                        <button onClick={async () => {
                                            if (!confirm("Convert to Invoice?")) return;
                                            try { await axios.post(`/api/app/invoices/${inv.id}/convert-to-invoice`); toast.success('Converted'); fetchInvoices(); }
                                            catch (e) { toast.error('Failed to convert'); }
                                        }} className="p-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100" title="Convert to Invoice">
                                            <FileText className="w-4 h-4" />
                                        </button>
                                    )}
                                    {inv.status !== 'paid' && documentType === 'invoice' && (
                                        <button onClick={() => handleMarkPaid(inv.id)} className="p-2 text-green-600 bg-green-50 rounded hover:bg-green-100" title="Mark Paid">
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={() => handleSendClick(inv.id)} className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100" title="Send WA">
                                        <Send className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleSendQrisClick(inv.id)} className="p-2 text-purple-600 bg-purple-50 rounded hover:bg-purple-100 transition-colors" title="Kirim QRIS ke WhatsApp">
                                        <QrCode className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDownload(inv.id, inv.invoice_number)} className="p-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200" title="Download PDF">
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteInvoice(inv.id)} className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100" title="Delete Invoice">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {invoices.length === 0 && (
                            <tr>
                                <td colSpan="6" className="p-12 text-center">
                                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">No invoices found matching your criteria.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            <DeviceSelectorModal
                isOpen={isDeviceModalOpen}
                onClose={() => setIsDeviceModalOpen(false)}
                devices={availableDevices}
                onSelect={(deviceId) => processSend(selectedInvoiceId, deviceId)}
            />
        </div>
    );
}