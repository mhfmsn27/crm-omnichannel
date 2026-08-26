import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import axios from 'axios';

export default function LicenseBlockPage() {
    const [checking, setChecking] = useState(true);
    const [licenseStatus, setLicenseStatus] = useState(null);

    const checkLicense = async () => {
        setChecking(true);
        try {
            // Use PUBLIC endpoint - no auth required
            const res = await axios.get('/api/license/check');
            setLicenseStatus(res.data);
        } catch (e) {
            console.error('License check failed:', e);
            setLicenseStatus({ valid: false, blocked: true, message: e.response?.data?.message });
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        checkLicense();
    }, []);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500">Memeriksa lisensi...</p>
                </div>
            </div>
        );
    }

    // License valid - show app
    if (licenseStatus?.valid) {
        return null; // Let app render normally
    }

    // License invalid or check failed - block UI
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white rounded-2xl shadow-xl border p-8 text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Lisensi Tidak Valid
                    </h1>
                    <p className="text-gray-500 mb-6">
                        Domain ini belum terdaftar dalam sistem lisensi kami.
                    </p>

                    {/* Domain Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-500">Domain</p>
                        <p className="font-mono text-gray-900">{window.location.hostname}</p>
                    </div>

                    {/* Instructions */}
                    <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p className="font-medium text-blue-800 mb-2">Langkah Pendaftaran:</p>
                        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                            <li>Hubungi admin untuk mendaftarkan domain ini</li>
                            <li>Tambahkan domain ke Google Sheets lisensi</li>
                            <li>Tunggu cache refresh (maks 6 jam)</li>
                        </ol>
                    </div>

                    {/* Retry Button */}
                    <button
                        onClick={checkLicense}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Coba Lagi
                    </button>

                    {/* Contact Admin */}
                    <p className="text-sm text-gray-400 mt-4">
                        Butuh bantuan?{' '}
                        <a href="mailto:admin@contoh.com" className="text-indigo-600 hover:underline">
                            Hubungi Admin
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

// Check license on app mount
export function useLicenseCheck() {
    const [isValid, setIsValid] = useState(null);

    useEffect(() => {
        const check = async () => {
            try {
                // Use PUBLIC endpoint - no auth required
                const res = await axios.get('/api/license/check');
                setIsValid(res.data.status === 'valid');
            } catch (e) {
                console.error('License check failed:', e);
                setIsValid(false);
            }
        };
        check();
    }, []);

    return isValid;
}
