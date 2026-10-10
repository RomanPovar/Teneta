import { useCallback, useEffect, useMemo, useState } from 'react';
import { LanguageContext } from './LanguageContext.js';
import { createTranslator, LANGUAGES, readSavedLanguage, saveLanguage } from './locale.js';

export default function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(readSavedLanguage);
  const t = useMemo(() => createTranslator(language), [language]);
  const changeLanguage = useCallback((next) => {
    if (LANGUAGES.includes(next)) setLanguage(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('page.title');
    saveLanguage(language);
  }, [language, t]);

  const value = useMemo(() => ({ language, t, changeLanguage }), [language, t, changeLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
