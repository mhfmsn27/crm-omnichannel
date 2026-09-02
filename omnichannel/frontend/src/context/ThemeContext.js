import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEME_PRESETS = [
    {
        id: 'light',
        name: 'Clean WhatsApp Emerald (Light)',
        tagline: 'Formal, Bersih & Elegan dengan Aksen Hijau WhatsApp Solid',
        badge: 'Recommended',
        sidebarColor: '#FFFFFF',
        accentColor: '#008069',
        accentClass: 'bg-[#008069] text-white hover:bg-[#075E54]',
        sidebarClass: 'bg-white dark:bg-[#0F172A] border-r border-slate-200/90 dark:border-slate-800 shadow-sm',
        activeMenuClass: 'bg-[#E7F7F2] dark:bg-[#008069]/20 text-[#008069] dark:text-[#25D366] font-bold shadow-xs border border-[#A2E2CD] dark:border-[#008069]/40',
        inactiveMenuClass: 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white border border-transparent',
        activeSubmenuClass: 'bg-[#E7F7F2] dark:bg-[#008069]/25 text-[#008069] dark:text-[#25D366] font-bold border border-[#A2E2CD]/80 dark:border-[#008069]/40',
        inactiveSubmenuClass: 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100',
        toggleBtnClass: 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm hover:text-[#008069] hover:border-[#008069]',
        indicatorClass: 'bg-[#008069] dark:bg-[#25D366]',
        brandTextClass: 'text-slate-900 dark:text-white',
        brandSubtextClass: 'text-slate-400 dark:text-slate-500',
        brandAvatarBg: 'bg-[#008069] text-white',
        footerBorderClass: 'border-slate-200/80 dark:border-slate-800',
        footerTextClass: 'text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30'
    },
    {
        id: 'executive',
        name: 'Executive Corporate Navy',
        tagline: 'Formal & Elegan untuk Perusahaan / B2B',
        badge: 'Dark Navy',
        sidebarColor: '#0F172A',
        accentColor: '#2563EB',
        accentClass: 'bg-blue-600 text-white hover:bg-blue-700',
        sidebarClass: 'bg-[#0F172A] border-r border-slate-800 shadow-md',
        activeMenuClass: 'bg-slate-800/90 text-sky-400 font-bold shadow-sm border-l-2 border-sky-400',
        inactiveMenuClass: 'text-slate-300 hover:bg-slate-800/50 hover:text-white',
        activeSubmenuClass: 'bg-slate-800 text-sky-300 font-bold border border-slate-700',
        inactiveSubmenuClass: 'text-white/70 hover:bg-white/10 hover:text-white',
        toggleBtnClass: 'bg-slate-800 text-sky-400 border border-slate-700',
        indicatorClass: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]',
        brandTextClass: 'text-white',
        brandSubtextClass: 'text-white/50',
        footerBorderClass: 'border-white/10',
        footerTextClass: 'text-white/60 hover:text-white hover:bg-white/10'
    },
    {
        id: 'modern',
        name: 'Minimalist Tech Slate',
        tagline: 'Clean, Border-Driven Dark Slate Theme',
        badge: 'Dark Slate',
        sidebarColor: '#1E293B',
        accentColor: '#4F46E5',
        accentClass: 'bg-indigo-600 text-white hover:bg-indigo-700',
        sidebarClass: 'bg-[#1E293B] border-r border-slate-700 shadow-md',
        activeMenuClass: 'bg-indigo-600 text-white font-bold shadow-md',
        inactiveMenuClass: 'text-slate-300 hover:bg-slate-700/60 hover:text-white',
        activeSubmenuClass: 'bg-indigo-700 text-white font-bold border border-indigo-500',
        inactiveSubmenuClass: 'text-slate-300 hover:bg-slate-700/50 hover:text-white',
        toggleBtnClass: 'bg-slate-700 text-indigo-300 border border-slate-600',
        indicatorClass: 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]',
        brandTextClass: 'text-white',
        brandSubtextClass: 'text-white/50',
        footerBorderClass: 'border-white/10',
        footerTextClass: 'text-white/60 hover:text-white hover:bg-white/10'
    },
    {
        id: 'classic',
        name: 'Classic WhatsApp Green',
        tagline: 'Identitas Hijau Khas WhatsApp Omnichannel',
        badge: 'Classic',
        sidebarColor: '#00A884',
        accentColor: '#00A884',
        accentClass: 'bg-[#00A884] text-white hover:bg-[#009677]',
        sidebarClass: 'bg-[#00A884] shadow-md',
        activeMenuClass: 'bg-white/95 text-[#00A884] font-bold shadow-md',
        inactiveMenuClass: 'text-white/75 hover:bg-white/15 hover:text-white',
        activeSubmenuClass: 'bg-white/20 text-white font-bold',
        inactiveSubmenuClass: 'text-white/70 hover:bg-white/10 hover:text-white',
        toggleBtnClass: 'bg-white text-[#00A884] border border-gray-100',
        indicatorClass: 'bg-gradient-to-b from-[#00A884] to-[#00897B] shadow-[0_0_8px_rgba(0,168,132,0.6)]',
        brandTextClass: 'text-white',
        brandSubtextClass: 'text-white/50',
        footerBorderClass: 'border-white/20',
        footerTextClass: 'text-white/60 hover:text-white hover:bg-white/10'
    }
];

export const ThemeProvider = ({ children }) => {
    // 1. Dark Mode State
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // 2. Corporate Theme Preset State (Default: 'light' for clean, formal, and professional white look)
    const [themePreset, setThemePresetState] = useState(() => {
        const savedPreset = localStorage.getItem('crmhub_theme_preset');
        if (savedPreset && ['light', 'executive', 'modern', 'classic'].includes(savedPreset)) {
            return savedPreset;
        }
        return 'light'; // Clean light white default
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute('data-theme-preset', themePreset);
        localStorage.setItem('crmhub_theme_preset', themePreset);
    }, [themePreset]);

    const toggleTheme = () => setIsDark(prev => !prev);
    const setThemePreset = (preset) => {
        if (['light', 'executive', 'modern', 'classic'].includes(preset)) {
            setThemePresetState(preset);
        }
    };

    const currentPresetConfig = THEME_PRESETS.find(p => p.id === themePreset) || THEME_PRESETS[0];

    return (
        <ThemeContext.Provider value={{ 
            isDark, 
            toggleTheme, 
            themePreset, 
            setThemePreset, 
            themePresets: THEME_PRESETS,
            currentPresetConfig 
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
