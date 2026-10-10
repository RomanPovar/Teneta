import { MESSAGES } from './messages.js';

export const LANGUAGE_STORAGE_KEY = 'teneta.ui.language';
export const LANGUAGES = Object.freeze(['en', 'uk']);
export const DEFAULT_LANGUAGE = 'en';
export const LOCALES = Object.freeze({ en: 'en-GB', uk: 'uk-UA' });

export function supportedLanguage(value) {
  return LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

export function readSavedLanguage() {
  try {
    return typeof window === 'undefined'
      ? DEFAULT_LANGUAGE
      : supportedLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function saveLanguage(value) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, supportedLanguage(value));
    }
  } catch {
    // Language switching still works when the browser blocks persistent storage.
  }
}

export function createTranslator(language) {
  const messages = MESSAGES[supportedLanguage(language)];
  return (key, values = {}) => {
    const template = messages[key] ?? MESSAGES.en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (match, name) => (
      Object.hasOwn(values, name) ? String(values[name]) : match
    ));
  };
}

export function loadErrorMessage(error, t) {
  const code = ['http', 'network', 'invalidJson', 'invalidData'].includes(error?.code)
    ? error.code : 'unknown';
  return t(`error.${code}`, { status: error?.status ?? '—' });
}
