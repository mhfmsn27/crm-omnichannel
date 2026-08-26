import React from 'react';
import { useTheme, THEME_PRESETS } from '../../context/ThemeContext';
import { Palette, Check, Moon, Sun, Monitor, X, Sparkles } from 'lucide-react';

export default function ThemeSelectorModal({ isOpen, onClose }) {
    const { themePreset, setThemePreset, isDark, toggleTheme } = useTheme();

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-[#1e293b] w-full max-w-xl rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-gray-50/80 to-indigo-50/30 dark:from-slate-800/80 dark:to-slate-850">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
                            <Palette className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">
                                Personalisasi Tema & Tampilan UI
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                Pilih nuansa desain profesional yang sesuai dengan karakter bisnis Anda.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    
                    {/* Dark / Light Mode Toggle */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-2.5">
                            Mode Pencahayaan
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => isDark && toggleTheme()}
                                className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-xs transition-all ${
                                    !isDark 
                                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-sm' 
                                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Sun className="w-4 h-4 text-amber-500" />
                                <span>Light Mode (Terang)</span>
                                {!isDark && <Check className="w-4 h-4 ml-1 text-indigo-600" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => !isDark && toggleTheme()}
                                className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-xs transition-all ${
                                    isDark 
                                        ? 'border-indigo-500 bg-slate-800 text-sky-300 shadow-sm' 
                                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Moon className="w-4 h-4 text-indigo-400" />
                                <span>Dark Mode (Gelap)</span>
                                {isDark && <Check className="w-4 h-4 ml-1 text-sky-400" />}
                            </button>
                        </div>
                    </div>

                    {/* Preset Themes List */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-2.5">
                            Pilihan Tema Desain Korporat
                        </label>
                        <div className="space-y-3">
                            {THEME_PRESETS.map((preset) => {
                                const isSelected = themePreset === preset.id;
                                return (
                                    <div
                                        key={preset.id}
                                        onClick={() => setThemePreset(preset.id)}
                                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
                                            isSelected 
                                                ? 'border-indigo-600 dark:border-sky-500 bg-indigo-50/40 dark:bg-slate-800/80 shadow-md ring-2 ring-indigo-500/20' 
                                                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            {/* Color Palette Preview Swatch */}
                                            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm flex flex-col border border-black/10 shrink-0">
                                                <div className="h-2/3 w-full" style={{ backgroundColor: preset.sidebarColor }} />
                                                <div className="h-1/3 w-full" style={{ backgroundColor: preset.accentColor }} />
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-black text-sm text-gray-900 dark:text-white">
                                                        {preset.name}
                                                    </h3>
                                                    {preset.badge && (
                                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                                            {preset.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                                    {preset.tagline}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                                            isSelected 
                                                ? 'bg-indigo-600 dark:bg-sky-500 border-transparent text-white' 
                                                : 'border-gray-300 dark:border-slate-700'
                                        }`}>
                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-850 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                    >
                        Selesai & Terapkan
                    </button>
                </div>
            </div>
        </div>
    );
}
