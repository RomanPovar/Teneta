import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOrganizations, ORGANIZATIONS_URL } from '../src/services/organizationService.js';

const record = {meta:{entity_id:'S'},company_profile:{brand_name:'Source organization'},intelligence_analysis:{threat_score:85}};

test('loading retains JSON normalization and excluded-record handling', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify([record,{meta:{is_demo:true}}])));
  const rows = await loadOrganizations();
  assert.equal(rows.length, 1); assert.equal(rows[0].risk, 'high');
});
test('requests preserve cancellation, headers and data path', async (t) => {
  const controller = new AbortController();
  let requested;
  t.mock.method(globalThis, 'fetch', async (...args) => { requested = args; return new Response('[]'); });
  await loadOrganizations({signal:controller.signal});
  assert.equal(requested[0], ORGANIZATIONS_URL);
  assert.equal(requested[1].signal, controller.signal);
  assert.equal(requested[1].headers.Accept, 'application/json');
});
test('HTTP errors expose a code and status for translation', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Unavailable', {status:503}));
  await assert.rejects(loadOrganizations(), error => error.code === 'http' && error.status === 503);
});
test('network errors expose a translation code', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(loadOrganizations(), error => error.code === 'network');
});
test('malformed JSON exposes a translation code', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>not json</html>'));
  await assert.rejects(loadOrganizations(), error => error.code === 'invalidJson');
});
test('invalid records expose a translation code', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('[{"company_profile":{}}]'));
  await assert.rejects(loadOrganizations(), error => error.code === 'invalidData');
});
test('duplicate identities expose a translation code', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify([record, record])));
  await assert.rejects(loadOrganizations(), error => error.code === 'invalidData');
});
test('request cancellation is not converted into an error panel', async (t) => {
  const error = new DOMException('Stopped', 'AbortError');
  t.mock.method(globalThis, 'fetch', async () => { throw error; });
  await assert.rejects(loadOrganizations(), error);
});
test('cancellation while reading JSON retains AbortError', async (t) => {
  const error = new DOMException('Stopped', 'AbortError');
  t.mock.method(globalThis, 'fetch', async () => ({ok:true,json:async () => { throw error; }}));
  await assert.rejects(loadOrganizations(), error);
});
