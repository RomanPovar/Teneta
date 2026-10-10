import { normalizeText, safeHttpUrl } from "../lib/catalog.js";

export const NODE_TYPES = Object.freeze(["company", "website", "contact", "vacancy", "skill", "domain", "reference"]);
const text = (value) => typeof value === "string" ? value.trim() : "";
const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const list = (value) => Array.isArray(value) ? value : [];
export const companyNodeId = (id) => `company:${encodeURIComponent(String(id))}`;
const key = (type, ...parts) => `${type}:${JSON.stringify(parts)}`;

function contactKey(value, kind) {
  if (kind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : "";
  // Do not erase extensions or turn incomplete numbers into shared identities.
  const digits = value.replace(/[\s()+.-]/g, "");
  return /^\d{10,15}$/.test(digits) ? digits : "";
}
function websiteKey(value) {
  const url = new URL(value);
  // Exact host + path + query, not a registrable-domain guess. Protocol/fragment are irrelevant.
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return `${host}${url.port ? `:${url.port}` : ""}${url.pathname.replace(/\/$/, "")}${url.search}`;
}
function isPlatformRoot(value) {
  const url = new URL(value);
  return (!url.pathname || url.pathname === "/") &&
    /(^|\.)(hh\.ru|avito\.ru|vk\.com|t\.me|youtube\.com|linkedin\.com)$/.test(url.hostname);
}

/** One indexed graph from the SAME normalized records used by the catalogue.
 * No fuzzy matching, score-based links, personal recruiter data or network requests.
 */
export function buildSemanticGraph(organizations = []) {
  const records = list(organizations).filter(o => o?.id && o?.raw?.meta?.is_demo !== true && !o.isDemo);
  const nodes = new Map();
  const edges = new Map();
  const aliases = new Map();
  let skipped = 0;
  function addAlias(alias, id) {
    if (!alias) return;
    if (!aliases.has(alias)) aliases.set(alias, id);
    else if (aliases.get(alias) !== id) aliases.set(alias, null); // Ambiguous INNs must not merge companies.
  }
  function addNode(id, type, label, owner, extra = {}) {
    if (!nodes.has(id)) nodes.set(id, { id, type, label, owners: new Set(), ...extra });
    if (owner) nodes.get(id).owners.add(owner);
    return id;
  }
  function addEdge(source, target, relation, owner, path, sourceUrl = null) {
    if (!nodes.has(source) || !nodes.has(target) || source === target) { skipped++; return; }
    const id = key("edge", source, target, relation);
    if (!edges.has(id)) edges.set(id, { id, source, target, relation, evidence: [] });
    const evidence = { organizationId: owner, path, url: safeHttpUrl(sourceUrl) };
    const edge = edges.get(id);
    if (!edge.evidence.some(e => e.organizationId === owner && e.path === path)) edge.evidence.push(evidence);
  }
  for (const o of records) {
    const id = companyNodeId(o.id);
    addNode(id, "company", o.name, o.id, { organizationId: o.id, risk: o.risk, score: o.score, url: o.sourceUrl });
    addAlias(String(o.id), id);
    addAlias(text(o.inn), id);
  }
  for (const o of records) {
    const company = companyNodeId(o.id);
    const attach = (type, id, label, relation, path, extra = {}, source = company) => {
      addNode(id, type, label, o.id, extra);
      addEdge(source, id, relation, o.id, path, o.sourceUrl);
      return id;
    };
    list(o.websites).forEach((value, i) => {
      const url = safeHttpUrl(value);
      if (!url) { skipped++; return; }
      const identity = isPlatformRoot(url) ? key("website", o.id, url) : key("website", websiteKey(url));
      attach("website", identity, websiteKey(url), "HAS_WEBSITE", `company_profile.contacts_and_web.websites[${i}]`, { url });
    });
    for (const [kind, values, field] of [["email", o.emails, "corporate_emails"], ["phone", o.phones, "phones"]]) {
      list(values).forEach((value, i) => {
        if (!text(value)) return;
        const normalized = contactKey(value, kind);
        attach("contact", normalized ? key(kind, normalized) : key(kind, o.id, value), value,
          kind === "email" ? "HAS_EMAIL" : "HAS_PHONE", `company_profile.contacts_and_web.${field}[${i}]`, { contactKind: kind });
      });
    }
    list(o.vacancies).forEach((v, i) => {
      const vacancy = attach("vacancy", key("vacancy", o.id, String(v.vacancy_id ?? i)), text(v.title) || String(v.vacancy_id ?? i + 1),
        "HAS_VACANCY", `vacancies[${i}]`, { url: safeHttpUrl(v.url), organizationId: o.id });
      list(v.key_skills).forEach((s, j) => {
        if (text(s)) attach("skill", key("skill", o.id, normalizeText(s)), text(s), "REQUIRES_SKILL",
          `vacancies[${i}].key_skills[${j}]`, {}, vacancy);
      });
    });
    const rawGraph = object(o.raw?.graph_nodes_and_edges);
    const declared = new Map();
    // Optional explicit node/edge representation; IDs (not display names) resolve endpoints.
    for (const n of list(rawGraph.nodes)) {
      const value = object(n);
      const id = text(value.id) || text(value.entity_id);
      if (!id) { skipped++; continue; }
      const resolved = aliases.get(id);
      if (resolved) { declared.set(id, resolved); continue; }
      const nodeId = key("reference", id);
      declared.set(id, nodeId);
      addNode(nodeId, "reference", text(value.label) || text(value.name) || id, o.id,
        { referenceId: id, url: safeHttpUrl(value.url) });
    }
    for (const [index, c] of list(rawGraph.connections).entries()) {
      const connection = object(c);
      const targetObject = object(connection.target);
      const explicitId = text(connection.target_id) || text(targetObject.entity_id) || text(targetObject.id) || text(targetObject.inn);
      const targetText = text(connection.target);
      const label = text(targetObject.label) || text(targetObject.name) || targetText || explicitId;
      const targetId = explicitId || targetText;
      const relation = text(connection.relation) || "RELATED_TO";
      if (!targetId && !label) { skipped++; continue; }
      const known = aliases.get(targetId) || declared.get(targetId);
      if (known) {
        addEdge(company, known, relation, o.id, `graph_nodes_and_edges.connections[${index}]`, connection.source_url || o.sourceUrl);
      } else {
        // A common industry/skill is NOT a corporate relationship: keep descriptive concepts local.
        const isConcept = /DOMAIN|SECTOR|INDUSTRY|SKILL|TECHNOLOGY|CATEGORY/i.test(relation);
        const type = isConcept ? "domain" : "reference";
        const nodeId = isConcept ? key(type, o.id, targetId || label) : key(type, targetId || label);
        attach(type, nodeId, label, relation, `graph_nodes_and_edges.connections[${index}]`,
          { referenceId: targetId, url: safeHttpUrl(targetObject.url) });
      }
    }
    for (const [index, value] of list(rawGraph.edges).entries()) {
      const e = object(value);
      const sourceId = text(e.source) || text(e.source_id) || o.id;
      const targetId = text(e.target) || text(e.target_id);
      const source = aliases.get(sourceId) || declared.get(sourceId);
      const target = aliases.get(targetId) || declared.get(targetId);
      addEdge(source, target, text(e.relation) || text(e.label) || "RELATED_TO", o.id,
        `graph_nodes_and_edges.edges[${index}]`, e.source_url || o.sourceUrl);
    }
  }
  return indexGraph([...nodes.values()].map(n => ({ ...n, owners: [...n.owners].sort() })), [...edges.values()], { skipped });
}

export function indexGraph(nodes, edges, extras = {}) {
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const adjacency = new Map(nodes.map(n => [n.id, []]));
  for (const edge of edges) {
    adjacency.get(edge.source)?.push({ nodeId: edge.target, edge });
    adjacency.get(edge.target)?.push({ nodeId: edge.source, edge });
  }
  const visited = new Set();
  const components = [];
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const ids = [node.id];
    visited.add(node.id);
    for (let i = 0; i < ids.length; i++) {
      for (const { nodeId } of adjacency.get(ids[i])) {
        if (!visited.has(nodeId)) { visited.add(nodeId); ids.push(nodeId); }
      }
    }
    components.push(ids);
  }
  return { nodes, edges, nodeById, adjacency, components, ...extras };
}

export function graphView(graph, { organizationId = null, depth = 2, types = NODE_TYPES } = {}) {
  const enabled = new Set(["company", ...types]);
  const allowed = new Set(graph.nodes.filter(n => enabled.has(n.type)).map(n => n.id));
  if (organizationId) {
    const center = companyNodeId(organizationId);
    if (!allowed.has(center)) return indexGraph([], []);
    const visible = new Set([center]);
    let frontier = [center];
    for (let level = 0; level < Math.min(5, Math.max(1, Number(depth) || 1)); level++) {
      const next = [];
      for (const id of frontier) for (const { nodeId } of graph.adjacency.get(id) ?? []) {
        if (allowed.has(nodeId) && !visible.has(nodeId)) { visible.add(nodeId); next.push(nodeId); }
      }
      frontier = next;
    }
    for (const id of allowed) if (!visible.has(id)) allowed.delete(id);
  }
  return indexGraph(graph.nodes.filter(n => allowed.has(n.id)), graph.edges.filter(e => allowed.has(e.source) && allowed.has(e.target)));
}

export function searchGraph(graph, query) {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return graph.nodes.filter(n => words.every(w => normalizeText(`${n.label} ${n.organizationId ?? ""} ${n.referenceId ?? ""}`).includes(w)));
}
