import { useEffect, useId, useRef } from "react";
import { graphHref } from "../navigation/routes.js";
import Icon from "./Icon.jsx";
import RiskBadge from "./RiskBadge.jsx";
import { formatDate, safeHttpUrl } from "../lib/catalog.js";
import { LOCALES } from "../i18n/locale.js";
import { useLanguage } from "../i18n/useLanguage.js";

function Detail({ label, children }) {
  const { t } = useLanguage();
  return <div><dt>{label}</dt><dd>{children || t("common.notAvailable")}</dd></div>;
}

export default function RecordDialog({ organization, onClose }) {
  const { language, t } = useLanguage();
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
        if ((!dialog.isConnected || !dialog.open) && previouslyFocused?.isConnected) {
          previouslyFocused.focus({ preventScroll: true });
        }
      });
    };
  }, []);

  return (
    <dialog ref={ref} className="record-dialog" aria-labelledby={titleId}
      onClose={(event) => { if (!event.currentTarget.open) onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-content">
        <div className="dialog-heading">
          <div><p className="record-id">{organization.id}</p><h2 id={titleId}>{organization.name}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t("record.close")} autoFocus><Icon name="close" /></button>
        </div>
        <div className="record-status">
          <RiskBadge level={organization.risk} score={organization.score} />
          {organization.score !== null && <span className="record-score">{organization.score} / 100</span>}
          <span className="risk-meaning">{t(organization.risk ? `risk.meaning.${organization.risk}` : "risk.noScore")}</span>
        </div>
        <dl className="detail-grid">
          <Detail label={t("record.city")}>{organization.city}</Detail><Detail label={t("record.region")}>{organization.region}</Detail>
          <Detail label={t("record.inn")}>{organization.inn}</Detail><Detail label={t("record.ogrn")}>{organization.ogrn}</Detail>
          <Detail label={t("record.updated")}>{formatDate(organization.lastScrapedAt, LOCALES[language], t("common.notAvailable"))}</Detail>
          <Detail label={t("record.source")}>{organization.sourceUrl
            ? <a className="source-link" href={organization.sourceUrl} target="_blank" rel="noopener noreferrer">{organization.source || t("common.notSpecified")}<Icon name="external" size={12} /></a>
            : organization.source || t("common.notSpecified")}</Detail>
        </dl>
        <section className="detail-section"><h3>{t("record.sector")}</h3><p>{organization.sector || t("common.notSpecified")}</p></section>
        {organization.description && <section className="detail-section"><h3>{t("record.overview")}</h3><p>{organization.description}</p></section>}
        {organization.summary && <section className="detail-section"><h3>{t("record.analysis")}</h3><p>{organization.summary}</p></section>}
        <section className="detail-section">
          <h3>{t("record.vacancies")} <span>{organization.vacancyCount}</span></h3>
          {organization.vacancies.length ? <ul className="vacancy-list">
            {organization.vacancies.map((vacancy, index) => {
              const url = safeHttpUrl(vacancy.url);
              const title = typeof vacancy.title === "string" ? vacancy.title : t("record.untitledVacancy");
              const skills = Array.isArray(vacancy.key_skills) ? vacancy.key_skills.filter((skill) => typeof skill === "string") : [];
              return <li key={`${vacancy.vacancy_id ?? "vacancy"}-${index}`}>
                <Icon name="briefcase" size={17} />
                <div>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{title}<Icon name="external" size={12} /></a> : <strong>{title}</strong>}
                  {skills.length > 0 && <span>{skills.join(" · ")}</span>}
                </div>
              </li>;
            })}
          </ul> : <p>{t("record.noVacancies")}</p>}
        </section>
        <section className="detail-section"><h3>{t("record.contacts")}</h3>
          <p>{[...organization.emails, ...organization.phones].join(" · ") || t("record.noContacts")}</p>
          {organization.websites.length > 0 && <div className="website-links">{organization.websites.map((url) => (
            <a className="source-link" href={url} key={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname}<Icon name="external" size={12} /></a>
          ))}</div>}
        </section>
        <div className="dialog-footer"><a className="button record-graph-link" href={graphHref(organization.id)} onClick={onClose}><Icon name="network" size={17} />{t("maps.openGraph")}</a><button className="button" type="button" onClick={onClose}>{t("common.close")}</button></div>
      </div>
    </dialog>
  );
}
