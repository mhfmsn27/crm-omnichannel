import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

export default function GoogleCallback() {
    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState('Processing Google login...');
    const [errorDetails, setErrorDetails] = useState('');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const error = params.get('error');

        // Referral Code from state param
        const referralCode = localStorage.getItem('referral_code') || params.get('state');

        if (code) {
            processCallback(code, referralCode);
        } else if (error) {
            console.error("Google Login Error:", error);
            setStatus('error');
            setMessage('Login dibatalkan atau gagal.');
            setErrorDetails(error);
        } else {
            // Unexpected entry
            navigate('/login');
        }
    }, [location]);

    const processCallback = async (code, referralCode) => {
        try {
            // Must match the redirect_uri used in LoginPage.js exactly
            const redirectUri = `${window.location.origin}/auth/google/callback`;

            const res = await axios.post('/api/auth/google/callback', { 
                code, 
                redirectUri,
                referral_code: referralCode 
            });
            
            const { token, user } = res.data;
            
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            setStatus('success');
            setMessage(`Selamat datang, ${user.name}!`);
            
            // Cleanup query params
            window.history.replaceState({}, document.title, window.location.pathname);
            
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);

        } catch (err) {
            console.error("Google Callback Backend Error:", err);
            setStatus('error');
            setMessage('Login Gagal pada Server.');
            
            const backendError = err.response?.data?.error;
            if (backendError && backendError.includes('Redirect URI mismatch')) {
                setErrorDetails(`Konfigurasi URL Callback salah. Mohon tambahkan URL ini ke Google Console: ${window.location.origin}/auth/google/callback`);
            } else {
                setErrorDetails(backendError || err.message);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full text-center border border-gray-100">
                {status === 'processing' && (
                    <div className="flex flex-col items-center py-4">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                        <h3 className="text-lg font-bold text-gray-800">Menghubungkan...</h3>
                        <p className="text-gray-500 mt-1 text-sm">Memverifikasi akun Google Anda</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center animate-in zoom-in py-4">
                        <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                        <h3 className="text-xl font-bold text-gray-800">Success!</h3>
                        <p className="text-gray-500 mt-2 text-sm">{message}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center animate-in zoom-in py-4">
                        <XCircle className="w-12 h-12 text-red-500 mb-4" />
                        <h3 className="text-xl font-bold text-gray-800">Login Failed</h3>
                        <p className="text-red-500 mt-2 text-sm font-medium">{message}</p>
                        
                        {errorDetails && (
                            <div className="bg-red-50 text-red-800 p-3 rounded text-xs mt-3 w-full break-words text-left border border-red-100">
                                <strong>Details:</strong> {errorDetails}
                            </div>
                        )}

                        <button 
                            onClick={() => navigate('/login')}
                            className="mt-6 w-full px-4 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
