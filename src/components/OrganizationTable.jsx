import Icon from "./Icon.jsx";
import RiskBadge from "./RiskBadge.jsx";
import { formatDate } from "../lib/catalog.js";
import { LOCALES } from "../i18n/locale.js";
import { useLanguage } from "../i18n/useLanguage.js";

function SortHeader({ label, field, sort, onSort, className = "" }) {
  const { t } = useLanguage();
  const active = sort.key === field;
  const ascending = sort.direction === "asc";
  return (
    <th scope="col" className={className} aria-sort={active ? ascending ? "ascending" : "descending" : "none"}>
      <button type="button" className={`sort-button ${active ? "is-sorted" : ""}`}
        onClick={() => onSort(field)}
        aria-label={t(active ? "table.sorted" : "table.sort", {
          label, direction: t(ascending ? "table.ascending" : "table.descending"),
        })}>
        {label}<Icon name={active ? ascending ? "up" : "down" : "sort"} size={14} />
      </button>
    </th>
  );
}

export default function OrganizationTable({ organizations, sort, onSort, onOpen, onReset, hasFilters, startIndex }) {
  const { language, t } = useLanguage();
  if (organizations.length === 0) {
    return (
      <div className="empty-state" role="status">
        <Icon name="search" size={28} />
        <h3>{t(hasFilters ? "empty.filteredTitle" : "empty.title")}</h3>
        <p>{t(hasFilters ? "empty.filteredHint" : "empty.hint")}</p>
        {hasFilters && <button type="button" className="button" onClick={onReset}>{t("empty.reset")}</button>}
      </div>
    );
  }
  return (
    <div className="table-scroll" role="region" aria-label={t("table.regionLabel")} tabIndex={0}>
      <table className="organization-table">
        <caption className="sr-only">{t("table.caption")}</caption>
        <thead><tr>
          <th className="row-index" scope="col"><span className="sr-only">{t("table.row")}</span>#</th>
          <SortHeader label={t("table.organization")} field="name" sort={sort} onSort={onSort} className="organization-column" />
          <SortHeader label={t("table.city")} field="city" sort={sort} onSort={onSort} className="city-column" />
          <th scope="col" className="sector-column">{t("table.sector")}</th>
          <SortHeader label={t("table.risk")} field="risk" sort={sort} onSort={onSort} className="risk-column" />
          <SortHeader label={t("table.vacancies")} field="vacancyCount" sort={sort} onSort={onSort} className="vacancies-column" />
          <th scope="col" className="source-column">{t("table.source")}</th>
          <th scope="col" className="open-column"><span className="sr-only">{t("table.details")}</span></th>
        </tr></thead>
        <tbody>{organizations.map((organization, index) => (
          <tr key={organization.id}>
            <td className="row-index">{String(startIndex + index + 1).padStart(2, "0")}</td>
            <td>
              <button type="button" className="organization-name" onClick={() => onOpen(organization.id)}>{organization.name}</button>
              <span className="cell-secondary">{organization.inn ? t("table.inn", { value: organization.inn }) : organization.id}</span>
            </td>
            <td><span className="city-name">{organization.city || t("common.notSpecified")}</span>
              {organization.region && <span className="cell-secondary">{organization.region}</span>}
            </td>
            <td><span className="sector-name" title={organization.sector || t("common.notSpecified")}>{organization.sector || t("common.notSpecified")}</span></td>
            <td><div className="risk-cell">
              <RiskBadge level={organization.risk} score={organization.score} />
              {organization.score !== null && <span className="score-value">{organization.score}<span> / 100</span></span>}
            </div></td>
            <td className="vacancy-value">{organization.vacancyCount}</td>
            <td>
              {organization.sourceUrl ? <a className="source-link" href={organization.sourceUrl} target="_blank" rel="noopener noreferrer">
                {organization.source || t("common.notSpecified")}<Icon name="external" size={12} />
              </a> : <span>{organization.source || t("common.notSpecified")}</span>}
              {organization.lastScrapedAt && <time className="cell-secondary" dateTime={organization.lastScrapedAt}>{formatDate(organization.lastScrapedAt, LOCALES[language], t("common.notAvailable"))}</time>}
            </td>
            <td><button type="button" className="icon-button row-open" onClick={() => onOpen(organization.id)} aria-label={t("table.view", { name: organization.name })}><Icon name="arrow" size={18} /></button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
