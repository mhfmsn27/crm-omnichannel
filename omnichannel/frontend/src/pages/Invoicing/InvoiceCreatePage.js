import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Database, Lock, Crown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import InvoiceForm from './InvoiceForm';
import BulkInvoiceTool from './BulkInvoiceTool';

export default function InvoiceCreatePage() {
    const [activeTab, setActiveTab] = useState('single');
    const [isLocked, setIsLocked] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        checkAccess();
    }, []);

    const checkAccess = async () => {
        try {
            const res = await axios.get('/api/app/invoices/stats');
            if (res.data.locked) setIsLocked(true);
        } catch (e) {
            console.error("Access check failed", e);
        }
    };

    if (isLocked) {
        return (
            <div className="p-8 h-full flex flex-col items-center justify-center text-center">
                 <div className="bg-white p-8 rounded-xl shadow-lg border border-indigo-100 max-w-md">
                     <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                         <Lock className="w-8 h-8 text-indigo-600" />
                     </div>
                     <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-500" /> Feature Locked
                     </h2>
                     <p className="text-gray-500 mb-6">
                         Invoicing module is not included in your current plan. Upgrade to unlock professional invoice generation and tracking.
                     </p>
                     <button 
                         onClick={() => navigate('/order')}
                         className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"
                     >
                         Upgrade Now <ArrowRight className="w-4 h-4" />
                     </button>
                 </div>
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Invoice</h1>

            <div className="flex border-b border-gray-200 mb-6">
                <button 
                    onClick={() => setActiveTab('single')}
                    className={`px-6 py-3 font-medium border-b-2 flex items-center gap-2 ${activeTab === 'single' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <FileText className="w-4 h-4" /> Single Invoice
                </button>
                <button 
                    onClick={() => setActiveTab('bulk')}
                    className={`px-6 py-3 font-medium border-b-2 flex items-center gap-2 ${activeTab === 'bulk' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Database className="w-4 h-4" /> Bulk Upload
                </button>
            </div>

            <div className="w-full">
                {activeTab === 'single' ? (
                    <InvoiceForm embedded={true} />
                ) : (
                    <BulkInvoiceTool embedded={true} />
                )}
            </div>
        </div>
    );
}
