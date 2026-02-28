"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const productFormSchema = z.object({
  categoryId: z.number({ required_error: "Category is required" }).int().positive(),
  huniCode: z
    .string()
    .min(1, "Huni code is required")
    .max(10, "Max 10 characters"),
  edicusCode: z.string().max(15).nullable().optional(),
  shopbyId: z.number().int().nullable().optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Max 200 characters"),
  slug: z.string().min(1, "Slug is required").max(200),
  productType: z.enum([
    "digital_print",
    "offset_print",
    "large_format",
    "cutting",
    "binding",
    "specialty",
  ]),
  pricingModel: z.enum(["tiered", "fixed", "package", "size_dependent"]),
  sheetStandard: z.enum(["A3", "T3", "A4"]).nullable().optional(),
  figmaSection: z.string().max(50).nullable().optional(),
  orderMethod: z.enum(["upload", "editor", "delivery"]),
  editorEnabled: z.boolean(),
  description: z.string().nullable().optional(),
  isActive: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

interface Category {
  id: number;
  name: string;
  depth: number;
}

interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  categories: Category[];
  onSubmit: (values: ProductFormValues) => void;
  isPending?: boolean;
  isEditing?: boolean;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProductForm({
  defaultValues,
  categories,
  onSubmit,
  isPending = false,
  isEditing = false,
}: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      categoryId: undefined,
      huniCode: "",
      edicusCode: null,
      shopbyId: null,
      name: "",
      slug: "",
      productType: "digital_print",
      pricingModel: "tiered",
      sheetStandard: null,
      figmaSection: null,
      orderMethod: "upload",
      editorEnabled: false,
      description: null,
      isActive: true,
      ...defaultValues,
    },
  });

  // Auto-generate slug from name
  const nameValue = form.watch("name");
  useEffect(() => {
    if (!isEditing && nameValue) {
      const slug = generateSlug(nameValue);
      form.setValue("slug", slug, { shouldValidate: true });
    }
  }, [nameValue, isEditing, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {"  ".repeat(cat.depth)}
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="huniCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Huni Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. BC001" maxLength={10} {...field} />
                </FormControl>
                <FormDescription>Unique product code (max 10 chars)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Product name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input placeholder="auto-generated" {...field} />
                </FormControl>
                <FormDescription>URL-friendly identifier</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="edicusCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Edicus Code (optional)
                  {isEditing && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (read-only after creation)
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. ED-BC001"
                    maxLength={15}
                    disabled={isEditing}
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
            control={form.control}
            name="shopbyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shopby ID (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Shopby product ID"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="digital_print">Digital Print</SelectItem>
                    <SelectItem value="offset_print">Offset Print</SelectItem>
                    <SelectItem value="large_format">Large Format</SelectItem>
                    <SelectItem value="cutting">Cutting</SelectItem>
                    <SelectItem value="binding">Binding</SelectItem>
                    <SelectItem value="specialty">Specialty</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pricingModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pricing Model</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="tiered">Tiered</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                    <SelectItem value="size_dependent">Size Dependent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sheetStandard"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sheet Standard (optional)</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                  value={field.value ?? "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="A3">A3</SelectItem>
                    <SelectItem value="T3">T3</SelectItem>
                    <SelectItem value="A4">A4</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="orderMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order Method</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="upload">Upload</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="figmaSection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Figma Section (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Figma section name"
                    maxLength={50}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Product description..."
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-6">
          <FormField
            control={form.control}
            name="editorEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal !mt-0">
                  Editor Enabled
                </FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal !mt-0">
                  Active
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
