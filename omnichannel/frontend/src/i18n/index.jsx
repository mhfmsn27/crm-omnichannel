/**
 * i18n - Simple translation hook
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { en } from './en';
import { id } from './id';

const translations = {
  id,
  en,
};

const LANGUAGES = [
  { code: 'id', name: 'Bahasa Indonesia', flag: 'ID' },
  { code: 'en', name: 'English', flag: 'EN' },
];

const LanguageContext = createContext({});

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('locale');
      if (saved && translations[saved]) return saved;
    }
    return 'id';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', locale);
    }
  }, [locale]);

  const t = (key, options = {}) => {
    const defaultVal = typeof options === 'string' ? options : options.defaultValue;
    const keys = key.split('.');
    let value = translations[locale];
    for (const k of keys) {
      if (value && typeof value === 'object') value = value[k];
      else return defaultVal || key;
    }
    return value || defaultVal || key;
  };

  const changeLanguage = (code) => {
    if (translations[code]) setLocale(code);
  };

  return (
    <LanguageContext.Provider value={{ locale, t, changeLanguage, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslation() {
  const { t } = useLanguage();
  return { t };
}

export { LANGUAGES };
export default LanguageProvider;
