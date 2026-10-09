/** Pure data helpers: no React, network requests, or mutation of the source JSON. */
export const RISK_LEVELS = ["low", "moderate", "high"];
export const RISK_LABELS = { low: "Low", moderate: "Moderate", high: "High" };

// Temporary DISPLAY policy for the hackathon. Agree these thresholds with the backend.
// This does not infer risk from a name, city, vacancy, or industry.
export const RISK_POLICY = { moderateFrom: 34, highFrom: 67, maximum: 100 };
export const DEFAULT_FILTERS = { query: "", city: "", sector: "", risk: "", origin: "" };
export const DEFAULT_SORT = { key: "name", direction: "asc" };
const collator = new Intl.Collator(["ru", "en"], { sensitivity: "base", numeric: true });
const text = (value) => (typeof value === "string" ? value.trim() : "");
const list = (value) => (Array.isArray(value) ? value : []);
const strings = (value) => [...new Set(list(value).map(text).filter(Boolean))];

export function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("ru").replaceAll("ё", "е").trim();
}

export function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function getRisk(analysis = {}) {
  const rawScore = analysis.threat_score;
  const parsed = typeof rawScore === "number" ? rawScore
    : typeof rawScore === "string" && rawScore.trim() !== "" ? Number(rawScore) : NaN;
  const score = Number.isFinite(parsed) && parsed >= 0 && parsed <= RISK_POLICY.maximum ? parsed : null;
  const explicit = normalizeText(analysis.risk_level);
  if (RISK_LEVELS.includes(explicit)) return { level: explicit, score, basis: "Provided risk level" };
  // Missing/invalid scores must NEVER silently become "low".
  if (score === null) return { level: null, score: null, basis: "Not assessed" };
  const level = score < RISK_POLICY.moderateFrom ? "low" : score < RISK_POLICY.highFrom ? "moderate" : "high";
  return { level, score, basis: "Temporary score-to-label mapping" };
}

export function normalizeOrganization(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !raw.company_profile) {
    throw new Error("Each organization must contain a company_profile object.");
  }
  const profile = raw.company_profile;
  const meta = raw.meta ?? {};
  const analysis = raw.intelligence_analysis ?? {};
  const location = profile.primary_location ?? {};
  const identifiers = profile.identifiers ?? {};
  const contacts = profile.contacts_and_web ?? {};
  const id = text(meta.entity_id) || text(identifiers.inn);
  const name = text(profile.brand_name) || text(profile.legal_name);
  if (!id || !name) throw new Error("Each organization needs a stable meta.entity_id (or INN) and a company name.");
  const vacancies = list(raw.vacancies).filter((vacancy) => vacancy && typeof vacancy === "object" && !Array.isArray(vacancy));
  const city = text(location.city);
  const sector = text(analysis.category) || "Not specified";
  const emails = strings(contacts.corporate_emails);
  const phones = strings(contacts.phones);
  const websites = strings(contacts.websites).map(safeHttpUrl).filter(Boolean);
  const risk = getRisk(analysis);
  const isDemo = meta.is_demo === true;
  const lastScrapedAt = text(meta.last_scraped_at);
  const confidence = typeof analysis.confidence_level === "number" && analysis.confidence_level >= 0 && analysis.confidence_level <= 1
    ? analysis.confidence_level : null;
  const result = {
    id, name, legalName: text(profile.legal_name), city, region: text(location.region),
    address: text(location.full_address), sector,
    inn: text(identifiers.inn), ogrn: text(identifiers.ogrn),
    description: text(profile.description_raw), summary: text(analysis.analytical_summary),
    classification: text(analysis.classification), confidence,
    emails, phones, websites, contactCount: emails.length + phones.length,
    vacancies, vacancyCount: vacancies.length, risk: risk.level, score: risk.score, riskBasis: risk.basis,
    isDemo, origin: isDemo ? "demo" : "supplied",
    source: text(meta.parser_source) || "Unspecified",
    sourceUrl: safeHttpUrl(meta.hh_profile_url),
    provenance: text(meta.provenance) || "Provided data; not independently verified by this interface.",
    lastScrapedAt: Number.isNaN(Date.parse(lastScrapedAt)) ? null : lastScrapedAt,
    raw,
  };
  // Only organizational information is searched; individual recruiter details are excluded.
  result.searchText = normalizeText([
    result.name, result.legalName, result.id, result.inn, result.ogrn,
    result.city, result.region, result.sector, result.description,
    ...websites, ...emails, ...vacancies.flatMap((vacancy) => [text(vacancy.title), ...strings(vacancy.key_skills)]),
  ].join(" "));
  return result;
}

export function normalizePayload(payload) {
  // Accept the user's single record, an array, or a common backend envelope.
  const records = Array.isArray(payload) ? payload
    : Array.isArray(payload?.items) ? payload.items
    : Array.isArray(payload?.organizations) ? payload.organizations
    : payload?.company_profile ? [payload] : null;
  if (!records) throw new Error("Expected an organization, an array, or { items: [...] } in the JSON response.");
  const ids = new Set();
  return records.map((record) => {
    const organization = normalizeOrganization(record);
    if (ids.has(organization.id)) throw new Error(`Duplicate organization ID: ${organization.id}. IDs must be unique.`);
    ids.add(organization.id);
    return organization;
  });
}

export function filterOrganizations(organizations, filters = DEFAULT_FILTERS) {
  const terms = normalizeText(filters.query).split(/\s+/).filter(Boolean);
  return organizations.filter((organization) =>
    terms.every((term) => organization.searchText.includes(term)) &&
    (!filters.city || organization.city === filters.city) &&
    (!filters.sector || organization.sector === filters.sector) &&
    (!filters.risk || (filters.risk === "unassessed" ? organization.risk === null : organization.risk === filters.risk)) &&
    (!filters.origin || organization.origin === filters.origin),
  );
}

export function sortOrganizations(organizations, sort = DEFAULT_SORT) {
  const direction = sort.direction === "desc" ? -1 : 1;
  return [...organizations].sort((a, b) => {
    let comparison = 0;
    if (sort.key === "risk") {
      // Unassessed records stay last in BOTH directions.
      if (a.risk === null && b.risk !== null) return 1;
      if (b.risk === null && a.risk !== null) return -1;
      comparison = RISK_LEVELS.indexOf(a.risk) - RISK_LEVELS.indexOf(b.risk);
      if (comparison === 0 && a.risk !== null) comparison = (a.score ?? -1) - (b.score ?? -1);
    } else if (sort.key === "vacancyCount") {
      comparison = a.vacancyCount - b.vacancyCount;
    } else if (sort.key === "city") {
      if (!a.city && b.city) return 1;
      if (!b.city && a.city) return -1;
      comparison = collator.compare(a.city, b.city);
    } else {
      comparison = collator.compare(a.name, b.name);
    }
    return comparison * direction || collator.compare(a.name, b.name) || collator.compare(a.id, b.id);
  });
}

export function getFilterOptions(organizations, field) {
  return [...new Set(organizations.map((organization) => organization[field]).filter(Boolean))].sort(collator.compare);
}

export function formatDate(value) {
  if (!value) return "Not supplied";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not supplied"
    : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

/** Export the same nested schema without publishing personal recruiter contacts. */
export function exportableRecord(organization) {
  const { recruiters, ...record } = organization.raw;
  return {
    ...record,
    meta: {
      ...record.meta,
      ...(Array.isArray(recruiters) && recruiters.length ? { export_note: "Individual recruiter records excluded from this catalogue export." } : {}),
    },
  };
}
