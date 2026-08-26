import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Globe, Languages, Check, Settings, RefreshCw,
    ChevronDown, AlertCircle, CheckCircle, BarChart2
} from 'lucide-react';
import toast from 'react-hot-toast';

const LANGUAGES = [
    { code: 'id', name: 'Indonesian', flag: '🇮🇩', native: 'Bahasa Indonesia' },
    { code: 'en', name: 'English', flag: '🇺🇸', native: 'English' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', native: '中文' },
    { code: 'ms', name: 'Malay', flag: '🇲🇾', native: 'Bahasa Melayu' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', native: 'العربية' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵', native: '日本語' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷', native: '한국어' },
    { code: 'th', name: 'Thai', flag: '🇹🇭', native: 'ไทย' },
    { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', native: 'Tiếng Việt' },
    { code: 'pt', name: 'Portuguese', flag: '🇧🇷', native: 'Português' }
];

function LanguageCard({ language, enabled, onToggle }) {
    return (
        <div
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                enabled ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => onToggle(language.code)}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{language.flag}</span>
                    <div>
                        <h3 className="font-bold text-gray-900">{language.name}</h3>
                        <p className="text-sm text-gray-500">{language.native}</p>
                    </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    enabled ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                    {enabled ? <Check className="w-4 h-4" /> : ''}
                </div>
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
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                Language Detection Test
            </h3>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message in any language to test detection..."
                className="w-full p-3 border rounded-lg mb-3 h-24 resize-none"
            />
            <button
                onClick={testDetection}
                disabled={loading || !text.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
                {loading ? 'Detecting...' : 'Test Detection'}
            </button>

            {result && detectedLang && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{detectedLang.flag}</span>
                        <div>
                            <h4 className="font-bold text-gray-900">{detectedLang.name}</h4>
                            <p className="text-sm text-gray-500">Confidence: {(result.confidence * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function LanguageAnalytics({ analytics }) {
    const distribution = analytics?.distribution || [];

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-green-500" />
                Language Distribution (30 days)
            </h3>
            {distribution.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    No language data yet
                </div>
            ) : (
                <div className="space-y-3">
                    {distribution.map(lang => {
                        const langInfo = LANGUAGES.find(l => l.code === lang.detected_language);
                        const maxCount = Math.max(...distribution.map(d => d.count));
                        const pct = (lang.count / maxCount) * 100;

                        return (
                            <div key={lang.detected_language} className="flex items-center gap-3">
                                <span className="w-8 text-xl">{langInfo?.flag || '🌐'}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium">{langInfo?.name || lang.detected_language}</span>
                                        <span className="text-gray-500">{lang.count} ({lang.avg_confidence?.toFixed(0)}%)</span>
                                    </div>
                                    <div className="bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-indigo-500 h-2 rounded-full"
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
            if (current.length <= 1) return;
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
            toast.success('Language settings saved');
            fetchData();
        } catch (e) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const supportedLangs = settings?.supported_languages || ['id', 'en'];
    const defaultLang = settings?.default_language || 'id';

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-indigo-500" />
                        Multi-Language AI
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure language detection and AI responses
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Languages className="w-5 h-5 text-blue-500" />
                    Supported Languages
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {LANGUAGES.map(lang => (
                        <LanguageCard
                            key={lang.code}
                            language={lang}
                            enabled={supportedLangs.includes(lang.code)}
                            onToggle={handleToggleLanguage}
                        />
                    ))}
                </div>
                <p className="text-sm text-gray-500 mt-4">
                    Click a language to enable/disable it. At least one language must be selected.
                </p>
            </div>

            {/* Configuration */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-500" />
                    Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default Language
                        </label>
                        <select
                            value={defaultLang}
                            onChange={(e) => setSettings({ ...settings, default_language: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            {LANGUAGES.filter(l => supportedLangs.includes(l.code)).map(lang => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.flag} {lang.name} ({lang.native})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Used when auto-detection is disabled or confidence is low
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h4 className="font-medium text-gray-900">Auto-Detection</h4>
                                <p className="text-sm text-gray-500">Automatically detect customer's language</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings?.auto_detect !== false}
                                    onChange={(e) => setSettings({ ...settings, auto_detect: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h4 className="font-medium text-gray-900">Fallback to English</h4>
                                <p className="text-sm text-gray-500">Use English when detected language is not supported</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings?.fallback_to_english !== false}
                                    onChange={(e) => setSettings({ ...settings, fallback_to_english: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            {/* Detection Test & Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DetectionTest />
                <LanguageAnalytics analytics={analytics} />
            </div>
        </div>
    );
}