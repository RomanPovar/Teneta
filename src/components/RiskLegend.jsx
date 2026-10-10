import { RISK_BANDS } from "../lib/catalog.js";
import { useLanguage } from "../i18n/useLanguage.js";
import Icon from "./Icon.jsx";

export default function RiskLegend() {
  const { t } = useLanguage();
  return (
    <details className="risk-legend" onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }
    }}>
      <summary><Icon name="info" size={16} />{t("risk.scale")}<Icon name="down" size={14} /></summary>
      <div className="risk-legend-content">
        <table>
          <caption className="sr-only">{t("risk.caption")}</caption>
          <thead><tr><th scope="col">{t("risk.points")}</th><th scope="col">{t("risk.level")}</th><th scope="col">{t("risk.meaning")}</th></tr></thead>
          <tbody>{RISK_BANDS.map((band) => (
            <tr key={band.level}><td>{band.range}</td><td>{t(`risk.${band.level}`)}</td><td>{t(`risk.meaning.${band.level}`)}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </details>
  );
}
