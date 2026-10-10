import { useLanguage } from '../i18n/useLanguage.js';

export default function LanguageSwitcher() {
  const { language, changeLanguage, t } = useLanguage();
  return (
    <div className="language-switcher" role="group" aria-label={t('language.label')}>
      {['en', 'uk'].map((value) => (
        <button key={value} type="button" className="language-button"
          aria-pressed={language === value} aria-label={t(`language.${value}`)}
          title={t(`language.${value}`)} onClick={() => changeLanguage(value)}>
          <span lang={value}>{value === 'en' ? 'EN' : 'УКР'}</span>
        </button>
      ))}
    </div>
  );
}
