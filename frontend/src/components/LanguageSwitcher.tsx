import React, { useState, useRef, useEffect } from 'react';
import { useI18n, Language, languageNames } from '../i18n';
import 'flag-icons/css/flag-icons.min.css';

// Country code mapping for flag-icons (ISO 3166-1 alpha-2 lowercase)
const languageCountryCodes: Record<Language, string> = {
  eng: 'gb', vie: 'vn', zho: 'cn', jpn: 'jp', kor: 'kr',
  tha: 'th', ind: 'id', hin: 'in', ara: 'sa', rus: 'ru',
  deu: 'de', fra: 'fr', spa: 'es', por: 'pt', ita: 'it',
  nld: 'nl', pol: 'pl', tur: 'tr', ukr: 'ua', ell: 'gr',
  heb: 'il', ben: 'bd', tam: 'lk', msa: 'my', fil: 'ph',
  swe: 'se', nor: 'no', dan: 'dk', fin: 'fi', ces: 'cz',
  hun: 'hu', ron: 'ro', fas: 'ir', swa: 'ke', bel: 'by',
  hrv: 'hr', srp: 'rs', slk: 'sk', slv: 'si', bul: 'bg',
  gle: 'ie', isl: 'is', lit: 'lt', lav: 'lv', est: 'ee',
  sqi: 'al', hye: 'am', kat: 'ge', kaz: 'kz', uzb: 'uz',
  aze: 'az', cat: 'es-ct', nep: 'np', sin: 'lk', mya: 'mm',
  khm: 'kh', lao: 'la', mon: 'mn', urd: 'pk', afr: 'za',
  eus: 'es-pv', glg: 'es-ga', mlt: 'mt'
};

// High-quality Flag component using flag-icons with proper sizing
const Flag: React.FC<{ code: Language; size?: 'sm' | 'md' | 'lg' }> = ({ code, size = 'md' }) => {
  const countryCode = languageCountryCodes[code];

  // Larger sizes for crisp rendering (3:2 ratio)
  const sizeStyles = {
    sm: { width: '21px', height: '14px', fontSize: '14px' },
    md: { width: '27px', height: '18px', fontSize: '18px' },
    lg: { width: '33px', height: '22px', fontSize: '22px' }
  };

  return (
    <span
      className={`fi fi-${countryCode} fis inline-block flex-shrink-0`}
      style={{
        ...sizeStyles[size],
        borderRadius: '3px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.08)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        imageRendering: 'crisp-edges'
      }}
      title={languageNames[code]}
    />
  );
};

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sort languages alphabetically by name
  const sortedLanguages = (Object.keys(languageNames) as Language[])
    .sort((a, b) => languageNames[a].localeCompare(languageNames[b]));

  // Filter languages based on search query
  const filteredLanguages = sortedLanguages.filter(lang =>
    languageNames[lang].toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg
                   bg-white dark:bg-dark-surface 
                   border border-gray-200 dark:border-dark-border
                   text-gray-700 dark:text-dark-text
                   hover:bg-gray-50 dark:hover:bg-dark-hover
                   focus:outline-none focus:ring-2 focus:ring-blue-500/50
                   transition-all duration-200 shadow-sm"
      >
        <Flag code={language} size="md" />
        <span className="hidden sm:inline">{languageNames[language]}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-hidden
                        bg-white dark:bg-dark-surface
                        border border-gray-200 dark:border-dark-border
                        rounded-xl shadow-xl z-50
                        animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100 dark:border-dark-border">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search language..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm
                           bg-gray-50 dark:bg-dark-hover
                           border border-gray-200 dark:border-dark-border
                           rounded-lg
                           text-gray-700 dark:text-dark-text
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
                           transition-all"
              />
            </div>
          </div>

          {/* Language List */}
          <div className="max-h-64 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleSelect(lang)}
                  className={`w-full flex items-center gap-3.5 px-4 py-2.5 text-sm
                             transition-all duration-150
                             ${language === lang
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover'
                    }`}
                >
                  <Flag code={lang} size="lg" />
                  <span className="flex-1 text-left font-medium">{languageNames[lang]}</span>
                  {language === lang && (
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                No language found
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-hover/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
              🌍 {sortedLanguages.length} languages available
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
