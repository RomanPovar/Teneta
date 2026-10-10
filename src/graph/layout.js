/** Deterministic component layout. Local spatial repulsion + edge springs, then
 * shelf packing with guaranteed separation of disconnected components.
 * No all-pairs O(V²) loop; all nodes remain in the result.
 */
function hash(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}
export function layoutGraph(graph, { iterations = 65, spacing = 1 } = {}) {
  const { nodes, edges, components } = graph;
  const positions = new Float32Array(nodes.length * 2);
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const adjacency = new Map(nodes.map(n => [n.id, []]));
  const edgeByComponent = new Map();
  const componentByNode = new Map();
  components.forEach((ids, c) => ids.forEach(id => componentByNode.set(id, c)));
  for (const e of edges) {
    adjacency.get(e.source)?.push(e.target);
    adjacency.get(e.target)?.push(e.source);
    const c = componentByNode.get(e.source);
    if (!edgeByComponent.has(c)) edgeByComponent.set(c, []);
    edgeByComponent.get(c).push([index.get(e.source), index.get(e.target)]);
  }
  const boxes = [];
  const vx = new Float64Array(nodes.length), vy = new Float64Array(nodes.length);
  components.forEach((ids, component) => {
    const root = ids.find(id => nodes[index.get(id)].type === "company") || ids[0];
    const depths = new Map([[root, 0]]), queue = [root], layers = [[root]];
    for (let q = 0; q < queue.length; q++) for (const id of adjacency.get(queue[q]) ?? []) {
      if (depths.has(id)) continue;
      const d = depths.get(queue[q]) + 1;
      depths.set(id, d); (layers[d] ??= []).push(id); queue.push(id);
    }
    for (const [d, layer] of layers.entries()) layer.forEach((id, j) => {
      const i = index.get(id), angle = j * Math.PI * 2 / layer.length + d * .6 + hash(root) * Math.PI;
      const radius = d ? Math.max(d * 125, Math.sqrt(layer.length) * 40) * spacing * (.82 + hash(id) * .35) : 0;
      positions[i * 2] = Math.cos(angle) * radius; positions[i * 2 + 1] = Math.sin(angle) * radius;
    });
    const count = ids.length;
    const indices = ids.map(id => index.get(id));
    const rounds = Math.min(iterations, count > 5000 ? 28 : count > 1000 ? 45 : 85);
    const cellSize = 75 * spacing;
    for (let step = 0; step < rounds; step++) {
      const cells = new Map();
      for (const i of indices) {
        const k = `${Math.floor(positions[2*i]/cellSize)},${Math.floor(positions[2*i+1]/cellSize)}`;
        if (!cells.has(k)) cells.set(k, []);
        cells.get(k).push(i);
      }
      for (const i of indices) {
        const x = positions[2*i], y = positions[2*i+1];
        const cx = Math.floor(x/cellSize), cy = Math.floor(y/cellSize);
        let sampled = 0;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
          for (const j of cells.get(`${cx+a},${cy+b}`) ?? []) {
            if (sampled >= 40) break;
            if (i === j) continue;
            sampled++;
            let dx = x - positions[2*j], dy = y - positions[2*j+1];
            if (dx === 0 && dy === 0) { dx = (i % 5 + 1) * .3; dy = .6; }
            const dist = Math.max(25, dx*dx + dy*dy);
            const force = 95 * spacing * spacing / dist;
            vx[i] += dx * force; vy[i] += dy * force;
          }
        }
      }
      for (const [a, b] of edgeByComponent.get(component) ?? []) {
        const dx = positions[2*b]-positions[2*a], dy = positions[2*b+1]-positions[2*a+1];
        const distance = Math.max(1, Math.hypot(dx, dy));
        const f = (distance - 125 * spacing) * .018 / distance;
        vx[a] += dx*f; vy[a] += dy*f; vx[b] -= dx*f; vy[b] -= dy*f;
      }
      for (const i of indices) {
        vx[i] = (vx[i] - positions[2*i] * .0009) * .65;
        vy[i] = (vy[i] - positions[2*i+1] * .0009) * .65;
        positions[2*i] += Math.max(-12, Math.min(12, vx[i]));
        positions[2*i+1] += Math.max(-12, Math.min(12, vy[i]));
      }
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const i of indices) { minX = Math.min(minX,positions[2*i]); maxX = Math.max(maxX,positions[2*i]); minY = Math.min(minY,positions[2*i+1]); maxY = Math.max(maxY,positions[2*i+1]); }
    boxes.push({ indices, minX, minY, width: Math.max(160,maxX-minX+160), height: Math.max(160,maxY-minY+160) });
  });
  const area = boxes.reduce((n,b) => n+(b.width+50)*(b.height+50),0);
  const width = boxes.reduce((n,b) => Math.max(n,b.width), Math.max(1,Math.sqrt(area)*1.3));
  let x = 0, y = 0, rowHeight = 0;
  boxes.sort((a,b) => b.height-a.height);
  for (const box of boxes) {
    if (x > 0 && x+box.width > width) { x=0; y+=rowHeight+65; rowHeight=0; }
    for (const i of box.indices) { positions[2*i]+= x-box.minX+80; positions[2*i+1]+=y-box.minY+80; }
    x+=box.width+65; rowHeight=Math.max(rowHeight,box.height);
  }
  return positions;
}
export function fitTransform(positions, width, height, padding = 80) {
  if (!positions.length) return { x: width/2, y: height/2, scale: 1 };
  let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
  for (let i=0;i<positions.length;i+=2) { x1=Math.min(x1,positions[i]);x2=Math.max(x2,positions[i]);y1=Math.min(y1,positions[i+1]);y2=Math.max(y2,positions[i+1]); }
  const scale=Math.max(.002,Math.min(1.8, Math.max(40,width-padding*2)/Math.max(120,x2-x1),Math.max(40,height-padding*2)/Math.max(120,y2-y1)));
  return { x: width/2-(x1+x2)/2*scale, y: height/2-(y1+y2)/2*scale, scale };
}
export function zoomTransform(camera, factor, x, y) {
  const scale=Math.max(.002,Math.min(8,camera.scale*factor)), ratio=scale/camera.scale;
  return { x: x-(x-camera.x)*ratio, y:y-(y-camera.y)*ratio, scale };
}
