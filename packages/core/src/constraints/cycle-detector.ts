// Circular dependency detection (REQ-CROSS-005)

import type { OptionDependency } from '../options/types.js';

/**
 * Detect cycles in the option dependency graph using Kahn's algorithm (topological sort).
 * Returns null if no cycles found, or an array of cyclic node IDs.
 */
export function detectCycles(dependencies: OptionDependency[]): string[] | null {
  const graph = new Map<number, number[]>();
  const allNodes = new Set<number>();

  // Build adjacency list
  for (const dep of dependencies) {
    allNodes.add(dep.parentOptionId);
    allNodes.add(dep.childOptionId);
    const children = graph.get(dep.parentOptionId) ?? [];
    children.push(dep.childOptionId);
    graph.set(dep.parentOptionId, children);
  }

  // Calculate in-degrees
  const inDegree = new Map<number, number>();
  for (const node of allNodes) {
    if (!inDegree.has(node)) inDegree.set(node, 0);
  }
  for (const [, children] of graph) {
    for (const child of children) {
      inDegree.set(child, (inDegree.get(child) ?? 0) + 1);
    }
  }

  // Start with zero in-degree nodes
  const queue: number[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  let visited = 0;

  while (queue.length > 0) {
    const node = queue.shift()!;
    visited++;
    for (const child of graph.get(node) ?? []) {
      const newDeg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newDeg);
      if (newDeg === 0) queue.push(child);
    }
  }

  if (visited < allNodes.size) {
    // Nodes still with in-degree > 0 are part of cycles
    const cyclicNodes = [...inDegree.entries()]
      .filter(([, deg]) => deg > 0)
      .map(([id]) => String(id));
    return cyclicNodes;
  }

  return null;
}
