import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, X, Eye, Filter, Search, CreditCard, Image as ImageIcon } from 'lucide-react';
import { getApiUrl } from '../../config/api';
import { toast } from 'react-hot-toast';
import Modal from '../../components/common/Modal';

// Modal Component
const VerificationModal = ({ order, onClose, onApprove, onReject }) => {
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    if (!order) return null;

    const isVerifiable = order.status === 'pending_confirmation';

    return (
        <Modal
            isOpen={!!order}
            onClose={onClose}
            showClose={false}
            size="full"
            className="max-w-4xl h-[600px] p-0"
        >
            <div className="w-full h-full flex overflow-hidden">
                {/* Left: Image */}
                <div className="w-1/2 bg-gray-900 flex items-center justify-center relative p-4">
                    {order.payment_proof_url ? (
                        <a href={getApiUrl(order.payment_proof_url)} target="_blank" rel="noreferrer" className="w-full h-full flex items-center justify-center">
                            <img
                                src={getApiUrl(order.payment_proof_url)}
                                alt="Proof"
                                className="max-w-full max-h-full object-contain hover:scale-105 transition-transform cursor-zoom-in"
                            />
                        </a>
                    ) : (
                        <div className="text-gray-500 flex flex-col items-center">
                            <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                            <span>No Proof Image</span>
                        </div>
                    )}
                </div>

                {/* Right: Details */}
                <div className="w-1/2 p-8 flex flex-col overflow-y-auto">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-xl font-bold text-gray-900">{isVerifiable ? 'Verify Payment' : 'Transaction Details'}</h2>
                        <button onClick={onClose}><X className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
                    </div>

                    <div className="space-y-6 mb-8 flex-1">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Transaction Details</p>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-600">Invoice:</span>
                                <span className="text-sm font-mono font-bold">{order.invoice_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total:</span>
                                <span className="text-lg font-bold text-indigo-600">Rp {parseInt(order.amount).toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm border-b pb-2">
                                <span className="text-gray-500">Customer</span>
                                <span className="font-medium text-right">{order.org_name}<br /><span className="text-xs text-gray-400">{order.user_email}</span></span>
                            </div>
                            <div className="flex justify-between text-sm border-b pb-2">
                                <span className="text-gray-500">Item</span>
                                <span className="font-medium">{order.item_name} ({order.cycle || 'one-time'})</span>
                            </div>
                            <div className="flex justify-between text-sm border-b pb-2">
                                <span className="text-gray-500">Method</span>
                                <span className="font-medium">{order.payment_method}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Date</span>
                                <span className="font-medium">{new Date(order.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t mt-2">
                                <span className="text-gray-500">Status</span>
                                <span className="font-bold uppercase">{order.status.replace('_', ' ')}</span>
                            </div>
                        </div>
                    </div>

                    {isVerifiable && (
                        <div className="mt-auto pt-4 border-t border-gray-100">
                            {showRejectInput ? (
                                <div className="bg-red-50 p-4 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                                    <label className="block text-xs font-bold text-red-700 mb-1 uppercase">Reason for Rejection</label>
                                    <textarea
                                        className="w-full p-2 border border-red-200 rounded text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                                        placeholder="e.g. Image blurry, amount incorrect..."
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={() => setShowRejectInput(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                        <button onClick={() => onReject(order.id, rejectReason)} className="px-3 py-1.5 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 shadow-sm">Confirm Reject</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowRejectInput(true)}
                                        className="flex-1 py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => onApprove(order.id)}
                                        className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all transform active:scale-95"
                                    >
                                        Approve Payment
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default function OrderManagement() {
    const [orders, setOrders] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, [filterStatus]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/sa/orders?status=${filterStatus}`);
            setOrders(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!confirm("Confirm approval?")) return;
        try {
            await axios.post(`/api/sa/orders/${id}/approve`);
            toast.success("Order Approved");
            fetchOrders();
            setSelectedOrder(null);
        } catch (err) {
            toast.error("Failed to approve");
        }
    };

    const handleReject = async (id, reason) => {
        try {
            await axios.post(`/api/sa/orders/${id}/reject`, { reason });
            toast.success("Order Rejected");
            fetchOrders();
            setSelectedOrder(null);
        } catch (err) {
            toast.error("Failed to reject");
        }
    };

    const statusBadge = (status) => {
        const map = {
            pending: 'bg-gray-100 text-gray-600 border-gray-200',
            pending_confirmation: 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse',
            success: 'bg-green-100 text-green-700 border-green-200',
            failed: 'bg-red-100 text-red-700 border-red-200'
        };
        return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${map[status] || 'bg-gray-100'}`}>{status.replace('_', ' ')}</span>;
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CreditCard className="w-8 h-8 text-indigo-600" /> Transaction History
                    </h1>
                    <p className="text-sm text-gray-500">Monitor and verify incoming payments.</p>
                </div>

                <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm">
                    {['all', 'pending_confirmation', 'success', 'failed'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterStatus === s ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {s.replace('_', ' ').toUpperCase()}
                        </button>
                    ))}
                    <button onClick={fetchOrders} className="px-2 text-gray-400 hover:text-indigo-600 border-l ml-1"><Filter className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Invoice</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Customer</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Item</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-400">Loading transactions...</td></tr>
                        ) : orders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="font-mono font-bold text-indigo-600 text-sm hover:underline hover:text-indigo-800 text-left"
                                    >
                                        {order.invoice_number}
                                    </button>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-bold text-gray-900 text-sm">{order.org_name}</p>
                                    <p className="text-xs text-gray-500">{order.user_email}</p>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                    {order.item_name || 'Plan'}
                                    <span className="text-xs text-gray-400 block">{order.type}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                                    Rp {parseInt(order.amount).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {statusBadge(order.status)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {(order.status === 'pending_confirmation') && order.payment_method !== 'DOKU' ? (
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 shadow-sm flex items-center gap-1 ml-auto"
                                        >
                                            <Eye className="w-3 h-3" /> Verify
                                        </button>
                                    ) : (
                                        <span className="text-gray-300 text-xs italic">{order.payment_method}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!loading && orders.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-gray-400">No transactions found.</td></tr>}
                    </tbody>
                </table>
            </div>

            <VerificationModal
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onApprove={handleApprove}
                onReject={handleReject}
            />
        </div>
    );
}
