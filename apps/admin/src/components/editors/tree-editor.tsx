"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  FolderOpen,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TreeNode {
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

export interface TreeEditorProps {
  data: TreeNode[];
  onMove: (nodeId: number, newParentId: number | null, newOrder: number) => void;
  onAdd: (parentId: number | null) => void;
  onEdit: (node: TreeNode) => void;
  onDelete: (nodeId: number) => void;
}

interface TreeItem extends TreeNode {
  children: TreeItem[];
}

const MAX_DEPTH = 2;

function buildTree(flatItems: TreeNode[]): TreeItem[] {
  const itemMap = new Map<number, TreeItem>();
  const roots: TreeItem[] = [];

  // Create tree items with empty children
  for (const item of flatItems) {
    itemMap.set(item.id, { ...item, children: [] });
  }

  // Build hierarchy
  for (const item of flatItems) {
    const treeItem = itemMap.get(item.id)!;
    if (item.parentId === null || !itemMap.has(item.parentId)) {
      roots.push(treeItem);
    } else {
      itemMap.get(item.parentId)!.children.push(treeItem);
    }
  }

  // Sort children by displayOrder
  function sortChildren(items: TreeItem[]) {
    items.sort((a, b) => a.displayOrder - b.displayOrder);
    for (const item of items) {
      sortChildren(item.children);
    }
  }
  sortChildren(roots);

  return roots;
}

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

interface SortableTreeNodeProps {
  node: TreeNode;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleExpand: (id: number) => void;
  onEdit: (node: TreeNode) => void;
  onDelete: (id: number) => void;
  onAdd: (parentId: number | null) => void;
  editingId: number | null;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onStartEditing: (node: TreeNode) => void;
}

function SortableTreeNode({
  node,
  hasChildren,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAdd,
  editingId,
  editingName,
  onEditingNameChange,
  onEditSave,
  onEditCancel,
  onStartEditing,
}: SortableTreeNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isEditing = editingId === node.id;
  const indent = node.depth * 24;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 mb-1",
        isDragging && "opacity-50 shadow-lg",
        !node.isActive && "opacity-50"
      )}
    >
      <div style={{ width: indent }} className="shrink-0" />

      <button
        className="shrink-0 p-0.5 hover:bg-muted rounded cursor-grab"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {hasChildren ? (
        <button
          className="shrink-0 p-0.5 hover:bg-muted rounded"
          onClick={() => onToggleExpand(node.id)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : (
        <div className="w-5 shrink-0" />
      )}

      <div className="shrink-0 text-muted-foreground">
        {hasChildren ? (
          <FolderOpen className="h-4 w-4" />
        ) : (
          <Package className="h-4 w-4" />
        )}
      </div>

      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Input
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onEditSave();
              if (e.key === "Escape") onEditCancel();
            }}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEditSave}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEditCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <span
          className="flex-1 min-w-0 truncate text-sm cursor-pointer"
          onDoubleClick={() => onStartEditing(node)}
        >
          {node.name}
        </span>
      )}

      <div className="flex items-center gap-1 shrink-0">
        {node._childCount != null && node._childCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {node._childCount} sub
          </Badge>
        )}
        {node._productCount != null && node._productCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {node._productCount} items
          </Badge>
        )}

        {!isEditing && (
          <>
            {node.depth < MAX_DEPTH && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onAdd(node.id)}
                title="Add child category"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onStartEditing(node)}
              title="Edit name"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(node.id)}
              title="Delete category"
              disabled={hasChildren}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function TreeEditor({ data, onMove, onAdd, onEdit, onDelete }: TreeEditorProps) {
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    // Expand root nodes by default
    return new Set(data.filter((d) => d.depth === 0).map((d) => d.id));
  });
  const [activeId, setActiveId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const tree = useMemo(() => buildTree(data), [data]);
  const flatList = useMemo(() => flattenTree(tree, expanded), [tree, expanded]);

  // Build lookup map for quick parent checks
  const nodeMap = useMemo(() => {
    const map = new Map<number, TreeNode>();
    for (const node of data) {
      map.set(node.id, node);
    }
    return map;
  }, [data]);

  const childrenMap = useMemo(() => {
    const map = new Map<number, TreeNode[]>();
    for (const node of data) {
      if (node.parentId !== null) {
        const siblings = map.get(node.parentId) ?? [];
        siblings.push(node);
        map.set(node.parentId, siblings);
      }
    }
    return map;
  }, [data]);

  const hasChildren = useCallback(
    (nodeId: number) => (childrenMap.get(nodeId)?.length ?? 0) > 0,
    [childrenMap]
  );

  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeNode = nodeMap.get(active.id as number);
      const overNode = nodeMap.get(over.id as number);
      if (!activeNode || !overNode) return;

      // Determine new parent and order
      // When dropping on a node, place as sibling after that node
      const newParentId = overNode.parentId;
      const siblings = data
        .filter((d) => d.parentId === newParentId)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      const overIndex = siblings.findIndex((s) => s.id === overNode.id);
      const newOrder = overIndex + 1;

      // Enforce max depth
      const newDepth = newParentId !== null ? (nodeMap.get(newParentId)?.depth ?? 0) + 1 : 0;
      if (newDepth > MAX_DEPTH) return;

      onMove(activeNode.id, newParentId, newOrder);
    },
    [data, nodeMap, onMove]
  );

  const handleStartEditing = useCallback((node: TreeNode) => {
    setEditingId(node.id);
    setEditingName(node.name);
  }, []);

  const handleEditSave = useCallback(() => {
    if (editingId === null || !editingName.trim()) return;
    const node = nodeMap.get(editingId);
    if (!node) return;
    onEdit({ ...node, name: editingName.trim() });
    setEditingId(null);
    setEditingName("");
  }, [editingId, editingName, nodeMap, onEdit]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditingName("");
  }, []);

  const activeNode = activeId ? nodeMap.get(activeId) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {data.length} categories
        </div>
        <Button variant="outline" size="sm" onClick={() => onAdd(null)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Root Category
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={flatList.map((n) => n.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0">
            {flatList.map((node) => (
              <SortableTreeNode
                key={node.id}
                node={node}
                hasChildren={hasChildren(node.id)}
                isExpanded={expanded.has(node.id)}
                onToggleExpand={toggleExpand}
                onEdit={onEdit}
                onDelete={onDelete}
                onAdd={onAdd}
                editingId={editingId}
                editingName={editingName}
                onEditingNameChange={setEditingName}
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
                onStartEditing={handleStartEditing}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeNode ? (
            <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 shadow-lg opacity-90">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{activeNode.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {data.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No categories yet</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => onAdd(null)}
          >
            Create First Category
          </Button>
        </div>
      )}
    </div>
  );
}
