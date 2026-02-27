"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

const formSchema = z.object({
  optionDefinitionId: z.number(),
  code: z.string().min(1, "Code is required").max(50),
  name: z.string().min(1, "Name is required").max(100),
  priceKey: z.string().max(50).nullable().optional(),
  refPaperId: z.number().nullable().optional(),
  refMaterialId: z.number().nullable().optional(),
  refPrintModeId: z.number().nullable().optional(),
  refPostProcessId: z.number().nullable().optional(),
  refBindingId: z.number().nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface OptionChoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: {
    id: number;
    optionDefinitionId: number;
    code: string;
    name: string;
    priceKey: string | null;
    refPaperId: number | null;
    refMaterialId: number | null;
    refPrintModeId: number | null;
    refPostProcessId: number | null;
    refBindingId: number | null;
    displayOrder: number;
    isActive: boolean;
  } | null;
  optionDefinitionId: number | null;
  onSuccess: () => void;
}

export function OptionChoiceForm({
  open,
  onOpenChange,
  editItem,
  optionDefinitionId,
  onSuccess,
}: OptionChoiceFormProps) {
  const isEditing = !!editItem;

  const createMutation = trpc.optionChoices.create.useMutation({
    onSuccess: () => {
      toast.success("Option choice created");
      onSuccess();
    },
    onError: (err) => {
      toast.error(`Failed to create: ${err.message}`);
    },
  });

  const updateMutation = trpc.optionChoices.update.useMutation({
    onSuccess: () => {
      toast.success("Option choice updated");
      onSuccess();
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      optionDefinitionId: optionDefinitionId ?? 0,
      code: "",
      name: "",
      priceKey: null,
      refPaperId: null,
      refMaterialId: null,
      refPrintModeId: null,
      refPostProcessId: null,
      refBindingId: null,
      displayOrder: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (open && editItem) {
      form.reset({
        optionDefinitionId: editItem.optionDefinitionId,
        code: editItem.code,
        name: editItem.name,
        priceKey: editItem.priceKey,
        refPaperId: editItem.refPaperId,
        refMaterialId: editItem.refMaterialId,
        refPrintModeId: editItem.refPrintModeId,
        refPostProcessId: editItem.refPostProcessId,
        refBindingId: editItem.refBindingId,
        displayOrder: editItem.displayOrder,
        isActive: editItem.isActive,
      });
    } else if (open && !editItem) {
      form.reset({
        optionDefinitionId: optionDefinitionId ?? 0,
        code: "",
        name: "",
        priceKey: null,
        refPaperId: null,
        refMaterialId: null,
        refPrintModeId: null,
        refPostProcessId: null,
        refBindingId: null,
        displayOrder: 0,
        isActive: true,
      });
    }
  }, [open, editItem, optionDefinitionId, form]);

  const onSubmit = (values: FormValues) => {
    if (isEditing) {
      updateMutation.mutate({ id: editItem.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Option Choice" : "Add Option Choice"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SC200" {...field} />
                    </FormControl>
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
                      <Input placeholder="Choice name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priceKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. SC200_PRICE"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Reference IDs (read-only links to related entities)
              </p>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    { name: "refPaperId" as const, label: "Paper ID" },
                    { name: "refMaterialId" as const, label: "Material ID" },
                    { name: "refPrintModeId" as const, label: "Print Mode ID" },
                    { name: "refPostProcessId" as const, label: "Post Process ID" },
                    { name: "refBindingId" as const, label: "Binding ID" },
                  ] as const
                ).map(({ name, label }) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="-"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-sm font-normal">Active</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditing
                    ? "Saving..."
                    : "Creating..."
                  : isEditing
                    ? "Save"
                    : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
