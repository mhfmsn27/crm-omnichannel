import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Copy, Upload, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function ManualPaymentConfirm() {
    const location = useLocation();
    const navigate = useNavigate();
    const { transaction_id, bank_details, amount, breakdown } = location.state || {};
    
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('pending'); // pending, uploaded

    if (!transaction_id) {
        return <div className="p-8 text-center">Invalid Transaction</div>;
    }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!file) return alert("Please upload proof");
        setLoading(true);

        const formData = new FormData();
        formData.append('transaction_id', transaction_id);
        formData.append('file', file);

        try {
            await axios.post('/api/app/billing/confirm-manual', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStatus('uploaded');
        } catch (err) {
            alert("Upload failed");
        } finally {
            setLoading(false);
        }
    };

    if (status === 'uploaded') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Submitted</h2>
                    <p className="text-gray-500 mb-6">
                        We have received your payment proof. Our team will verify it shortly (usually within 1-2 hours). A PDF invoice will be sent to your email upon approval.
                    </p>
                    <button 
                        onClick={() => navigate('/inbox')} 
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-indigo-600 p-6 text-white text-center">
                    <h2 className="text-xl font-bold">Complete Payment</h2>
                    <p className="opacity-80 text-sm mt-1">Order ID: {transaction_id}</p>
                </div>

                <div className="p-8">
                    {/* Important Alert */}
                    {breakdown && breakdown.unique_code > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                                <strong>Important:</strong> Please transfer the <strong>EXACT</strong> amount including the unique code (last 3 digits) for faster verification.
                            </div>
                        </div>
                    )}

                    {/* Amount */}
                    <div className="text-center mb-8">
                        <p className="text-gray-500 text-sm">Total Amount to Transfer</p>
                        <h1 className="text-4xl font-extrabold text-indigo-600 mt-1 tracking-tight">
                            Rp {parseInt(amount).toLocaleString('id-ID')}
                        </h1>
                        {breakdown && (
                            <div className="mt-2 text-xs text-gray-400">
                                (Sub: {breakdown.subtotal.toLocaleString()} + Code: <span className="font-bold text-gray-600">{breakdown.unique_code}</span>)
                            </div>
                        )}
                    </div>

                    {/* Bank Details */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-sm text-gray-500">Bank Name</p>
                                <p className="font-bold text-gray-800">{bank_details.bank}</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-100 rounded flex items-center justify-center text-indigo-700 font-bold text-xs">
                                {bank_details.bank.substring(0,3)}
                            </div>
                        </div>
                        
                        <div className="mb-4">
                             <p className="text-sm text-gray-500 mb-1">Account Number</p>
                             <div className="flex items-center gap-2">
                                 <span className="text-xl font-mono font-bold text-gray-900 bg-white px-3 py-1.5 border rounded shadow-sm">
                                     {bank_details.number}
                                 </span>
                                 <button 
                                    onClick={() => navigator.clipboard.writeText(bank_details.number)}
                                    className="text-indigo-600 hover:bg-indigo-50 p-2 rounded"
                                 >
                                    <Copy className="w-4 h-4" />
                                 </button>
                             </div>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500">Account Name</p>
                            <p className="font-medium text-gray-800">{bank_details.holder}</p>
                        </div>
                    </div>

                    {/* Upload */}
                    <div>
                        <label className="block font-bold text-gray-800 mb-2 text-sm">Upload Transfer Proof</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                            <input type="file" className="hidden" id="proof-upload" onChange={handleFileChange} accept="image/*" />
                            <label htmlFor="proof-upload" className="cursor-pointer flex flex-col items-center">
                                {file ? (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle className="w-6 h-6" />
                                        <span className="font-medium">{file.name}</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                        <span className="text-sm text-gray-600">Click to upload Receipt (JPG/PNG)</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full mt-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200"
                    >
                        {loading ? 'Uploading...' : 'I Have Transferred'}
                    </button>
                </div>
            </div>
        </div>
    );
}
