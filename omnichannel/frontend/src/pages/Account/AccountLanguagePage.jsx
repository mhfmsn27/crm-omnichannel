import React from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage, LANGUAGES } from '../../i18n';

export default function AccountLanguagePage() {
    const { locale, changeLanguage, t } = useLanguage();

    return (
        <div className="p-6">
            <div className="max-w-xl mx-auto">
                <h2 className="text-lg font-bold text-gray-900 mb-2">{t('account.language')}</h2>
                <p className="text-sm text-gray-500 mb-6">Pilih bahasa yang ingin Anda gunakan untuk antarmuka aplikasi.</p>

                <div className="space-y-3">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                locale === lang.code
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500'
                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            }`}
                        >
                            <span className="text-2xl">{lang.flag}</span>
                            <div className="flex-1 text-left">
                                <p className="font-medium text-gray-900">{lang.name}</p>
                                <p className="text-sm text-gray-500">{lang.code.toUpperCase()}</p>
                            </div>
                            {locale === lang.code && (
                                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-700">
                        <strong>Catatan:</strong> Pengubahan bahasa hanya mengubah antarmuka aplikasi.
                        Bahasa chat dengan customer tidak berubah.
                    </p>
                </div>
            </div>
        </div>
    );
}