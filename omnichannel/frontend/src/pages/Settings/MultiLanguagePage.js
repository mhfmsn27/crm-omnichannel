import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Globe, Languages, Check, Settings, RefreshCw,
    AlertCircle, CheckCircle, BarChart2, Sparkles, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

const LANGUAGES = [
    { code: 'id', name: 'Indonesian', flag: '🇮🇩', native: 'Bahasa Indonesia', region: 'Asia / ID' },
    { code: 'en', name: 'English', flag: '🇺🇸', native: 'English (US/UK)', region: 'Global / US' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', native: '中文 (Simplified)', region: 'Asia / CN' },
    { code: 'ms', name: 'Malay', flag: '🇲🇾', native: 'Bahasa Melayu', region: 'Asia / MY' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', native: 'العربية (Standard)', region: 'Middle East / SA' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵', native: '日本語 (Nihongo)', region: 'Asia / JP' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷', native: '한국어 (Hangugeo)', region: 'Asia / KR' },
    { code: 'th', name: 'Thai', flag: '🇹🇭', native: 'ภาษาไทย (Phasa Thai)', region: 'Asia / TH' },
    { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', native: 'Tiếng Việt', region: 'Asia / VN' },
    { code: 'pt', name: 'Portuguese', flag: '🇧🇷', native: 'Português (BR/PT)', region: 'Americas / BR' }
];

function LanguageCard({ language, enabled, onToggle }) {
    return (
        <div
            onClick={() => onToggle(language.code)}
            className={`group relative p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                enabled
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-500/70 shadow-xs ring-1 ring-indigo-500/20'
                    : 'border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-xs'
            }`}
        >
            <div className="flex items-start justify-between gap-2.5 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl sm:text-2xl leading-none select-none flex-shrink-0 drop-shadow-xs" role="img" aria-label={language.name}>
                        {language.flag}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h4 className={`text-xs sm:text-sm font-bold truncate ${
                            enabled ? 'text-indigo-950 dark:text-indigo-100' : 'text-gray-800 dark:text-gray-200'
                        }`}>
                            {language.name}
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-0.5">
                            {language.native}
                        </p>
                    </div>
                </div>

                {/* Status Indicator Pill */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    enabled
                        ? 'bg-indigo-600 text-white shadow-xs scale-100'
                        : 'bg-gray-100 dark:bg-slate-700 text-transparent group-hover:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-slate-600'
                }`}>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
            </div>

            {/* Bottom info tag */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700/50 text-[10px]">
                <span className="font-mono uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">
                    {language.code}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                    enabled 
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' 
                        : 'bg-gray-100 text-gray-500 dark:bg-slate-700/60 dark:text-slate-400'
                }`}>
                    {enabled ? 'Active' : 'Disabled'}
                </span>
            </div>
        </div>
    );
}

function DetectionTest() {
    const [text, setText] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const testDetection = async () => {
        if (!text.trim()) return;
        setLoading(true);
        try {
            const res = await axios.get('/api/app/language/detect', { params: { text } });
            setResult(res.data);
        } catch (e) {
            toast.error('Detection failed');
        } finally {
            setLoading(false);
        }
    };

    const detectedLang = result ? LANGUAGES.find(l => l.code === result.language) : null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
            <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2 text-sm sm:text-base">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Uji Coba Deteksi Bahasa Otomatis
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                    Ketik contoh pesan pelanggan untuk menguji akurasi model AI dalam mendeteksi bahasa.
                </p>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Contoh: Halo, apakah produk ini masih tersedia? / How much is the shipping cost? / 多少钱？"
                    className="w-full p-3 border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 text-gray-800 dark:text-white rounded-lg text-sm mb-3 h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
            </div>

            <div>
                <button
                    onClick={testDetection}
                    disabled={loading || !text.trim()}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg disabled:opacity-50 transition-all shadow-xs"
                >
                    {loading ? 'Menganalisis Bahasa...' : 'Uji Deteksi Bahasa'}
                </button>

                {result && detectedLang && (
                    <div className="mt-4 p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{detectedLang.flag}</span>
                            <div>
                                <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                                    {detectedLang.name} ({detectedLang.native})
                                </h4>
                                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                                    Tingkat Keyakinan AI: <strong className="text-indigo-600 dark:text-indigo-400">{((result.confidence || 0.95) * 100).toFixed(0)}%</strong>
                                </p>
                            </div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                )}
            </div>
        </div>
    );
}

function LanguageAnalytics({ analytics }) {
    const distribution = analytics?.distribution || [];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 sm:p-6">
            <h3 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2 text-sm sm:text-base">
                <BarChart2 className="w-4 h-4 text-emerald-500" />
                Distribusi Bahasa Obrolan (30 Hari Terakhir)
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                Statistik bahasa yang paling sering digunakan oleh pelanggan Anda.
            </p>

            {distribution.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-slate-500 text-xs">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Belum ada riwayat deteksi bahasa obrolan yang tercatat.
                </div>
            ) : (
                <div className="space-y-3">
                    {distribution.map(lang => {
                        const langInfo = LANGUAGES.find(l => l.code === lang.detected_language);
                        const maxCount = Math.max(...distribution.map(d => d.count), 1);
                        const pct = (lang.count / maxCount) * 100;

                        return (
                            <div key={lang.detected_language} className="flex items-center gap-3">
                                <span className="w-7 text-lg flex-shrink-0">{langInfo?.flag || '🌐'}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-gray-800 dark:text-gray-200 truncate">
                                            {langInfo?.name || lang.detected_language}
                                        </span>
                                        <span className="text-gray-500 dark:text-slate-400 font-medium">
                                            {lang.count} obrolan ({lang.avg_confidence?.toFixed(0) || 90}%)
                                        </span>
                                    </div>
                                    <div className="bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function MultiLanguagePage() {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingsRes, analyticsRes] = await Promise.all([
                axios.get('/api/app/language/settings'),
                axios.get('/api/app/language/analytics')
            ]);

            setSettings(settingsRes.data);
            setAnalytics(analyticsRes.data);
        } catch (e) {
            console.error('Language settings fetch error:', e);
            toast.error('Failed to load language settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggleLanguage = (langCode) => {
        const current = settings?.supported_languages || ['id', 'en'];
        let newSupported;

        if (current.includes(langCode)) {
            // Don't allow removing all
            if (current.length <= 1) {
                toast.error('Setidaknya harus ada 1 bahasa aktif');
                return;
            }
            newSupported = current.filter(c => c !== langCode);
        } else {
            newSupported = [...current, langCode];
        }

        setSettings({
            ...settings,
            supported_languages: newSupported
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/api/app/language/settings', {
                default_language: settings.default_language,
                supported_languages: settings.supported_languages,
                auto_detect: settings.auto_detect,
                fallback_to_english: settings.fallback_to_english
            });
            toast.success('Pengaturan bahasa berhasil disimpan!');
            fetchData();
        } catch (e) {
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const supportedLangs = settings?.supported_languages || ['id', 'en'];
    const defaultLang = settings?.default_language || 'id';

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-gray-100 dark:border-slate-800">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Languages className="w-5 h-5" />
                        </div>
                        Multi-Language AI Assistant
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Konfigurasi deteksi bahasa otomatis dan respon cerdas Chatbot AI dalam berbagai bahasa dunia.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    title="Refresh Data"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Supported Languages Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">
                            Bahasa yang Didukung (Supported Languages)
                        </h3>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2.5 py-1 rounded-full w-fit">
                        {supportedLangs.length} dari {LANGUAGES.length} Bahasa Aktif
                    </span>
                </div>

                {/* Ultra-Responsive Grid for all screen sizes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
                    {LANGUAGES.map(lang => (
                        <LanguageCard
                            key={lang.code}
                            language={lang}
                            enabled={supportedLangs.includes(lang.code)}
                            onToggle={handleToggleLanguage}
                        />
                    ))}
                </div>

                <p className="text-xs text-gray-400 dark:text-slate-500 mt-4 leading-relaxed">
                    💡 <strong>Petunjuk:</strong> Klik pada kartu bahasa untuk mengaktifkan atau menonaktifkan bahasa tersebut. Sistem membutuhkan minimal 1 bahasa aktif.
                </p>
            </div>

            {/* Configuration Options */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-5">
                    <Settings className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        Preferensi Konfigurasi Bahasa
                    </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Default Language Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Bahasa Utama / Default (Default Language)
                        </label>
                        <select
                            value={defaultLang}
                            onChange={(e) => setSettings({ ...settings, default_language: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        >
                            {LANGUAGES.filter(l => supportedLangs.includes(l.code)).map(lang => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.flag} {lang.name} — {lang.native}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
                            Digunakan sebagai respon bawaan ketika bahasa pelanggan tidak dapat dideteksi dengan yakin.
                        </p>
                    </div>

                    {/* Automation Switches */}
                    <div className="space-y-3">
                        {/* Auto Detect Switch */}
                        <div className="flex items-center justify-between p-3.5 bg-gray-50/70 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700/60 rounded-xl">
                            <div className="pr-4">
                                <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">Deteksi Otomatis (Auto-Detection)</h4>
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Otomatis mengenali bahasa pesan pelanggan yang masuk secara cerdas.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                    type="checkbox"
                                    checked={settings?.auto_detect !== false}
                                    onChange={(e) => setSettings({ ...settings, auto_detect: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {/* Fallback Switch */}
                        <div className="flex items-center justify-between p-3.5 bg-gray-50/70 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700/60 rounded-xl">
                            <div className="pr-4">
                                <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">Cadangan Bahasa Inggris (Fallback to English)</h4>
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Gunakan Bahasa Inggris jika pelanggan menggunakan bahasa di luar daftar aktif.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                    type="checkbox"
                                    checked={settings?.fallback_to_english !== false}
                                    onChange={(e) => setSettings({ ...settings, fallback_to_english: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700/60 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-xs hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Menyimpan Perubahan...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Simpan Pengaturan Bahasa
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Detection Test & Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DetectionTest />
                <LanguageAnalytics analytics={analytics} />
            </div>
        </div>
    );
}