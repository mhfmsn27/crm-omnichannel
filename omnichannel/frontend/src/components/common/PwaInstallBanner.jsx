import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';
import Button from './Button';

export default function PwaInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (isStandalone) return;

        // Detect iOS Safari
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        const isSafari = isIosDevice && /webkit/.test(userAgent) && !/crios|fxios|opios/.test(userAgent);
        
        if (isSafari) {
            setIsIOS(true);
            const dismissed = localStorage.getItem('pwa_prompt_dismissed');
            if (!dismissed) {
                // Show banner after 3 seconds for iOS
                const t = setTimeout(() => setIsVisible(true), 3000);
                return () => clearTimeout(t);
            }
        }

        // Android / Desktop Chrome beforeinstallprompt event
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            const dismissed = localStorage.getItem('pwa_prompt_dismissed');
            if (!dismissed) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsVisible(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl border border-slate-800 shadow-2xl space-y-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 rounded-xl shadow-md text-white">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-white">Install CRMHUB App</h4>
                            <p className="text-[11px] text-slate-400">Akses cepat & notifikasi chat instan di HP</p>
                        </div>
                    </div>
                    <button onClick={handleDismiss} className="text-slate-400 hover:text-white p-1">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {isIOS ? (
                    <div className="text-[11px] bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 text-slate-300">
                        Ketuk tombol <strong>Share (Bagikan)</strong> di Safari, lalu pilih <strong>"Add to Home Screen (Tambah ke Layar Utama)"</strong> 📲
                    </div>
                ) : (
                    <div className="flex gap-2 pt-1">
                        <Button 
                            onClick={handleInstallClick} 
                            size="sm" 
                            fullWidth 
                            leftIcon={<Download className="w-3.5 h-3.5" />}
                            className="!bg-indigo-600 hover:!bg-indigo-700 text-white font-bold"
                        >
                            Install Sekarang
                        </Button>
                        <Button onClick={handleDismiss} size="sm" variant="outline" className="!text-slate-400 !border-slate-700">
                            Nanti
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
