import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MESSAGES } from '../src/i18n/messages.js';
import {
  createTranslator, loadErrorMessage, supportedLanguage,
  readSavedLanguage, saveLanguage, LANGUAGE_STORAGE_KEY,
} from '../src/i18n/locale.js';
import { formatDate, normalizeOrganization, getRisk, exportableRecord } from '../src/lib/catalog.js';

const en = createTranslator('en');
const uk = createTranslator('uk');
const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
function withWindow(value, fn) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { value, configurable: true });
  try { return fn(); }
  finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  }
}

test('both languages define the same nonempty message keys', () => {
  assert.deepEqual(Object.keys(MESSAGES.en).sort(), Object.keys(MESSAGES.uk).sort());
  for (const dict of Object.values(MESSAGES)) for (const value of Object.values(dict)) {
    assert.equal(typeof value, 'string'); assert.ok(value.trim().length > 0);
  }
});
test('template parameters match across both languages', () => {
  const parameters = (text) => (text.match(/\{\w+\}/g) || []).sort();
  for (const key of Object.keys(MESSAGES.en)) {
    assert.deepEqual(parameters(MESSAGES.en[key]), parameters(MESSAGES.uk[key]), key);
  }
});
test('the interface has English and Ukrainian titles', () => {
  assert.equal(en('page.heading'), 'Organization catalogue');
  assert.equal(uk('page.heading'), 'Каталог організацій');
});
test('three risk labels and missing-score status are translated', () => {
  assert.deepEqual(['low','moderate','high','unassessed'].map(r => uk(`risk.${r}`)), ['Низький','Помірний','Високий','Не оцінено']);
});
test('all risk descriptions are translated without changing thresholds', () => {
  for (const score of [0, 64.999, 65, 84.999, 85, 100]) {
    const { level } = getRisk({ threat_score: score });
    assert.ok(uk(`risk.meaning.${level}`));
    assert.notEqual(uk(`risk.meaning.${level}`), en(`risk.meaning.${level}`));
  }
});
test('interpolation preserves zero and does not evaluate source text', () => {
  assert.equal(uk('export.success', {count: 0}), 'Експортовано організацій: 0.');
  assert.equal(en('table.view', {name: '{count} <script>'}), 'View {count} <script>');
});
test('unsupported languages fall back to English', () => {
  for (const value of ['ua', 'ru', '', null, undefined, '__proto__']) {
    assert.equal(supportedLanguage(value), 'en');
    assert.equal(createTranslator(value)('nav.catalogue'), 'Catalogue');
  }
});
test('absent browser state is safe', () => {
  withWindow(undefined, () => {
    assert.equal(readSavedLanguage(), 'en'); assert.doesNotThrow(() => saveLanguage('uk'));
  });
});
test('stored Ukrainian is restored', () => {
  withWindow({ localStorage: { getItem: (key) => key === LANGUAGE_STORAGE_KEY ? 'uk' : null } }, () => {
    assert.equal(readSavedLanguage(), 'uk');
  });
});
test('corrupt stored locale falls back to English', () => {
  withWindow({ localStorage: { getItem: () => 'null' } }, () => assert.equal(readSavedLanguage(), 'en'));
});
test('language choice persists under a namespaced key', () => {
  let written;
  withWindow({ localStorage: { setItem: (...args) => { written = args; } } }, () => saveLanguage('uk'));
  assert.deepEqual(written, [LANGUAGE_STORAGE_KEY, 'uk']);
});
test('blocked storage access does not crash the app', () => {
  const value = Object.defineProperty({}, 'localStorage', { get() { throw new Error('Blocked'); } });
  withWindow(value, () => {
    assert.equal(readSavedLanguage(), 'en'); assert.doesNotThrow(() => saveLanguage('uk'));
  });
});
test('failed storage writes do not throw', () => {
  withWindow({ localStorage: { setItem() { throw new Error('Quota'); } } }, () => {
    assert.doesNotThrow(() => saveLanguage('uk'));
  });
});
test('HTTP and network errors can be translated after loading fails', () => {
  assert.equal(loadErrorMessage({code:'http',status:503}, uk), 'Не вдалося завантажити каталог (HTTP 503).');
  assert.notEqual(loadErrorMessage({code:'network'}, uk), loadErrorMessage({code:'network'}, en));
});
test('unexpected server errors use a safe localized fallback', () => {
  assert.equal(loadErrorMessage({ message: '<secret>' }, uk), uk('error.unknown'));
});
test('dates are localized and remain in UTC', () => {
  const date = '2026-10-04T23:55:00Z';
  assert.equal(formatDate(date), '04 Oct 2026');
  assert.equal(formatDate(date, 'uk-UA'), new Intl.DateTimeFormat('uk-UA', {day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date)));
  assert.equal(formatDate('invalid', 'uk-UA', uk('common.notAvailable')), 'Немає даних');
});
test('missing source fields remain empty for localized UI fallbacks', () => {
  const item = normalizeOrganization({meta:{entity_id:'P'},company_profile:{brand_name:'Компанія'}});
  assert.equal(item.sector, ''); assert.equal(item.source, '');
});
test('translation never mutates organization data or JSON exports', () => {
  const original = {meta:{entity_id:'P'},company_profile:{brand_name:'ООО Пример',primary_location:{city:'Тула'}},intelligence_analysis:{threat_score:70,category:'Control systems'}};
  const before = JSON.stringify(original);
  const item = normalizeOrganization(original);
  en('table.view', {name: item.name}); uk('table.view', {name:item.name});
  assert.equal(JSON.stringify(exportableRecord(item)), before);
  assert.equal(JSON.stringify(original), before);
});
test('search no longer registers keyboard shortcut handlers or hints', () => {
  const component = source('src/components/CatalogFilters.jsx');
  assert.doesNotMatch(component, /addEventListener|keydown|onKeyDown|ctrlKey|metaKey|<kbd|Ctrl\s*\+?\s*K/i);
  assert.doesNotMatch(source('src/SearchBar.css'), /\bkbd\b/);
});
test('language switching keeps canonical filter values independent of display text', () => {
  const component = source('src/components/CatalogFilters.jsx');
  assert.match(component, /value=\{level\}/);
  assert.match(component, /t\(`risk\.\$\{level\}`\)/);
});
