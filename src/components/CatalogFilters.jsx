import { useRef } from "react";
import Icon from "./Icon.jsx";
import { RISK_LEVELS } from "../lib/catalog.js";
import { useLanguage } from "../i18n/useLanguage.js";

function FilterSelect({ id, label, value, onChange, children }) {
  return (
    <label className="filter-field" htmlFor={id}>
      <span>{label}</span>
      <span className="select-wrap">
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
        <Icon name="down" size={16} />
      </span>
    </label>
  );
}

export default function CatalogFilters({ filters, cities, sectors, hasUnassessed, onChange, onReset }) {
  const { t } = useLanguage();
  const searchRef = useRef(null);
  const active = Boolean(filters.query.trim() || filters.city || filters.sector || filters.risk);
  const chips = [
    ["city", filters.city], ["sector", filters.sector],
    ["risk", filters.risk ? t(`risk.${filters.risk}`) : ""],
  ].filter(([, value]) => value);

  return (
    <section className="filter-panel gradient-border" aria-label={t("filters.label")}>
      <form onSubmit={(event) => event.preventDefault()}>
        <div className="search-row">
          <div className="search-field gradient-border">
            <Icon name="search" size={20} />
            <label className="sr-only" htmlFor="organization-search">{t("filters.search")}</label>
            <input ref={searchRef} id="organization-search" type="search" value={filters.query}
              onChange={(event) => onChange("query", event.target.value)}
              placeholder={t("filters.placeholder")}
              autoComplete="off" spellCheck="false" />
            {filters.query && (
              <button type="button" className="icon-button" aria-label={t("filters.clearSearch")}
                onClick={() => { onChange("query", ""); searchRef.current?.focus(); }}>
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
          <button className="clear-filters" type="button" onClick={onReset} disabled={!active}>
            <Icon name="reset" size={16} />{t("filters.clearAll")}
          </button>
        </div>
        <div className="filters-grid">
          <FilterSelect id="city-filter" label={t("filters.city")} value={filters.city} onChange={(value) => onChange("city", value)}>
            <option value="">{t("filters.allCities")}</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </FilterSelect>
          <FilterSelect id="sector-filter" label={t("filters.sector")} value={filters.sector} onChange={(value) => onChange("sector", value)}>
            <option value="">{t("filters.allSectors")}</option>{sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
          </FilterSelect>
          <FilterSelect id="risk-filter" label={t("filters.risk")} value={filters.risk} onChange={(value) => onChange("risk", value)}>
            <option value="">{t("filters.allRisks")}</option>
            {RISK_LEVELS.map((level) => <option key={level} value={level}>{t(`risk.${level}`)}</option>)}
            {hasUnassessed && <option value="unassessed">{t("risk.unassessed")}</option>}
          </FilterSelect>
        </div>
        {chips.length > 0 && <div className="filter-chips" aria-label={t("filters.active")}>
          {chips.map(([key, value]) => <button type="button" key={key} className="filter-chip"
            onClick={() => onChange(key, "")} aria-label={t("filters.remove", { label: t(`filters.${key}`), value })}>
            <span>{value}</span><Icon name="close" size={12} />
          </button>)}
        </div>}
      </form>
    </section>
  );
}
