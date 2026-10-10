import { fitTransform, zoomTransform } from "./layout.js";

export const COLORS = Object.freeze({ company: "#d1e5bc", website: "#91c8bc", contact: "#c8b994", vacancy: "#93adca", skill: "#aaa2c8", domain: "#97af95", reference: "#cd9e91" });

/** Imperative canvas renderer: no per-frame React state or thousands of DOM nodes. */
export class GraphRenderer {
  constructor(canvas, { onSelect, onOpen, onView } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.callbacks = { onSelect, onOpen, onView };
    this.camera = { x: 0, y: 0, scale: 1 };
    this.nodes = []; this.edges = []; this.indices = new Map(); this.positions = new Float32Array();
    this.pointers = new Map(); this.selectedId = null; this.hoverId = null; this.neighbors = new Set(); this.matches = null;
    this.labels = true; this.frame = null; this.width = 1; this.height = 1; this.touched = false; this.drag = null;
    this.events = {
      pointerdown: e => this.pointerDown(e), pointermove: e => this.pointerMove(e),
      pointerup: e => this.pointerUp(e), pointercancel: e => this.pointerCancel(e),
      pointerleave: () => { if (!this.pointers.size) { this.hoverId = null; this.invalidate(); } },
      dblclick: e => { const p = this.point(e); const hit = this.hit(p.x,p.y); if (hit) this.callbacks.onOpen?.(hit.id); },
      wheel: e => { e.preventDefault(); this.touched = true; const p = this.point(e); this.zoom(Math.exp(-Math.max(-140,Math.min(140,e.deltaY))*.0025),p.x,p.y); },
    };
    for (const [type,handler] of Object.entries(this.events)) canvas.addEventListener(type,handler,{ passive: false });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
  }
  dispose() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    for (const [type,handler] of Object.entries(this.events)) this.canvas.removeEventListener(type,handler);
  }
  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    const oldW=this.width, oldH=this.height;
    this.width=Math.max(1,r.width); this.height=Math.max(1,r.height);
    const ratio=Math.min(window.devicePixelRatio||1,2);
    this.canvas.width=Math.round(this.width*ratio);this.canvas.height=Math.round(this.height*ratio);
    this.ratio=ratio;
    if (!this.touched) this.fit();
    else { this.camera.x+=(this.width-oldW)/2;this.camera.y+=(this.height-oldH)/2;this.invalidate(); }
  }
  setGraph(graph, positions) {
    this.nodes=graph.nodes;this.edges=graph.edges;this.adjacency=graph.adjacency;
    this.indices=new Map(this.nodes.map((n,i)=>[n.id,i]));this.positions=positions;
    this.edgeIndices=this.edges.map(e=>[this.indices.get(e.source),this.indices.get(e.target)]);
    this.drawOrder=this.nodes.map((n,i)=>({n,i})).sort((a,b)=>(a.n.type==="company"?0:1)-(b.n.type==="company"?0:1));
    this.touched=false;this.setSelected(this.selectedId);this.fit();
  }
  setPositions(positions) {
    if (this.touched) return;
    this.positions=positions;this.fit();
  }
  setSelected(id) {
    this.selectedId=id;
    this.neighbors=new Set((this.adjacency?.get(id)??[]).map(n=>n.nodeId));
    this.invalidate();
  }
  setSearch(ids) { this.matches=ids;this.invalidate(); }
  fit() { this.camera=fitTransform(this.positions,this.width,this.height,75);this.invalidate(); }
  zoom(factor,x=this.width/2,y=this.height/2) { this.camera=zoomTransform(this.camera,factor,x,y);this.invalidate(); }
  centerOn(id) {
    const index=this.indices.get(id);if (index===undefined) return;
    const scale=Math.max(.9,Math.min(2.2,this.camera.scale));
    this.camera={x:this.width/2-this.positions[index*2]*scale,y:this.height/2-this.positions[index*2+1]*scale,scale};
    this.touched=true;this.invalidate();
  }
  pan(dx,dy) { this.camera.x+=dx;this.camera.y+=dy;this.touched=true;this.invalidate(); }
  point(e) { const r=this.canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}; }
  hit(x,y) {
    let best=null,bestD=Infinity;
    for (let i=0;i<this.nodes.length;i++) {
      const sx=this.positions[2*i]*this.camera.scale+this.camera.x,sy=this.positions[2*i+1]*this.camera.scale+this.camera.y;
      const radius=Math.max(10,this.radius(this.nodes[i])+5);
      const d=(sx-x)**2+(sy-y)**2;
      if (d<radius*radius && d<bestD) { best=this.nodes[i];bestD=d; }
    }
    return best;
  }
  pointerDown(e) {
    if (e.button!==0 && e.pointerType!=="touch") return;
    e.preventDefault();this.canvas.parentElement.focus({preventScroll:true});
    this.canvas.setPointerCapture(e.pointerId);
    const p=this.point(e);this.pointers.set(e.pointerId,p);this.touched=true;
    if (this.pointers.size===1) this.drag={id:this.hit(p.x,p.y)?.id,start:p,last:p,moved:false};
    else { this.drag=null;this.pinch=this.pinchState(); }
  }
  pinchState() { const [a,b]=[...this.pointers.values()];return b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))}:null; }
  pointerMove(e) {
    const p=this.point(e);
    if (!this.pointers.has(e.pointerId)) {
      const id=this.hit(p.x,p.y)?.id??null;
      if (id!==this.hoverId) {this.hoverId=id;this.canvas.style.cursor=id?"pointer":"grab";this.invalidate();}return;
    }
    this.pointers.set(e.pointerId,p);
    if (this.pointers.size>=2) {
      const next=this.pinchState();
      if (this.pinch && next) {this.zoom(next.d/this.pinch.d,this.pinch.x,this.pinch.y);this.pan(next.x-this.pinch.x,next.y-this.pinch.y);}
      this.pinch=next;return;
    }
    if (!this.drag) return;
    const dx=p.x-this.drag.last.x,dy=p.y-this.drag.last.y;
    if (Math.hypot(p.x-this.drag.start.x,p.y-this.drag.start.y)>4) this.drag.moved=true;
    if (this.drag.moved) {
      if (this.drag.id) { const i=this.indices.get(this.drag.id);this.positions[2*i]+=dx/this.camera.scale;this.positions[2*i+1]+=dy/this.camera.scale; }
      else {this.camera.x+=dx;this.camera.y+=dy;}
      this.canvas.style.cursor="grabbing";this.invalidate();
    }
    this.drag.last=p;
  }
  pointerUp(e) {
    if (this.pointers.size===1 && this.drag && !this.drag.moved) this.callbacks.onSelect?.(this.drag.id??null);
    this.pointers.delete(e.pointerId);this.drag=null;this.pinch=null;
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    this.canvas.style.cursor="grab";
  }
  pointerCancel(e) { this.pointers.delete(e.pointerId);this.drag=null;this.pinch=null; }
  radius(n) { return Math.max(n.type==="company"?4:2, Math.min(n.type==="company"?11:6,(n.type==="company"?9:4.8)*Math.sqrt(this.camera.scale))); }
  invalidate() {
    if (this.frame!==null) return;
    this.frame=requestAnimationFrame(()=>{this.frame=null;this.draw();});
  }
  draw() {
    const ctx=this.ctx;if (!ctx) return;
    const {width:w,height:h,camera:c}=this;
    ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.clearRect(0,0,w,h);
    const highlight=this.hoverId||this.selectedId;
    const neighbors=highlight===this.selectedId?this.neighbors:new Set((this.adjacency?.get(highlight)??[]).map(n=>n.nodeId));
    const sx=i=>this.positions[2*i]*c.scale+c.x, sy=i=>this.positions[2*i+1]*c.scale+c.y;
    const active=id=>(!highlight||id===highlight||neighbors.has(id)) && (!this.matches||this.matches.has(id)||id===highlight);
    // Edges in two passes reduce state changes while preserving focused links.
    for (const focused of [false,true]) {
      ctx.beginPath();
      for (let k=0;k<this.edges.length;k++) {
        const e=this.edges[k],lit=Boolean(highlight&&(e.source===highlight||e.target===highlight));if (lit!==focused) continue;
        const [a,b]=this.edgeIndices[k],x1=sx(a),y1=sy(a),x2=sx(b),y2=sy(b);
        if (Math.max(x1,x2)<0||Math.min(x1,x2)>w||Math.max(y1,y2)<0||Math.min(y1,y2)>h) continue;
        ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
      }
      ctx.lineWidth=focused?1.3:.7;ctx.strokeStyle=focused?"rgba(200,222,181,.65)":highlight||this.matches?"rgba(151,175,148,.09)":"rgba(151,175,148,.28)";ctx.stroke();
    }
    const labelCells=new Set();
    // Company-first ordering is cached; only selection priority changes while interacting.
    const highlightedIndex=this.indices.get(highlight);
    const order=highlightedIndex===undefined ? (this.drawOrder??[])
      : [{n:this.nodes[highlightedIndex],i:highlightedIndex},...this.drawOrder.filter(item=>item.i!==highlightedIndex)];
    for (const {n,i} of order) {
      const x=sx(i),y=sy(i);if (x<-120||x>w+120||y<-60||y>h+60) continue;
      const r=this.radius(n),lit=active(n.id),selected=n.id===highlight;
      ctx.globalAlpha=lit?1:.22;
      if (selected) {ctx.beginPath();ctx.arc(x,y,r+5,0,Math.PI*2);ctx.strokeStyle=COLORS[n.type];ctx.lineWidth=1;ctx.stroke();}
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=COLORS[n.type]||COLORS.reference;ctx.fill();
      if (n.type==="company") {ctx.beginPath();ctx.arc(x,y,r+3,0,Math.PI*2);ctx.strokeStyle="rgba(209,229,188,.16)";ctx.lineWidth=1;ctx.stroke();}
      const show=selected||(this.labels&&lit&&(n.type==="company"?c.scale>.09:c.scale>.55));
      if (show) {
        const label=n.label.length>43?n.label.slice(0,41)+"…":n.label;
        const font=n.type==="company"?12:10;
        ctx.font=`${n.type==="company"?500:400} ${font}px "Segoe UI",Arial,sans-serif`;
        const tw=ctx.measureText(label).width,ly=y+r+17;
        const cellKeys=[];
        for (let xx=Math.floor((x-tw/2)/70);xx<=Math.floor((x+tw/2)/70);xx++) cellKeys.push(`${xx}:${Math.floor(ly/19)}`);
        if (selected || cellKeys.every(k=>!labelCells.has(k))) {
          cellKeys.forEach(k=>labelCells.add(k));ctx.fillStyle="rgba(25,35,29,.86)";ctx.fillRect(x-tw/2-3,ly-font,tw+6,font+5);
          ctx.fillStyle=n.type==="company"?"#e6efdc":"#aebfad";ctx.textAlign="center";ctx.fillText(label,x,ly);
        }
      }
    }
    ctx.globalAlpha=1;this.callbacks.onView?.({scale:c.scale});
  }
}
