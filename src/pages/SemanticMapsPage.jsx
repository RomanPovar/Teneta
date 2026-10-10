import { useCallback, useMemo, useState } from "react";
import { useLanguage } from "../i18n/useLanguage.js";
import { loadErrorMessage } from "../i18n/locale.js";
import { buildSemanticGraph, companyNodeId, graphView, NODE_TYPES, searchGraph } from "../graph/model.js";
import GraphCanvas from "../graph/GraphCanvas.jsx";
import { COLORS } from "../graph/canvas.js";
import { graphHref, ROUTES } from "../navigation/routes.js";
import Icon from "../components/Icon.jsx";
import RiskBadge from "../components/RiskBadge.jsx";
import RecordDialog from "../components/RecordDialog.jsx";
import "./SemanticMapsPage.css";

function relationLabel(relation, t) {
  const translated = t(`maps.relation.${relation}`);
  return translated.startsWith("maps.relation.") ? relation : translated;
}

export default function SemanticMapsPage({ active, organizationId, dataset }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState(NODE_TYPES);
  const [labels, setLabels] = useState(true);
  const [depth, setDepth] = useState(2);
  const [spacing, setSpacing] = useState(1);
  const [selection, setSelection] = useState({ scope: null, id: null });
  const [centerRequest, setCenterRequest] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [listLimit, setListLimit] = useState(40);
  const [edgeLimit, setEdgeLimit] = useState(15);
  const { organizations, status, error, retry } = dataset;
  const graph = useMemo(() => buildSemanticGraph(organizations), [organizations]);
  const visible = useMemo(() => graphView(graph, { organizationId, depth, types }), [graph, organizationId, depth, types]);
  const results = useMemo(() => searchGraph(visible, query), [visible, query]);
  const matches = useMemo(() => query.trim() ? new Set(results.map(n => n.id)) : null, [results, query]);
  const selectedId = selection.scope === organizationId ? selection.id : organizationId ? companyNodeId(organizationId) : null;
  const selected = visible.nodeById.get(selectedId);
  const localCompany = organizations.find(o => o.id === organizationId);
  const selectedCompany = organizations.find(o => o.id === selected?.organizationId);
  const profile = organizations.find(o => o.id === profileId);
  const nodeList = matches ? results : visible.nodes;
  const connections = selected ? visible.adjacency.get(selected.id) : [];
  const onSelect = useCallback(id => {
    setSelection({ scope: organizationId, id }); setEdgeLimit(15);
  }, [organizationId]);
  const onOpen = useCallback(id => {
    const node = graph.nodeById.get(id);
    if (node?.type === "company") window.location.hash = graphHref(node.organizationId);
  }, [graph]);
  function inspect(id) {
    onSelect(id);setCenterRequest({ id });
  }
  function changeType(type) {
    setTypes(old => old.includes(type) ? old.filter(v=>v!==type) : [...old,type]);
    setListLimit(40);
  }

  return <section hidden={!active} className="maps-page" aria-labelledby="maps-heading">
    <div className="maps-heading-row">
      <div className="maps-heading-copy"><h1 id="maps-heading">{t("maps.heading")}</h1>
        <span className="maps-scope"><span className="status-dot" />{organizationId ? t("maps.local") : t("maps.global")}</span>
      </div>
      {organizationId && <a className="button" href={ROUTES.maps}><Icon name="left" size={16}/>{t("maps.backGlobal")}</a>}
    </div>
    {localCompany && <p className="maps-company-name">{localCompany.name}</p>}
    {status === "loading" && <div className="state-panel" role="status"><span className="loading-spinner"/><h2>{t("loading.title")}</h2></div>}
    {status === "error" && <div className="state-panel" role="alert"><h2>{t("error.title")}</h2><p>{loadErrorMessage(error,t)}</p><button className="button" onClick={retry}>{t("error.retry")}</button></div>}
    {status === "ready" && organizationId && !localCompany && <div className="state-panel" role="alert"><h2>{t("maps.unknownOrganization")}</h2><a className="button" href={ROUTES.maps}>{t("maps.backGlobal")}</a></div>}
    {status === "ready" && (!organizationId || localCompany) && <>
      <div className="maps-topline">
        <dl className="maps-stats" aria-label={t("maps.global")}>
          <div><dd>{visible.nodes.filter(n=>n.type==="company").length}</dd><dt>{t("maps.companies")}</dt></div>
          <div><dd>{visible.nodes.length}</dd><dt>{t("maps.nodes")}</dt></div>
          <div><dd>{visible.edges.length}</dd><dt>{t("maps.edges")}</dt></div>
          <div><dd>{visible.components.length}</dd><dt>{t("maps.clusters")}</dt></div>
        </dl>
        <label className="graph-search"><span className="sr-only">{t("maps.search")}</span><Icon name="search" size={17}/>
          <input value={query} placeholder={t("maps.searchPlaceholder")} onChange={e=>{setQuery(e.target.value);setListLimit(40);}} type="search"/>
        </label>
      </div>
      {!graph.nodes.length ? <div className="state-panel"><h2>{t("maps.empty")}</h2><p>{t("maps.emptyHint")}</p></div> :
      <div className="graph-workspace">
        <div className="graph-stage">
          {active && <GraphCanvas graph={visible} selectedId={selected?.id} matches={matches} labels={labels} spacing={spacing}
            centerRequest={centerRequest} onSelect={onSelect} onOpen={onOpen}/>}
          <div className="graph-legend" aria-label={t("maps.types")}>{NODE_TYPES.filter(type=>visible.nodes.some(n=>n.type===type)).map(type=>
            <span key={type}><i style={{background:COLORS[type]}}/>{t(`maps.type.${type}`)}</span>)}</div>
        </div>
        <aside className="graph-sidebar" aria-label={t("maps.view")}>
          <details className="graph-settings" open>
            <summary>{t("maps.view")}<Icon name="filters" size={16}/></summary>
            {organizationId && <label className="graph-range" htmlFor="graph-depth">{t("maps.depth")}<output aria-hidden="true">{depth}</output><input id="graph-depth" type="range" min="1" max="5" step="1" value={depth} onChange={e=>setDepth(Number(e.target.value))}/></label>}
            <label className="graph-check"><input type="checkbox" checked={labels} onChange={e=>setLabels(e.target.checked)}/>{t("maps.labels")}</label>
            <label className="graph-range" htmlFor="graph-spacing">{t("maps.spacing")}<output aria-hidden="true">{spacing.toFixed(1)}×</output><input id="graph-spacing" type="range" min="0.7" max="1.7" step="0.1" value={spacing} onChange={e=>setSpacing(Number(e.target.value))}/></label>
            <fieldset className="graph-type-filters"><legend>{t("maps.types")}</legend>{NODE_TYPES.filter(type=>type!=="company").map(type=>
              <label className="graph-check" key={type}><input type="checkbox" checked={types.includes(type)} onChange={()=>changeType(type)}/><i style={{background:COLORS[type]}}/>{t(`maps.type.${type}`)}</label>)}</fieldset>
          </details>
          <section className="graph-inspector" aria-label={t("maps.selected")}>
            <div className="graph-section-label">{t("maps.selected")}{selected&&<button className="icon-button" aria-label={t("common.close")} onClick={()=>onSelect(null)}><Icon name="close" size={14}/></button>}</div>
            {!selected ? <p className="graph-muted">{t("maps.selectHint")}</p> : <>
              <span className="graph-node-type"><i style={{background:COLORS[selected.type]}}/>{t(`maps.type.${selected.type}`)}</span>
              <h2>{selected.label}</h2>
              {selected.type==="company" && <div className="graph-risk"><RiskBadge level={selected.risk} score={selected.score}/>{selected.score!==null&&<span>{selected.score} / 100</span>}</div>}
              {selected.owners.length>1 && <p className="graph-muted">{t("maps.shared",{count:selected.owners.length})}</p>}
              {selected.owners.length>1 && ["website","contact"].includes(selected.type) && <p className="graph-note">{t("maps.overlapNote")}</p>}
              {selected.type==="reference" && <p className="graph-note">{t("maps.referenceNote")}</p>}
              {selectedCompany && <div className="graph-inspector-actions">
                <a className="button" href={graphHref(selectedCompany.id)}><Icon name="network" size={16}/>{t("maps.openGraph")}</a>
                <button className="button graph-secondary" onClick={()=>setProfileId(selectedCompany.id)}>{t("maps.openProfile")}<Icon name="external" size={13}/></button>
              </div>}
              {selected.url && <a className="source-link" href={selected.url} target="_blank" rel="noopener noreferrer">{t("maps.source")}<Icon name="external" size={12}/></a>}
              <h3>{t("maps.connections")} <span>{connections.length}</span></h3>
              {!connections.length && <p className="graph-muted">{t("maps.noEdges")}</p>}
              <ul className="graph-connections">{connections.slice(0,edgeLimit).map(({nodeId,edge})=>{
                const target=visible.nodeById.get(nodeId);
                return <li key={edge.id}>
                  <button type="button" onClick={()=>inspect(nodeId)}><span className="graph-relation">{selected.id===edge.source?"→":"←"} {relationLabel(edge.relation,t)}</span><span>{target.label}</span></button>
                  <details className="graph-evidence"><summary>{t("maps.evidence")}</summary>{edge.evidence.map((e,i)=><div key={i}><span>{t("maps.record")}: {e.organizationId}</span><code>{e.path}</code>{e.url&&<a href={e.url} target="_blank" rel="noopener noreferrer">{t("maps.source")} ↗</a>}</div>)}</details>
                </li>;
              })}</ul>
              {connections.length>edgeLimit&&<button className="text-button" onClick={()=>setEdgeLimit(n=>n+25)}>{t("maps.more")}</button>}
            </>}
          </section>
          <details className="graph-node-list" open>
            <summary>{t(matches?"maps.results":"maps.nodeList")} <span>{nodeList.length}</span></summary>
            {nodeList.length===0&&<p className="graph-muted" role="status">{t("maps.noMatches")}</p>}
            <ul>{nodeList.slice(0,listLimit).map(n=><li key={n.id}><button type="button" aria-pressed={selected?.id===n.id} onClick={()=>inspect(n.id)}><i style={{background:COLORS[n.type]}}/><span>{n.label}</span></button></li>)}</ul>
            {nodeList.length>listLimit&&<button className="text-button" onClick={()=>setListLimit(n=>n+50)}>{t("maps.more")}</button>}
          </details>
        </aside>
      </div>}
      <p className="graph-keyboard-note">{t("maps.keyboardHelp")}</p>
      {graph.skipped>0&&<p className="graph-note">{t("maps.skipped",{count:graph.skipped})}</p>}
    </>}
    {active && profile && <RecordDialog organization={profile} onClose={()=>setProfileId(null)}/>}
  </section>;
}
