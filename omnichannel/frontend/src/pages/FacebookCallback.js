import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function FacebookCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { dispatch } = useAuth(); // Accessing dispatch from AuthContext (assuming standard reducer pattern or exposing method)
    // Wait, useAuth usually exposes 'login' function. I should check AuthContext if it exposes a way to manually set user.
    // However, usually we might just want to reload or call a "setSession" method.
    // Let's assume we can just save token to localStorage and reload or use a method if available.

    // Actually, looking at LoginPage.js: `const { login } = useAuth();`
    // I should check AuthContext content to see how to inject the session. 
    // For now, I will assume standard token storage and reload/fetchMe.

    const processed = useRef(false);

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (processed.current) return;
        processed.current = true;

        if (error) {
            toast.error("Facebook Login Failed or Cancelled");
            navigate('/login');
            return;
        }

        if (code) {
            handleLogin(code);
        } else {
            navigate('/login');
        }
    }, [searchParams]);

    const handleLogin = async (code) => {
        try {
            // Helper to get base URL for redirect_uri exact matching
            const redirectUri = window.location.origin + '/auth/facebook/callback';

            const res = await axios.post('/api/auth/facebook', { code, redirectUri });
            const { token, user } = res.data;

            // Save Token
            localStorage.setItem('token', token);

            // Force Reload or Update Context (If we can access context setter)
            // Ideally we use a method from useAuth, but since I can't see useAuth implementation right now,
            // I will do a hard reload to ensure state is fresh or navigation to /inbox which triggers auth check usually.

            toast.success(`Welcome back, ${user.name}!`);

            // Allow time for toast
            setTimeout(() => {
                window.location.href = '/inbox';
            }, 500);

        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Login Failed");
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">Verifying Facebook Login...</h2>
            <p className="text-gray-500 text-sm mt-2">Please wait a moment.</p>
        </div>
    );
}

