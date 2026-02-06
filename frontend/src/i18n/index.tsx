import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Import all locale files
import eng from './locales/eng.json';
import vie from './locales/vie.json';
import zho from './locales/zho.json';
import jpn from './locales/jpn.json';
import kor from './locales/kor.json';
import tha from './locales/tha.json';
import ind from './locales/ind.json';
import hin from './locales/hin.json';
import ara from './locales/ara.json';
import rus from './locales/rus.json';
import deu from './locales/deu.json';
import fra from './locales/fra.json';
import spa from './locales/spa.json';
import por from './locales/por.json';
import ita from './locales/ita.json';
import nld from './locales/nld.json';
import pol from './locales/pol.json';
import tur from './locales/tur.json';
import ukr from './locales/ukr.json';
import ell from './locales/ell.json';
import heb from './locales/heb.json';
import ben from './locales/ben.json';
import tam from './locales/tam.json';
import msa from './locales/msa.json';
import fil from './locales/fil.json';
import swe from './locales/swe.json';
import nor from './locales/nor.json';
import dan from './locales/dan.json';
import fin from './locales/fin.json';
import ces from './locales/ces.json';
import hun from './locales/hun.json';
import ron from './locales/ron.json';
import fas from './locales/fas.json';
import swa from './locales/swa.json';
import bel from './locales/bel.json';
import hrv from './locales/hrv.json';
import srp from './locales/srp.json';
import slk from './locales/slk.json';
import slv from './locales/slv.json';
import bul from './locales/bul.json';
import gle from './locales/gle.json';
import isl from './locales/isl.json';
import lit from './locales/lit.json';
import lav from './locales/lav.json';
import est from './locales/est.json';
import sqi from './locales/sqi.json';
import kat from './locales/kat.json';
import kaz from './locales/kaz.json';
import uzb from './locales/uzb.json';
import aze from './locales/aze.json';
import cat from './locales/cat.json';
import nep from './locales/nep.json';
import sin from './locales/sin.json';
import mya from './locales/mya.json';
import khm from './locales/khm.json';
import lao from './locales/lao.json';
import mon from './locales/mon.json';
import urd from './locales/urd.json';
import afr from './locales/afr.json';
import eus from './locales/eus.json';
import glg from './locales/glg.json';
import mlt from './locales/mlt.json';

// Language type - all supported languages (ISO 639-2/3 codes)
export type Language =
  | 'eng' | 'vie' | 'zho' | 'jpn' | 'kor' | 'tha' | 'ind' | 'hin' | 'ara' | 'rus'
  | 'deu' | 'fra' | 'spa' | 'por' | 'ita' | 'nld' | 'pol' | 'tur' | 'ukr' | 'ell'
  | 'heb' | 'ben' | 'tam' | 'msa' | 'fil' | 'swe' | 'nor' | 'dan' | 'fin' | 'ces'
  | 'hun' | 'ron' | 'fas' | 'swa' | 'bel' | 'hrv' | 'srp' | 'slk' | 'slv' | 'bul'
  | 'gle' | 'isl' | 'lit' | 'lav' | 'est' | 'sqi' | 'kat' | 'kaz' | 'uzb'
  | 'aze' | 'cat' | 'nep' | 'sin' | 'mya' | 'khm' | 'lao' | 'mon' | 'urd' | 'afr'
  | 'eus' | 'glg' | 'mlt';

// Translation type - flexible to allow optional keys
type TranslationType = {
  [key: string]: string | TranslationType;
};

// All translations - use flexible type to allow different locales to have different keys
const translations: Record<Language, TranslationType> = {
  eng, vie, zho, jpn, kor, tha, ind, hin, ara, rus,
  deu, fra, spa, por, ita, nld, pol, tur, ukr, ell,
  heb, ben, tam, msa, fil, swe, nor, dan, fin, ces,
  hun, ron, fas, swa, bel, hrv, srp, slk, slv, bul,
  gle, isl, lit, lav, est, sqi, kat, kaz, uzb,
  aze, cat, nep, sin, mya, khm, lao, mon, urd, afr,
  eus, glg, mlt
};

// Language names in their native form
export const languageNames: Record<Language, string> = {
  eng: 'English',
  vie: 'Tiếng Việt',
  zho: '中文',
  jpn: '日本語',
  kor: '한국어',
  tha: 'ไทย',
  ind: 'Bahasa Indonesia',
  hin: 'हिन्दी',
  ara: 'العربية',
  rus: 'Русский',
  deu: 'Deutsch',
  fra: 'Français',
  spa: 'Español',
  por: 'Português',
  ita: 'Italiano',
  nld: 'Nederlands',
  pol: 'Polski',
  tur: 'Türkçe',
  ukr: 'Українська',
  ell: 'Ελληνικά',
  heb: 'עברית',
  ben: 'বাংলা',
  tam: 'தமிழ்',
  msa: 'Bahasa Melayu',
  fil: 'Filipino',
  swe: 'Svenska',
  nor: 'Norsk',
  dan: 'Dansk',
  fin: 'Suomi',
  ces: 'Čeština',
  hun: 'Magyar',
  ron: 'Română',
  fas: 'فارسی',
  swa: 'Kiswahili',
  bel: 'Беларуская',
  hrv: 'Hrvatski',
  srp: 'Српски',
  slk: 'Slovenčina',
  slv: 'Slovenščina',
  bul: 'Български',
  gle: 'Gaeilge',
  isl: 'Íslenska',
  lit: 'Lietuvių',
  lav: 'Latviešu',
  est: 'Eesti',
  sqi: 'Shqip',
  kat: 'ქართული',
  kaz: 'Қазақша',
  uzb: "O'zbek",
  aze: 'Azərbaycan',
  cat: 'Català',
  nep: 'नेपाली',
  sin: 'සිංහල',
  mya: 'မြန်မာ',
  khm: 'ខ្មែរ',
  lao: 'ລາວ',
  mon: 'Монгол',
  urd: 'اردو',
  afr: 'Afrikaans',
  eus: 'Euskara',
  glg: 'Galego',
  mlt: 'Malti'
};

// Browser 2-char code to ISO 639-2/3 code mapping
const browserLangMap: Record<string, Language> = {
  en: 'eng',
  vi: 'vie',
  zh: 'zho',
  ja: 'jpn',
  ko: 'kor',
  th: 'tha',
  id: 'ind',
  hi: 'hin',
  ar: 'ara',
  ru: 'rus',
  de: 'deu',
  fr: 'fra',
  es: 'spa',
  pt: 'por',
  it: 'ita',
  nl: 'nld',
  pl: 'pol',
  tr: 'tur',
  uk: 'ukr',
  el: 'ell',
  he: 'heb',
  bn: 'ben',
  ta: 'tam',
  ms: 'msa',
  tl: 'fil',
  sv: 'swe',
  no: 'nor',
  da: 'dan',
  fi: 'fin',
  cs: 'ces',
  hu: 'hun',
  ro: 'ron',
  fa: 'fas',
  sw: 'swa',
  be: 'bel',
  hr: 'hrv',
  sr: 'srp',
  sk: 'slk',
  sl: 'slv',
  bg: 'bul',
  ga: 'gle',
  is: 'isl',
  lt: 'lit',
  lv: 'lav',
  et: 'est',
  sq: 'sqi',

  ka: 'kat',
  kk: 'kaz',
  uz: 'uzb',
  az: 'aze',
  ca: 'cat',
  ne: 'nep',
  si: 'sin',
  my: 'mya',
  km: 'khm',
  lo: 'lao',
  mn: 'mon',
  ur: 'urd',
  af: 'afr',
  eu: 'eus',
  gl: 'glg',
  mt: 'mlt'
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
    return browserLangMap[browserLang] || 'eng';
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

// Get all available languages for language selector - sorted alphabetically
export const getAvailableLanguages = (): { code: Language; name: string }[] => {
  return (Object.keys(languageNames) as Language[])
    .map(code => ({
      code,
      name: languageNames[code]
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
};

export default I18nProvider;
