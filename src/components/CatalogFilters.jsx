import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";
import { RISK_LABELS } from "../lib/catalog.js";

function FilterSelect({ id, label, value, onChange, children }) {
  return (
    <label className="filter-field" htmlFor={id}>
      <span id={`${id}-label`}>{label}</span>
      <span className="select-wrap"><select id={id} aria-labelledby={`${id}-label`} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select><Icon name="down" size={16} /></span>
    </label>
  );
}

export default function CatalogFilters({ filters, cities, sectors, hasUnassessed, onChange, onReset, resultCount, totalCount }) {
  const searchRef = useRef(null);
  const filterCount = [filters.city, filters.sector, filters.risk, filters.origin].filter(Boolean).length;
  const active = Boolean(filters.query.trim() || filterCount);
  const chips = [
    ["city", filters.city], ["sector", filters.sector],
    ["risk", filters.risk === "unassessed" ? "Not assessed" : RISK_LABELS[filters.risk]],
    ["origin", filters.origin === "demo" ? "Fictional demos" : filters.origin === "supplied" ? "Provided records" : ""],
  ].filter(([, value]) => value);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <section className="filter-panel gradient-border" aria-label="Search and filter organizations">
      <form onSubmit={(event) => event.preventDefault()}>
        <div className="search-row">
          <label className="search-field gradient-border" htmlFor="organization-search">
            <Icon name="search" size={22} />
            <span className="sr-only">Search organizations</span>
            <input ref={searchRef} id="organization-search" aria-label="Search organizations" type="search" value={filters.query} onChange={(event) => onChange("query", event.target.value)} placeholder="Search organizations, cities, INN or keywords…" autoComplete="off" spellCheck="false" />
            {filters.query ? <button type="button" className="icon-button" aria-label="Clear search" onClick={() => { onChange("query", ""); searchRef.current?.focus(); }}><Icon name="close" size={17} /></button> : <kbd>Ctrl K</kbd>}
          </label>
          <div className="filter-caption"><Icon name="filters" size={18} /><span>Filters</span><span className="small-count">{filterCount}</span></div>
        </div>
        <div className="filters-grid">
          <FilterSelect id="city-filter" label="City" value={filters.city} onChange={(value) => onChange("city", value)}><option value="">All cities</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</FilterSelect>
          <FilterSelect id="sector-filter" label="Sector" value={filters.sector} onChange={(value) => onChange("sector", value)}><option value="">All sectors</option>{sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</FilterSelect>
          <FilterSelect id="risk-filter" label="Risk level" value={filters.risk} onChange={(value) => onChange("risk", value)}><option value="">All risk levels</option>{Object.entries(RISK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}{hasUnassessed && <option value="unassessed">Not assessed</option>}</FilterSelect>
          <FilterSelect id="origin-filter" label="Record type" value={filters.origin} onChange={(value) => onChange("origin", value)}><option value="">All records</option><option value="supplied">Provided records</option><option value="demo">Fictional demos</option></FilterSelect>
        </div>
        <div className="filter-bottom">
          <div className="filter-summary" aria-live="polite" aria-atomic="true"><span className="status-dot" /><span><strong>{resultCount}</strong> of {totalCount} organizations{active ? " match your search" : " in this dataset"}</span></div>
          <button className="text-button reset-button" type="button" onClick={onReset} disabled={!active}><Icon name="reset" size={15} />Clear all</button>
        </div>
        {chips.length > 0 && <div className="filter-chips" aria-label="Active filters">{chips.map(([key, value]) => <button type="button" key={key} className="filter-chip" onClick={() => onChange(key, "")} aria-label={`Remove ${key} filter: ${value}`}><span>{value}</span><Icon name="close" size={12} /></button>)}</div>}
      </form>
    </section>
  );
}
