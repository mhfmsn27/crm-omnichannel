import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Lock, Mail, User, Building, Loader2, Facebook, ArrowRight, Phone, ChevronLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../config/api';
import { motion, AnimatePresence } from 'framer-motion';

// Use Environment Variable for Google & Facebook
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// UPDATED: Use specific FACEBOOK_APP_ID for Login/Register flow
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

const InputField = ({ icon: Icon, type, name, placeholder, value, onChange, isPassToggle, isPasswordVisible, onTogglePassword, autoComplete, maxLength }) => (
    <div className="relative group">
        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
            {name === 'orgName' ? 'Business Name' : name.replace(/([A-Z])/g, ' $1').trim()}
        </label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {Icon && <Icon className="text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />}
            </div>
            <input
                type={isPassToggle ? (isPasswordVisible ? "text" : "password") : type}
                name={name}
                value={value}
                onChange={onChange}
                required
                maxLength={maxLength}
                autoComplete={autoComplete}
                className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white dark:focus:bg-dark-surface transition-all duration-200 text-base sm:text-sm`}
                placeholder={placeholder}
            />
            {isPassToggle && (
                <button
                    type="button"
                    onClick={onTogglePassword}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer p-2"
                >
                    {isPasswordVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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

    const [view, setView] = useState(initialView);
    const [loading, setLoading] = useState(false);

    // Forms State
    const [formData, setFormData] = useState({
        email: '', password: '', name: '', phone: '', orgName: '', confirmPassword: ''
    });

    const [resetToken, setResetToken] = useState('');
    const [showPass, setShowPass] = useState({ login: false, reg: false, confirm: false });

    // Handle URL query params overrides
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const viewParam = params.get('view');
        const refCode = params.get('ref');
        const token = params.get('token');

        if (viewParam === 'login' || viewParam === 'forgot' || viewParam === 'reset') {
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
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(formData.email, formData.password);
            toast.success('Welcome back!');
            navigate('/inbox');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) return toast.error("Passwords do not match");
        if (formData.password.length < 6) return toast.error("Password too short");

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
                toast.success("Welcome! Registration successful.");
                navigate('/inbox');
            } else {
                toast.success("Registrasi berhasil! Silakan login.");
                setView('login');
                setFormData({ ...formData, password: '', confirmPassword: '' });
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/auth/forgot-password', { email: formData.email });
            toast.success("If account exists, email sent!");
        } catch (err) {
            toast.error("Request failed");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) return toast.error("Passwords do not match");
        setLoading(true);
        try {
            await axios.post('/api/auth/reset-password', { token: resetToken, password: formData.password });
            toast.success("Password reset successful! Please login.");
            setView('login');
        } catch (err) {
            toast.error(err.response?.data?.error || "Reset failed.");
        } finally {
            setLoading(false);
        }
    };

    // --- SOCIAL LOGIN HANDLERS ---
    const handleGoogleLogin = () => {
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const scope = 'profile email';
        const refCode = localStorage.getItem('referral_code') || '';

        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${refCode}`;

        window.location.href = url;
    };

    const handleFacebookLogin = () => {
        if (!FACEBOOK_APP_ID) {
            toast.error("Facebook App ID is missing in configuration (VITE_FACEBOOK_APP_ID).");
            return;
        }

        const redirectUri = `${window.location.origin}/auth/facebook/callback`;
        const scope = 'email,public_profile';
        const refCode = localStorage.getItem('referral_code') || 'fb_login';

        const url = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${refCode}`;

        window.location.href = url;
    };

    const slideVariants = {
        enter: (direction) => ({ x: direction > 0 ? 50 : -50, opacity: 0, scale: 0.95 }),
        center: { zIndex: 1, x: 0, opacity: 1, scale: 1 },
        exit: (direction) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0, scale: 0.95 })
    };

    const direction = view === 'register' ? 1 : -1;

    const getHeaderTitle = () => {
        if (view === 'login') return 'Welcome Back';
        if (view === 'register') return 'Create Account';
        if (view === 'forgot') return 'Reset Password';
        if (view === 'reset') return 'Set New Password';
    };

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg md:bg-gray-50 dark:md:bg-dark-bg flex overflow-hidden">

            {/* LEFT SIDE: FORM */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 md:p-12 relative bg-white dark:bg-dark-surface z-10 lg:shadow-2xl lg:shadow-indigo-100 h-screen overflow-y-auto">
                <div className="w-full max-w-md mx-auto my-auto">

                    <div className="flex flex-col items-center mb-8">
                        {config.app_logo ? (
                            <img src={getApiUrl(config.app_logo)} alt="Logo" className="h-12 mb-4 object-contain" />
                        ) : (
                            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4 transform -rotate-3">
                                <span className="text-2xl font-extrabold text-white">{config.app_name?.charAt(0) || 'R'}</span>
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-gray-900 text-center tracking-tight">{getHeaderTitle()}</h2>
                        <p className="text-gray-500 text-center mt-2 text-sm">Join thousands of businesses growing with us.</p>
                    </div>


                    <div className="relative min-h-[400px]">
                        <AnimatePresence initial={false} custom={direction} mode="wait">

                            {/* LOGIN */}
                            {view === 'login' && (
                                <motion.div key="login" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="w-full absolute top-0 left-0">
                                    <form onSubmit={handleLogin} className="space-y-5">
                                        <InputField icon={Mail} type="email" name="email" placeholder="name@company.com" value={formData.email} onChange={handleChange} autoComplete="email" />
                                        <InputField icon={Lock} type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} isPassToggle={true} isPasswordVisible={showPass.login} onTogglePassword={() => setShowPass(prev => ({ ...prev, login: !prev.login }))} autoComplete="current-password" />
                                        <div className="flex items-center justify-between text-sm">
                                            <label className="flex items-center cursor-pointer group"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" /><span className="ml-2 text-gray-600">Remember me</span></label>
                                            <button type="button" onClick={() => setView('forgot')} className="text-indigo-600 font-bold">Forgot password?</button>
                                        </div>
                                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70">
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-5 h-5" /></>}
                                        </button>
                                    </form>
                                    {/* <div className="mt-8 text-center"><p className="text-gray-600 text-sm">Don't have an account? <button onClick={() => setView('register')} className="text-indigo-600 font-bold hover:underline ml-1">Sign up</button></p></div> */}
                                </motion.div>
                            )}

                            {/* REGISTER (DIRECT) - Disabled for Personal Version */}
                            {/* {view === 'register' && (
                                <motion.div key="register" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="w-full absolute top-0 left-0">
                                    <form onSubmit={handleRegister} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField icon={User} type="text" name="name" placeholder="John Doe" value={formData.name} onChange={handleChange} autoComplete="name" />
                                            <InputField icon={Phone} type="tel" name="phone" placeholder="628..." value={formData.phone} onChange={handleChange} autoComplete="tel" />
                                        </div>
                                        <InputField icon={Building} type="text" name="orgName" placeholder="Company Name" value={formData.orgName} onChange={handleChange} autoComplete="organization" />
                                        <InputField icon={Mail} type="email" name="email" placeholder="email@company.com" value={formData.email} onChange={handleChange} autoComplete="email" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField icon={Lock} type="password" name="password" placeholder="Min 6 chars" value={formData.password} onChange={handleChange} isPassToggle={true} isPasswordVisible={showPass.reg} onTogglePassword={() => setShowPass(prev => ({ ...prev, reg: !prev.reg }))} autoComplete="new-password" />
                                            <InputField icon={Lock} type="password" name="confirmPassword" placeholder="Confirm" value={formData.confirmPassword} onChange={handleChange} isPassToggle={true} isPasswordVisible={showPass.confirm} onTogglePassword={() => setShowPass(prev => ({ ...prev, confirm: !prev.confirm }))} autoComplete="new-password" />
                                        </div>
                                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70 mt-4">
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                                        </button>
                                    </form>
                                    <div className="mt-8 text-center"><p className="text-gray-600 text-sm">Already have an account? <button onClick={() => setView('login')} className="text-indigo-600 font-bold hover:underline ml-1">Log in</button></p></div>
                                </motion.div>
                            )} */}

                            {/* FORGOT & RESET views */}
                            {view === 'forgot' && (
                                <motion.div key="forgot" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="w-full absolute top-0 left-0">
                                    <form onSubmit={handleForgot} className="space-y-6">
                                        <InputField icon={Mail} type="email" name="email" placeholder="name@company.com" value={formData.email} onChange={handleChange} autoComplete="email" />
                                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-70">
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                                        </button>
                                    </form>
                                    <div className="mt-6 text-center"><button onClick={() => setView('login')} className="text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 mx-auto text-sm font-medium"><ChevronLeft className="w-4 h-4" /> Back to Login</button></div>
                                </motion.div>
                            )}

                            {view === 'reset' && (
                                <motion.div key="reset" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="w-full absolute top-0 left-0">
                                    <form onSubmit={handleReset} className="space-y-4">
                                        <InputField icon={Lock} type="password" name="password" placeholder="New Password" value={formData.password} onChange={handleChange} isPassToggle={true} isPasswordVisible={showPass.reg} onTogglePassword={() => setShowPass(prev => ({ ...prev, reg: !prev.reg }))} />
                                        <InputField icon={Lock} type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} isPassToggle={true} isPasswordVisible={showPass.confirm} onTogglePassword={() => setShowPass(prev => ({ ...prev, confirm: !prev.confirm }))} />
                                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-70 mt-4">
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                                        </button>
                                    </form>
                                    <div className="mt-6 text-center"><button onClick={() => setView('login')} className="text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 mx-auto text-sm font-medium"><ChevronLeft className="w-4 h-4" /> Back to Login</button></div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: BANNER */}
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
                {config.login_banner ? (
                    /* Custom banner image from settings */
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${getApiUrl(config.login_banner)})` }}
                    >
                        <div className="absolute inset-0 bg-[#075E54]/70 backdrop-blur-[2px]" />
                    </motion.div>
                ) : (
                    /* Default gradient background */
                    <div className="absolute inset-0 overflow-hidden bg-[#00A884]">
                        {/* Decorative blobs */}
                        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-20 translate-x-20" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-32 -translate-x-16" />
                        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/5 rounded-full -translate-x-24 -translate-y-24" />
                    </div>
                )}

                <div className="relative z-10 h-full flex flex-col justify-center px-14 text-white">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold mb-8 w-fit">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        All-in-One Omnichannel Platform
                    </div>

                    {/* Headline */}
                    <h2 className="text-4xl font-extrabold mb-4 leading-snug tracking-tight">
                        Kelola semua pesan<br />
                        <span className="text-green-200">
                            dalam satu tempat.
                        </span>
                    </h2>
                    <p className="text-white/65 text-sm mb-10 leading-relaxed max-w-xs">
                        WhatsApp, Instagram, Telegram, dan lebih banyak lagi — semuanya terhubung, semua terkelola.
                    </p>

                    {/* Feature list */}
                    <div className="space-y-3 mb-10">
                        {[
                            { icon: '💬', text: 'WhatsApp API Resmi & Unofficial' },
                            { icon: '🤖', text: 'Chatbot AI & Auto-Reply Otomatis' },
                            { icon: '📢', text: 'Broadcast ke Ribuan Kontak' },
                            { icon: '📊', text: 'Laporan & Analitik Real-time' },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 group">
                                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors flex-shrink-0 text-base">
                                    {item.icon}
                                </div>
                                <span className="text-sm font-medium text-white/90">{item.text}</span>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}