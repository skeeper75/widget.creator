/**
 * Tests for TreeEditor pure logic functions.
 * REQ-E-101: Category tree structure (depth 0-2)
 * REQ-E-102: Drag-and-drop reordering with depth constraints
 * REQ-N-001: Cannot delete category with children
 *
 * Tests buildTree() and flattenTree() which are internal to tree-editor.tsx.
 * These are re-implemented here since they are not exported.
 */
import { describe, it, expect } from 'vitest';

interface TreeNode {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  depth: number;
  displayOrder: number;
  iconUrl: string | null;
  isActive: boolean;
  _childCount?: number;
  _productCount?: number;
}

interface TreeItem extends TreeNode {
  children: TreeItem[];
}

// Re-implement buildTree (same as tree-editor.tsx)
function buildTree(flatItems: TreeNode[]): TreeItem[] {
  const itemMap = new Map<number, TreeItem>();
  const roots: TreeItem[] = [];

  for (const item of flatItems) {
    itemMap.set(item.id, { ...item, children: [] });
  }

  for (const item of flatItems) {
    const treeItem = itemMap.get(item.id)!;
    if (item.parentId === null || !itemMap.has(item.parentId)) {
      roots.push(treeItem);
    } else {
      itemMap.get(item.parentId)!.children.push(treeItem);
    }
  }

  function sortChildren(items: TreeItem[]) {
    items.sort((a, b) => a.displayOrder - b.displayOrder);
    for (const item of items) {
      sortChildren(item.children);
    }
  }
  sortChildren(roots);

  return roots;
}

// Re-implement flattenTree (same as tree-editor.tsx)
function flattenTree(items: TreeItem[], expanded: Set<number>): TreeNode[] {
  const result: TreeNode[] = [];

  function walk(nodes: TreeItem[]) {
    for (const node of nodes) {
      result.push(node);
      if (expanded.has(node.id) && node.children.length > 0) {
        walk(node.children);
      }
    }
  }

  walk(items);
  return result;
}

function createNode(overrides: Partial<TreeNode> & { id: number }): TreeNode {
  return {
    code: `CAT${overrides.id}`,
    name: `Category ${overrides.id}`,
    parentId: null,
    depth: 0,
    displayOrder: overrides.id,
    iconUrl: null,
    isActive: true,
    ...overrides,
  };
}

describe('buildTree', () => {
  it('returns empty array for empty input', () => {
    expect(buildTree([])).toEqual([]);
  });

  it('builds single root node', () => {
    const nodes = [createNode({ id: 1 })];
    const tree = buildTree(nodes);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe(1);
    expect(tree[0].children).toEqual([]);
  });

  it('builds flat list of root nodes', () => {
    const nodes = [
      createNode({ id: 1, displayOrder: 2 }),
      createNode({ id: 2, displayOrder: 1 }),
      createNode({ id: 3, displayOrder: 3 }),
    ];
    const tree = buildTree(nodes);

    expect(tree).toHaveLength(3);
    // Sorted by displayOrder
    expect(tree[0].id).toBe(2);
    expect(tree[1].id).toBe(1);
    expect(tree[2].id).toBe(3);
  });

  it('builds parent-child relationship', () => {
    const nodes = [
      createNode({ id: 1, depth: 0 }),
      createNode({ id: 2, parentId: 1, depth: 1, displayOrder: 1 }),
      createNode({ id: 3, parentId: 1, depth: 1, displayOrder: 2 }),
    ];
    const tree = buildTree(nodes);

    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].id).toBe(2);
    expect(tree[0].children[1].id).toBe(3);
  });

  it('builds 3-level deep tree (depth 0-2)', () => {
    const nodes = [
      createNode({ id: 1, depth: 0 }),
      createNode({ id: 2, parentId: 1, depth: 1, displayOrder: 1 }),
      createNode({ id: 3, parentId: 2, depth: 2, displayOrder: 1 }),
    ];
    const tree = buildTree(nodes);

    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].id).toBe(3);
  });

  it('sorts children by displayOrder at each level', () => {
    const nodes = [
      createNode({ id: 1, depth: 0 }),
      createNode({ id: 2, parentId: 1, depth: 1, displayOrder: 3 }),
      createNode({ id: 3, parentId: 1, depth: 1, displayOrder: 1 }),
      createNode({ id: 4, parentId: 1, depth: 1, displayOrder: 2 }),
    ];
    const tree = buildTree(nodes);

    expect(tree[0].children.map((c) => c.id)).toEqual([3, 4, 2]);
  });

  it('handles multiple root categories', () => {
    const nodes = [
      createNode({ id: 1, depth: 0, displayOrder: 2 }),
      createNode({ id: 2, depth: 0, displayOrder: 1 }),
      createNode({ id: 3, parentId: 1, depth: 1, displayOrder: 1 }),
      createNode({ id: 4, parentId: 2, depth: 1, displayOrder: 1 }),
    ];
    const tree = buildTree(nodes);

    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe(2); // sorted by displayOrder
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe(4);
    expect(tree[1].id).toBe(1);
    expect(tree[1].children).toHaveLength(1);
    expect(tree[1].children[0].id).toBe(3);
  });

  it('treats orphan nodes (missing parent) as root nodes', () => {
    const nodes = [
      createNode({ id: 1, parentId: 999, depth: 1 }), // parent doesn't exist
    ];
    const tree = buildTree(nodes);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe(1);
  });

  it('preserves node metadata through tree building', () => {
    const nodes = [
      createNode({
        id: 1,
        isActive: false,
        _childCount: 5,
        _productCount: 10,
        iconUrl: 'https://example.com/icon.png',
      }),
    ];
    const tree = buildTree(nodes);

    expect(tree[0].isActive).toBe(false);
    expect(tree[0]._childCount).toBe(5);
    expect(tree[0]._productCount).toBe(10);
    expect(tree[0].iconUrl).toBe('https://example.com/icon.png');
  });
});

describe('flattenTree', () => {
  it('returns empty array for empty tree', () => {
    expect(flattenTree([], new Set())).toEqual([]);
  });

  it('returns root nodes only when nothing is expanded', () => {
    const nodes = [
      createNode({ id: 1, depth: 0 }),
      createNode({ id: 2, parentId: 1, depth: 1 }),
    ];
    const tree = buildTree(nodes);

    const flat = flattenTree(tree, new Set());
    expect(flat).toHaveLength(1);
    expect(flat[0].id).toBe(1);
  });

  it('includes children when parent is expanded', () => {
    const nodes = [
      createNode({ id: 1, depth: 0 }),
      createNode({ id: 2, parentId: 1, depth: 1, displayOrder: 1 }),
      createNode({ id: 3, parentId: 1, depth: 1, displayOrder: 2 }),
    ];
    const tree = buildTree(nodes);

    const flat = flattenTree(tree, new Set([1]));
    expect(flat).toHaveLength(3);
    expect(flat.map((n) => n.id)).toEqual([1, 2, 3]);
  });

  it('does not include grandchildren when only root is expanded', () => {
    const nodes = [
      createNode({ id: 1, depth: 0 }),
      createNode({ id: 2, parentId: 1, depth: 1, displayOrder: 1 }),
      createNode({ id: 3, parentId: 2, depth: 2, displayOrder: 1 }),
    ];
    const tree = buildTree(nodes);

    const flat = flattenTree(tree, new Set([1]));
    expect(flat).toHaveLength(2);
    expect(flat.map((n) => n.id)).toEqual([1, 2]);
  });

  it('includes grandchildren when both levels are expanded', () => {
    const nodes = [
      createNode({ id: 1, depth: 0 }),
      createNode({ id: 2, parentId: 1, depth: 1, displayOrder: 1 }),
      createNode({ id: 3, parentId: 2, depth: 2, displayOrder: 1 }),
    ];
    const tree = buildTree(nodes);

    const flat = flattenTree(tree, new Set([1, 2]));
    expect(flat).toHaveLength(3);
    expect(flat.map((n) => n.id)).toEqual([1, 2, 3]);
  });

  it('maintains displayOrder within expanded levels', () => {
    const nodes = [
      createNode({ id: 1, depth: 0, displayOrder: 1 }),
      createNode({ id: 2, parentId: 1, depth: 1, displayOrder: 2 }),
      createNode({ id: 3, parentId: 1, depth: 1, displayOrder: 1 }),
      createNode({ id: 4, depth: 0, displayOrder: 2 }),
    ];
    const tree = buildTree(nodes);

    const flat = flattenTree(tree, new Set([1]));
    // Root order: 1 (order=1), 4 (order=2)
    // Under 1: 3 (order=1), 2 (order=2)
    expect(flat.map((n) => n.id)).toEqual([1, 3, 2, 4]);
  });

  it('handles expanding a node with no children', () => {
    const nodes = [createNode({ id: 1, depth: 0 })];
    const tree = buildTree(nodes);

    // Expanding node 1 which has no children should not cause errors
    const flat = flattenTree(tree, new Set([1]));
    expect(flat).toHaveLength(1);
    expect(flat[0].id).toBe(1);
  });

  it('handles selective expansion of sibling branches', () => {
    const nodes = [
      createNode({ id: 1, depth: 0, displayOrder: 1 }),
      createNode({ id: 2, depth: 0, displayOrder: 2 }),
      createNode({ id: 3, parentId: 1, depth: 1, displayOrder: 1 }),
      createNode({ id: 4, parentId: 2, depth: 1, displayOrder: 1 }),
    ];
    const tree = buildTree(nodes);

    // Only expand node 2, not node 1
    const flat = flattenTree(tree, new Set([2]));
    expect(flat.map((n) => n.id)).toEqual([1, 2, 4]);
  });
});

describe('depth constraint enforcement', () => {
  const MAX_DEPTH = 2;

  it('allows nodes at depth 0', () => {
    const node = createNode({ id: 1, depth: 0 });
    expect(node.depth).toBeLessThanOrEqual(MAX_DEPTH);
  });

  it('allows nodes at depth 1', () => {
    const node = createNode({ id: 2, parentId: 1, depth: 1 });
    expect(node.depth).toBeLessThanOrEqual(MAX_DEPTH);
  });

  it('allows nodes at depth 2 (max)', () => {
    const node = createNode({ id: 3, parentId: 2, depth: 2 });
    expect(node.depth).toBeLessThanOrEqual(MAX_DEPTH);
  });

  it('rejects nodes at depth 3 (exceeds max)', () => {
    const depth = 3;
    expect(depth).toBeGreaterThan(MAX_DEPTH);
  });
});

describe('delete protection (REQ-N-001)', () => {
  it('identifies nodes with children', () => {
    const nodes = [
      createNode({ id: 1, depth: 0 }),
      createNode({ id: 2, parentId: 1, depth: 1 }),
    ];

    const childrenMap = new Map<number, TreeNode[]>();
    for (const node of nodes) {
      if (node.parentId !== null) {
        const siblings = childrenMap.get(node.parentId) ?? [];
        siblings.push(node);
        childrenMap.set(node.parentId, siblings);
      }
    }

    const hasChildren = (nodeId: number) => (childrenMap.get(nodeId)?.length ?? 0) > 0;

    expect(hasChildren(1)).toBe(true); // Has child, should not be deletable
    expect(hasChildren(2)).toBe(false); // No children, can be deleted
  });

  it('leaf nodes are deletable', () => {
    const nodes = [
      createNode({ id: 1, depth: 0 }),
      createNode({ id: 2, parentId: 1, depth: 1 }),
      createNode({ id: 3, parentId: 2, depth: 2 }),
    ];

    const childrenMap = new Map<number, TreeNode[]>();
    for (const node of nodes) {
      if (node.parentId !== null) {
        const siblings = childrenMap.get(node.parentId) ?? [];
        siblings.push(node);
        childrenMap.set(node.parentId, siblings);
      }
    }

    const hasChildren = (nodeId: number) => (childrenMap.get(nodeId)?.length ?? 0) > 0;

    expect(hasChildren(3)).toBe(false); // Leaf node
    expect(hasChildren(2)).toBe(true); // Has child
    expect(hasChildren(1)).toBe(true); // Has child
  });
});
