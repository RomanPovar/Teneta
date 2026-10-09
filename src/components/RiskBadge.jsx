import { RISK_LABELS } from "../lib/catalog.js";

export default function RiskBadge({ level, score, isDemo = false }) {
  const label = RISK_LABELS[level] ?? "Not assessed";
  return (
    <span className={`risk-badge risk-${level ?? "unknown"}`} title={`${isDemo ? "Fictional demo value. " : "Provided score; not verified. "}${score === null ? "No valid score supplied." : `Score ${score}/100.`}`}>
      <span className="risk-bars" aria-hidden="true"><i /><i /><i /></span>
      {label}
    </span>
  );
}
