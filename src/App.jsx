import { useEffect, useState } from "react";
import "./index.css";
import "./App.css";
import "./SearchBar.css";
import CatalogFilters from "./components/CatalogFilters.jsx";
import OrganizationTable from "./components/OrganizationTable.jsx";
import RecordDialog, { ModalFrame } from "./components/RecordDialog.jsx";
import Icon from "./components/Icon.jsx";
import { DATA_SOURCE, loadOrganizations } from "./services/organizationService.js";
import { DEFAULT_FILTERS, DEFAULT_SORT, exportableRecord, filterOrganizations, getFilterOptions, sortOrganizations } from "./lib/catalog.js";

function Logo() {
  return <a className="brand" href="#main-content" aria-label="Teneta catalogue"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 36 36" fill="none"><path d="M5 8 18 2l13 6v20l-13 6-13-6V8Z" /><path d="M5 8 18 15l13-7M18 15v19M5 18l13 7 13-7M11.5 5v20m13-20v20" /></svg></span><span>TENETA<span className="brand-caption">OPEN DATA. CONNECTED.</span></span></a>;
}

function StatCard({ label, value, caption, icon, loading }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><Icon name={icon} size={19} /></div><div className="stat-bottom"><strong>{loading ? "—" : String(value).padStart(2, "0")}</strong><span>{caption}</span></div></div>;
}

export default function App() {
  const [loadState, setLoadState] = useState({ status: "loading", organizations: [], error: "" });
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [sort, setSort] = useState({ ...DEFAULT_SORT });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  // Fetching is an external side effect. Filtering/sorting below is derived data, not another effect.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    loadOrganizations({ signal: controller.signal })
      .then((organizations) => { if (active) setLoadState({ status: "ready", organizations, error: "" }); })
      .catch((error) => { if (active && error.name !== "AbortError") setLoadState({ status: "error", organizations: [], error: error.message || "The catalogue could not be loaded." }); });
    return () => { active = false; controller.abort(); };
  }, [attempt]);

  const { organizations, status, error } = loadState;
  const cities = getFilterOptions(organizations, "city");
  const sectors = getFilterOptions(organizations, "sector");
  const demoCount = organizations.filter((organization) => organization.isDemo).length;
  const vacancies = organizations.reduce((total, organization) => total + organization.vacancyCount, 0);
  const results = sortOrganizations(filterOrganizations(organizations, filters), sort);
  const hasFilters = Boolean(filters.query.trim() || filters.city || filters.sector || filters.risk || filters.origin);
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleResults = results.slice(startIndex, startIndex + pageSize);
  const selected = organizations.find((organization) => organization.id === selectedId);

  function changeFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setExportMessage("");
  }
  function resetFilters() {
    setFilters({ ...DEFAULT_FILTERS });
    setPage(1);
    setExportMessage("");
  }
  function changeSort(key) {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  }
  function retry() {
    setLoadState({ status: "loading", organizations: [], error: "" });
    setAttempt((value) => value + 1);
  }
  function exportResults() {
    // ALL matching records, not just the current table page. Keep the backend's nested schema.
    const json = JSON.stringify(results.map(exportableRecord), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "teneta-organizations.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportMessage(`Exported ${results.length} matching ${results.length === 1 ? "record" : "records"}.`);
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to catalogue</a>
      <header className="topbar"><div className="topbar-inner"><Logo /><nav className="main-nav" aria-label="Main navigation"><a href="#catalogue" className="nav-item active" aria-current="page"><Icon name="grid" size={16} />Catalogue</a><button className="nav-item" type="button" onClick={() => setShowAbout(true)}><Icon name="info" size={16} />About this dataset</button></nav><span className="workspace-label"><span className="status-dot" />Hackathon workspace</span></div></header>
      <main id="main-content" className="main-container" tabIndex={-1}>
        <section className="page-heading"><div><p className="eyebrow"><span>WORKSPACE</span><span className="breadcrumb-divider">/</span>ORGANIZATIONS</p><h1>Organization catalogue<span className="heading-dot">.</span></h1><p className="page-description">Less noise. More context. Find your way through the data.</p></div><div className="heading-actions"><span className="data-mode"><span className="status-dot" />{DATA_SOURCE}</span><button type="button" className="button button-primary" onClick={exportResults} disabled={status !== "ready" || results.length === 0}><Icon name="download" size={17} />Export JSON</button></div></section>
        <div className="overview-label"><span>DATASET OVERVIEW</span><span>Before search & filters</span></div>
        <section className="stats-grid" aria-label="Full dataset statistics">
          <StatCard label="Organizations" value={organizations.length} caption="records in dataset" icon="building" loading={status === "loading"} />
          <StatCard label="Cities" value={cities.length} caption="locations represented" icon="pin" loading={status === "loading"} />
          <StatCard label="Loaded vacancies" value={vacancies} caption="from included records" icon="briefcase" loading={status === "loading"} />
          <StatCard label="Fictional examples" value={demoCount} caption="for interface testing" icon="layers" loading={status === "loading"} />
        </section>
        {status === "ready" && <div className="dataset-notice"><span className="notice-label"><Icon name="info" size={15} />DATA NOTE</span><p>{demoCount > 0 ? <>{organizations.length - demoCount} provided {organizations.length - demoCount === 1 ? "record" : "records"} + {demoCount} fictional demos. </> : "Provided data. "}Risk labels are provisional, not verified findings.</p><button type="button" className="text-button" onClick={() => setShowAbout(true)}>How to read this<Icon name="arrow" size={15} /></button></div>}

        {status === "loading" && <div className="loading-panel" role="status"><span className="loading-spinner" /><h2>Loading the catalogue</h2><p>Reading organization records from {DATA_SOURCE.toLowerCase()}.</p></div>}
        {status === "error" && <div className="error-panel" role="alert"><Icon name="info" size={28} /><h2>We couldn’t load the dataset</h2><p>{error}</p><button type="button" className="button button-primary" onClick={retry}><Icon name="reset" size={16} />Try again</button></div>}
        {status === "ready" && <>
          <CatalogFilters filters={filters} cities={cities} sectors={sectors} hasUnassessed={organizations.some((organization) => organization.risk === null)} onChange={changeFilter} onReset={resetFilters} resultCount={results.length} totalCount={organizations.length} />
          <section className="catalogue-section" id="catalogue" aria-labelledby="results-title">
            <div className="table-toolbar"><div className="table-title"><Icon name="grid" size={18} /><h2 id="results-title">All organizations</h2><span className="results-badge">{results.length}</span></div><span className="table-hint">Click a name to inspect the record<Icon name="arrow" size={14} /></span></div>
            {results.length > 0 && <p className="mobile-table-hint">Swipe the table for risk levels, vacancies and sources.<Icon name="arrow" size={14} /></p>}
            <OrganizationTable organizations={visibleResults} sort={sort} onSort={changeSort} onOpen={setSelectedId} onReset={resetFilters} hasFilters={hasFilters} startIndex={startIndex} />
            <div className="table-footer"><p>Showing <strong>{results.length ? startIndex + 1 : 0}–{Math.min(startIndex + pageSize, results.length)}</strong> of <strong>{results.length}</strong> results</p><div className="pagination"><label htmlFor="page-size">Rows per page<select id="page-size" aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{[5, 10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select></label><span className="pagination-divider" /><button type="button" className="icon-button pagination-button" aria-label="Previous page" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}><Icon name="left" size={17} /></button><span className="page-indicator">{currentPage}<span>/ {pageCount}</span></span><button type="button" className="icon-button pagination-button" aria-label="Next page" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount}><Icon name="right" size={17} /></button></div></div>
          </section>
          <div className="catalogue-footnotes"><p><span className="status-dot" />Original JSON stays intact when you search, filter or sort.</p><p className="export-message" role="status">{exportMessage || "Risk order: low → moderate → high"}</p></div>
        </>}
        <footer className="page-footer"><span className="footer-wordmark">TENETA</span><span>Turn scattered records into a clearer picture.</span><span className="footer-version">CATALOGUE / 01</span></footer>
      </main>
      {selected && <RecordDialog organization={selected} onClose={() => setSelectedId(null)} />}
      {showAbout && <ModalFrame title="A transparent starting point." eyebrow="ABOUT THIS DATASET" onClose={() => setShowAbout(false)}><div className="about-content"><p>This catalogue reads nested organization JSON. Its sample contains your supplied company record and eight explicitly fictional organizations for testing search, sorting and all three risk states.</p><h3>What a risk label means here</h3><p>A provided <code>risk_level</code> wins. Otherwise, the temporary UI rule maps a valid <code>threat_score</code> from 0–100 to low (&lt;34), moderate (34–&lt;67), or high (67–100). Missing or invalid values are shown as “Not assessed,” never low.</p><p>These cutoffs are display defaults, not a validated assessment method. The interface does not determine that a company is suspicious. The sample’s confidence field is not used as its risk score.</p><h3>Demo is not evidence</h3><p>Fictional companies have no real employer profiles or personal contacts. Their assigned scores only demonstrate the controls. The provided company’s data and analysis have not been independently verified here.</p><h3>Search behavior</h3><p>Every search term must occur somewhere in the organizational record. City, sector, risk and record type are applied together. Clearing just the search preserves active filters; “Clear all” restores the full list.</p><h3>From JSON to the backend</h3><p>Loading is isolated in <code>src/services/organizationService.js</code>. Point <code>VITE_ORGANIZATIONS_URL</code> at your API when it is ready. This version searches the loaded dataset in the browser, not the entire remote database.</p><p className="detail-footnote">Before a public deployment, review which data may be published. Anything delivered to the browser is accessible to its users.</p></div><div className="dialog-footer"><span>Source type and demo flags remain visible.</span><button className="button button-primary" type="button" onClick={() => setShowAbout(false)}>Got it<Icon name="check" size={16} /></button></div></ModalFrame>}
    </div>
  );
}
