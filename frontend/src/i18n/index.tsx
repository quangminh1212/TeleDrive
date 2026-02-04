import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

import eng from './locales/eng.json';
import vie from './locales/vie.json';
import zho from './locales/zho.json';
import jpn from './locales/jpn.json';

export type Language = 'eng' | 'vie' | 'zho' | 'jpn';

const translations: Record<Language, typeof eng> = { eng, vie, zho, jpn };

export const languageNames: Record<Language, string> = {
  eng: 'English',
  vie: 'Tiếng Việt',
  zho: '中文',
  jpn: '日本語'
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const getNestedValue = (obj: any, path: string): string => {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) return path;
  }
  return typeof result === 'string' ? result : path;
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('teledrive_language') as Language;
    if (saved && translations[saved]) return saved;
    // Map browser 2-char codes to our 3-char codes
    const browserLang = navigator.language.split('-')[0];
    const langMap: Record<string, Language> = { en: 'eng', vi: 'vie', zh: 'zho', ja: 'jpn' };
    return langMap[browserLang] || 'eng';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('teledrive_language', lang);
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = getNestedValue(translations[language], key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
};

export default I18nProvider;
