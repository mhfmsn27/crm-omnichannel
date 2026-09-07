import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Bell, CheckCircle } from 'lucide-react';
import Button from './Button';
import { requestNotificationPermission } from '../../utils/pwaHelper';

export default function PwaInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [needsNotification, setNeedsNotification] = useState(false);
    const [notifGranted, setNotifGranted] = useState(false);

    useEffect(() => {
        // Check standalone / installed mode
        const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        setIsStandalone(standalone);

        // Check Notification Permission
        if ('Notification' in window) {
            setNeedsNotification(Notification.permission === 'default');
            setNotifGranted(Notification.permission === 'granted');
        }

        // Detect iOS Safari
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        const isSafari = isIosDevice && /webkit/.test(userAgent) && !/crios|fxios|opios/.test(userAgent);
        setIsIOS(isSafari);

        const isDismissed = () => {
            const dismissedUntil = localStorage.getItem('pwa_prompt_dismissed_until');
            if (!dismissedUntil) return false;
            return Date.now() < parseInt(dismissedUntil, 10);
        };

        if (isSafari && !standalone && !isDismissed()) {
            const t = setTimeout(() => setIsVisible(true), 2500);
            return () => clearTimeout(t);
        }

        // Android / Desktop Chrome beforeinstallprompt event
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            window.pwaDeferredPrompt = e; // make accessible to Header
            window.dispatchEvent(new CustomEvent('PWA_CAN_INSTALL'));
            if (!isDismissed()) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Allow manual trigger from Header or anywhere else
        const handleManualTrigger = () => {
            setIsVisible(true);
        };
        window.addEventListener('TRIGGER_PWA_INSTALL', handleManualTrigger);

        // If app is installed, handle appinstalled event
        const handleAppInstalled = () => {
            setIsVisible(false);
            setIsStandalone(true);
            setDeferredPrompt(null);
            window.pwaDeferredPrompt = null;
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('TRIGGER_PWA_INSTALL', handleManualTrigger);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        const prompt = deferredPrompt || window.pwaDeferredPrompt;
        if (prompt) {
            prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === 'accepted') {
                setIsVisible(false);
                setIsStandalone(true);
            }
            setDeferredPrompt(null);
            window.pwaDeferredPrompt = null;
        }
    };

    const handleEnableNotification = async () => {
        const granted = await requestNotificationPermission();
        if (granted) {
            setNotifGranted(true);
            setNeedsNotification(false);
            // Hide banner after successful notification enable if already installed
            if (isStandalone) {
                setIsVisible(false);
            }
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        // Dismiss for 3 days only
        localStorage.setItem('pwa_prompt_dismissed_until', String(Date.now() + 3 * 24 * 60 * 60 * 1000));
    };

    // If already standalone and notification permission is already handled, don't show
    if (!isVisible || (isStandalone && !needsNotification)) return null;

    return (
        <div className="fixed bottom-[74px] md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-[70] animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="bg-slate-900/95 dark:bg-slate-900/98 backdrop-blur-md text-white p-4 rounded-2xl border border-slate-700/80 shadow-2xl space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-gradient-to-br from-[#008069] to-[#00A884] rounded-xl shadow-md text-white flex-shrink-0">
                            {isStandalone ? <Bell className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-black text-white truncate">
                                {isStandalone ? 'Aktifkan Notifikasi Pesan' : 'Install Aplikasi CRMHUB'}
                            </h4>
                            <p className="text-[11px] text-slate-300 truncate">
                                {isStandalone ? 'Terima popup notifikasi saat ada chat baru' : 'Akses instan seperti aplikasi HP & offline'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleDismiss} 
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
                        title="Tutup"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {isIOS && !isStandalone ? (
                    <div className="text-[11px] bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 text-slate-300 leading-relaxed">
                        Ketuk tombol <strong>Share (Bagikan)</strong> di Safari iOS, lalu pilih <strong>"Add to Home Screen (Tambah ke Layar Utama)"</strong> 📲
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 pt-1">
                        {!isStandalone && (
                            <Button 
                                onClick={handleInstallClick} 
                                size="sm" 
                                fullWidth 
                                leftIcon={<Download className="w-3.5 h-3.5" />}
                                className="!bg-[#008069] hover:!bg-[#00A884] text-white font-bold shadow-md shadow-[#008069]/20"
                            >
                                Tambah ke Layar Utama
                            </Button>
                        )}

                        {needsNotification && (
                            <Button 
                                onClick={handleEnableNotification} 
                                size="sm" 
                                fullWidth 
                                leftIcon={<Bell className="w-3.5 h-3.5" />}
                                className="!bg-indigo-600 hover:!bg-indigo-700 text-white font-bold shadow-md"
                            >
                                {notifGranted ? 'Notifikasi Aktif' : 'Izinkan Notifikasi Chat'}
                            </Button>
                        )}

                        <button 
                            onClick={handleDismiss} 
                            className="text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors text-center"
                        >
                            Nanti Saja
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
