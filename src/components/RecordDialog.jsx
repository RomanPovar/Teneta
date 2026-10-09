import { useEffect, useId, useRef } from "react";
import Icon from "./Icon.jsx";
import RiskBadge from "./RiskBadge.jsx";
import { formatDate } from "../lib/catalog.js";

export function ModalFrame({ title, eyebrow, onClose, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      queueMicrotask(() => {
        if ((!dialog.isConnected || !dialog.open) && previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <dialog ref={ref} className="record-dialog" aria-labelledby={titleId} onClose={(event) => { if (!event.currentTarget.open) onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-content">
        <div className="dialog-heading"><div><p className="eyebrow">{eyebrow}</p><h2 id={titleId}>{title}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog" autoFocus><Icon name="close" /></button></div>
        {children}
      </div>
    </dialog>
  );
}

function Detail({ label, children }) {
  return <div><dt>{label}</dt><dd>{children || "Not supplied"}</dd></div>;
}

export default function RecordDialog({ organization, onClose }) {
  return (
    <ModalFrame title={organization.name} eyebrow={`ORGANIZATION / ${organization.id}`} onClose={onClose}>
      <div className="record-status"><RiskBadge level={organization.risk} score={organization.score} isDemo={organization.isDemo} /><span>{organization.score === null ? "No numeric score supplied" : `${organization.score} / 100 · provided score`}</span></div>
      <div className="provenance-notice"><Icon name="info" size={18} /><p>{organization.isDemo ? "Fictional organization. Names, jobs and scores exist only to test this interface; they are not findings about a real company." : organization.provenance}</p></div>
      <dl className="detail-grid">
        <Detail label="City">{organization.city}</Detail><Detail label="Region">{organization.region}</Detail>
        <Detail label="INN">{organization.inn}</Detail><Detail label="OGRN">{organization.ogrn}</Detail>
        <Detail label="Last collected (UTC)">{formatDate(organization.lastScrapedAt)}</Detail><Detail label="Risk basis">{organization.riskBasis}</Detail>
      </dl>
      <section className="detail-section"><h3>Sector</h3><p>{organization.sector}</p></section>
      {organization.description && <section className="detail-section"><h3>Company description <span>from supplied data</span></h3><p>{organization.description}</p></section>}
      {organization.summary && <section className="detail-section"><h3>{organization.isDemo ? "Demo note" : "Supplied analysis"}</h3><p>{organization.summary}</p><p className="detail-footnote">Displayed as provided, not verified by Teneta. Confidence and risk are separate fields.</p></section>}
      <section className="detail-section"><h3>Loaded vacancies <span>{organization.vacancyCount}</span></h3>{organization.vacancies.length ? <ul className="vacancy-list">{organization.vacancies.map((vacancy, index) => <li key={`${vacancy.vacancy_id ?? "vacancy"}-${index}`}><Icon name="briefcase" size={17} /><div><strong>{typeof vacancy.title === "string" ? vacancy.title : "Untitled vacancy"}</strong><span>{Array.isArray(vacancy.key_skills) ? vacancy.key_skills.filter((skill) => typeof skill === "string").join(" · ") : ""}</span></div></li>)}</ul> : <p>No vacancies in this record.</p>}</section>
      <section className="detail-section"><h3>Organizational contacts</h3><p>{[...organization.emails, ...organization.phones].join(" · ") || "No organizational contacts supplied."}</p><p className="detail-footnote">Individual recruiter details are not displayed or included in catalogue exports.</p></section>
      {organization.sourceUrl && !organization.isDemo && <a className="button button-secondary source-link" href={organization.sourceUrl} target="_blank" rel="noopener noreferrer">Open supplied employer source<Icon name="external" size={15} /></a>}
      <div className="dialog-footer"><span>Temporary labels: low &lt; 34 · moderate 34–&lt;67 · high 67–100.</span><button className="button button-primary" type="button" onClick={onClose}>Done<Icon name="check" size={16} /></button></div>
    </ModalFrame>
  );
}
