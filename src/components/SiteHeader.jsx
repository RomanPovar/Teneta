import Brand from "./Brand.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { useLanguage } from "../i18n/useLanguage.js";
import { ROUTES } from "../navigation/routes.js";

export default function SiteHeader({ page }) {
  const { t } = useLanguage();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Brand />
        <nav className="header-nav" aria-label={t("nav.label")}>
          {Object.entries(ROUTES).map(([key, href]) => (
            <a key={key} href={href} className="nav-item"
              aria-current={page === key ? "page" : undefined}>
              {t(`nav.${key}`)}
            </a>
          ))}
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
