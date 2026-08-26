import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download, MessageCircle, CreditCard, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { getApiUrl } from '../../config/api';

export default function PublicInvoiceView() {
    const { token } = useParams();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [paying, setPaying] = useState(false);
    const [paySuccess, setPaySuccess] = useState(searchParams.get('status') === 'success');

    useEffect(() => {
        axios.get(`/api/public/invoices/${token}`)
            .then(res => setData(res.data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [token]);

    const handleConfirm = () => {
        const msg = `Halo Admin ${data.settings.org_name || data.org_name}, saya sudah bayar Invoice ${data.invoice.invoice_number}. Mohon dicek.`;
        
        let targetPhone = data.settings.org_phone || '';
        if (targetPhone) {
            targetPhone = targetPhone.replace(/[^0-9]/g, '');
            if (targetPhone.startsWith('0')) targetPhone = '62' + targetPhone.slice(1);
        }

        const url = targetPhone 
            ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`;
            
        window.open(url, '_blank');
    };

    const handleDownload = () => {
        // Use public download endpoint (no auth needed)
        window.open(getApiUrl(`/api/public/invoices/${token}/download`), '_blank');
    };

    const handlePayOnline = async () => {
        setPaying(true);
        try {
            const res = await axios.post(`/api/public/invoices/${token}/pay`);
            if (res.data.payment_url) {
                window.location.href = res.data.payment_url;
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Gagal membuat link pembayaran');
            setPaying(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );
    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-500 font-bold">Invoice not found or expired.</p>
            </div>
        </div>
    );

    const { invoice, settings, has_gateway } = data;
    const orgName = settings.org_name || data.org_name;
    const isPaid = invoice.status === 'paid';
    const isOverdue = invoice.status === 'overdue';

    const statusConfig = {
        paid: { bg: 'bg-white text-green-600', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
        overdue: { bg: 'bg-white text-orange-600', icon: <AlertTriangle className="w-3 h-3 mr-1" /> },
        unpaid: { bg: 'bg-white text-red-600', icon: <Clock className="w-3 h-3 mr-1" /> },
        sent: { bg: 'bg-white text-blue-600', icon: <Clock className="w-3 h-3 mr-1" /> },
        draft: { bg: 'bg-white text-gray-600', icon: <Clock className="w-3 h-3 mr-1" /> },
    };
    const sc = statusConfig[invoice.status] || statusConfig.unpaid;

    return (
        <div className="min-h-screen bg-gray-100 py-10 px-4">
            {/* Payment success banner */}
            {paySuccess && !isPaid && (
                <div className="max-w-3xl mx-auto mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                    <div>
                        <p className="font-bold text-green-800">Pembayaran sedang diproses</p>
                        <p className="text-sm text-green-600">Status invoice akan diperbarui otomatis setelah pembayaran dikonfirmasi.</p>
                    </div>
                </div>
            )}

            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="p-8 text-white flex justify-between items-start transition-colors duration-300" style={{ backgroundColor: isPaid ? '#10b981' : (settings.theme_color || '#4f46e5') }}>
                    <div>
                        <h1 className="text-2xl font-bold">INVOICE</h1>
                        <p className="opacity-80 text-sm mt-1">{invoice.invoice_number}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        {settings.logo_url && (
                            <div className="bg-white p-1.5 rounded-lg shadow-sm mb-3">
                                <img src={getApiUrl(settings.logo_url)} alt="Logo" className="h-10 w-auto object-contain" />
                            </div>
                        )}
                        <h2 className="text-xl font-bold">{orgName}</h2>
                        <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${sc.bg}`}>
                            {sc.icon} {invoice.status}
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                        <div>
                            <p className="text-gray-500 mb-1">Bill To:</p>
                            <p className="font-bold text-gray-800">{invoice.contact_name}</p>
                            <p className="text-gray-600">{invoice.contact_phone}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-500 mb-1">Dates:</p>
                            <p><span className="text-gray-600">Issued:</span> <span className="font-bold">{new Date(invoice.issue_date).toLocaleDateString()}</span></p>
                            <p><span className="text-gray-600">Due:</span> <span className={`font-bold ${isOverdue ? 'text-orange-500' : 'text-red-500'}`}>{new Date(invoice.due_date).toLocaleDateString()}</span></p>
                            {isPaid && invoice.paid_at && (
                                <p><span className="text-gray-600">Paid:</span> <span className="font-bold text-green-600">{new Date(invoice.paid_at).toLocaleDateString()}</span></p>
                            )}
                        </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full mb-8">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr>
                                <th className="p-3 text-left">Description</th>
                                <th className="p-3 text-center">Qty</th>
                                <th className="p-3 text-right">Price</th>
                                <th className="p-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y">
                            {invoice.items.map((item, i) => (
                                <tr key={i}>
                                    <td className="p-3 font-medium text-gray-800">{item.description}</td>
                                    <td className="p-3 text-center">{item.quantity}</td>
                                    <td className="p-3 text-right">{parseInt(item.unit_price).toLocaleString()}</td>
                                    <td className="p-3 text-right font-bold">{parseInt(item.amount).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end mb-8">
                        <div className="w-64 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>{parseInt(invoice.subtotal).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Tax</span>
                                <span>{parseInt(invoice.tax_amount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{ color: settings.theme_color || '#4338ca' }}>
                                <span>Total</span>
                                <span>Rp {parseInt(invoice.total_amount).toLocaleString('id-ID')}</span>
                            </div>
                            {parseFloat(invoice.dp_amount || 0) > 0 && (
                                <>
                                    <div className="flex justify-between text-gray-600 pt-2">
                                        <span>DP (Down Payment)</span>
                                        <span>- Rp {parseInt(invoice.dp_amount).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-xl pt-2 border-t text-red-600">
                                        <span>Sisa Tagihan</span>
                                        <span>Rp {Math.max(0, parseInt(invoice.total_amount) - parseInt(invoice.dp_amount)).toLocaleString('id-ID')}</span>
                                    </div>
                                </>
                            )}
                            {parseFloat(invoice.paid_amount || 0) > 0 && !isPaid && (
                                <>
                                    <div className="flex justify-between text-green-600 pt-2">
                                        <span>Sudah Dibayar</span>
                                        <span>- Rp {parseInt(invoice.paid_amount).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-xl pt-2 border-t text-red-600">
                                        <span>Sisa Tagihan</span>
                                        <span>Rp {Math.max(0, parseInt(invoice.total_amount) - parseInt(invoice.paid_amount)).toLocaleString('id-ID')}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Payment History */}
                    {invoice.payments && invoice.payments.length > 0 && (
                        <div className="bg-green-50 p-4 rounded-lg mb-8 border border-green-100">
                            <p className="text-xs font-bold text-green-700 uppercase mb-2">Riwayat Pembayaran</p>
                            <div className="space-y-2">
                                {invoice.payments.map((p, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-green-700">
                                            {new Date(p.paid_at).toLocaleDateString('id-ID')} — {p.payment_method || 'Manual'}
                                        </span>
                                        <span className="font-bold text-green-800">Rp {parseInt(p.amount).toLocaleString('id-ID')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer Notes */}
                    {settings.footer_note && (
                        <div className="bg-gray-50 p-4 rounded-lg mb-8 border border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Payment Instructions</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{settings.footer_note}</p>
                        </div>
                    )}
                    
                    {/* Organization Footer Details */}
                    {(settings.org_address || settings.org_email || settings.org_phone) && (
                         <div className="text-center text-xs text-gray-400 mb-8 border-t pt-4">
                             <p className="font-bold text-gray-500">{orgName}</p>
                             <p>{settings.org_address}</p>
                             <p>{settings.org_email} {settings.org_email && settings.org_phone ? '•' : ''} {settings.org_phone}</p>
                         </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                         <button onClick={handleDownload} className="px-6 py-3 bg-white border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
                             <Download className="w-4 h-4" /> Download PDF
                         </button>

                         {!isPaid && (
                             <button onClick={handleConfirm} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2 transition-colors">
                                 <MessageCircle className="w-4 h-4" /> Konfirmasi via WhatsApp
                             </button>
                         )}

                         {!isPaid && has_gateway && (
                             <button 
                                 onClick={handlePayOnline} 
                                 disabled={paying}
                                 className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                             >
                                 {paying ? (
                                     <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                                 ) : (
                                     <><CreditCard className="w-4 h-4" /> Bayar Online</>
                                 )}
                             </button>
                         )}
                    </div>

                    {/* Paid success state */}
                    {isPaid && (
                        <div className="mt-6 text-center p-4 bg-green-50 rounded-lg border border-green-200">
                            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p className="font-bold text-green-800">Invoice telah dibayar</p>
                            <p className="text-sm text-green-600">Pembayaran diterima pada {new Date(invoice.paid_at).toLocaleDateString('id-ID')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}