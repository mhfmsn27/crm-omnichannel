
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
    Menu, X, MessageSquare, Zap, Bot, Users, BarChart2, CheckCircle, 
    Play, ArrowRight, Globe, Shield, Smartphone, CreditCard, Mail, Instagram, Facebook, Send, ChevronDown, Star, Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiUrl } from '../../config/api';
import { useConfig } from '../../context/ConfigContext';

// --- COMPONENTS ---

const Navbar = ({ logo, appName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Fitur', href: '#features' },
        { name: 'Cara Kerja', href: '#how-it-works' },
        { name: 'Harga', href: '#pricing' },
        { name: 'FAQ', href: '#faq' }
    ];

    return (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-[#0B0F19]/80 backdrop-blur-md shadow-lg border-b border-white/10 py-3' : 'bg-transparent py-5'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {logo ? (
                        <img src={getApiUrl(logo)} alt="Logo" className="h-8 w-auto" />
                    ) : (
                        <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-500/20">
                            {appName ? appName.charAt(0) : 'R'}
                        </div>
                    )}
                    <span className="font-bold text-xl text-white tracking-wide">{appName}</span>
                </div>

                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map(link => (
                        <a key={link.name} href={link.href} className="text-sm font-medium text-gray-300 hover:text-amber-400 transition-colors">
                            {link.name}
                        </a>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <Link to="/login" className="text-sm font-bold text-gray-300 hover:text-white transition-colors">Login</Link>
                    <Link to="/login?view=register" className="px-6 py-2.5 bg-amber-400 text-white rounded-full text-sm font-bold hover:shadow-lg hover:shadow-amber-500/30 transition-all hover:scale-105 border border-white/10">
                        Coba Gratis
                    </Link>
                </div>

                <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-gray-300 hover:text-white">
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-[#0f172a] border-b border-white/10 overflow-hidden"
                    >
                        <div className="px-4 py-6 space-y-4 flex flex-col">
                            {navLinks.map(link => (
                                <a key={link.name} href={link.href} onClick={() => setIsOpen(false)} className="text-base font-medium text-gray-300 hover:text-amber-400">
                                    {link.name}
                                </a>
                            ))}
                            <hr className="border-white/10"/>
                            <Link to="/login" className="text-base font-bold text-white">Login</Link>
                            <Link to="/login?view=register" className="w-full py-3 bg-amber-400 text-white rounded-lg text-center font-bold shadow-lg">
                                Coba Gratis
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

const HeroSection = ({ content }) => {
    if (!content) return null;
    return (
        <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden relative bg-[#0B0F19]">
            {/* Galaxy Background Effects */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-900/30 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/30 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-amber-400 text-xs font-bold mb-6 backdrop-blur-sm">
                            <Star className="w-3 h-3 fill-current" /> #1 Customer Support Platform
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                            {content.title?.split(' ').slice(0, -2).join(' ') || "Kelola Customer Support"} <br/>
                            <span className="text-amber-300">
                                {content.title?.split(' ').slice(-2).join(' ') || "Satu Dashboard."}
                            </span>
                        </h1>
                        <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                            {content.subtitle || "Tingkatkan respons tim CS Anda, kirim broadcast tanpa batas, dan otomatisasi dengan AI. Tanpa perlu coding."}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to={content.cta_link || "/login?view=register"} className="px-8 py-4 bg-amber-400 text-white rounded-full text-base font-bold hover:shadow-lg hover:shadow-amber-500/40 transition-transform hover:scale-105 text-center">
                                {content.cta_text || "Mulai Uji Coba Gratis"}
                            </Link>
                            <button className="px-8 py-4 bg-white/5 text-white border border-white/10 rounded-full text-base font-bold hover:bg-white/10 flex items-center justify-center gap-2 transition-colors backdrop-blur-sm">
                                <Play className="w-4 h-4 fill-current" /> Lihat Demo
                            </button>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10">
                            <p className="text-sm text-slate-400 font-medium mb-3">Dipercaya oleh 500+ Bisnis</p>
                            <div className="flex -space-x-3">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full bg-slate-800 border-2 border-[#0B0F19] flex items-center justify-center text-xs text-slate-500">
                                        <Users className="w-4 h-4" />
                                    </div>
                                ))}
                                <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-[#0B0F19] flex items-center justify-center text-xs text-white font-bold">
                                    +500
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="absolute -inset-1 bg-amber-500 rounded-2xl blur opacity-30"></div>
                        {content.image_url ? (
                            <img 
                                src={getApiUrl(content.image_url)} 
                                alt="Dashboard Preview" 
                                className="relative rounded-2xl shadow-2xl border border-white/10 bg-[#1e293b] w-full transform rotate-1 hover:rotate-0 transition-transform duration-500"
                            />
                        ) : (
                            <div className="aspect-video bg-[#1e293b] rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl relative overflow-hidden group">
                                <div className="text-center z-10">
                                    <div className="w-20 h-20 bg-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                                        <Play className="w-8 h-8 text-white fill-current ml-1" />
                                    </div>
                                    <span className="text-white font-bold text-lg">Lihat Dashboard Beraksi</span>
                                </div>
                                {/* Grid pattern */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

const FeatureCard = ({ icon: Icon, title, desc }) => (
    <div className="bg-[#15192B] p-8 rounded-2xl border border-white/5 shadow-lg hover:border-amber-500/50 hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 group">
        <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center text-amber-400 mb-6 group-hover:bg-amber-400 group-hover:text-white transition-all border border-white/10">
            <Icon className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber-400 transition-colors">{title}</h3>
        <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
    </div>
);

const ICON_MAP = {
    'message-square': MessageSquare,
    'zap': Zap,
    'bot': Bot,
    'users': Users,
    'bar-chart-2': BarChart2,
    'smartphone': Smartphone,
    'globe': Globe,
    'shield': Shield,
    'key': Key
};

const FeaturesSection = ({ features }) => {
    const defaultFeatures = [
        { title: 'Unified Inbox', desc: 'Gabungkan WA, Telegram, FB, IG di satu tempat.', icon: 'message-square' },
        { title: 'Broadcast & Rotator', desc: 'Kirim pesan massal aman dengan rotasi nomor otomatis.', icon: 'zap' },
        { title: 'Chatbot AI', desc: 'Balas pelanggan 24/7 dengan kecerdasan buatan Gemini.', icon: 'bot' },
        { title: 'CRM & Kontak', desc: 'Kelola database pelanggan dan label dengan mudah.', icon: 'users' },
        { title: 'Tim & Peran', desc: 'Atur akses Super Agen dan Agen Biasa.', icon: 'key' },
        { title: 'Analitik Lengkap', desc: 'Pantau kinerja tim dan efektivitas kampanye.', icon: 'bar-chart-2' }
    ];

    const list = (features && features.length > 0) ? features : defaultFeatures;

    return (
        <section id="features" className="py-24 bg-[#0f1421] relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-900/10 rounded-full blur-[150px] pointer-events-none"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="text-amber-400 font-bold text-sm uppercase tracking-widest mb-2 block">Powerful Features</span>
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-6">Semua Fitur yang Anda Butuhkan</h2>
                    <p className="text-slate-400 text-lg">
                        Satu platform untuk mengelola seluruh komunikasi bisnis Anda dengan teknologi terdepan.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {list.map((feat, idx) => {
                        let IconComp = Zap;
                        if (feat.icon && ICON_MAP[feat.icon.toLowerCase()]) {
                            IconComp = ICON_MAP[feat.icon.toLowerCase()];
                        }
                        return <FeatureCard key={idx} icon={IconComp} title={feat.title} desc={feat.desc} />;
                    })}
                </div>
            </div>
        </section>
    );
};

const HowItWorksSection = ({ steps }) => {
    const defaultSteps = [
        { title: 'Daftar & Hubungkan', desc: 'Daftar akun dan scan QR Code WhatsApp untuk menghubungkan device Anda dalam hitungan detik.', image_url: '' },
        { title: 'Undang Tim Anda', desc: 'Tambahkan anggota tim CS, atur role mereka, dan bagi beban kerja secara merata.', image_url: '' },
        { title: 'Mulai Melayani', desc: 'Balas pesan dari inbox bersama, kirim broadcast, atau aktifkan chatbot AI.', image_url: '' }
    ];
    
    const list = (steps && steps.length > 0) ? steps : defaultSteps;

    return (
        <section id="how-it-works" className="py-24 bg-[#0B0F19]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                    <h2 className="text-3xl font-extrabold text-white">Cara Kerja</h2>
                    <p className="text-slate-400 mt-4 text-lg">Mudah digunakan, siap dalam 3 langkah.</p>
                </div>

                <div className="space-y-24">
                    {list.map((step, idx) => (
                        <div key={idx} className={`flex flex-col md:flex-row gap-12 items-center ${idx % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                            <div className="flex-1">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-400 text-white font-bold text-xl mb-6 shadow-lg shadow-amber-500/20">
                                    {idx + 1}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                                <p className="text-slate-400 text-lg leading-relaxed">{step.desc}</p>
                            </div>
                            <div className="flex-1 w-full">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                                    {step.image_url ? (
                                        <img src={getApiUrl(step.image_url)} alt={step.title} className="relative rounded-xl shadow-2xl border border-white/10 w-full object-cover bg-[#1e293b]" />
                                    ) : (
                                        <div className="relative aspect-video bg-[#1e293b] rounded-xl shadow-2xl border border-white/10 flex flex-col items-center justify-center text-slate-500 p-8 overflow-hidden">
                                            <div className="absolute inset-0 bg-grid-slate-700/[0.1] bg-[size:32px_32px]"></div>
                                            <span className="text-8xl font-bold opacity-10 z-10 text-white">{idx + 1}</span>
                                            <p className="z-10 font-medium text-white/50">Ilustrasi {step.title}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const PricingCard = ({ plan, isYearly }) => {
    const price = isYearly 
        ? (plan.price_yearly_promo || plan.price_yearly) 
        : (plan.price_monthly_promo || plan.price_monthly);
    
    const period = isYearly ? 'tahun' : 'bulan';

    const isHighlight = plan.name.toLowerCase().includes('pro') || plan.name.toLowerCase().includes('value');

    return (
        <div className={`p-8 rounded-2xl border flex flex-col transition-all duration-300 relative overflow-hidden ${isHighlight ? 'bg-[#15192B] border-amber-500/50 shadow-2xl shadow-amber-900/20 scale-105 z-10' : 'bg-[#0f1421] border-white/10 hover:border-white/20'}`}>
            {isHighlight && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                    Paling Laris
                </div>
            )}
            
            <div className="mb-6 pt-2">
                <h3 className={`text-xl font-bold mb-3 ${isHighlight ? 'text-amber-400' : 'text-white'}`}>{plan.name}</h3>
                <p className="text-sm text-slate-400 min-h-[40px]">{plan.description}</p>
            </div>
            
            <div className="mb-8">
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">
                        {parseInt(price).toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs font-bold text-slate-500">rb</span>
                </div>
                <span className="text-slate-500 font-medium text-sm">/ {period}</span>
            </div>

            <Link 
                to={`/login?view=register&plan=${plan.id}`}
                className={`w-full py-3.5 rounded-full font-bold text-center transition-all mb-8 ${isHighlight ? 'bg-amber-400 text-white hover:shadow-lg hover:shadow-amber-500/25' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
                Pilih Paket Ini
            </Link>

            <div className="space-y-4 flex-1">
                {plan.features && plan.features.map((feat, i) => (
                    feat.is_enabled && (
                        <div key={i} className="flex items-start gap-3 text-sm text-slate-300">
                            <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isHighlight ? 'text-amber-400' : 'text-indigo-400'}`} />
                            <span className="leading-tight">
                                {feat.code === 'feat_broadcast_limit' ? `${feat.limit_value} Broadcast / bln` : 
                                 feat.code === 'feat_session_limit' ? `${feat.limit_value} Device Connected` :
                                 feat.code === 'feat_agent_limit' ? `${feat.limit_value} Agent Seats` :
                                 feat.code.replace('feat_', '').replace(/_/g, ' ')}
                            </span>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
};

const PricingSection = ({ plans, textContent }) => {
    const [isYearly, setIsYearly] = useState(false);

    return (
        <section id="pricing" className="py-24 bg-[#0f1421] relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-white">{textContent.title || "Pilih Paket Langganan"}</h2>
                    <p className="text-slate-400 mt-4 max-w-2xl mx-auto">{textContent.subtitle || "Harga transparan. Upgrade kapan saja sesuai pertumbuhan bisnis Anda."}</p>
                    
                    <div className="flex items-center justify-center mt-8 gap-4">
                        <span className={`text-sm font-bold ${!isYearly ? 'text-white' : 'text-slate-500'}`}>Bulanan</span>
                        <button 
                            onClick={() => setIsYearly(!isYearly)}
                            className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center ${isYearly ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'}`}
                        >
                            <div className="w-6 h-6 bg-white rounded-full shadow-md"></div>
                        </button>
                        <span className={`text-sm font-bold ${isYearly ? 'text-white' : 'text-slate-500'}`}>Tahunan <span className="text-amber-900 text-xs bg-amber-400 px-2 py-0.5 rounded-full ml-1 font-extrabold">Hemat 20%</span></span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map(plan => (
                        <PricingCard key={plan.id} plan={plan} isYearly={isYearly} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const TestimonialsSection = ({ testimonials }) => {
    const list = (testimonials && testimonials.length > 0) ? testimonials : [
        { name: "Andi Pratama", role: "CEO, Kopi Kenangan", quote: "Sangat membantu tim CS kami dalam mengelola ribuan chat setiap hari.", avatar_url: "" },
        { name: "Siti Aminah", role: "Owner, Hijab Chic", quote: "Fitur broadcast-nya juara! Aman dari banned dan konversinya tinggi.", avatar_url: "" },
        { name: "Budi Santoso", role: "Manager, Tech Corp", quote: "Integrasi API-nya sangat mudah. Kami bisa custom sesuai kebutuhan.", avatar_url: "" }
    ];

    return (
        <section className="py-24 bg-[#0B0F19]">
             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                 <div className="text-center mb-16">
                     <h2 className="text-3xl font-extrabold text-white">Apa Kata Mereka?</h2>
                     <p className="text-slate-400 mt-2">Bergabunglah dengan ribuan pebisnis sukses lainnya.</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     {list.map((item, idx) => (
                         <div key={idx} className="bg-[#15192B] p-8 rounded-2xl border border-white/5 relative">
                             <div className="absolute top-6 right-8 text-white/5">
                                 <MessageSquare className="w-12 h-12" />
                             </div>
                             <div className="flex mb-4">
                                 {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-amber-400 fill-current" />)}
                             </div>
                             <p className="text-slate-300 italic mb-6 relative z-10">"{item.quote}"</p>
                             <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-400 font-bold text-lg overflow-hidden border border-white/10">
                                     {item.avatar_url ? <img src={getApiUrl(item.avatar_url)} className="w-full h-full object-cover" alt={item.name}/> : item.name.charAt(0)}
                                 </div>
                                 <div>
                                     <h4 className="font-bold text-white text-sm">{item.name}</h4>
                                     <p className="text-xs text-slate-500">{item.role}</p>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
        </section>
    );
};

const FAQAccordion = ({ faqList }) => {
    const [openIndex, setOpenIndex] = useState(0);
    
    const list = (faqList && faqList.length > 0) ? faqList : [
        { q: "Apakah aman dari banned?", a: "Kami menggunakan teknologi rotator dan interval delay pintar untuk meminimalisir risiko banned. Namun, kebijakan konten WhatsApp tetap berlaku." },
        { q: "Bisa refund jika tidak cocok?", a: "Kami menyediakan garansi uang kembali 7 hari untuk paket tahunan jika terjadi kendala teknis yang tidak bisa diselesaikan." },
        { q: "Perlu install aplikasi di HP?", a: "Tidak perlu. Sistem kami berbasis Cloud (Web-based). Anda hanya perlu scan QR code sekali saja." }
    ];

    return (
        <section id="faq" className="py-24 bg-[#0f1421]">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-white">Pertanyaan Umum (FAQ)</h2>
                </div>

                <div className="space-y-4">
                    {list.map((item, idx) => (
                        <div key={idx} className="border border-white/10 rounded-xl overflow-hidden bg-[#15192B]">
                            <button 
                                onClick={() => setOpenIndex(openIndex === idx ? -1 : idx)}
                                className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-white/5 transition-colors"
                            >
                                <span className="font-bold text-slate-200">{item.q}</span>
                                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openIndex === idx ? 'rotate-180 text-amber-400' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {openIndex === idx && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                                            {item.a}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Footer = ({ appName }) => (
    <footer className="bg-black text-white py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                <div className="col-span-1 md:col-span-2">
                    <div className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                            {appName ? appName.charAt(0) : 'R'}
                        </div>
                        {appName}
                    </div>
                    <p className="text-slate-400 max-w-sm text-sm leading-relaxed">
                        Platform Customer Support #1 di Indonesia. Kelola semua pesan pelanggan Anda dengan mudah, cepat, dan terintegrasi AI.
                    </p>
                </div>
                <div>
                    <h4 className="font-bold mb-6 text-white">Produk</h4>
                    <ul className="space-y-3 text-sm text-slate-400">
                        <li><a href="#features" className="hover:text-amber-400 transition-colors">Fitur Unggulan</a></li>
                        <li><a href="#pricing" className="hover:text-amber-400 transition-colors">Harga Paket</a></li>
                        <li><Link to="/login" className="hover:text-amber-400 transition-colors">Login Member</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-6 text-white">Hubungi Kami</h4>
                    <div className="flex gap-4">
                        <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-amber-500 hover:text-white transition-colors text-slate-400"><Instagram className="w-4 h-4" /></a>
                        <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-blue-600 hover:text-white transition-colors text-slate-400"><Facebook className="w-4 h-4" /></a>
                        <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-green-500 hover:text-white transition-colors text-slate-400"><MessageSquare className="w-4 h-4" /></a>
                    </div>
                    <p className="mt-6 text-sm text-slate-500">Jakarta, Indonesia</p>
                </div>
            </div>
            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
                <p>&copy; {new Date().getFullYear()} <a href="https://wa.me/6281317666780" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition-colors">Digital Inovasi</a>. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                    <Link to="/p/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                    <Link to="/p/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                </div>
            </div>
        </div>
    </footer>
);

// --- MAIN PAGE ---

export default function LandingPage() {
    const [content, setContent] = useState(null);
    const [plans, setPlans] = useState([]);
    const { config } = useConfig();

    useEffect(() => {
        // Fetch CMS Content
        axios.get('/api/public/landing').then(res => setContent(res.data)).catch(() => {});
        // Fetch Plans
        axios.get('/api/public/plans').then(res => setPlans(res.data)).catch(() => {});
    }, []);

    // Loading State
    if (!content) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
    );

    return (
        <div className="font-sans text-gray-900 bg-[#0B0F19] selection:bg-amber-500/30 selection:text-amber-100">
            <Navbar logo={config.app_logo} appName={config.app_name} />
            
            <HeroSection content={content.hero} />
            
            <FeaturesSection features={content.features} />
            
            <HowItWorksSection steps={content.how_it_works} />
            
            <PricingSection plans={plans} textContent={content.pricing || {}} />
            
            <TestimonialsSection testimonials={content.testimonials} />
            
            <FAQAccordion faqList={content.faq} />

            <Footer appName={config.app_name} />
        </div>
    );
}
