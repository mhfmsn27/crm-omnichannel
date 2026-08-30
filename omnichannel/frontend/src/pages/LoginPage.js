import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
    Eye, EyeOff, Lock, Mail, User, Building, Loader2, 
    ArrowRight, Phone, ChevronLeft, ShieldCheck, CheckCircle2,
    MessageSquare, Smartphone, Zap, Bot, Globe
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../config/api';
import { motion, AnimatePresence } from 'framer-motion';

// Google & Facebook Environment Credentials
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

// Reusable Professional Input Field
const FormInput = ({ 
    icon: Icon, 
    label, 
    type, 
    name, 
    placeholder, 
    value, 
    onChange, 
    isPassword, 
    showPassword, 
    onTogglePassword, 
    autoComplete, 
    maxLength,
    required = true
}) => (
    <div className="space-y-1.5">
        <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide">
                {label || (name === 'orgName' ? 'Nama Perusahaan / Bisnis' : name)}
            </label>
        </div>
        <div className="relative">
            {Icon && (
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Icon className="w-4 h-4" />
                </div>
            )}
            <input
                type={isPassword ? (showPassword ? "text" : "password") : type}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                maxLength={maxLength}
                autoComplete={autoComplete}
                placeholder={placeholder}
                className={`w-full ${Icon ? 'pl-10' : 'pl-3.5'} pr-10 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-indigo-500/20 focus:border-slate-800 dark:focus:border-indigo-500 transition-all duration-150 shadow-sm`}
            />
            {isPassword && (
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={onTogglePassword}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            )}
        </div>
    </div>
);

export default function LoginPage({ initialView = 'login' }) {
    const { login, setAuthData } = useAuth();
    const { config } = useConfig();
    const navigate = useNavigate();
    const location = useLocation();

    const [view, setView] = useState(initialView); // 'login' | 'register' | 'forgot' | 'reset'
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    // Form States
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        phone: '',
        orgName: '',
        confirmPassword: ''
    });

    const [resetToken, setResetToken] = useState('');
    const [showPass, setShowPass] = useState({ login: false, reg: false, confirm: false });

    // Handle URL parameters
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const viewParam = params.get('view');
        const refCode = params.get('ref');
        const token = params.get('token');

        if (viewParam === 'login' || viewParam === 'register' || viewParam === 'forgot' || viewParam === 'reset') {
            setView(viewParam);
        }
        if (refCode) {
            localStorage.setItem('referral_code', refCode);
        }
        if (token) {
            setResetToken(token);
            if (viewParam !== 'reset') setView('reset');
        }
    }, [location.search]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // 1. Handle Login
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(formData.email, formData.password);
            toast.success('Autentikasi berhasil. Selamat datang!');
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Email atau password tidak valid');
        } finally {
            setLoading(false);
        }
    };

    // 2. Handle Register
    const handleRegister = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return toast.error("Konfirmasi password tidak cocok");
        }
        if (formData.password.length < 6) {
            return toast.error("Password minimal 6 karakter");
        }

        setLoading(true);
        try {
            const refCode = localStorage.getItem('referral_code');
            const res = await axios.post('/api/auth/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                orgName: formData.orgName,
                phone: formData.phone,
                ref: refCode
            });

            if (res.data.token && res.data.user) {
                setAuthData(res.data.token, res.data.user);
                toast.success("Akun berhasil dibuat. Selamat datang di CRMHUB!");
                navigate('/dashboard');
            } else {
                toast.success("Registrasi berhasil! Silakan masuk dengan akun baru Anda.");
                setView('login');
                setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Registrasi gagal. Silakan coba kembali.');
        } finally {
            setLoading(false);
        }
    };

    // 3. Handle Forgot Password
    const handleForgot = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/auth/forgot-password', { email: formData.email });
            toast.success("Tautan pemulihan kata sandi telah dikirim ke email Anda.");
        } catch (err) {
            toast.error("Permintaan gagal diproses. Pastikan email terdaftar.");
        } finally {
            setLoading(false);
        }
    };

    // 4. Handle Reset Password
    const handleReset = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return toast.error("Konfirmasi password tidak cocok");
        }
        setLoading(true);
        try {
            await axios.post('/api/auth/reset-password', { 
                token: resetToken, 
                password: formData.password 
            });
            toast.success("Password baru berhasil disimpan. Silakan masuk.");
            setView('login');
        } catch (err) {
            toast.error(err.response?.data?.error || "Gagal mengatur ulang kata sandi.");
        } finally {
            setLoading(false);
        }
    };

    // 5. Social Auth Handlers
    const handleGoogleLogin = () => {
        if (!GOOGLE_CLIENT_ID) {
            toast.error("Konfigurasi Google Client ID belum tersedia.");
            return;
        }
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const scope = 'profile email';
        const refCode = localStorage.getItem('referral_code') || '';
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${refCode}`;
        window.location.href = url;
    };

    const handleFacebookLogin = () => {
        if (!FACEBOOK_APP_ID) {
            toast.error("Konfigurasi Facebook App ID belum tersedia.");
            return;
        }
        const redirectUri = `${window.location.origin}/auth/facebook/callback`;
        const scope = 'email,public_profile';
        const refCode = localStorage.getItem('referral_code') || 'fb_login';
        const url = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${refCode}`;
        window.location.href = url;
    };

    const slideVariants = {
        enter: { opacity: 0, y: 8 },
        center: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 }
    };

    const getHeaderInfo = () => {
        switch (view) {
            case 'register':
                return {
                    title: 'Daftar Akun Baru',
                    subtitle: 'Mulai kelola komunikasi bisnis & omnichannel dalam hitungan menit.'
                };
            case 'forgot':
                return {
                    title: 'Pemulihan Kata Sandi',
                    subtitle: 'Masukkan email Anda untuk menerima instruksi reset password.'
                };
            case 'reset':
                return {
                    title: 'Buat Kata Sandi Baru',
                    subtitle: 'Tentukan password baru yang kuat untuk mengamankan akun Anda.'
                };
            case 'login':
            default:
                return {
                    title: 'Masuk ke Portal',
                    subtitle: 'Akses sistem omnichannel & CRM terintegrasi organisasi Anda.'
                };
        }
    };

    const header = getHeaderInfo();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center selection:bg-slate-900 selection:text-white">
            <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12">

                {/* ========================================================= */}
                {/* LEFT PANEL: AUTHENTICATION FORM (5 Cols LG)               */}
                {/* ========================================================= */}
                <div className="lg:col-span-5 flex flex-col justify-between bg-white dark:bg-slate-900 px-6 py-8 sm:px-12 md:px-16 lg:px-14 xl:px-16 border-r border-slate-200/80 dark:border-slate-800/80 shadow-sm z-10">
                    
                    {/* Top Branding */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {config.app_logo ? (
                                <img 
                                    src={getApiUrl(config.app_logo)} 
                                    alt={config.app_name || "Logo"} 
                                    className="h-9 w-auto max-w-[160px] object-contain" 
                                />
                            ) : (
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white shadow-sm font-bold text-base">
                                        {config.app_name?.charAt(0) || 'C'}
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white tracking-tight text-lg">
                                        {config.app_name || 'CRMHUB'}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-full font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>v2.0 Online</span>
                        </div>
                    </div>

                    {/* Form Center Container */}
                    <div className="my-auto py-8 w-full max-w-md mx-auto">
                        <div className="mb-6">
                            <h1 className="text-2xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                                {header.title}
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                {header.subtitle}
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {/* ---------------- LOGIN VIEW ---------------- */}
                            {view === 'login' && (
                                <motion.div 
                                    key="login" 
                                    variants={slideVariants} 
                                    initial="enter" 
                                    animate="center" 
                                    exit="exit" 
                                    transition={{ duration: 0.15 }}
                                    className="space-y-4"
                                >
                                    <form onSubmit={handleLogin} className="space-y-4">
                                        <FormInput 
                                            label="Email Akun"
                                            icon={Mail} 
                                            type="email" 
                                            name="email" 
                                            placeholder="nama@perusahaan.com" 
                                            value={formData.email} 
                                            onChange={handleChange} 
                                            autoComplete="email" 
                                        />

                                        <FormInput 
                                            label="Kata Sandi"
                                            icon={Lock} 
                                            type="password" 
                                            name="password" 
                                            placeholder="Masukkan kata sandi" 
                                            value={formData.password} 
                                            onChange={handleChange} 
                                            isPassword={true} 
                                            showPassword={showPass.login} 
                                            onTogglePassword={() => setShowPass(prev => ({ ...prev, login: !prev.login }))} 
                                            autoComplete="current-password" 
                                        />

                                        <div className="flex items-center justify-between text-xs pt-0.5">
                                            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-300">
                                                <input 
                                                    type="checkbox" 
                                                    checked={rememberMe}
                                                    onChange={(e) => setRememberMe(e.target.checked)}
                                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 dark:text-indigo-600 focus:ring-slate-900 dark:focus:ring-indigo-500" 
                                                />
                                                <span>Ingat saya di perangkat ini</span>
                                            </label>
                                            
                                            <button 
                                                type="button" 
                                                onClick={() => setView('forgot')} 
                                                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
                                            >
                                                Lupa password?
                                            </button>
                                        </div>

                                        <button 
                                            type="submit" 
                                            disabled={loading} 
                                            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-150 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] mt-2"
                                        >
                                            {loading ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                            ) : (
                                                <>
                                                    <span>Masuk ke Dashboard</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    {/* Social Auth (Google & Facebook) */}
                                    {(GOOGLE_CLIENT_ID || FACEBOOK_APP_ID) && (
                                        <div className="pt-3">
                                            <div className="relative flex items-center justify-center my-3">
                                                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                                                <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 font-medium uppercase tracking-wider absolute">
                                                    Atau
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                                {GOOGLE_CLIENT_ID && (
                                                    <button
                                                        type="button"
                                                        onClick={handleGoogleLogin}
                                                        className="w-full flex items-center justify-center gap-2.5 py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                                                    >
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                                                            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                                                            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"/>
                                                            <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.8-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"/>
                                                        </svg>
                                                        <span>Google Account</span>
                                                    </button>
                                                )}

                                                {FACEBOOK_APP_ID && (
                                                    <button
                                                        type="button"
                                                        onClick={handleFacebookLogin}
                                                        className="w-full flex items-center justify-center gap-2.5 py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                                                    >
                                                        <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                                        </svg>
                                                        <span>Meta / Facebook</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Register prompt (if enabled in policy) */}
                                    <div className="text-center pt-2">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Belum memiliki akun organisasi?{' '}
                                            <button 
                                                type="button" 
                                                onClick={() => setView('register')} 
                                                className="text-slate-900 dark:text-indigo-400 font-semibold hover:underline"
                                            >
                                                Daftar Sekarang
                                            </button>
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* ---------------- REGISTER VIEW ---------------- */}
                            {view === 'register' && (
                                <motion.div 
                                    key="register" 
                                    variants={slideVariants} 
                                    initial="enter" 
                                    animate="center" 
                                    exit="exit" 
                                    transition={{ duration: 0.15 }}
                                    className="space-y-3.5"
                                >
                                    <form onSubmit={handleRegister} className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <FormInput 
                                                label="Nama Lengkap"
                                                icon={User} 
                                                type="text" 
                                                name="name" 
                                                placeholder="Budi Santoso" 
                                                value={formData.name} 
                                                onChange={handleChange} 
                                                autoComplete="name" 
                                            />
                                            <FormInput 
                                                label="No. WhatsApp"
                                                icon={Phone} 
                                                type="tel" 
                                                name="phone" 
                                                placeholder="08123456789" 
                                                value={formData.phone} 
                                                onChange={handleChange} 
                                                autoComplete="tel" 
                                            />
                                        </div>

                                        <FormInput 
                                            label="Nama Bisnis / Organisasi"
                                            icon={Building} 
                                            type="text" 
                                            name="orgName" 
                                            placeholder="PT Sukses Bersama" 
                                            value={formData.orgName} 
                                            onChange={handleChange} 
                                            autoComplete="organization" 
                                        />

                                        <FormInput 
                                            label="Email Organisasi"
                                            icon={Mail} 
                                            type="email" 
                                            name="email" 
                                            placeholder="admin@perusahaan.com" 
                                            value={formData.email} 
                                            onChange={handleChange} 
                                            autoComplete="email" 
                                        />

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <FormInput 
                                                label="Kata Sandi"
                                                icon={Lock} 
                                                type="password" 
                                                name="password" 
                                                placeholder="Min. 6 karakter" 
                                                value={formData.password} 
                                                onChange={handleChange} 
                                                isPassword={true} 
                                                showPassword={showPass.reg} 
                                                onTogglePassword={() => setShowPass(prev => ({ ...prev, reg: !prev.reg }))} 
                                                autoComplete="new-password" 
                                            />
                                            <FormInput 
                                                label="Ulangi Kata Sandi"
                                                icon={Lock} 
                                                type="password" 
                                                name="confirmPassword" 
                                                placeholder="Konfirmasi password" 
                                                value={formData.confirmPassword} 
                                                onChange={handleChange} 
                                                isPassword={true} 
                                                showPassword={showPass.confirm} 
                                                onTogglePassword={() => setShowPass(prev => ({ ...prev, confirm: !prev.confirm }))} 
                                                autoComplete="new-password" 
                                            />
                                        </div>

                                        <button 
                                            type="submit" 
                                            disabled={loading} 
                                            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-150 shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] mt-2"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buat Akun Organisasi'}
                                        </button>
                                    </form>

                                    <div className="text-center pt-1">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Sudah memiliki akun?{' '}
                                            <button 
                                                type="button" 
                                                onClick={() => setView('login')} 
                                                className="text-slate-900 dark:text-indigo-400 font-semibold hover:underline"
                                            >
                                                Masuk Disini
                                            </button>
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* ---------------- FORGOT PASSWORD VIEW ---------------- */}
                            {view === 'forgot' && (
                                <motion.div 
                                    key="forgot" 
                                    variants={slideVariants} 
                                    initial="enter" 
                                    animate="center" 
                                    exit="exit" 
                                    transition={{ duration: 0.15 }}
                                    className="space-y-4"
                                >
                                    <form onSubmit={handleForgot} className="space-y-4">
                                        <FormInput 
                                            label="Email Terdaftar"
                                            icon={Mail} 
                                            type="email" 
                                            name="email" 
                                            placeholder="nama@perusahaan.com" 
                                            value={formData.email} 
                                            onChange={handleChange} 
                                            autoComplete="email" 
                                        />

                                        <button 
                                            type="submit" 
                                            disabled={loading} 
                                            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kirim Tautan Pemulihan'}
                                        </button>
                                    </form>

                                    <div className="text-center pt-2">
                                        <button 
                                            type="button"
                                            onClick={() => setView('login')} 
                                            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium inline-flex items-center gap-1 transition-colors"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                            Kembali ke Halaman Masuk
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ---------------- RESET PASSWORD VIEW ---------------- */}
                            {view === 'reset' && (
                                <motion.div 
                                    key="reset" 
                                    variants={slideVariants} 
                                    initial="enter" 
                                    animate="center" 
                                    exit="exit" 
                                    transition={{ duration: 0.15 }}
                                    className="space-y-4"
                                >
                                    <form onSubmit={handleReset} className="space-y-4">
                                        <FormInput 
                                            label="Kata Sandi Baru"
                                            icon={Lock} 
                                            type="password" 
                                            name="password" 
                                            placeholder="Minimal 6 karakter" 
                                            value={formData.password} 
                                            onChange={handleChange} 
                                            isPassword={true} 
                                            showPassword={showPass.reg} 
                                            onTogglePassword={() => setShowPass(prev => ({ ...prev, reg: !prev.reg }))} 
                                        />

                                        <FormInput 
                                            label="Konfirmasi Kata Sandi Baru"
                                            icon={Lock} 
                                            type="password" 
                                            name="confirmPassword" 
                                            placeholder="Ulangi kata sandi baru" 
                                            value={formData.confirmPassword} 
                                            onChange={handleChange} 
                                            isPassword={true} 
                                            showPassword={showPass.confirm} 
                                            onTogglePassword={() => setShowPass(prev => ({ ...prev, confirm: !prev.confirm }))} 
                                        />

                                        <button 
                                            type="submit" 
                                            disabled={loading} 
                                            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Perbarui Kata Sandi'}
                                        </button>
                                    </form>

                                    <div className="text-center pt-2">
                                        <button 
                                            type="button"
                                            onClick={() => setView('login')} 
                                            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium inline-flex items-center gap-1 transition-colors"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                            Kembali ke Halaman Masuk
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Bottom Security Footer */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>SSL 256-bit Enkripsi Terproteksi</span>
                        </div>
                        <span>© {new Date().getFullYear()} {config.app_name || 'CRMHUB'} Inc.</span>
                    </div>
                </div>

                {/* ========================================================= */}
                {/* RIGHT PANEL: ENTERPRISE SHOWCASE & METRICS (7 Cols LG)   */}
                {/* ========================================================= */}
                <div className="hidden lg:flex lg:col-span-7 bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden flex-col justify-between p-12 xl:p-16 border-l border-slate-800">
                    
                    {/* Subtle Architectural Grid Background (Zero flashy gradients) */}
                    <div 
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                            backgroundSize: '24px 24px'
                        }}
                    />

                    {/* Top Status Header */}
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-slate-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Omnichannel Node Gateway: Active</span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                            Multi-Session Baileys + Meta Cloud API
                        </div>
                    </div>

                    {/* Middle: Feature Showcase with Live Preview Mockup */}
                    <div className="relative z-10 my-auto py-8 max-w-xl">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold tracking-wide uppercase">
                                <Zap className="w-3.5 h-3.5" />
                                <span>Platform Komunikasi Terpadu</span>
                            </div>

                            <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
                                Satukan Seluruh Interaksi Pelanggan dalam Satu Dasbor.
                            </h2>

                            <p className="text-sm xl:text-base text-slate-400 leading-relaxed max-w-lg">
                                Kelola percakapan WhatsApp, Instagram, Telegram, dan Email secara real-time dengan bantuan AI Copilot dan pembagian tim otomatis.
                            </p>
                        </div>

                        {/* Interactive UI Live Stream Mockup */}
                        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl p-4 backdrop-blur-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 text-xs text-slate-400">
                                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                                    Aktivitas Pesan Masuk Terkini
                                </span>
                                <span className="text-[11px] font-mono text-emerald-400">Realtime Sync (85ms)</span>
                            </div>

                            {/* Stream Item 1: WhatsApp */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40 text-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                                        WA
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-200">PT Maju Makmur (+62 812-3456-7890)</p>
                                        <p className="text-[11px] text-slate-400 truncate max-w-[260px]">Invoice #INV-2026-08 telah terbayar lunas.</p>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                                    Auto-Resolved
                                </span>
                            </div>

                            {/* Stream Item 2: Instagram */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40 text-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-md bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                                        IG
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-200">@retail_partner</p>
                                        <p className="text-[11px] text-slate-400 truncate max-w-[260px]">Apakah ada promo langganan tahunan untuk 10 agen?</p>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
                                    Agent Budi
                                </span>
                            </div>

                            {/* Stream Item 3: AI Copilot */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40 text-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                                        AI
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-200">AI Copilot Smart Reply</p>
                                        <p className="text-[11px] text-slate-400 truncate max-w-[260px]">Draft balasan otomatis disiapkan dengan akurasi 98%.</p>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Bot className="w-2.5 h-2.5" /> Ready
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Formal Metrics Bar */}
                    <div className="relative z-10 border-t border-slate-800 pt-6 grid grid-cols-3 gap-6">
                        <div>
                            <p className="text-xl font-bold text-white tracking-tight">99.9%</p>
                            <p className="text-xs text-slate-400 mt-0.5">Uptime Availability SLA</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white tracking-tight">Multi-Session</p>
                            <p className="text-xs text-slate-400 mt-0.5">WhatsApp QR & Official CoEx</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white tracking-tight">AES-256</p>
                            <p className="text-xs text-slate-400 mt-0.5">Enkripsi Data Terisolasi</p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}