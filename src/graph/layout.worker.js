import { layoutGraph } from "./layout.js";
self.onmessage = ({ data }) => {
  try {
    const positions = layoutGraph(data.graph, { spacing: data.spacing });
    self.postMessage({ positions }, [positions.buffer]);
  } catch {
    self.postMessage({ error: true });
  }
};
