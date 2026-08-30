import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme, THEME_PRESETS } from '../../context/ThemeContext';
import { Palette, Check, Moon, Sun, X, Sparkles } from 'lucide-react';

export default function ThemeSelectorModal({ isOpen, onClose }) {
    const { themePreset, setThemePreset, isDark, toggleTheme } = useTheme();

    // Prevent body scroll when modal is active
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modalContent = (
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-lg my-auto bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl border border-gray-200/80 dark:border-slate-700/80 flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-gray-50/90 to-indigo-50/40 dark:from-slate-800/90 dark:to-slate-900 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm">
                            <Palette className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                Personalisasi Tema Tampilan
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                Pilih nuansa desain profesional yang sesuai karakter bisnis Anda.
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Tutup"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    
                    {/* Dark / Light Mode Toggle */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-2.5">
                            Mode Pencahayaan
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => isDark && toggleTheme()}
                                className={`p-3 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-xs transition-all ${
                                    !isDark 
                                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-sm ring-1 ring-indigo-500/20' 
                                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Sun className="w-4 h-4 text-amber-500" />
                                <span>Light Mode</span>
                                {!isDark && <Check className="w-4 h-4 ml-1 text-indigo-600" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => !isDark && toggleTheme()}
                                className={`p-3 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-xs transition-all ${
                                    isDark 
                                        ? 'border-indigo-500 bg-slate-800 text-sky-300 shadow-sm ring-1 ring-indigo-500/20' 
                                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Moon className="w-4 h-4 text-indigo-400" />
                                <span>Dark Mode</span>
                                {isDark && <Check className="w-4 h-4 ml-1 text-sky-400" />}
                            </button>
                        </div>
                    </div>

                    {/* Preset Themes List */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-2.5">
                            Pilihan Preset Nuansa Tema
                        </label>
                        <div className="space-y-2.5">
                            {THEME_PRESETS.map((preset) => {
                                const isSelected = themePreset === preset.id;
                                return (
                                    <div
                                        key={preset.id}
                                        onClick={() => setThemePreset(preset.id)}
                                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
                                            isSelected 
                                                ? 'border-indigo-600 dark:border-sky-500 bg-indigo-50/40 dark:bg-slate-800/80 shadow-md ring-2 ring-indigo-500/20' 
                                                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            {/* Color Swatch */}
                                            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs flex flex-col border border-black/10 shrink-0">
                                                <div className="h-2/3 w-full" style={{ backgroundColor: preset.sidebarColor }} />
                                                <div className="h-1/3 w-full" style={{ backgroundColor: preset.accentColor }} />
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                                                        {preset.name}
                                                    </h3>
                                                    {preset.badge && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                                            {preset.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                                    {preset.tagline}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                            isSelected 
                                                ? 'bg-indigo-600 dark:bg-sky-500 border-transparent text-white' 
                                                : 'border-gray-300 dark:border-slate-700'
                                        }`}>
                                            {isSelected && <Check className="w-3 h-3" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60 flex items-center justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                    >
                        Selesai & Terapkan
                    </button>
                </div>
            </div>
        </div>
    );

    // Render via Portal directly onto document.body to avoid header/overflow clipping
    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
