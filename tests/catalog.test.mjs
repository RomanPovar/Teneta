import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_FILTERS, exportableRecord, filterOrganizations, getFilterOptions, getRisk, normalizeOrganization, normalizePayload, normalizeText, safeHttpUrl, sortOrganizations } from '../src/lib/catalog.js';

const raw = JSON.parse(await readFile(new URL('../public/data/organizations.json', import.meta.url), 'utf8'));
const organizations = normalizePayload(raw);
const filters = (changes = {}) => ({ ...DEFAULT_FILTERS, ...changes });

test('reads the supplied nested record without losing its identity', () => {
  const organization = organizations.find(item => item.id === 'ENT_043');
  assert.equal(organization.name, 'ООО АВГ Инженерные Системы');
  assert.equal(organization.city, 'Нахабино');
  assert.equal(organization.inn, '5032264630');
  assert.equal(organization.risk, 'low');
  assert.equal(organization.contactCount, 3);
  assert.equal(organization.confidence, 0.95);
  assert.equal(organization.vacancyCount, 1);
});
test('one provided record and eight unmistakably fictional test records', () => {
  assert.equal(organizations.filter(item => item.isDemo).length, 8);
  for (const item of organizations.filter(item => item.isDemo)) {
    assert.equal(item.sourceUrl, null);
    assert.equal(item.contactCount, 0);
  }
});
test('empty search and disabled filters restore the complete dataset', () => {
  assert.equal(filterOrganizations(organizations, filters()).length, 9);
  assert.equal(filterOrganizations(organizations, filters({ query: '   ' })).length, 9);
});
test('case-insensitive Cyrillic organization search', () => {
  assert.equal(filterOrganizations(organizations, filters({ query: 'аВг' }))[0].id, 'ENT_043');
});
test('search by INN and organizational keyword', () => {
  assert.equal(filterOrganizations(organizations, filters({ query: '5032264630' }))[0].id, 'ENT_043');
  assert.equal(filterOrganizations(organizations, filters({ query: 'котельных' }))[0].id, 'ENT_043');
});
test('multiple search terms use AND, including across different fields', () => {
  assert.equal(filterOrganizations(organizations, filters({ query: 'авг Нахабино' })).length, 1);
  assert.equal(filterOrganizations(organizations, filters({ query: 'авг Казань' })).length, 0);
});
test('normalizes Cyrillic ё and Unicode compatibility characters', () => {
  assert.equal(normalizeText('  Ёлка  '), 'елка');
  assert.equal(normalizeText('ＦＩＬＴＥＲ'), 'filter');
});
test('all filter controls work together', () => {
  const rows = filterOrganizations(organizations, filters({ query: 'альфа', city: 'Казань', risk: 'high', sector: 'Industrial automation', origin: 'demo' }));
  assert.deepEqual(rows.map(row => row.id), ['DEMO_001']);
});
test('clearing search keeps the other active filters', () => {
  assert.equal(filterOrganizations(organizations, filters({ query: '', city: 'Казань' })).length, 2);
});
test('all risk categories exist and filter correctly', () => {
  for (const risk of ['low', 'moderate', 'high']) assert.equal(filterOrganizations(organizations, filters({ risk })).length, 3);
});
test('provided-only filter excludes all fictitious organizations', () => {
  assert.deepEqual(filterOrganizations(organizations, filters({ origin: 'supplied' })).map(row => row.id), ['ENT_043']);
});
test('no match produces an empty array', () => {
  assert.deepEqual(filterOrganizations(organizations, filters({ query: 'no-such-company' })), []);
});
test('organization sorting supports both directions with Cyrillic collation', () => {
  const asc = sortOrganizations(organizations, { key: 'name', direction: 'asc' });
  const desc = sortOrganizations(organizations, { key: 'name', direction: 'desc' });
  assert.equal(asc[0].name, 'Демо Альфа');
  assert.deepEqual(desc.map(row => row.id), [...asc].reverse().map(row => row.id));
});
test('city sorting is alphabetical, not a hard-coded order', () => {
  const collator = new Intl.Collator(['ru', 'en'], { sensitivity: 'base', numeric: true });
  for (const direction of ['asc', 'desc']) {
    const rows = sortOrganizations(organizations, { key: 'city', direction });
    for (let i = 1; i < rows.length; i++) assert.ok(collator.compare(rows[i - 1].city, rows[i].city) * (direction === 'asc' ? 1 : -1) <= 0);
  }
});
test('risk sorts low → moderate → high, never alphabetically', () => {
  const rows = sortOrganizations(organizations, { key: 'risk', direction: 'asc' });
  assert.deepEqual(rows.map(row => row.risk), ['low', 'low', 'low', 'moderate', 'moderate', 'moderate', 'high', 'high', 'high']);
  assert.deepEqual(rows.map(row => row.score), [10, 18, 29, 46, 50, 62, 74, 82, 91]);
});
test('risk descending reverses the assessed score order', () => {
  const rows = sortOrganizations(organizations, { key: 'risk', direction: 'desc' });
  assert.deepEqual(rows.map(row => row.score), [91, 82, 74, 62, 50, 46, 29, 18, 10]);
});
test('filtering and sorting do not mutate the original data', () => {
  const original = JSON.stringify(organizations);
  const frozen = Object.freeze([...organizations]);
  sortOrganizations(filterOrganizations(frozen, filters({ risk: 'high' })), { key: 'risk', direction: 'desc' });
  assert.equal(JSON.stringify(organizations), original);
});
test('risk boundaries and zero are handled correctly', () => {
  for (const [score, expected] of [[0, 'low'], [33, 'low'], [33.9, 'low'], [34, 'moderate'], [66.9, 'moderate'], [67, 'high'], [100, 'high']]) assert.equal(getRisk({ threat_score: score }).level, expected);
});
test('missing, invalid, negative and excessive scores are not low risk', () => {
  for (const threat_score of [undefined, null, '', ' ', NaN, Infinity, -1, 101, false, true, {}, []]) assert.equal(getRisk({ threat_score }).level, null);
});
test('numeric string scores and explicit backend labels are supported', () => {
  assert.equal(getRisk({ threat_score: '70' }).level, 'high');
  assert.equal(getRisk({ threat_score: 90, risk_level: 'low' }).level, 'low');
});
test('confidence is never used as a risk score', () => {
  assert.equal(getRisk({ confidence_level: 0.99 }).level, null);
});
test('unassessed records sort last in either direction and have a separate filter', () => {
  const copy = structuredClone(raw[0]);
  copy.meta.entity_id = 'MISSING_RISK';
  copy.intelligence_analysis = {};
  const unknown = normalizeOrganization(copy);
  const rows = [unknown, ...organizations];
  for (const direction of ['asc', 'desc']) assert.equal(sortOrganizations(rows, { key: 'risk', direction }).at(-1).id, 'MISSING_RISK');
  assert.equal(filterOrganizations(rows, filters({ risk: 'unassessed' }))[0].id, 'MISSING_RISK');
});
test('missing optional fields do not crash the page', () => {
  const row = normalizeOrganization({ meta: { entity_id: 'MINIMAL' }, company_profile: { brand_name: 'Minimal' } });
  assert.equal(row.city, '');
  assert.equal(row.risk, null);
  assert.equal(row.vacancyCount, 0);
  assert.equal(row.lastScrapedAt, null);
});
test('accepts a single object and supported array envelopes', () => {
  assert.equal(normalizePayload(raw[0]).length, 1);
  assert.equal(normalizePayload({ items: raw }).length, 9);
  assert.equal(normalizePayload({ organizations: raw }).length, 9);
  assert.equal(normalizePayload([]).length, 0);
});
test('rejects malformed payloads, duplicate IDs and missing identities', () => {
  assert.throws(() => normalizePayload({ bad: true }), /Expected/);
  assert.throws(() => normalizePayload([raw[0], raw[0]]), /Duplicate/);
  assert.throws(() => normalizePayload([{ company_profile: {} }]), /stable/);
});
test('dropdown choices are deduplicated and complete', () => {
  const options = getFilterOptions(organizations, 'city');
  assert.equal(options.length, 7);
  assert.equal(options.filter(city => city === 'Казань').length, 1);
});
test('only HTTP and HTTPS source links are accepted', () => {
  assert.equal(safeHttpUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpUrl('data:text/html,test'), null);
  assert.equal(safeHttpUrl('not-a-url'), null);
  assert.equal(safeHttpUrl('https://example.org'), 'https://example.org/');
});
test('exports exclude individual recruiter records without mutating source data', () => {
  const copy = structuredClone(raw[0]);
  copy.recruiters = [{ full_name: 'PRIVATE DEMO PERSON', phone: 'REDACTED' }];
  const row = normalizeOrganization(copy);
  const exported = exportableRecord(row);
  assert.equal(exported.recruiters, undefined);
  assert.equal(row.raw.recruiters.length, 1);
  assert.equal(exported.company_profile.brand_name, row.name);
});
