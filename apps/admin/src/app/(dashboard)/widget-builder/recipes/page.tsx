"use client";

import { useState } from "react";
import { Plus, Archive } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { ElementBindingTable } from "@/components/widget-builder/element-binding-table";
import { ChoiceRestrictionMatrix } from "@/components/widget-builder/choice-restriction-matrix";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const RecipeFormSchema = z.object({
  recipeName: z.string().min(1, "Recipe name is required").max(100),
  isDefault: z.boolean().default(false),
  description: z.string().nullable().optional(),
});

const AddBindingFormSchema = z.object({
  typeId: z.number().int().positive({ message: "Please select an element type" }),
  displayOrder: z.number().int().min(0).default(0),
  processingOrder: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true),
});

type RecipeFormValues = z.infer<typeof RecipeFormSchema>;
type AddBindingFormValues = z.infer<typeof AddBindingFormSchema>;

// ─── Page Component ───────────────────────────────────────────────────────────

export default function RecipesPage() {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [expandedBindingId, setExpandedBindingId] = useState<number | null>(null);

  // Modal states
  const [createRecipeOpen, setCreateRecipeOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [addBindingOpen, setAddBindingOpen] = useState(false);

  // Product list from dashboard (wbProducts)
  const { data: dashboardData } = trpc.widgetAdmin.dashboard.useQuery();
  const products = dashboardData?.map((p: { id: number; productKey: string; productNameKo: string }) => p) ?? [];

  // Recipe list for selected product
  const {
    data: recipes,
    refetch: refetchRecipes,
  } = trpc.recipes.listByProduct.useQuery(
    { productId: selectedProductId! },
    { enabled: selectedProductId !== null },
  );

  // Selected recipe with bindings
  const {
    data: recipeWithBindings,
    refetch: refetchBindings,
  } = trpc.recipes.getWithBindings.useQuery(
    { recipeId: selectedRecipeId! },
    { enabled: selectedRecipeId !== null },
  );

  // Element types for add-binding modal
  const { data: elementTypes } = trpc.elementTypes.list.useQuery({ isActive: true });

  // Choices grouped by typeId for ElementBindingTable
  const { data: allChoices } = trpc.elementChoices.list.useQuery({ isActive: true });
  const choicesByTypeId = (allChoices ?? []).reduce<Record<number, { id: number; displayName: string }[]>>(
    (acc, choice) => {
      const key = (choice as { typeId: number }).typeId;
      if (!acc[key]) acc[key] = [];
      acc[key].push({ id: choice.id, displayName: choice.displayName });
      return acc;
    },
    {},
  );

  // ─── Forms ─────────────────────────────────────────────────────────────────

  const createForm = useForm<RecipeFormValues>({
    resolver: zodResolver(RecipeFormSchema),
    defaultValues: { recipeName: "", isDefault: false, description: null },
  });

  const addBindingForm = useForm<AddBindingFormValues>({
    resolver: zodResolver(AddBindingFormSchema),
    defaultValues: { typeId: 0, displayOrder: 0, processingOrder: 0, isRequired: true },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const createRecipe = trpc.recipes.create.useMutation({
    onSuccess: (recipe) => {
      toast.success("Recipe created");
      setCreateRecipeOpen(false);
      createForm.reset();
      void refetchRecipes();
      setSelectedRecipeId(recipe.id);
    },
    onError: (err) => toast.error(`Failed to create recipe: ${err.message}`),
  });

  const archiveAndCreate = trpc.recipes.archiveAndCreate.useMutation({
    onSuccess: (newRecipe) => {
      toast.success("Recipe archived and new version created");
      setArchiveConfirmOpen(false);
      createForm.reset();
      void refetchRecipes();
      setSelectedRecipeId(newRecipe.id);
    },
    onError: (err) => toast.error(`Failed to archive recipe: ${err.message}`),
  });

  const addBinding = trpc.recipes.addBinding.useMutation({
    onSuccess: () => {
      toast.success("Binding added");
      setAddBindingOpen(false);
      addBindingForm.reset();
      void refetchBindings();
    },
    onError: (err) => toast.error(`Failed to add binding: ${err.message}`),
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleCreateRecipe(values: RecipeFormValues) {
    if (!selectedProductId) return;
    createRecipe.mutate({ productId: selectedProductId, ...values });
  }

  function handleArchiveAndCreate(values: RecipeFormValues) {
    if (!selectedRecipeId) return;
    archiveAndCreate.mutate({ recipeId: selectedRecipeId, ...values });
  }

  function handleAddBinding(values: AddBindingFormValues) {
    if (!selectedRecipeId) return;
    addBinding.mutate({ recipeId: selectedRecipeId, ...values });
  }

  const selectedRecipe = recipes?.find((r) => r.id === selectedRecipeId);
  const isSelectedArchived = selectedRecipe?.isArchived ?? false;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Recipe Builder</h1>
        <p className="text-muted-foreground">
          Manage product recipes and element type bindings.
        </p>
      </div>

      {/* Product Selector */}
      <div className="flex items-center gap-4">
        <div className="w-72">
          <Select
            value={selectedProductId?.toString() ?? ""}
            onValueChange={(val) => {
              setSelectedProductId(parseInt(val, 10));
              setSelectedRecipeId(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.productNameKo}
                  <span className="ml-2 text-xs text-muted-foreground">({p.productKey})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProductId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateRecipeOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Recipe
          </Button>
        )}
      </div>

      {/* Recipe Version Selector */}
      {selectedProductId && recipes && recipes.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="w-72">
            <Select
              value={selectedRecipeId?.toString() ?? ""}
              onValueChange={(val) => {
                setSelectedRecipeId(parseInt(val, 10));
                setExpandedBindingId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a recipe version" />
              </SelectTrigger>
              <SelectContent>
                {recipes.map((r) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    <span>v{r.recipeVersion} — {r.recipeName}</span>
                    {r.isArchived && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Archived
                      </Badge>
                    )}
                    {r.isDefault && !r.isArchived && (
                      <Badge className="ml-2 text-xs">Default</Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRecipeId && !isSelectedArchived && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiveConfirmOpen(true)}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive &amp; Edit
            </Button>
          )}
        </div>
      )}

      {/* No recipes yet */}
      {selectedProductId && recipes && recipes.length === 0 && (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          No recipes for this product. Create the first recipe.
        </div>
      )}

      {/* Recipe Builder — Bindings */}
      {recipeWithBindings && selectedRecipeId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Bindings for v{recipeWithBindings.recipeVersion} — {recipeWithBindings.recipeName}
              {recipeWithBindings.isArchived && (
                <Badge variant="secondary" className="ml-2">Archived</Badge>
              )}
            </h2>
            {!recipeWithBindings.isArchived && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddBindingOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Binding
              </Button>
            )}
          </div>

          <ElementBindingTable
            recipeId={selectedRecipeId}
            bindings={recipeWithBindings.bindings}
            choicesByTypeId={choicesByTypeId}
            onBindingsChange={() => void refetchBindings()}
          />

          {/* Choice Restriction Matrix — per binding row */}
          {recipeWithBindings.bindings.map((binding) => (
            <div key={binding.id}>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() =>
                  setExpandedBindingId(expandedBindingId === binding.id ? null : binding.id)
                }
              >
                {expandedBindingId === binding.id ? "Hide" : "Show"} restrictions for{" "}
                {binding.typeName}
              </Button>
              {expandedBindingId === binding.id && (
                <ChoiceRestrictionMatrix
                  bindingId={binding.id}
                  elementTypeId={binding.typeId}
                  currentRestrictions={binding.restrictions}
                  onSave={() => void refetchBindings()}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Create Recipe Modal ─── */}
      <Dialog open={createRecipeOpen} onOpenChange={setCreateRecipeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Recipe</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateRecipe)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="recipeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Standard A4 Recipe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional description"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="create-is-default"
                      />
                    </FormControl>
                    <FormLabel htmlFor="create-is-default" className="!mt-0 cursor-pointer">
                      Set as default recipe
                    </FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateRecipeOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRecipe.isPending}>
                  {createRecipe.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ─── Archive & Edit Confirmation Modal ─── */}
      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive &amp; Create New Version</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will archive the current recipe (v{selectedRecipe?.recipeVersion}) and create a
            new version with all existing bindings copied. The old recipe will remain accessible
            for historical reference.
          </p>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(handleArchiveAndCreate)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="recipeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Recipe Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Updated Recipe v2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="archive-is-default"
                      />
                    </FormControl>
                    <FormLabel htmlFor="archive-is-default" className="!mt-0 cursor-pointer">
                      Set new version as default
                    </FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setArchiveConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={archiveAndCreate.isPending}>
                  {archiveAndCreate.isPending ? "Processing..." : "Archive & Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ─── Add Binding Modal ─── */}
      <Dialog open={addBindingOpen} onOpenChange={setAddBindingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Element Type Binding</DialogTitle>
          </DialogHeader>
          <Form {...addBindingForm}>
            <form onSubmit={addBindingForm.handleSubmit(handleAddBinding)} className="space-y-4">
              <FormField
                control={addBindingForm.control}
                name="typeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Element Type</FormLabel>
                    <Select
                      value={field.value ? field.value.toString() : ""}
                      onValueChange={(val) => field.onChange(parseInt(val, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select element type" />
                      </SelectTrigger>
                      <SelectContent>
                        {(elementTypes ?? []).map((et) => (
                          <SelectItem key={et.id} value={et.id.toString()}>
                            {et.typeNameKo}
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({et.typeKey})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addBindingForm.control}
                name="isRequired"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="binding-is-required"
                      />
                    </FormControl>
                    <FormLabel htmlFor="binding-is-required" className="!mt-0 cursor-pointer">
                      Required
                    </FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddBindingOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addBinding.isPending}>
                  {addBinding.isPending ? "Adding..." : "Add Binding"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
