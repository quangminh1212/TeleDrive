import React, { useState, useRef, useEffect } from 'react';
import { useI18n, Language, languageNames } from '../i18n';

// Flag emoji mapping for each language
const languageFlags: Record<Language, string> = {
  eng: '🇬🇧', vie: '🇻🇳', zho: '🇨🇳', jpn: '🇯🇵', kor: '🇰🇷',
  tha: '🇹🇭', ind: '🇮🇩', hin: '🇮🇳', ara: '🇸🇦', rus: '🇷🇺',
  deu: '🇩🇪', fra: '🇫🇷', spa: '🇪🇸', por: '🇵🇹', ita: '🇮🇹',
  nld: '🇳🇱', pol: '🇵🇱', tur: '🇹🇷', ukr: '🇺🇦', ell: '🇬🇷',
  heb: '🇮🇱', ben: '🇧🇩', tam: '🇱🇰', msa: '🇲🇾', fil: '🇵🇭',
  swe: '🇸🇪', nor: '🇳🇴', dan: '🇩🇰', fin: '🇫🇮', ces: '🇨🇿',
  hun: '🇭🇺', ron: '🇷🇴', fas: '🇮🇷', swa: '🇰🇪', bel: '🇧🇾',
  hrv: '🇭🇷', srp: '🇷🇸', slk: '🇸🇰', slv: '🇸🇮', bul: '🇧🇬',
  gle: '🇮🇪', isl: '🇮🇸', lit: '🇱🇹', lav: '🇱🇻', est: '🇪🇪',
  sqi: '🇦🇱', hye: '🇦🇲', kat: '🇬🇪', kaz: '🇰🇿', uzb: '🇺🇿',
  aze: '🇦🇿', cat: '🇪🇸', nep: '🇳🇵', sin: '🇱🇰', mya: '🇲🇲',
  khm: '🇰🇭', lao: '🇱🇦', mon: '🇲🇳', urd: '🇵🇰', afr: '🇿🇦',
  eus: '🇪🇸', glg: '🇪🇸', mlt: '🇲🇹'
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
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg
                   bg-white dark:bg-dark-surface 
                   border border-gray-200 dark:border-dark-border
                   text-gray-700 dark:text-dark-text
                   hover:bg-gray-50 dark:hover:bg-dark-hover
                   focus:outline-none focus:ring-2 focus:ring-blue-500/50
                   transition-all duration-200 shadow-sm"
      >
        <span className="text-lg">{languageFlags[language]}</span>
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
        <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-hidden
                        bg-white dark:bg-dark-surface
                        border border-gray-200 dark:border-dark-border
                        rounded-xl shadow-xl z-50
                        animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100 dark:border-dark-border">
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
                className="w-full pl-9 pr-3 py-2 text-sm
                           bg-gray-50 dark:bg-dark-hover
                           border border-gray-200 dark:border-dark-border
                           rounded-lg
                           text-gray-700 dark:text-dark-text
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500/50
                           transition-all"
              />
            </div>
          </div>

          {/* Language List */}
          <div className="max-h-56 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleSelect(lang)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm
                             transition-all duration-150
                             ${language === lang
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover'
                    }`}
                >
                  <span className="text-xl">{languageFlags[lang]}</span>
                  <span className="flex-1 text-left font-medium">{languageNames[lang]}</span>
                  {language === lang && (
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                No language found
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-hover">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {sortedLanguages.length} languages available
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
