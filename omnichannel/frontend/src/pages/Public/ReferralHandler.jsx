import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../config/api';

const ReferralHandler = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // processing, done

    useEffect(() => {
        if (!code) {
            navigate('/register');
            return;
        }

        const trackAndRedirect = async () => {
            // Artificial delay for better UX (so they see the branding/spinner briefly)? 
            // Or instant. Let's do fast.
            try {
                // Tracking (Fire and forget? No, wait for it to ensure count)
                await axios.get(`/api/ref/${code}?json=true`);
            } catch (err) {
                console.error("Referral Tracking Failed", err);
                // Proceed anyway, don't block user registration
            } finally {
                // Navigate to register with code
                navigate(`/register?ref=${code}`);
            }
        };

        trackAndRedirect();
    }, [code, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-500 dark:text-slate-400 font-medium">Memproses referral...</p>
        </div>
    );
};

export default ReferralHandler;
