import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Lock, ExternalLink, ShieldCheck, HelpCircle } from 'lucide-react';
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
            console.error('[License Guard] Check failed:', e);
            setLicenseStatus({ 
                valid: false, 
                blocked: true, 
                reason: e.response?.data?.reason || 'UNAUTHORIZED_DOMAIN',
                message: e.response?.data?.message || 'Domain belum terdaftar dalam sistem lisensi resmi CRMHUB.'
            });
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        checkLicense();

        // Listen for global LICENSE_REQUIRED custom events
        const handleLicenseError = () => {
            setLicenseStatus({
                valid: false,
                blocked: true,
                message: 'Akses ditolak: Lisensi domain tidak valid atau belum diizinkan.'
            });
        };

        window.addEventListener('LICENSE_REQUIRED', handleLicenseError);
        return () => window.removeEventListener('LICENSE_REQUIRED', handleLicenseError);
    }, []);

    if (checking) {
        return null; // Don't block screen during initial quick fetch
    }

    // License valid - allow application to render normally
    if (licenseStatus?.valid) {
        return null;
    }

    // Current hostname
    const currentDomain = window.location.hostname;

    // License invalid or domain un-whitelisted - render formal blocking overlay
    return (
        <div className="fixed inset-0 z-[99999] min-h-screen flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 selection:bg-rose-500 selection:text-white">
            <div className="max-w-md w-full mx-auto">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-center text-white relative overflow-hidden">
                    
                    {/* Top Security Line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />

                    {/* Shield Icon */}
                    <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xs">
                        <ShieldAlert className="w-8 h-8" />
                    </div>

                    {/* Title */}
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Lisensi Domain Belum Aktif
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                        Domain ini belum terdaftar di whitelist Google Spreadsheet sistem lisensi resmi CRMHUB.
                    </p>

                    {/* Detected Domain Readout */}
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 my-5 text-left">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Domain Terdeteksi:</span>
                            <span className="font-mono text-[11px] bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded">
                                Unverified
                            </span>
                        </div>
                        <p className="font-mono text-sm text-slate-100 font-semibold truncate select-all">
                            {currentDomain}
                        </p>
                    </div>

                    {/* Registration Instructions Box */}
                    <div className="text-left bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 mb-6 space-y-2 text-xs text-slate-300">
                        <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-indigo-400" />
                            Petunjuk Aktivasi:
                        </p>
                        <ol className="space-y-1.5 list-decimal list-inside text-slate-400 leading-relaxed text-[11px] sm:text-xs">
                            <li>Buka Google Spreadsheet lisensi yang telah dikonfigurasi.</li>
                            <li>Tambahkan domain <strong className="text-white font-mono">{currentDomain}</strong> ke kolom <strong className="text-white">Domain</strong> pada sheet <strong className="text-white">licenses</strong>.</li>
                            <li>Tekan tombol <strong>"Periksa Ulang Lisensi"</strong> di bawah.</li>
                        </ol>
                    </div>

                    {/* Action Button */}
                    <button
                        type="button"
                        onClick={checkLicense}
                        disabled={checking}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                    >
                        <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                        <span>{checking ? 'Memverifikasi...' : 'Periksa Ulang Lisensi'}</span>
                    </button>

                    {/* Footer note */}
                    <p className="text-[11px] text-slate-500 mt-4 flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        CRMHUB RSA-2048 Cryptographic License Guard
                    </p>
                </div>
            </div>
        </div>
    );
}

export function useLicenseCheck() {
    const [isValid, setIsValid] = useState(null);

    useEffect(() => {
        const check = async () => {
            try {
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
