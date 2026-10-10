import { useEffect, useRef, useState } from "react";
import { GraphRenderer } from "./canvas.js";
import { layoutGraph } from "./layout.js";
import { useLanguage } from "../i18n/useLanguage.js";
import Icon from "../components/Icon.jsx";

export default function GraphCanvas({ graph, selectedId, matches, labels, spacing, centerRequest, onSelect, onOpen }) {
  const { t } = useLanguage();
  const canvasRef = useRef(null), renderer = useRef(null);
  const [view, setView] = useState({ scale: 1 });
  const [layoutStatus, setLayoutStatus] = useState("working");
  const callbacks = useRef({ onSelect, onOpen });
  useEffect(() => { callbacks.current = { onSelect, onOpen }; }, [onSelect, onOpen]);
  useEffect(() => {
    const engine = new GraphRenderer(canvasRef.current, {
      onSelect: id => callbacks.current.onSelect(id), onOpen: id => callbacks.current.onOpen(id),
      onView: next => setView(old => Math.abs(old.scale-next.scale)>.0001 ? next : old),
    });
    renderer.current = engine;
    const simple = { nodes: graph.nodes, edges: graph.edges, components: graph.components };
    engine.setGraph(graph, layoutGraph(simple, { iterations: 0, spacing }));
    let worker, disposed = false;
    window.queueMicrotask(() => { if (!disposed) setLayoutStatus("working"); });
    const fallback = () => { if (!disposed) setLayoutStatus("fallback"); };
    try {
      worker = new Worker(new URL("./layout.worker.js", import.meta.url), { type: "module" });
      worker.onmessage = ({ data }) => {
        if (disposed) return;
        if (data.error) { fallback(); return; }
        engine.setPositions(data.positions);
        setLayoutStatus("ready");
      };
      worker.onerror = fallback;
      worker.postMessage({ graph: simple, spacing });
    } catch { window.queueMicrotask(fallback); }
    return () => { disposed = true; worker?.terminate(); engine.dispose(); renderer.current = null; };
  }, [graph, spacing]);
  useEffect(() => { renderer.current?.setSelected(selectedId); }, [graph, spacing, selectedId]);
  useEffect(() => { renderer.current?.setSearch(matches); }, [graph, spacing, matches]);
  useEffect(() => { if (renderer.current) {renderer.current.labels=labels;renderer.current.invalidate();} }, [graph, spacing, labels]);
  useEffect(() => { if (centerRequest?.id) renderer.current?.centerOn(centerRequest.id); }, [centerRequest]);

  function onKeyDown(e) {
    if (e.target !== e.currentTarget || e.ctrlKey || e.metaKey || e.altKey) return;
    const keys={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]};
    if (keys[e.key]) {e.preventDefault();renderer.current?.pan(...keys[e.key]);}
    else if (e.key==="+"||e.key==="=") {e.preventDefault();renderer.current?.zoom(1.3);}
    else if (e.key==="-") {e.preventDefault();renderer.current?.zoom(1/1.3);}
    else if (e.key==="Home") {e.preventDefault();renderer.current?.fit();}
    else if (e.key==="Escape") {e.preventDefault();onSelect(null);}
  }
  return <div className="graph-canvas-wrap" tabIndex={0} role="group" aria-label={t("maps.canvas")} aria-describedby="graph-controls-help" onKeyDown={onKeyDown}>
    <canvas ref={canvasRef} className="graph-canvas" aria-hidden="true" />
    <div className="graph-layout-state" role="status">{layoutStatus==="working"?t("maps.layoutWorking"):layoutStatus==="fallback"?t("maps.layoutFallback"):""}</div>
    <div className="graph-camera-controls">
      <button className="icon-button" type="button" aria-label={t("maps.zoomIn")} title={t("maps.zoomIn")} onClick={()=>renderer.current?.zoom(1.3)}>+</button>
      <output aria-label={t("maps.zoom")}>{Math.round(view.scale*100)}%</output>
      <button className="icon-button" type="button" aria-label={t("maps.zoomOut")} title={t("maps.zoomOut")} onClick={()=>renderer.current?.zoom(1/1.3)}>−</button>
      <span className="graph-control-divider" />
      <button className="icon-button" type="button" aria-label={t("maps.fit")} title={t("maps.fit")} onClick={()=>renderer.current?.fit()}><Icon name="fit" size={17}/></button>
    </div>
    <p className="graph-gesture-hint" id="graph-controls-help">{t("maps.controls")}</p>
  </div>;
}
