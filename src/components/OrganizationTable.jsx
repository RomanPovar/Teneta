import Icon from "./Icon.jsx";
import RiskBadge from "./RiskBadge.jsx";

function SortHeader({ label, field, sort, onSort, className = "" }) {
  const active = sort.key === field;
  return <th scope="col" className={className} aria-sort={active ? sort.direction === "asc" ? "ascending" : "descending" : "none"}>
    <button type="button" className={`sort-button ${active ? "is-sorted" : ""}`} onClick={() => onSort(field)} aria-label={`Sort by ${label}${active ? `, currently ${sort.direction === "asc" ? "ascending" : "descending"}` : ""}`}>
      {label}<Icon name={active ? sort.direction === "asc" ? "up" : "down" : "sort"} size={15} />
    </button>
  </th>;
}

export default function OrganizationTable({ organizations, sort, onSort, onOpen, onReset, hasFilters, startIndex }) {
  if (organizations.length === 0) {
    return <div className="empty-state" role="status"><span className="empty-icon"><Icon name="search" size={28} /></span><h3>{hasFilters ? "No matching organizations" : "Your catalogue is empty"}</h3><p>{hasFilters ? "Try a broader search or remove a filter. Your original data is still here." : "Add organizations to the JSON file or connect your backend."}</p>{hasFilters && <button type="button" className="button button-secondary" onClick={onReset}><Icon name="reset" size={16} />Reset search & filters</button>}</div>;
  }
  return (
    <div className="table-scroll" role="region" aria-label="Organization results table; scroll horizontally on small screens" tabIndex={0}>
      <table className="organization-table">
        <caption className="sr-only">Organization catalogue. Sort using the Organization, City, Risk level or Vacancies column headers.</caption>
        <thead><tr>
          <th className="row-index" scope="col"><span className="sr-only">Row</span>#</th>
          <SortHeader label="Organization" field="name" sort={sort} onSort={onSort} className="organization-column" />
          <SortHeader label="City" field="city" sort={sort} onSort={onSort} className="city-column" />
          <th scope="col" className="sector-column">Sector</th>
          <SortHeader label="Risk level" field="risk" sort={sort} onSort={onSort} className="risk-column" />
          <SortHeader label="Vacancies" field="vacancyCount" sort={sort} onSort={onSort} className="vacancies-column" />
          <th scope="col" className="source-column">Data source</th>
          <th scope="col" className="open-column"><span className="sr-only">Details</span></th>
        </tr></thead>
        <tbody>
          {organizations.map((organization, index) => <tr key={organization.id}>
            <td className="row-index">{String(startIndex + index + 1).padStart(2, "0")}</td>
            <td><div className="organization-cell"><span className="organization-monogram" aria-hidden="true">{organization.name.replace(/^(ООО|ПАО|АО|Демо)\s*/i, "").slice(0, 2).toUpperCase()}</span><div className="organization-name-wrap"><button type="button" className="organization-name" onClick={() => onOpen(organization.id)}>{organization.name}</button><span className="organization-id">{organization.id}<span className="id-separator">/</span>{organization.inn ? `INN ${organization.inn}` : "Demo organization"}</span></div></div></td>
            <td><span className="city-name">{organization.city || "Not supplied"}</span><span className="cell-secondary">{organization.region || "—"}</span></td>
            <td><span className="sector-name" title={organization.sector}>{organization.sector}</span></td>
            <td><RiskBadge level={organization.risk} score={organization.score} isDemo={organization.isDemo} /></td>
            <td className="vacancy-value"><Icon name="briefcase" size={15} /><span>{organization.vacancyCount}</span></td>
            <td><span className={`source-tag ${organization.isDemo ? "source-demo" : "source-provided"}`}><span />{organization.isDemo ? "Fictional demo" : organization.source}</span><span className="cell-secondary">{organization.isDemo ? "Synthetic data" : "Provided · unverified"}</span></td>
            <td><button type="button" className="icon-button row-open" onClick={() => onOpen(organization.id)} aria-label={`View ${organization.name}`}><Icon name="arrow" size={18} /></button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
  );
}
