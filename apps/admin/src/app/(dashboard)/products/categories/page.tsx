"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TreeEditor, type TreeNode } from "@/components/editors/tree-editor";
import { CategoryForm } from "@/components/forms/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc/client";

export default function CategoriesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<TreeNode | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // categories.list returns flat array (no pagination wrapper)
  const categoriesQuery = trpc.categories.list.useQuery();

  const updateMutation = trpc.categories.update.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      toast.success("Category updated");
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const reorderMutation = trpc.categories.reorder.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      toast.success("Category order updated");
    },
    onError: (err) => {
      toast.error(`Failed to reorder: ${err.message}`);
    },
  });

  const deleteMutation = trpc.categories.delete.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      toast.success("Category deleted");
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
      setDeleteId(null);
    },
  });

  const rawCategories = categoriesQuery.data ?? [];
  const categories: TreeNode[] = rawCategories.map(
    (cat: Record<string, unknown>) => ({
      id: cat.id as number,
      code: cat.code as string,
      name: cat.name as string,
      parentId: cat.parentId as number | null,
      depth: cat.depth as number,
      displayOrder: cat.displayOrder as number,
      iconUrl: cat.iconUrl as string | null,
      isActive: cat.isActive as boolean,
    })
  );

  // Compute child counts
  const enriched = categories.map((cat) => ({
    ...cat,
    _childCount: categories.filter((c) => c.parentId === cat.id).length,
  }));

  const handleMove = (
    nodeId: number,
    newParentId: number | null,
    newOrder: number
  ) => {
    const siblings = categories
      .filter((c) => c.parentId === newParentId && c.id !== nodeId)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const movedNode = categories.find((c) => c.id === nodeId);
    if (!movedNode) return;

    siblings.splice(newOrder, 0, movedNode);

    const newDepth =
      newParentId !== null
        ? (categories.find((c) => c.id === newParentId)?.depth ?? 0) + 1
        : 0;

    // categories.reorder takes an array of { id, parentId, depth, displayOrder }
    const items = siblings.map((s, idx) => ({
      id: s.id,
      parentId: newParentId,
      depth: s.id === nodeId ? newDepth : s.depth,
      displayOrder: idx,
    }));

    reorderMutation.mutate(items);
  };

  const handleAdd = (parentId: number | null) => {
    setFormParentId(parentId);
    setEditingCategory(null);
    setFormOpen(true);
  };

  const handleEdit = (node: TreeNode) => {
    updateMutation.mutate({
      id: node.id,
      data: { name: node.name },
    });
  };

  const handleDelete = (nodeId: number) => {
    const hasChildren = categories.some((c) => c.parentId === nodeId);
    if (hasChildren) {
      toast.error(
        "Cannot delete: move or remove child categories first"
      );
      return;
    }
    setDeleteId(nodeId);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    utils.categories.list.invalidate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">
          Manage product category hierarchy (max 3 levels)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Tree</CardTitle>
        </CardHeader>
        <CardContent>
          {categoriesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <TreeEditor
              data={enriched}
              onMove={handleMove}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        parentId={formParentId}
        category={editingCategory}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category. This action cannot be undone. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
