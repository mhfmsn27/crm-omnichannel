import React, { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, LANGUAGES } from '../../i18n';

export default function LanguageSwitcher({ variant = 'dropdown' }) {
    const { locale, changeLanguage, languages } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const currentLang = languages.find(l => l.code === locale) || languages[0];

    if (variant === 'simple') {
        return (
            <select
                value={locale}
                onChange={(e) => changeLanguage(e.target.value)}
                className="px-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-800 cursor-pointer"
            >
                {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                    </option>
                ))}
            </select>
        );
    }

    if (variant === 'buttons') {
        return (
            <div className="flex gap-2">
                {languages.map(lang => (
                    <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            locale === lang.code
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                    >
                        <span>{lang.flag}</span>
                        <span>{lang.code.toUpperCase()}</span>
                    </button>
                ))}
            </div>
        );
    }

    // Default: dropdown
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
                <Globe className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">{currentLang.flag} {currentLang.code.toUpperCase()}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 border rounded-xl shadow-lg z-50 py-2">
                        {languages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => { changeLanguage(lang.code); setIsOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                    locale === lang.code ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                                }`}
                            >
                                <span className="text-lg">{lang.flag}</span>
                                <span className="flex-1 text-sm font-medium">{lang.name}</span>
                                {locale === lang.code && <Check className="w-4 h-4 text-indigo-600" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}