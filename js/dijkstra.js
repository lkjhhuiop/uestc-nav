/* 无向带权图的 Dijkstra 算法；不可达或节点不存在时返回空路径。 */
function dijkstra(nodes, edges, startId, endId) {
  const adjacency = new Map(nodes.map(node => [node.id, []]));
  const distances = new Map(nodes.map(node => [node.id, Infinity]));
  const previous = new Map();
  const visited = new Set();
  if (!adjacency.has(startId) || !adjacency.has(endId)) return { path: [], distance: Infinity };
  for (const edge of edges) {
    if (!adjacency.has(edge.from) || !adjacency.has(edge.to) || !Number.isFinite(edge.weight) || edge.weight < 0) throw new Error('拓扑边包含无效节点或距离');
    adjacency.get(edge.from).push({ id: edge.to, weight: edge.weight });
    adjacency.get(edge.to).push({ id: edge.from, weight: edge.weight });
  }
  distances.set(startId, 0);
  while (visited.size < nodes.length) {
    let nearest = null;
    let minimum = Infinity;
    for (const [id, distance] of distances) {
      if (!visited.has(id) && distance < minimum) { nearest = id; minimum = distance; }
    }
    if (nearest === null || nearest === endId) break;
    visited.add(nearest);
    for (const neighbor of adjacency.get(nearest)) {
      const candidate = minimum + neighbor.weight;
      if (candidate < distances.get(neighbor.id)) {
        distances.set(neighbor.id, candidate);
        previous.set(neighbor.id, nearest);
      }
    }
  }
  if (!Number.isFinite(distances.get(endId))) return { path: [], distance: Infinity };
  const path = [];
  for (let id = endId; id !== undefined; id = previous.get(id)) path.unshift(id);
  return { path, distance: distances.get(endId) };
}
