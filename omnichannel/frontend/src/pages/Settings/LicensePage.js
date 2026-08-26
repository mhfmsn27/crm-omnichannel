import React, { useState, useEffect } from 'react';
import { Shield, Check, X, RefreshCw, AlertCircle, Globe, Key, Clock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function timeAgo(timestamp) {
    if (!timestamp) return '-';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds} detik lalu`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} menit lalu`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam lalu`;
    return `${Math.floor(seconds / 86400)} hari lalu`;
}

export default function LicensePage() {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null);
    const [debug, setDebug] = useState(null);

    const fetchLicense = async () => {
        setLoading(true);
        try {
            // Clear previous state
            setStatus(null);
            setDebug(null);

            // Use PUBLIC endpoint - no auth required
            const checkRes = await axios.get('/api/license/check');
            setStatus(checkRes.data);
            console.log('[LicensePage] Check result:', checkRes.data);

            // Get detailed status from authenticated endpoint (will work if logged in)
            try {
                const statusRes = await axios.get('/api/app/license/status');
                setDebug(statusRes.data);
            } catch (e) {
                console.log('[LicensePage] Detailed status not available (not logged in)');
            }
        } catch (e) {
            console.error('License fetch error:', e);
            const errorMessage = e.response?.data?.message || 'Gagal memuat data license';
            setStatus({ status: 'invalid', message: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLicense();
    }, []);

    const handleRefresh = async () => {
        try {
            // Show loading state
            toast.loading('Refreshing license...');

            // Call public refresh endpoint (no auth required)
            await axios.post('/api/license/refresh');

            toast.dismiss();

            // Refetch license status
            await fetchLicense();

            toast.success('License berhasil di-refresh!');
        } catch (e) {
            toast.dismiss();
            console.error('Refresh error:', e);
            toast.error('Refresh gagal: ' + (e.response?.data?.message || e.message));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
                    <p className="text-gray-500">Memuat status license...</p>
                </div>
            </div>
        );
    }

    if (!status || status.status !== 'valid') {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-700">License Invalid</h2>
                    <p className="text-red-600 mt-2">{status?.message || 'Domain tidak terdaftar'}</p>

                    <div className="mt-6 p-4 bg-white rounded-lg border border-red-100">
                        <h3 className="font-bold text-red-800 mb-3">Troubleshooting:</h3>
                        <ul className="text-left text-sm text-red-600 space-y-2">
                            <li>✓ Pastikan domain sudah ditambahkan di Google Sheets</li>
                            <li>✓ Pastikan Sheet di-share "Anyone with link can VIEW"</li>
                            <li>✓ Pastikan LICENSE_SHEET_ID sudah di-set di .env</li>
                            <li>✓ Restart PM2: <code className="bg-red-100 px-1">pm2 restart omni-backend</code></li>
                        </ul>
                    </div>

                    <button
                        onClick={fetchLicense}
                        className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">License Status</h1>
                        <p className="text-sm text-gray-500">Domain-Locked Protection</p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Valid License Card */}
            <div className="bg-green-500 rounded-xl p-6 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                        <Check className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">License Aktif</h2>
                        <p className="text-white/80 mt-1">Domain terdaftar dan valid</p>
                    </div>
                </div>
            </div>

            {/* Domain Info */}
            <div className="bg-white rounded-xl border p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <Globe className="w-10 h-10 text-indigo-600" />
                    <div>
                        <p className="text-sm text-gray-500">Domain</p>
                        <p className="text-xl font-bold text-gray-900">{status.domain}</p>
                    </div>
                </div>

                {status.licenseKey && (
                    <div className="mt-4 pt-4 border-t flex items-center gap-4">
                        <Key className="w-5 h-5 text-gray-400" />
                        <div>
                            <p className="text-sm text-gray-500">License Key</p>
                            <p className="font-mono text-sm text-gray-700">{status.licenseKey}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Cache Status */}
            {debug && (
                <div className="bg-gray-50 rounded-xl border p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <h3 className="font-bold text-gray-700">Cache Status</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500">Cached</p>
                            <p className="font-medium">{debug.cached ? 'Ya' : 'Tidak'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Last Check</p>
                            <p className="font-medium">{debug.cacheAge || 'Baru saja'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Valid</p>
                            <p className={`font-medium ${debug.valid ? 'text-green-600' : 'text-red-600'}`}>
                                {debug.valid ? 'Ya' : 'Tidak'}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500">Sheet ID</p>
                            <p className="font-medium text-xs truncate">{debug.sheetId || 'Not set'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-blue-800">Informasi</p>
                        <ul className="text-sm text-blue-600 mt-2 space-y-1">
                            <li>• License bersifat one-time purchase (tanpa batas waktu)</li>
                            <li>• Untuk menonaktifkan, hapus domain dari Google Sheets</li>
                            <li>• Klik tombol <strong>Refresh</strong> untuk update status terbaru</li>
                            <li>• Cache berlaku selama 6 jam untuk performa optimal</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border p-4">
                <h3 className="font-bold text-gray-800 mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-sm font-medium"
                    >
                        🔄 Force Refresh
                    </button>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(status.domain);
                            toast.success('Domain copied!');
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                    >
                        📋 Copy Domain
                    </button>
                </div>
            </div>
        </div>
    );
}