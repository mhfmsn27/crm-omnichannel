import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, Download, Search, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../../config/api';

export default function InvoiceHistory() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            // Using the new endpoint we created
            const res = await axios.get('/api/app/billing/history');
            setInvoices(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id, number) => {
        try {
            // Use the specific transaction download endpoint
            const res = await axios.get(`/api/app/billing/history/${id}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice-${number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) { 
            console.error(e);
            toast.error("Download failed"); 
        }
    };

    const handlePay = (invoice) => {
        if (!invoice) return;

        // Check if it's an automated payment (Doku/Tripay) with a proof URL (payment link)
        if (invoice.payment_proof_url && invoice.payment_proof_url.startsWith('http')) {
            window.open(invoice.payment_proof_url, '_blank');
        } else {
            // Assume Manual Bank Transfer - Redirect to Confirm Page
            const bankDetails = {
                bank: invoice.bank_name || 'Manual Transfer',
                number: invoice.bank_number || '-',
                holder: invoice.bank_holder || '-'
            };

            const breakdown = {
                subtotal: invoice.subtotal,
                tax: invoice.tax,
                admin_fee: invoice.admin_fee,
                unique_code: invoice.unique_code
            };

            navigate('/billing/confirm', { 
                state: { 
                    transaction_id: invoice.id, 
                    amount: invoice.amount,
                    bank_details: bankDetails,
                    breakdown: breakdown
                } 
            });
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            success: 'bg-green-100 text-green-700 border-green-200',
            pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            pending_confirmation: 'bg-orange-100 text-orange-700 border-orange-200',
            failed: 'bg-red-100 text-red-700 border-red-200',
        };
        const labels = {
            success: 'PAID',
            pending: 'UNPAID',
            pending_confirmation: 'CHECKING',
            failed: 'FAILED'
        };
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const filteredInvoices = invoices.filter(inv => 
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        inv.item_name?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center">Loading History...</div>;

    return (
        <div className="p-4 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <p className="text-xs font-bold text-green-600 uppercase">Paid Invoices</p>
                    <p className="text-2xl font-bold text-green-800">{invoices.filter(i => i.status === 'success').length}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <p className="text-xs font-bold text-red-600 uppercase">Unpaid Invoices</p>
                    <p className="text-2xl font-bold text-red-800">{invoices.filter(i => i.status === 'pending').length}</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-600 uppercase">Total Transactions</p>
                    <p className="text-2xl font-bold text-indigo-800">{invoices.length}</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-800">Riwayat Transaksi</h2>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Cari Invoice ID..." 
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hidden md:block">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-bold text-gray-500 uppercase text-xs">Invoice ID</th>
                            <th className="px-6 py-3 font-bold text-gray-500 uppercase text-xs">Tanggal</th>
                            <th className="px-6 py-3 font-bold text-gray-500 uppercase text-xs">Item</th>
                            <th className="px-6 py-3 font-bold text-gray-500 uppercase text-xs">Jumlah</th>
                            <th className="px-6 py-3 font-bold text-gray-500 uppercase text-xs text-center">Status</th>
                            <th className="px-6 py-3 font-bold text-gray-500 uppercase text-xs text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredInvoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-mono font-medium text-indigo-600">
                                    {inv.invoice_number}
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    {format(new Date(inv.created_at), 'dd MMM yyyy HH:mm')}
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-800">
                                    {inv.item_name || 'Unknown Item'}
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-800">
                                    Rp {parseInt(inv.amount).toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {getStatusBadge(inv.status)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 items-center">
                                        {inv.status === 'pending' && (
                                            <button 
                                                onClick={() => handlePay(inv)}
                                                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 shadow-sm"
                                            >
                                                <CreditCard className="w-3 h-3" /> Bayar
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDownload(inv.id, inv.invoice_number)} 
                                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" 
                                            title="Download Invoice"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredInvoices.length === 0 && (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-400">
                                    Belum ada riwayat transaksi.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {filteredInvoices.map(inv => (
                    <div key={inv.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-mono font-bold text-indigo-600 text-sm">{inv.invoice_number}</p>
                                <p className="text-xs text-gray-500">{format(new Date(inv.created_at), 'dd MMM yyyy HH:mm')}</p>
                            </div>
                            {getStatusBadge(inv.status)}
                        </div>
                        
                        <div>
                            <p className="font-medium text-gray-800 text-sm">{inv.item_name || 'Unknown Item'}</p>
                            <p className="font-bold text-gray-900 text-lg">Rp {parseInt(inv.amount).toLocaleString('id-ID')}</p>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                            {inv.status === 'pending' && (
                                <button 
                                    onClick={() => handlePay(inv)}
                                    className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1 shadow-sm"
                                >
                                    <CreditCard className="w-3 h-3" /> Bayar
                                </button>
                            )}
                            <button 
                                onClick={() => handleDownload(inv.id, inv.invoice_number)} 
                                className="flex-1 px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 text-xs font-bold flex items-center justify-center gap-1" 
                            >
                                <Download className="w-3 h-3" /> PDF
                            </button>
                        </div>
                    </div>
                ))}
                {filteredInvoices.length === 0 && (
                     <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        Belum ada riwayat transaksi.
                    </div>
                )}
            </div>
        </div>
    );
}
