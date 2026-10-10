import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizePayload, normalizeOrganization } from '../src/lib/catalog.js';
import { buildSemanticGraph, companyNodeId, graphView, indexGraph, NODE_TYPES, searchGraph } from '../src/graph/model.js';
import { fitTransform, layoutGraph, zoomTransform } from '../src/graph/layout.js';
import { graphHref, organizationFromHash, routeFromHash, routeTitleKey } from '../src/navigation/routes.js';
import { createTranslator } from '../src/i18n/locale.js';

function record(id, extras = {}) {
  return { meta:{entity_id:id}, company_profile:{brand_name:`Company ${id}`,primary_location:{city:'Shared city'},contacts_and_web:{}}, intelligence_analysis:{threat_score:10}, ...extras };
}
const normalized = (rows) => rows.map(normalizeOrganization);
const real = JSON.parse(readFileSync(new URL('../public/data/organizations.json',import.meta.url),'utf8'));
const g = (rows) => buildSemanticGraph(normalized(rows));

test('current dataset: exactly one supplied company, no invented companies',()=>{
 const graph=buildSemanticGraph(normalizePayload(real));
 assert.equal(graph.nodes.filter(n=>n.type==='company').length,1);
 assert.equal(graph.components.length,1);
 assert.equal(graph.nodes.length,11);assert.equal(graph.edges.length,10);
 assert.equal(graph.skipped,0);
});
test('all current nested graph connection and skill fields are represented',()=>{
 const graph=buildSemanticGraph(normalizePayload(real));
 assert.ok(graph.nodes.some(n=>n.label==='Civilian_HVAC_Plumbing'));
 assert.equal(graph.edges.filter(e=>e.relation==='REQUIRES_SKILL').length,4);
 assert.ok(graph.edges.every(e=>e.evidence.length&&e.evidence[0].path));
});
test('unrelated companies remain separate even with the same city, score and industry',()=>{
 const graph=g([record('A'),record('B')]);
 assert.equal(graph.components.length,2);assert.equal(graph.edges.length,0);
});
test('sharing a descriptive domain is not an inter-company link',()=>{
 const fields={graph_nodes_and_edges:{connections:[{relation:'OPERATES_IN_DOMAIN',target:'Shared_Domain'}]}};
 const graph=g([record('A',fields),record('B',fields)]);
 assert.equal(graph.components.length,2);assert.equal(graph.nodes.filter(n=>n.type==='domain').length,2);
});
test('explicit company ID creates a directed edge and one component',()=>{
 const graph=g([record('A',{graph_nodes_and_edges:{connections:[{relation:'SUPPLIES',target:'B'}]}}),record('B')]);
 assert.equal(graph.components.length,1);assert.equal(graph.nodes.length,2);
 assert.equal(graph.edges[0].source,companyNodeId('A'));assert.equal(graph.edges[0].target,companyNodeId('B'));
});
test('target object with company ID resolves a full profile, not a duplicate',()=>{
 const graph=g([record('A',{graph_nodes_and_edges:{connections:[{relation:'PART_OF',target:{entity_id:'B',name:'The other company'}}]}}),record('B')]);
 assert.equal(graph.nodes.length,2);assert.equal(graph.components.length,1);
});
test('exact INN resolves the known company',()=>{
 const b=record('B');b.company_profile.identifiers={inn:'0123456789'};
 const graph=g([record('A',{graph_nodes_and_edges:{connections:[{relation:'RELATED_TO',target:'0123456789'}]}}),b]);
 assert.equal(graph.edges[0].target,companyNodeId('B'));
});
test('ambiguous INN does not arbitrarily select a company',()=>{
 const b=record('B'),c=record('C');b.company_profile.identifiers={inn:'SAME'};c.company_profile.identifiers={inn:'SAME'};
 const graph=g([record('A',{graph_nodes_and_edges:{connections:[{target:'SAME'}]}}),b,c]);
 assert.equal(graph.nodes.filter(n=>n.type==='reference').length,1);
 assert.notEqual(graph.edges[0].target,companyNodeId('B'));assert.notEqual(graph.edges[0].target,companyNodeId('C'));
});
test('names alone do not overwrite company identity',()=>{
 const graph=g([record('A',{graph_nodes_and_edges:{connections:[{target:'Company B'}]}}),record('B')]);
 assert.equal(graph.nodes.filter(n=>n.type==='reference').length,1);assert.equal(graph.components.length,2);
});
test('shared explicit external reference produces a common node without creating a fake profile',()=>{
 const graph=g(['A','B'].map(id=>record(id,{graph_nodes_and_edges:{connections:[{relation:'PART_OF',target:'HOLDING_ID_01'}]}})));
 assert.equal(graph.nodes.length,3);assert.equal(graph.components.length,1);
 assert.equal(graph.nodes.find(n=>n.type==='reference').owners.length,2);
});
test('exact shared corporate email is a shared node, not an ownership edge',()=>{
 const rows=['A','B'].map((id,i)=>{const r=record(id);r.company_profile.contacts_and_web.corporate_emails=[i?'office@example.test':'Office@example.test'];return r;});
 const graph=g(rows);assert.equal(graph.components.length,1);
 assert.equal(graph.nodes.filter(n=>n.type==='contact').length,1);
 assert.ok(graph.edges.every(e=>e.relation==='HAS_EMAIL'));
});
test('phone formatting normalizes but incomplete/extension numbers stay scoped',()=>{
 const rows=['A','B'].map((id,i)=>{const r=record(id);r.company_profile.contacts_and_web.phones=[i?'+79001234567':'+7 (900) 123-45-67','12345','+79001234567 ext 1'];return r;});
 const graph=g(rows);assert.equal(graph.nodes.filter(n=>n.type==='contact').length,5);
 assert.equal(graph.nodes.find(n=>n.owners.length===2).label,'+7 (900) 123-45-67');
});
test('corporate website canonicalization shares exact pages, never all pages on one host',()=>{
 const rows=['A','B','C'].map((id,i)=>{const r=record(id);r.company_profile.contacts_and_web.websites=[['http://www.example.test/','https://example.test/#section','https://example.test/another'][i]];return r;});
 const graph=g(rows);assert.equal(graph.components.length,2);assert.equal(graph.nodes.filter(n=>n.type==='website').length,2);
});
test('shared job-board homepage is not an organizational link',()=>{
 const rows=['A','B'].map(id=>{const r=record(id);r.company_profile.contacts_and_web.websites=['https://hh.ru/'];return r;});
 assert.equal(g(rows).components.length,2);
});
test('shared vacancy IDs and common skills are scoped to the organization',()=>{
 const graph=g(['A','B'].map(id=>record(id,{vacancies:[{vacancy_id:'1',title:'Engineer',key_skills:['Python']}]})));
 assert.equal(graph.components.length,2);assert.equal(graph.nodes.filter(n=>n.type==='skill').length,2);
});
test('raw recruiter details are never extracted into graph labels or edges',()=>{
 const graph=g([record('A',{recruiters:[{full_name:'Private Person',email:'private@example.test',phone:'+79001234567'}]})]);
 assert.equal(graph.nodes.length,1);assert.doesNotMatch(JSON.stringify(graph.nodes),/Private|private@|7900/);
});
test('demos are excluded even when a caller bypasses the regular normalizer',()=>{
 const graph=buildSemanticGraph([normalizeOrganization(record('A')),normalizeOrganization(record('F',{meta:{entity_id:'F',is_demo:true}}))]);
 assert.equal(graph.nodes.length,1);
});
test('unsafe URLs are not graph destinations',()=>{
 const r=record('A',{graph_nodes_and_edges:{connections:[{target:{id:'unknown',url:'javascript:alert(1)'}}]}});
 r.company_profile.contacts_and_web.websites=['javascript:alert(1)'];
 assert.ok(g([r]).nodes.every(n=>!n.url||/^https?:/.test(n.url)));
});
test('explicit node/edge format accepts declared node IDs and records source paths',()=>{
 const graph=g([record('A',{graph_nodes_and_edges:{nodes:[{id:'H1',label:'Holding'}],edges:[{source:'A',target:'H1',relation:'PART_OF'}]}})]);
 assert.equal(graph.nodes.length,2);assert.equal(graph.edges[0].relation,'PART_OF');
 assert.equal(graph.edges[0].evidence[0].path,'graph_nodes_and_edges.edges[0]');
});
test('dangling explicit edges are skipped, counted and never fabricated',()=>{
 const graph=g([record('A',{graph_nodes_and_edges:{edges:[{source:'A',target:'missing'}]}})]);
 assert.equal(graph.nodes.length,1);assert.equal(graph.edges.length,0);assert.equal(graph.skipped,1);
});
test('self links and duplicates cannot create spurious edges',()=>{
 const graph=g([record('A',{graph_nodes_and_edges:{connections:[{target:'A'},{target:'B'},{target:'B'}]}}),record('B')]);
 assert.equal(graph.edges.length,1);assert.equal(graph.edges[0].evidence.length,2);assert.equal(graph.skipped,1);
});
test('null or malformed connection entries are safe',()=>{
 const graph=g([record('A',{graph_nodes_and_edges:{nodes:[null,{}],connections:[null,{},3],edges:[null]}})]);
 assert.equal(graph.nodes.length,1);assert.ok(graph.skipped>=5);
});
test('builder does not mutate input organization records or JSON',()=>{
 const input=normalized([record('A',{vacancies:[{title:'Engineer',key_skills:['Skill']}]}),record('B')]);
 const before=JSON.stringify(input);buildSemanticGraph(input);assert.equal(JSON.stringify(input),before);
});
test('stable IDs, node ordering and edge ordering across rebuilds',()=>{
 const input=normalizePayload(real);const a=buildSemanticGraph(input),b=buildSemanticGraph(input);
 assert.deepEqual(a.nodes,b.nodes);assert.deepEqual(a.edges,b.edges);
});
test('BFS local depth includes relevant nodes and excludes unrelated components',()=>{
 const graph=g([record('A',{graph_nodes_and_edges:{connections:[{target:'B'}]}}),record('B',{graph_nodes_and_edges:{connections:[{target:'C'}]}}),record('C'),record('D')]);
 assert.deepEqual(graphView(graph,{organizationId:'A',depth:1}).nodes.map(n=>n.organizationId),['A','B']);
 assert.deepEqual(graphView(graph,{organizationId:'A',depth:2}).nodes.map(n=>n.organizationId),['A','B','C']);
});
test('default local view contains vacancy skills two hops away',()=>{
 const graph=g([record('A',{vacancies:[{title:'Engineer',key_skills:['Skill']}]} )]);
 assert.equal(graphView(graph,{organizationId:'A',depth:1}).nodes.length,2);
 assert.equal(graphView(graph,{organizationId:'A',depth:2}).nodes.length,3);
});
test('missing graph organization produces an empty graph, not the whole network',()=>{
 assert.equal(graphView(g([record('A')]),{organizationId:'missing'}).nodes.length,0);
});
test('type filters remove incident edges; companies and isolated nodes remain',()=>{
 const graph=g([record('A',{vacancies:[{title:'Engineer',key_skills:['Skill']}]}),record('B')]);
 const filtered=graphView(graph,{types:[]});
 assert.equal(filtered.nodes.length,2);assert.equal(filtered.edges.length,0);assert.equal(filtered.components.length,2);
});
test('hidden node types cannot create invisible bridges in local BFS',()=>{
 const rows=['A','B'].map(id=>{const r=record(id);r.company_profile.contacts_and_web.corporate_emails=['common@example.test'];return r;});
 assert.equal(graphView(g(rows),{organizationId:'A',depth:3,types:['company']}).nodes.length,1);
});
test('search supports case-insensitive Cyrillic and multiple query terms',()=>{
 const graph=indexGraph([{id:'1',type:'company',label:'ООО Ёлка',organizationId:'ENT_001'}],[]);
 assert.equal(searchGraph(graph,'елка ent_001').length,1);assert.equal(searchGraph(graph,'unknown').length,0);assert.equal(searchGraph(graph,' ').length,0);
});
test('empty graphs produce stable empty model and layout',()=>{
 const graph=buildSemanticGraph([]);assert.deepEqual(graph.nodes,[]);assert.deepEqual(graph.components,[]);assert.equal(layoutGraph(graph).length,0);
});
test('layout is deterministic, finite and contains positions for every node',()=>{
 const graph=buildSemanticGraph(normalizePayload(real));const a=layoutGraph(graph),b=layoutGraph(graph);
 assert.deepEqual(a,b);assert.equal(a.length,graph.nodes.length*2);assert.ok([...a].every(Number.isFinite));
});
test('disconnected clusters have separate non-overlapping bounds',()=>{
 const graph=g(Array.from({length:20},(_,i)=>record(String(i),{vacancies:[{title:'Engineer',key_skills:['Skill']}]})));
 const p=layoutGraph(graph);const ids=new Map(graph.nodes.map((n,i)=>[n.id,i]));
 const bounds=graph.components.map(c=>{const xs=c.map(id=>p[2*ids.get(id)]),ys=c.map(id=>p[2*ids.get(id)+1]);return {x1:Math.min(...xs)-20,x2:Math.max(...xs)+20,y1:Math.min(...ys)-20,y2:Math.max(...ys)+20};});
 for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){
  const a=bounds[i],b=bounds[j];assert.ok(a.x2<b.x1||b.x2<a.x1||a.y2<b.y1||b.y2<a.y1);
 }
});
test('seed layout works independently when workers are unavailable',()=>{
 const graph=buildSemanticGraph(normalizePayload(real));assert.ok([...layoutGraph(graph,{iterations:0})].every(Number.isFinite));
});
test('fitting and pointer-centered zoom have finite bounded transforms',()=>{
 const c=fitTransform(new Float32Array([100,200,900,800]),1000,700);
 assert.ok(c.scale>0);const x=350,y=260;const before=[(x-c.x)/c.scale,(y-c.y)/c.scale];const z=zoomTransform(c,2,x,y);
 assert.deepEqual([(x-z.x)/z.scale,(y-z.y)/z.scale],before);
 assert.ok(zoomTransform(c,1e9,0,0).scale<=8);assert.ok(zoomTransform(c,0,0,0).scale>=.002);
});
test('large dataset is not silently sampled or truncated',()=>{
 const graph=g(Array.from({length:1200},(_,i)=>record(String(i),{vacancies:[{title:'Vacancy',key_skills:['One','Two']}]})));
 assert.equal(graph.nodes.length,4800);assert.equal(graph.components.length,1200);
 assert.equal(layoutGraph(graph,{iterations:3}).length,9600);
});
test('graph links preserve GitHub Pages prefix and round-trip special IDs',()=>{
 for(const id of ['ENT_043','Компанія 1','A&B?#/ C']){
  const href=graphHref(id);assert.equal(routeFromHash(href),'maps');assert.equal(organizationFromHash(href),id);
  assert.equal(new URL(href,'https://example.test/Teneta/').pathname,'/Teneta/');
 }
 assert.equal(graphHref(null),'#/maps');assert.equal(organizationFromHash('#/'),null);
});
test('same-page graph route changes are subscribed to, not only page name changes',()=>{
 const s=readFileSync(new URL('../src/navigation/usePageRoute.js',import.meta.url),'utf8');assert.match(s,/return window.location.hash/);
});
test('graph localization has matching complete keys and three page titles',()=>{
 for(const lang of ['en','uk']){
  const t=createTranslator(lang);for(const type of NODE_TYPES)assert.notEqual(t(`maps.type.${type}`),`maps.type.${type}`);
  assert.match(t(routeTitleKey('maps')),/^TENETA/);
 }
});
test('skip link targets main, prevents hash navigation and explicitly focuses the landmark',()=>{
 const s=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.match(s,/href="#main-content" className="skip-link" onClick=\{skipToContent\}/);
 assert.match(s,/event.preventDefault\(\)/);assert.match(s,/mainRef.current\?\.focus/);
});
test('record details contain a real routable organization map link',()=>{
 const s=readFileSync(new URL('../src/components/RecordDialog.jsx',import.meta.url),'utf8');
 assert.match(s,/href=\{graphHref\(organization.id\)\}/);assert.match(s,/maps.openGraph/);
});
