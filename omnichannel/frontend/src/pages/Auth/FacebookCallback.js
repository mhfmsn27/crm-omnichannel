import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

export default function FacebookCallback() {
    const [status, setStatus] = useState('processing'); // processing, success, error
    const [message, setMessage] = useState('Memverifikasi autentikasi Facebook / Meta...');
    const [errorDetails, setErrorDetails] = useState('');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        
        // Facebook Error Params
        const error = params.get('error');
        const errorCode = params.get('error_code');
        const errorMessage = params.get('error_message');
        const errorDesc = params.get('error_description');

        // Referral param (state)
        const referralCode = localStorage.getItem('referral_code') || params.get('state');

        if (code) {
            processCallback(code, referralCode);
        } else if (error || errorCode || errorMessage) {
            console.error("Facebook Login Error:", { error, errorCode, errorMessage, errorDesc });
            setStatus('error');
            setMessage('Otorisasi Facebook dibatalkan atau gagal.');
            if (errorMessage && errorMessage.includes('Invalid Scopes')) {
                setErrorDetails("Konfigurasi aplikasi Facebook belum mengizinkan akses email/profil publik. Hubungi Admin.");
            } else {
                setErrorDetails(errorMessage || errorDesc || "Otorisasi dibatalkan atau gagal.");
            }
        } else {
            setStatus('error');
            setMessage('Tautan tidak valid.');
            setErrorDetails('Kode otorisasi tidak ditemukan dalam parameter callback.');
        }
    }, [location]);

    const processCallback = async (code, referralCode) => {
        try {
            const redirectUri = `${window.location.origin}/auth/facebook/callback`;

            const res = await axios.post('/api/auth/facebook/callback', { 
                code, 
                redirectUri,
                referral_code: referralCode 
            });
            
            const { token, user } = res.data;
            
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            setStatus('success');
            setMessage(`Selamat datang kembali, ${user.name}!`);
            
            window.history.replaceState({}, document.title, window.location.pathname);

            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1200);

        } catch (err) {
            console.error("Facebook Callback Backend Error:", err);
            setStatus('error');
            setMessage('Autentikasi gagal diproses pada server.');
            
            const backendError = err.response?.data?.error;
            if (backendError && backendError.includes('Redirect URI mismatch')) {
                setErrorDetails(`Konfigurasi URL Callback salah. Tambahkan URI ini ke Meta App Dashboard: ${window.location.origin}/auth/facebook/callback`);
            } else {
                setErrorDetails(backendError || err.message || 'Terjadi kesalahan pada server.');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm max-w-sm w-full text-center border border-slate-200 dark:border-slate-800">
                {status === 'processing' && (
                    <div className="flex flex-col items-center py-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <Loader2 className="w-6 h-6 text-slate-900 dark:text-indigo-400 animate-spin" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Memproses Masuk...</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center py-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-200 dark:border-emerald-800/60">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Autentikasi Berhasil</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs">{message}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center py-4">
                        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 border border-rose-200 dark:border-rose-800/60">
                            <XCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Autentikasi Gagal</h3>
                        <p className="text-rose-600 dark:text-rose-400 mt-1 text-xs font-medium">{message}</p>
                        
                        {errorDetails && (
                            <div className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 p-3 rounded-lg text-xs mt-3 w-full break-words text-left border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                                <strong>Detail:</strong> {errorDetails}
                            </div>
                        )}

                        <button 
                            onClick={() => navigate('/login')}
                            className="mt-5 w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Halaman Masuk
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}