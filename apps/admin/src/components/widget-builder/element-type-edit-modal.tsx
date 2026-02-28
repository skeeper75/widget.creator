"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// @MX:NOTE: [AUTO] Schema mirrors elementTypesRouter create/update schemas
const ElementTypeFormSchema = z.object({
  typeKey: z.string().min(1, "Type key is required").max(50),
  typeNameKo: z.string().min(1, "Korean name is required").max(100),
  typeNameEn: z.string().min(1, "English name is required").max(100),
  uiControl: z.enum([
    "toggle-group",
    "toggle-multi",
    "select",
    "number-stepper",
    "slider",
    "checkbox",
    "collapsible",
    "color-swatch",
    "image-toggle",
    "text-input",
  ]),
  optionCategory: z.enum([
    "material",
    "process",
    "spec",
    "quantity",
    "group",
  ]),
  allowsCustom: z.boolean(),
  displayOrder: z.number().int().min(0),
  description: z.string().nullable().optional(),
});

type ElementTypeFormValues = z.infer<typeof ElementTypeFormSchema>;

interface ElementTypeEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: {
    id: number;
    typeKey: string;
    typeNameKo: string;
    typeNameEn: string;
    uiControl: string;
    optionCategory: string;
    allowsCustom: boolean;
    displayOrder: number;
    description: string | null;
  } | null;
  onSuccess?: () => void;
}

const UI_CONTROL_OPTIONS = [
  { value: "toggle-group", label: "Toggle Group" },
  { value: "toggle-multi", label: "Toggle Multi" },
  { value: "select", label: "Select" },
  { value: "number-stepper", label: "Number Stepper" },
  { value: "slider", label: "Slider" },
  { value: "checkbox", label: "Checkbox" },
  { value: "collapsible", label: "Collapsible" },
  { value: "color-swatch", label: "Color Swatch" },
  { value: "image-toggle", label: "Image Toggle" },
  { value: "text-input", label: "Text Input" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "material", label: "Material" },
  { value: "process", label: "Process" },
  { value: "spec", label: "Spec" },
  { value: "quantity", label: "Quantity" },
  { value: "group", label: "Group" },
] as const;

// @MX:ANCHOR: [AUTO] ElementTypeEditModal — shared by elements page create and edit flows
// @MX:REASON: Fan_in >= 3: used by elements page, potentially by recipe binding UI
export function ElementTypeEditModal({
  open,
  onOpenChange,
  editItem,
  onSuccess,
}: ElementTypeEditModalProps) {
  const isEdit = Boolean(editItem);
  const utils = trpc.useUtils();

  const form = useForm<ElementTypeFormValues>({
    resolver: zodResolver(ElementTypeFormSchema),
    defaultValues: {
      typeKey: "",
      typeNameKo: "",
      typeNameEn: "",
      uiControl: "select",
      optionCategory: "spec",
      allowsCustom: false,
      displayOrder: 0,
      description: null,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (editItem) {
      form.reset({
        typeKey: editItem.typeKey,
        typeNameKo: editItem.typeNameKo,
        typeNameEn: editItem.typeNameEn,
        uiControl: editItem.uiControl as ElementTypeFormValues["uiControl"],
        optionCategory: editItem.optionCategory as ElementTypeFormValues["optionCategory"],
        allowsCustom: editItem.allowsCustom,
        displayOrder: editItem.displayOrder,
        description: editItem.description,
      });
    } else {
      form.reset({
        typeKey: "",
        typeNameKo: "",
        typeNameEn: "",
        uiControl: "select",
        optionCategory: "spec",
        allowsCustom: false,
        displayOrder: 0,
        description: null,
      });
    }
  }, [editItem, form]);

  const createMutation = trpc.elementTypes.create.useMutation({
    onSuccess: () => {
      utils.elementTypes.list.invalidate();
      toast.success("Element type created");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Failed to create: ${err.message}`);
    },
  });

  const updateMutation = trpc.elementTypes.update.useMutation({
    onSuccess: () => {
      utils.elementTypes.list.invalidate();
      toast.success("Element type updated");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: ElementTypeFormValues) {
    if (isEdit && editItem) {
      updateMutation.mutate({ id: editItem.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Element Type" : "Add Element Type"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="typeKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type Key</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. paper_type" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="typeNameKo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (KO)</FormLabel>
                    <FormControl>
                      <Input placeholder="한국어 이름" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="typeNameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (EN)</FormLabel>
                    <FormControl>
                      <Input placeholder="English name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="uiControl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UI Control</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select UI control" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UI_CONTROL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                name="optionCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allowsCustom"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-8">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Allows Custom</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
