/** Data transformations are kept separate from React and network access. */
export const RISK_LEVELS = Object.freeze(["low", "moderate", "high"]);
export const RISK_LABELS = Object.freeze({ low: "Low", moderate: "Moderate", high: "High" });
export const RISK_POLICY = Object.freeze({ moderateFrom: 65, highFrom: 85, maximum: 100 });
export const RISK_BANDS = Object.freeze([
  Object.freeze({ level: "low", range: "0–<65", meaning: "Civilian activity or general industry" }),
  Object.freeze({ level: "moderate", range: "65–<85", meaning: "Dual-use products or technologies" }),
  Object.freeze({ level: "high", range: "85–100", meaning: "Strong defense-related indicators" }),
]);
export const DEFAULT_FILTERS = Object.freeze({ query: "", city: "", sector: "", risk: "" });
export const DEFAULT_SORT = Object.freeze({ key: "name", direction: "asc" });
const collator = new Intl.Collator(["ru", "en"], { sensitivity: "base", numeric: true });
const text = (value) => (typeof value === "string" ? value.trim() : "");
const list = (value) => (Array.isArray(value) ? value : []);
const object = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});
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
  const rawScore = object(analysis).threat_score;
  const parsed = typeof rawScore === "number" ? rawScore
    : typeof rawScore === "string" && rawScore.trim() !== "" ? Number(rawScore) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > RISK_POLICY.maximum) {
    return { level: null, score: null, meaning: "No valid score available" };
  }
  // The final company score is authoritative. Do not round across a boundary,
  // reimplement the backend formula, or let an older risk_level override it.
  const level = parsed < RISK_POLICY.moderateFrom ? "low"
    : parsed < RISK_POLICY.highFrom ? "moderate" : "high";
  return { level, score: parsed, meaning: RISK_BANDS.find((band) => band.level === level).meaning };
}

function isExcludedRecord(record) {
  return record?.meta?.is_demo === true;
}

export function normalizeOrganization(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)
    || !raw.company_profile || typeof raw.company_profile !== "object" || Array.isArray(raw.company_profile)) {
    throw new Error("Each organization must contain a company_profile object.");
  }
  const profile = raw.company_profile;
  const meta = object(raw.meta);
  const analysis = object(raw.intelligence_analysis);
  const location = object(profile.primary_location);
  const identifiers = object(profile.identifiers);
  const contacts = object(profile.contacts_and_web);
  const id = text(meta.entity_id) || text(identifiers.inn);
  const name = text(profile.brand_name) || text(profile.legal_name);
  if (!id || !name) throw new Error("Each organization needs a stable meta.entity_id (or INN) and a company name.");
  const vacancies = list(raw.vacancies).filter((vacancy) => vacancy && typeof vacancy === "object" && !Array.isArray(vacancy));
  const emails = strings(contacts.corporate_emails);
  const phones = strings(contacts.phones);
  const websites = strings(contacts.websites).map(safeHttpUrl).filter(Boolean);
  const risk = getRisk(analysis);
  const lastScrapedAt = text(meta.last_scraped_at);
  const result = {
    id, name, legalName: text(profile.legal_name),
    city: text(location.city), region: text(location.region), address: text(location.full_address),
    sector: text(analysis.category),
    inn: text(identifiers.inn), ogrn: text(identifiers.ogrn),
    description: text(profile.description_raw), summary: text(analysis.analytical_summary),
    emails, phones, websites, contactCount: emails.length + phones.length,
    vacancies, vacancyCount: vacancies.length,
    risk: risk.level, score: risk.score, riskMeaning: risk.meaning,
    source: text(meta.parser_source), sourceUrl: safeHttpUrl(meta.hh_profile_url),
    lastScrapedAt: Number.isNaN(Date.parse(lastScrapedAt)) ? null : lastScrapedAt,
    raw,
  };
  result.searchText = normalizeText([
    result.name, result.legalName, result.id, result.inn, result.ogrn,
    result.city, result.region, result.sector, result.description,
    ...websites, ...emails,
    ...vacancies.flatMap((vacancy) => [text(vacancy.title), ...strings(vacancy.key_skills)]),
  ].join(" "));
  return result;
}

export function normalizePayload(payload) {
  const records = Array.isArray(payload) ? payload
    : Array.isArray(payload?.items) ? payload.items
    : Array.isArray(payload?.organizations) ? payload.organizations
    : payload?.company_profile ? [payload] : null;
  if (!records) throw new Error("Expected an organization, an array, or { items: [...] } in the JSON response.");
  const ids = new Set();
  // Exclude flagged records before validation, counts, filter options and export.
  // The source JSON file itself is not modified.
  return records.filter((record) => !isExcludedRecord(record)).map((record) => {
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
    (!filters.risk || (filters.risk === "unassessed" ? organization.risk === null : organization.risk === filters.risk)),
  );
}

export function sortOrganizations(organizations, sort = DEFAULT_SORT) {
  const direction = sort.direction === "desc" ? -1 : 1;
  return [...organizations].sort((a, b) => {
    let comparison;
    if (sort.key === "risk") {
      if (a.risk === null && b.risk !== null) return 1;
      if (b.risk === null && a.risk !== null) return -1;
      comparison = RISK_LEVELS.indexOf(a.risk) - RISK_LEVELS.indexOf(b.risk);
      if (comparison === 0 && a.risk !== null) comparison = a.score - b.score;
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

export function formatDate(value, locale = "en-GB", unavailable = "Not available") {
  if (!value) return unavailable;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? unavailable
    : new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

/** Retain the source schema and provenance; individual recruiter entries stay excluded. */
export function exportableRecord(organization) {
  if (isExcludedRecord(organization.raw)) throw new Error("This record is excluded from catalogue exports.");
  const { recruiters, ...record } = organization.raw;
  return {
    ...record,
    meta: {
      ...record.meta,
      ...(Array.isArray(recruiters) && recruiters.length
        ? { export_note: "Individual recruiter records excluded from this catalogue export." } : {}),
    },
  };
}
