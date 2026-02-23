/**
 * REQ-N-004: Circular dependency detection for option constraints.
 * Uses DFS-based cycle detection on the directed graph of
 * sourceOptionId -> targetOptionId edges.
 */

interface ConstraintEdge {
  sourceOptionId: number | null | undefined;
  targetOptionId: number | null | undefined;
}

/**
 * Detects if adding a new constraint would create a circular dependency.
 * @param existing - Current constraint edges
 * @param newEdge  - The proposed new constraint edge
 * @returns true if a cycle would be created
 */
export function detectCircularDependency(
  existing: ConstraintEdge[],
  newEdge: ConstraintEdge,
): boolean {
  if (newEdge.sourceOptionId == null || newEdge.targetOptionId == null) {
    return false;
  }

  // Self-referencing check
  if (newEdge.sourceOptionId === newEdge.targetOptionId) {
    return true;
  }

  // Build adjacency list from existing + proposed edge
  const graph = new Map<number, Set<number>>();

  for (const edge of existing) {
    if (edge.sourceOptionId == null || edge.targetOptionId == null) continue;
    if (!graph.has(edge.sourceOptionId)) {
      graph.set(edge.sourceOptionId, new Set());
    }
    graph.get(edge.sourceOptionId)!.add(edge.targetOptionId);
  }

  // Add the proposed edge
  if (!graph.has(newEdge.sourceOptionId)) {
    graph.set(newEdge.sourceOptionId, new Set());
  }
  graph.get(newEdge.sourceOptionId)!.add(newEdge.targetOptionId);

  // DFS cycle detection
  const visited = new Set<number>();
  const inStack = new Set<number>();

  function hasCycle(node: number): boolean {
    if (inStack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    inStack.add(node);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) return true;
      }
    }

    inStack.delete(node);
    return false;
  }

  // Check all nodes for cycles
  for (const node of graph.keys()) {
    visited.clear();
    inStack.clear();
    if (hasCycle(node)) return true;
  }

  return false;
}
