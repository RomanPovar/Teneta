import { useLanguage } from "../i18n/useLanguage.js";
import logoUrl from "../assets/teneta-logo.png";

export default function Brand() {
  const { t } = useLanguage();
  return (
    <a className="brand" href="#/" aria-label={t("brand.label")}>
      <span className="brand-symbol" aria-hidden="true">
        <img src={logoUrl} alt="" draggable="false" />
      </span>
      <span className="brand-copy">
        <span className="brand-wordmark" aria-hidden="true">
          <img src={logoUrl} alt="" draggable="false" />
        </span>
        <span className="brand-caption" lang="en">Relationships reveal truth</span>
      </span>
    </a>
  );
}
