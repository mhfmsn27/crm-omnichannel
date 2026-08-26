import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Lock, Loader2, Globe, Mail, Key, Hash, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function LicenseModal() {
    const [view, setView] = useState(null); // 'activate' or 'verify'
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        purchase_code: 'TEST-DEV-BYPASS-LOCAL',
        email: '',
        license_key: '',
        product_id: '12345', // Default Product ID
    });

    useEffect(() => {
        const handleLicenseError = (e) => {
            if (e.detail.status === 402) setView('activate');
            else if (e.detail.status === 403) setView('verify');
        };

        window.addEventListener('LICENSE_REQUIRED', handleLicenseError);
        return () => window.removeEventListener('LICENSE_REQUIRED', handleLicenseError);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const endpoint = view === 'activate' ? '/api/license/activate' : '/api/license/verify';
        const payload = view === 'activate' ? {
            purchase_code: formData.purchase_code,
            product_id: formData.product_id,
            email: formData.email
        } : {
            license_key: formData.license_key
        };

        try {
            const res = await axios.post(endpoint, payload);
            if (res.data.success) {
                toast.success(view === 'activate' ? "Activation Success!" : "Verification Success!");
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Operation failed. Please check your data.");
        } finally {
            setLoading(false);
        }
    };

    if (!view) return null;

    const inputStyle = "w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all duration-200 text-sm";
    const iconStyle = "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5";

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-lg">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 relative overflow-hidden"
                >
                    {/* Header Dekoratif */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>

                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 mx-auto transform -rotate-3">
                        <Lock className="w-8 h-8 text-indigo-600" />
                    </div>

                    <h2 className="text-2xl font-bold text-center text-gray-900 tracking-tight">
                        {view === 'activate' ? 'Product Activation' : 'Verify License'}
                    </h2>
                    <p className="text-gray-500 text-center mt-2 text-sm px-4">
                        {view === 'activate'
                            ? 'Register your domain using your Envato Purchase Code to get started.'
                            : 'Invalid license detected. Please enter your License Key for verification.'}
                    </p>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                        {view === 'activate' ? (
                            <>
                                <div className="relative">
                                    <Key className={iconStyle} />
                                    <input type="text" placeholder="Envato Purchase Code" required className={inputStyle} value={formData.purchase_code} onChange={(e) => setFormData({ ...formData, purchase_code: e.target.value })} />
                                </div>
                                <div className="relative">
                                    <Mail className={iconStyle} />
                                    <input type="email" placeholder="Registered Email Address" required className={inputStyle} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="relative">
                                    <Hash className={iconStyle} />
                                    <input type="text" placeholder="Product ID" required className={inputStyle} value={formData.product_id} onChange={(e) => setFormData({ ...formData, product_id: e.target.value })} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="relative">
                                    <Key className={iconStyle} />
                                    <input type="text" placeholder="Enter License Key (SHA256)" required className={inputStyle} value={formData.license_key} onChange={(e) => setFormData({ ...formData, license_key: e.target.value })} />
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70 mt-6"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (view === 'activate' ? 'Register & Activate' : 'Verify Now')}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}