import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function LicenseGate({ children }) {
    const [license, setLicense] = useState({ status: 'loading' });
    const [licenseKey, setLicenseKey] = useState(null);

    useEffect(() => {
        checkLicense();
    }, []);

    const checkLicense = async () => {
        try {
            // Use PUBLIC endpoint - no auth required
            const res = await axios.get('/api/license/check');
            setLicense(res.data);
        } catch (e) {
            console.error('License check failed:', e);
            setLicense({ status: 'invalid', blocked: true, message: e.response?.data?.message });
        }
    };

    // Loading state
    if (license.status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Memeriksa lisensi...</p>
                </div>
        );
    }

    // Blocked state
    if (license.blocked || license.status === 'invalid' || !license.valid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full">
                    {/* Blocked Card */}
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
                        {/* Icon */}
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 1118.01 0" />
                            </svg>
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Lisensi Tidak Valid
                        </h1>

                        <p className="text-gray-600 mb-6">
                            Domain ini belum terdaftar dalam sistem lisensi.
                        </p>

                        <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
                            <p className="text-sm text-gray-500 mb-2">Informasi:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>Domain: <code className="bg-gray-200 px-2 py-0.5 rounded">{window.location.host}</li>
                                <li>Status: <span className="text-red-600 font-medium">Belum terdaftar</span></li>
                            </ul>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left mb-6">
                            <p className="text-sm font-medium text-blue-800 mb-2">Langkah Pendaftaran:</p>
                            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                                <li>Hubungi administrator untuk mendaftarkan domain ini</li>
                                <li>Tunggu beberapa menit untuk aktivasi</li>
                                <li>Refresh halaman ini setelah domain terdaftar</li>
                            </ol>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl hover:bg-indigo-700 transition-colors"
                        >
                            🔄 Coba Lagi
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Valid license - render children
    return children;
}
