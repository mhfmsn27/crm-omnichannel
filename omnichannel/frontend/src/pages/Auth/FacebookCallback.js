import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function FacebookCallback() {
    const [status, setStatus] = useState('processing'); // processing, success, error
    const [message, setMessage] = useState('Memproses login Facebook...');
    const [errorDetails, setErrorDetails] = useState('');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // Parse URL params
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
            // Handle error redirect from Facebook
            console.error("Facebook Login Error:", { error, errorCode, errorMessage, errorDesc });
            setStatus('error');
            setMessage('Gagal login dengan Facebook.');
            // Display friendly message if possible
            if (errorMessage && errorMessage.includes('Invalid Scopes')) {
                setErrorDetails("Konfigurasi aplikasi Facebook belum mengizinkan akses email/profil publik. Hubungi Admin.");
            } else {
                setErrorDetails(errorMessage || errorDesc || "Otorisasi dibatalkan atau gagal.");
            }
        } else {
            // No code and no error params (unexpected direct access)
            setStatus('error');
            setMessage('Link tidak valid.');
            setErrorDetails('Kode otorisasi tidak ditemukan.');
        }
    }, [location]);

    const processCallback = async (code, referralCode) => {
        try {
            // Ensure URI matches EXACTLY what was sent in login (frontend origin based)
            // It MUST be the exact URL of this callback page
            const redirectUri = `${window.location.origin}/auth/facebook/callback`;

            const res = await axios.post('/api/auth/facebook/callback', { 
                code, 
                redirectUri,
                referral_code: referralCode 
            });
            
            // Handle successful login
            const { token, user } = res.data;
            
            // Manual login handling
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            setStatus('success');
            setMessage(`Selamat datang, ${user.name}!`);
            
            // Cleanup query params from URL for clean history
            window.history.replaceState({}, document.title, window.location.pathname);

            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);

        } catch (err) {
            console.error("Facebook Callback Backend Error:", err);
            setStatus('error');
            setMessage('Gagal memproses login.');
            
            const backendError = err.response?.data?.error;
            if (backendError && backendError.includes('Redirect URI mismatch')) {
                setErrorDetails(`Konfigurasi URL Callback salah.\nHarap tambahkan URI ini ke 'Valid OAuth Redirect URIs' di Facebook App Dashboard:\n${window.location.origin}/auth/facebook/callback`);
            } else {
                setErrorDetails(backendError || err.message || 'Terjadi kesalahan pada server.');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-gray-100">
                {status === 'processing' && (
                    <div className="flex flex-col items-center py-4">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                        <h3 className="text-xl font-bold text-gray-800">Menghubungkan...</h3>
                        <p className="text-gray-500 mt-2 text-sm">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center animate-in zoom-in py-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Login Berhasil!</h3>
                        <p className="text-gray-500 mt-2 text-sm">{message}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center animate-in zoom-in py-4">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <AlertTriangle className="w-9 h-9 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{message}</h3>
                        
                        {errorDetails && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs mt-3 mb-4 w-full break-words text-left border border-red-100 font-mono">
                                <strong>Detail Error:</strong><br/>
                                {errorDetails}
                            </div>
                        )}
                        
                        <button 
                            onClick={() => navigate('/login')}
                            className="mt-2 w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Kembali ke Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}