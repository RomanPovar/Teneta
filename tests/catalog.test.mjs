import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RISK_LEVELS, RISK_BANDS, DEFAULT_FILTERS, RISK_POLICY,
  getRisk, normalizeText, normalizeOrganization, normalizePayload,
  filterOrganizations, sortOrganizations, getFilterOptions, exportableRecord, safeHttpUrl, formatDate,
} from '../src/lib/catalog.js';

const raw = JSON.parse(readFileSync(new URL('../public/data/organizations.json', import.meta.url), 'utf8'));
const filters = (values = {}) => ({ ...DEFAULT_FILTERS, ...values });
function record(id, name, city, score, sector = 'Industry') {
  return {
    meta: { entity_id: id },
    company_profile: { brand_name: name, primary_location: { city } },
    intelligence_analysis: { threat_score: score, category: sector },
    vacancies: [],
  };
}
const fixtures = [
  record('A', 'Альфа', 'Казань', 64, 'Automation'),
  record('B', 'Бета', 'Москва', 65),
  record('C', 'Вектор', 'Казань', 85, 'Automation'),
  record('D', 'Дельта', 'Тула', 0),
  record('E', 'Эхо', '', null),
];
const rows = normalizePayload(fixtures);
const liveRows = normalizePayload(raw);

for (const [score, level] of [
  [0, 'low'], [10, 'low'], [24, 'low'], [25, 'low'], [33, 'low'], [34, 'low'], [64, 'low'],
  [64.999, 'low'], [65, 'moderate'], [66, 'moderate'], [67, 'moderate'], [84, 'moderate'],
  [84.999, 'moderate'], [85, 'high'], [99.9, 'high'], [100, 'high'],
]) {
  test(`score ${score} maps to ${level}`, () => {
    assert.equal(getRisk({ threat_score: score }).level, level);
    assert.equal(getRisk({ threat_score: score }).score, score);
  });
}

test('three risk levels only; the civilian band is part of low', () => {
  assert.deepEqual(RISK_LEVELS, ['low', 'moderate', 'high']);
  assert.equal(RISK_BANDS.length, 3);
  assert.deepEqual(RISK_POLICY, { moderateFrom: 65, highFrom: 85, maximum: 100 });
});
test('unknown is an unavailable state, never a fourth assessed level', () => {
  assert.equal(getRisk({}).level, null);
  assert.ok(!RISK_LEVELS.includes(null));
});
test('missing, boolean, malformed and out-of-range scores stay unassessed', () => {
  for (const threat_score of [undefined, null, '', ' ', NaN, Infinity, -1, 100.01, false, true, {}, [], 'bad']) {
    assert.equal(getRisk({ threat_score }).level, null);
    assert.equal(getRisk({ threat_score }).score, null);
  }
});
test('numeric strings preserve decimal boundaries', () => {
  assert.equal(getRisk({ threat_score: ' 64.9 ' }).level, 'low');
  assert.equal(getRisk({ threat_score: '65' }).level, 'moderate');
  assert.equal(getRisk({ threat_score: '85' }).level, 'high');
});
test('company score takes precedence over outdated explicit labels', () => {
  assert.equal(getRisk({ threat_score: 90, risk_level: 'low' }).level, 'high');
  assert.equal(getRisk({ threat_score: 10, risk_level: 'high' }).level, 'low');
});
test('confidence, labels and vacancy markers do not create a company score', () => {
  assert.equal(getRisk({ confidence_level: 0.99, risk_level: 'high' }).level, null);
  assert.equal(getRisk(null).level, null);
  const row = normalizeOrganization({ ...fixtures[0], intelligence_analysis: {}, vacancies: [{ suspiciousness_score: 99 }] });
  assert.equal(row.risk, null);
});
test('risk meanings are driven by the same three bands', () => {
  for (const threat_score of [10, 70, 90]) {
    const risk = getRisk({ threat_score });
    assert.equal(risk.meaning, RISK_BANDS.find(band => band.level === risk.level).meaning);
  }
});
test('existing JSON excludes every flagged record before presentation', () => {
  assert.equal(liveRows.length, raw.filter(r => r.meta?.is_demo !== true).length);
  assert.ok(liveRows.every(r => r.raw.meta?.is_demo !== true));
  assert.equal(liveRows.find(r => r.id === 'ENT_043').risk, 'low');
});
test('source JSON is not mutated by normalization', () => {
  const before = JSON.stringify(raw);
  normalizePayload(raw);
  assert.equal(JSON.stringify(raw), before);
});
test('excluded malformed records cannot break a valid catalogue', () => {
  assert.deepEqual(normalizePayload([{ meta: { is_demo: true } }, fixtures[0]]).map(r => r.id), ['A']);
});
test('a payload containing only excluded records is empty', () => {
  assert.deepEqual(normalizePayload([{ meta: { is_demo: true } }]), []);
});
test('missing exclusion flag is accepted, not automatically hidden', () => {
  assert.equal(normalizePayload(fixtures).length, fixtures.length);
});
test('all supported envelopes use the same exclusion rule', () => {
  for (const payload of [raw, { items: raw }, { organizations: raw }]) {
    assert.deepEqual(normalizePayload(payload).map(r => r.id), liveRows.map(r => r.id));
  }
  assert.equal(normalizePayload(raw[0]).length, 1);
  assert.deepEqual(normalizePayload([]), []);
});
test('excluded records do not contribute counts or dropdown choices', () => {
  const result = normalizePayload([...fixtures, { ...record('X', 'Excluded', 'Excluded city', 99, 'Excluded sector'), meta: { entity_id: 'X', is_demo: true }, vacancies: [{ title: 'Excluded vacancy' }] }]);
  assert.equal(result.length, 5);
  assert.equal(result.reduce((sum, r) => sum + r.vacancyCount, 0), 0);
  assert.ok(!getFilterOptions(result, 'city').includes('Excluded city'));
  assert.ok(!getFilterOptions(result, 'sector').includes('Excluded sector'));
});
test('empty query and whitespace preserve all displayed records', () => {
  assert.equal(filterOrganizations(rows, filters()).length, rows.length);
  assert.equal(filterOrganizations(rows, filters({ query: '  ' })).length, rows.length);
});
test('case-insensitive Cyrillic search', () => {
  assert.deepEqual(filterOrganizations(rows, filters({ query: 'аЛЬфА' })).map(r => r.id), ['A']);
});
test('INN, name and vacancy keyword searches still work on the existing record', () => {
  for (const query of ['5032264630', 'авг', 'котельных']) assert.equal(filterOrganizations(liveRows, filters({ query }))[0].id, 'ENT_043');
});
test('normalizes ё and compatibility characters', () => {
  assert.equal(normalizeText(' Ёлка '), 'елка');
  assert.equal(normalizeText('ＦＩＬＴＥＲ'), 'filter');
});
test('AND search works across fields', () => {
  assert.deepEqual(filterOrganizations(rows, filters({ query: 'альфа казань' })).map(r => r.id), ['A']);
  assert.equal(filterOrganizations(rows, filters({ query: 'альфа москва' })).length, 0);
});
test('query, city, sector and risk filters combine', () => {
  assert.deepEqual(filterOrganizations(rows, filters({ query: 'вектор', city: 'Казань', sector: 'Automation', risk: 'high' })).map(r => r.id), ['C']);
});
test('clearing search keeps selected filters', () => {
  assert.equal(filterOrganizations(rows, filters({ query: '', city: 'Казань' })).length, 2);
});
test('clear all restores only eligible records, not excluded ones', () => {
  assert.deepEqual(filterOrganizations(liveRows, filters()), liveRows);
});
test('all assessed levels and the missing-score state filter separately', () => {
  for (const [risk, count] of [['low', 2], ['moderate', 1], ['high', 1], ['unassessed', 1]]) {
    assert.equal(filterOrganizations(rows, filters({ risk })).length, count);
  }
});
test('no match returns an empty list', () => {
  assert.deepEqual(filterOrganizations(rows, filters({ query: 'nothing matches this' })), []);
});
test('organization alphabetical sorting reverses correctly', () => {
  const asc = sortOrganizations(rows, { key: 'name', direction: 'asc' });
  const desc = sortOrganizations(rows, { key: 'name', direction: 'desc' });
  assert.deepEqual(asc.map(r => r.id), ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(desc.map(r => r.id), [...asc].reverse().map(r => r.id));
});
test('city alphabetical sorting leaves missing cities last in both directions', () => {
  const col = new Intl.Collator(['ru', 'en'], { sensitivity: 'base', numeric: true });
  for (const direction of ['asc', 'desc']) {
    const sorted = sortOrganizations(rows, { key: 'city', direction });
    assert.equal(sorted.at(-1).id, 'E');
    for (let i = 1; i < sorted.length - 1; i++) assert.ok(col.compare(sorted[i - 1].city, sorted[i].city) * (direction === 'asc' ? 1 : -1) <= 0);
  }
});
test('risk sorts by tier and then exact points, not alphabetically', () => {
  assert.deepEqual(sortOrganizations(rows, { key: 'risk', direction: 'asc' }).map(r => r.id), ['D', 'A', 'B', 'C', 'E']);
  assert.deepEqual(sortOrganizations(rows, { key: 'risk', direction: 'desc' }).map(r => r.id), ['C', 'B', 'A', 'D', 'E']);
});
test('vacancy counts sort numerically', () => {
  const copy = rows.map((r, i) => ({ ...r, vacancyCount: [20, 3, 0, 100, 8][i] }));
  assert.deepEqual(sortOrganizations(copy, { key: 'vacancyCount', direction: 'asc' }).map(r => r.vacancyCount), [0, 3, 8, 20, 100]);
});
test('filtering and sorting leave source and normalized data unchanged', () => {
  const before = JSON.stringify(rows);
  sortOrganizations(filterOrganizations(Object.freeze([...rows]), filters({ risk: 'high' })), { key: 'risk', direction: 'desc' });
  assert.equal(JSON.stringify(rows), before);
});
test('duplicate eligible identities are rejected', () => {
  assert.throws(() => normalizePayload([fixtures[0], fixtures[0]]), /Duplicate/);
});
test('missing and malformed identities are rejected', () => {
  for (const payload of [null, {}, { bad: true }, [{ company_profile: {} }], [{ company_profile: [] }]]) {
    assert.throws(() => normalizePayload(payload));
  }
});
test('null optional sections are safe', () => {
  const row = normalizeOrganization({ meta: { entity_id: 'M' }, company_profile: { brand_name: 'Minimal', primary_location: null, contacts_and_web: null, identifiers: null }, intelligence_analysis: null, vacancies: null });
  assert.equal(row.city, ''); assert.equal(row.score, null); assert.equal(row.vacancyCount, 0);
});
test('filter options are deduplicated and sorted', () => {
  assert.deepEqual(getFilterOptions(rows, 'city'), ['Казань', 'Москва', 'Тула']);
});
test('only HTTP(S) source links are accepted', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '/relative', 'bad', null]) assert.equal(safeHttpUrl(url), null);
  assert.equal(safeHttpUrl('https://example.org'), 'https://example.org/');
});
test('dates are formatted in UTC; missing dates are explicit', () => {
  assert.equal(formatDate('2026-10-04T23:55:00Z'), '04 Oct 2026');
  assert.equal(formatDate('invalid'), 'Not available');
});
test('export retains nested data and provenance while excluding recruiter records', () => {
  const source = structuredClone(raw[0]); source.recruiters = [{ full_name: 'Private contact', phone: '0000' }];
  const exported = exportableRecord(normalizeOrganization(source));
  assert.equal(exported.recruiters, undefined);
  assert.deepEqual(exported.company_profile, source.company_profile);
  assert.deepEqual(exported.intelligence_analysis, source.intelligence_analysis);
  assert.equal(exported.meta.provenance, source.meta.provenance);
  assert.equal(source.recruiters.length, 1);
});
test('export guard rejects excluded records even outside the normal load path', () => {
  const source = { ...fixtures[0], meta: { entity_id: 'X', is_demo: true } };
  assert.throws(() => exportableRecord(normalizeOrganization(source)), /excluded/);
});
test('export all filtered records is independent of table pagination', () => {
  const result = sortOrganizations(filterOrganizations(rows, filters()), { key: 'risk', direction: 'desc' });
  const page = result.slice(0, 2);
  assert.equal(page.length, 2);
  assert.equal(result.map(exportableRecord).length, 5);
});
