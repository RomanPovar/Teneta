import { useContext } from 'react';
import { LanguageContext } from './LanguageContext.js';

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (value === null) throw new Error('useLanguage must be used inside LanguageProvider.');
  return value;
}
