import { useEffect, useState } from "react";
import "./App.css";
import "./SearchBar.css";
import LanguageProvider from "./i18n/LanguageProvider.jsx";
import { useLanguage } from "./i18n/useLanguage.js";
import { loadErrorMessage } from "./i18n/locale.js";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";
import Brand from "./components/Brand.jsx";
import CatalogFilters from "./components/CatalogFilters.jsx";
import OrganizationTable from "./components/OrganizationTable.jsx";
import RecordDialog from "./components/RecordDialog.jsx";
import RiskLegend from "./components/RiskLegend.jsx";
import Icon from "./components/Icon.jsx";
import { loadOrganizations } from "./services/organizationService.js";
import {
  DEFAULT_FILTERS, DEFAULT_SORT, exportableRecord, filterOrganizations,
  getFilterOptions, sortOrganizations,
} from "./lib/catalog.js";

function CataloguePage() {
  const { t } = useLanguage();
  const [loadState, setLoadState] = useState({ status: "loading", organizations: [], error: null });
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [sort, setSort] = useState({ ...DEFAULT_SORT });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState(null);
  const [exportNotice, setExportNotice] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    loadOrganizations({ signal: controller.signal })
      .then((organizations) => {
        if (active) setLoadState({ status: "ready", organizations, error: null });
      })
      .catch((error) => {
        if (active && error.name !== "AbortError") {
          setLoadState({ status: "error", organizations: [], error });
        }
      });
    return () => { active = false; controller.abort(); };
  }, [attempt]);

  const { organizations, status, error } = loadState;
  const cities = getFilterOptions(organizations, "city");
  const sectors = getFilterOptions(organizations, "sector");
  const vacancies = organizations.reduce((total, organization) => total + organization.vacancyCount, 0);
  const results = sortOrganizations(filterOrganizations(organizations, filters), sort);
  const hasFilters = Boolean(filters.query.trim() || filters.city || filters.sector || filters.risk);
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleResults = results.slice(startIndex, startIndex + pageSize);
  const selected = organizations.find((organization) => organization.id === selectedId);
  const count = (value) => status === "ready" ? value : "—";

  function changeFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setExportNotice(null);
  }
  function resetFilters() {
    setFilters({ ...DEFAULT_FILTERS });
    setPage(1);
    setExportNotice(null);
  }
  function changeSort(key) {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  }
  function retry() {
    setLoadState({ status: "loading", organizations: [], error: null });
    setAttempt((value) => value + 1);
  }
  function exportResults() {
    let url;
    let link;
    try {
      const json = JSON.stringify(results.map(exportableRecord), null, 2);
      url = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8" }));
      link = document.createElement("a");
      link.href = url;
      link.download = "teneta-organizations.json";
      document.body.appendChild(link);
      link.click();
      setExportNotice({ key: "export.success", count: results.length });
    } catch {
      setExportNotice({ key: "export.failed" });
    } finally {
      link?.remove();
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">{t("nav.skip")}</a>
      <header className="topbar"><div className="topbar-inner">
        <Brand />
        <nav className="header-nav" aria-label={t("nav.label")}><a href="#catalogue" className="nav-item" aria-current="page">{t("nav.catalogue")}</a></nav>
        <LanguageSwitcher />
      </div></header>
      <main id="main-content" className="main-container" tabIndex={-1}>
        <div className="page-heading">
          <h1>{t("page.heading")}</h1>
          <button type="button" className="button export-button" onClick={exportResults} disabled={status !== "ready" || results.length === 0}>
            <Icon name="download" size={17} />{t("export.button")}
          </button>
        </div>
        <dl className="catalogue-stats" aria-label={t("stats.label")}>
          <div><dt>{t("stats.organizations")}</dt><dd>{count(organizations.length)}</dd></div>
          <div><dt>{t("stats.cities")}</dt><dd>{count(cities.length)}</dd></div>
          <div><dt>{t("stats.vacancies")}</dt><dd>{count(vacancies)}</dd></div>
        </dl>
        {status === "loading" && <div className="state-panel" role="status"><span className="loading-spinner" /><h2>{t("loading.title")}</h2></div>}
        {status === "error" && <div className="state-panel" role="alert">
          <Icon name="info" size={28} /><h2>{t("error.title")}</h2><p>{loadErrorMessage(error, t)}</p>
          <button type="button" className="button" onClick={retry}><Icon name="reset" size={16} />{t("error.retry")}</button>
        </div>}
        {status === "ready" && <>
          <CatalogFilters filters={filters} cities={cities} sectors={sectors}
            hasUnassessed={organizations.some((organization) => organization.risk === null)}
            onChange={changeFilter} onReset={resetFilters} />
          <section className="catalogue-section" id="catalogue" aria-labelledby="results-title">
            <div className="table-toolbar">
              <h2 id="results-title" aria-live="polite" aria-atomic="true">
                {t(hasFilters ? "table.results" : "table.organizations")}<span className="results-badge">{results.length}</span>
              </h2>
              <RiskLegend />
            </div>
            <OrganizationTable organizations={visibleResults} sort={sort} onSort={changeSort}
              onOpen={setSelectedId} onReset={resetFilters} hasFilters={hasFilters} startIndex={startIndex} />
            <div className="table-footer">
              <p>{results.length ? startIndex + 1 : 0}–{Math.min(startIndex + pageSize, results.length)} <span>{t("pagination.of")}</span> {results.length}</p>
              <div className="pagination">
                <label htmlFor="page-size">{t("pagination.rows")}<select id="page-size" value={pageSize}
                  onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                  {[5, 10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
                </select></label>
                <button type="button" className="icon-button" aria-label={t("pagination.previous")}
                  onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}><Icon name="left" size={17} /></button>
                <span className="page-indicator">{currentPage} <span>/ {pageCount}</span></span>
                <button type="button" className="icon-button" aria-label={t("pagination.next")}
                  onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount}><Icon name="right" size={17} /></button>
              </div>
            </div>
          </section>
        </>}
        <p className="export-feedback" role="status" aria-live="polite">{exportNotice ? t(exportNotice.key, exportNotice) : ""}</p>
      </main>
      {selected && <RecordDialog organization={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

export default function App() {
  return <LanguageProvider><CataloguePage /></LanguageProvider>;
}
