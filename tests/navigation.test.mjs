import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROUTES, routeFromHash, routeTitleKey } from '../src/navigation/routes.js';
import { createTranslator } from '../src/i18n/locale.js';

const source = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('the root and home links select the landing page', () => {
  for (const hash of ['', '#', '#/', '#/home', '#/home/', null, undefined]) {
    assert.equal(routeFromHash(hash), 'home', String(hash));
  }
});
test('explicit catalogue links select the catalogue', () => {
  for (const hash of ['#/catalogue', '#/catalogue/', '#/catalogue?view=table']) {
    assert.equal(routeFromHash(hash), 'catalogue', hash);
  }
});
test('legacy catalogue anchor continues to work', () => {
  assert.equal(routeFromHash('#catalogue'), 'catalogue');
});
test('unknown, malformed, or missing page names safely return home', () => {
  for (const hash of ['#/unknown', '#main-content', '#/catalogue/unknown', '#/catalogue-evil', '#%not-an-escape', '#https://example.com']) {
    assert.equal(routeFromHash(hash), 'home', hash);
  }
});
test('hash navigation requires no server-side route rewriting', () => {
  assert.deepEqual(ROUTES, { home: '#/', catalogue: '#/catalogue', maps: '#/maps' });
  assert.ok(Object.isFrozen(ROUTES));
  for (const href of Object.values(ROUTES)) {
    const url = new URL(href, 'https://example.test/Teneta/');
    assert.equal(url.pathname, '/Teneta/');
    assert.equal(url.origin, 'https://example.test');
  }
});
test('document titles follow the current page in both languages', () => {
  for (const lang of ['en', 'uk']) {
    const t = createTranslator(lang);
    assert.notEqual(t(routeTitleKey('home')), t(routeTitleKey('catalogue')));
    assert.ok(t(routeTitleKey('home')).startsWith('TENETA'));
    assert.ok(t(routeTitleKey('catalogue')).startsWith('TENETA'));
  }
});
test('the shared header links both pages and marks only the active page', () => {
  const header = source('src/components/SiteHeader.jsx');
  assert.match(header, /Object\.entries\(ROUTES\)/);
  assert.match(header, /aria-current=\{page === key \? "page" : undefined\}/);
  assert.match(header, /<LanguageSwitcher/);
});
test('the project logo links home instead of the old catalogue anchor', () => {
  assert.match(source('src/components/Brand.jsx'), /href="#\/"/);
  assert.doesNotMatch(source('src/components/Brand.jsx'), /href="#main-content"/);
});
test('there is one shared main landmark and one shared header', () => {
  const app = source('src/App.jsx');
  assert.equal((app.match(/<main\s/g) || []).length, 1);
  assert.equal((app.match(/<SiteHeader\s/g) || []).length, 1);
  assert.doesNotMatch(source('src/pages/CataloguePage.jsx'), /<main\s|<header\s/);
  assert.doesNotMatch(source('src/pages/LandingPage.jsx'), /<main\s|<header\s/);
});
test('catalogue state stays mounted and hidden page modals cannot open', () => {
  assert.match(source('src/App.jsx'), /<CataloguePage active=\{page === "catalogue"\}/);
  const page = source('src/pages/CataloguePage.jsx');
  assert.match(page, /hidden=\{!active\}/);
  assert.match(page, /active && selected && <RecordDialog/);
  assert.match(source('src/App.css'), /\[hidden\] \{ display: none !important;/);
});
test('the landing page does not require a catalogue fetch on entry', () => {
  const page = source('src/hooks/useOrganizations.js');
  assert.match(page, /if \(!active \|\| loaded\.current\) return;/);
  assert.match(page, /\[active, attempt\]/);
  assert.match(page, /requestActive = false; controller\.abort\(\)/);
});
test('team names and roles have both supplied-language and English labels', () => {
  const en = createTranslator('en');
  const uk = createTranslator('uk');
  assert.deepEqual(['roman', 'yuliana', 'milana'].map(id => uk(`team.${id}.name`)),
    ['Повар Роман', 'Панчук Юліана', 'Порошинська Мілана']);
  assert.deepEqual(['roman', 'yuliana', 'milana'].map(id => en(`team.${id}.role`)),
    ['Frontend engineer', 'Team lead', 'Backend engineer']);
  for (const id of ['roman', 'yuliana', 'milana']) {
    assert.notEqual(en(`team.${id}.description`), uk(`team.${id}.description`));
  }
});
test('team assets exist and match valid PNG signatures', () => {
  for (const name of ['roman-povar', 'yuliana-panchuk', 'milana-poroshynska']) {
    const bytes = readFileSync(new URL(`../src/assets/team/${name}.png`, import.meta.url));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  }
});
test('landing copy has only the requested team and a working catalogue action', () => {
  const sourceText = source('src/pages/LandingPage.jsx');
  assert.match(sourceText, /make kyiv great again/);
  assert.match(sourceText, /href=\{ROUTES\.catalogue\}/);
  assert.doesNotMatch(sourceText, /\bhref="#"|semantic-map|faker|fictional|hackathon workspace/i);
});
test('the app does not save a last-visited route that could override the landing page', () => {
  assert.doesNotMatch(source('src/navigation/usePageRoute.js'), /localStorage|sessionStorage/);
  assert.match(source('src/navigation/usePageRoute.js'), /hashchange/);
  assert.match(source('src/navigation/usePageRoute.js'), /removeEventListener/);
});
