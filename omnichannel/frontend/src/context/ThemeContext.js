import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEME_PRESETS = [
    {
        id: 'executive',
        name: 'Executive Corporate Navy',
        tagline: 'Formal & Elegan untuk Perusahaan / B2B',
        badge: 'Recommended',
        sidebarColor: '#0F172A',
        accentColor: '#2563EB',
        accentClass: 'bg-blue-600 text-white hover:bg-blue-700',
        sidebarClass: 'bg-[#0F172A] border-r border-slate-800',
        activeMenuClass: 'bg-slate-800/90 text-sky-400 font-bold shadow-sm border-l-2 border-sky-400',
        inactiveMenuClass: 'text-slate-300 hover:bg-slate-800/50 hover:text-white',
        toggleBtnClass: 'bg-slate-800 text-sky-400 border border-slate-700'
    },
    {
        id: 'modern',
        name: 'Minimalist Tech Modern',
        tagline: 'Clean, Border-Driven ala Linear & Stripe',
        badge: 'Clean UI',
        sidebarColor: '#1E293B',
        accentColor: '#4F46E5',
        accentClass: 'bg-indigo-600 text-white hover:bg-indigo-700',
        sidebarClass: 'bg-[#1E293B] border-r border-slate-700',
        activeMenuClass: 'bg-indigo-600 text-white font-bold shadow-md',
        inactiveMenuClass: 'text-slate-300 hover:bg-slate-700/60 hover:text-white',
        toggleBtnClass: 'bg-slate-700 text-indigo-300 border border-slate-600'
    },
    {
        id: 'classic',
        name: 'Classic WhatsApp Green',
        tagline: 'Identitas Hijau Khas WhatsApp Omnichannel',
        badge: 'Original',
        sidebarColor: '#00A884',
        accentColor: '#00A884',
        accentClass: 'bg-[#00A884] text-white hover:bg-[#009677]',
        sidebarClass: 'bg-[#00A884]',
        activeMenuClass: 'bg-white/95 text-[#00A884] font-bold shadow-md',
        inactiveMenuClass: 'text-white/75 hover:bg-white/15 hover:text-white',
        toggleBtnClass: 'bg-white text-[#00A884] border border-gray-100'
    }
];

export const ThemeProvider = ({ children }) => {
    // 1. Dark Mode State
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // 2. Corporate Theme Preset State (Default: 'executive' for formal look, fallback: 'classic')
    const [themePreset, setThemePresetState] = useState(() => {
        const savedPreset = localStorage.getItem('crmhub_theme_preset');
        if (savedPreset && ['executive', 'modern', 'classic'].includes(savedPreset)) {
            return savedPreset;
        }
        return 'executive'; // Default formal corporate
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
        if (['executive', 'modern', 'classic'].includes(preset)) {
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
