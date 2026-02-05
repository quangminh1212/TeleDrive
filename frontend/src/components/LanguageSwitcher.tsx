import React from 'react';
import { useI18n, Language, languageNames } from '../i18n';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useI18n();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
      className="px-2 py-1 text-sm border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-surface text-gray-700 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-dark-blue"
    >
      {(Object.keys(languageNames) as Language[]).map((lang) => (
        <option key={lang} value={lang}>
          {languageNames[lang]}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
