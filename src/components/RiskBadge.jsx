import { useLanguage } from "../i18n/useLanguage.js";

export default function RiskBadge({ level, score }) {
  const { t } = useLanguage();
  const label = t(`risk.${level ?? "unassessed"}`);
  const title = score === null || score === undefined || level === null
    ? t("risk.noScore")
    : t("risk.tooltip", { score, label, meaning: t(`risk.meaning.${level}`) });
  return (
    <span className={`risk-badge risk-${level ?? "unknown"}`} title={title}>
      <span className="risk-bars" aria-hidden="true"><i /><i /><i /></span>
      {label}
    </span>
  );
}
