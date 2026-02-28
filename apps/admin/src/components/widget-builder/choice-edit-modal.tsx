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
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const ChoiceFormSchema = z.object({
  typeId: z.number().int().positive(),
  choiceKey: z.string().min(1, "Choice key is required").max(100),
  displayName: z.string().min(1, "Display name is required").max(200),
  value: z.string().max(100).nullable().optional(),
  mesCode: z.string().max(100).nullable().optional(),
  displayOrder: z.number().int().min(0),
  isDefault: z.boolean(),
});

type ChoiceFormValues = z.infer<typeof ChoiceFormSchema>;

interface ElementTypeOption {
  id: number;
  typeNameKo: string;
  typeKey: string;
}

interface ChoiceEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementTypes: ElementTypeOption[];
  editItem?: {
    id: number;
    typeId: number;
    choiceKey: string;
    displayName: string;
    value: string | null;
    mesCode: string | null;
    displayOrder: number;
    isDefault: boolean;
  } | null;
  defaultTypeId?: number;
  onSuccess?: () => void;
}

// @MX:ANCHOR: [AUTO] ChoiceEditModal — shared create/edit modal for element choices
// @MX:REASON: Fan_in >= 3: used by choices page, element type detail view, and recipe binding
export function ChoiceEditModal({
  open,
  onOpenChange,
  elementTypes,
  editItem,
  defaultTypeId,
  onSuccess,
}: ChoiceEditModalProps) {
  const isEdit = Boolean(editItem);
  const utils = trpc.useUtils();

  const form = useForm<ChoiceFormValues>({
    resolver: zodResolver(ChoiceFormSchema),
    defaultValues: {
      typeId: defaultTypeId ?? 0,
      choiceKey: "",
      displayName: "",
      value: null,
      mesCode: null,
      displayOrder: 0,
      isDefault: false,
    },
  });

  useEffect(() => {
    if (editItem) {
      form.reset({
        typeId: editItem.typeId,
        choiceKey: editItem.choiceKey,
        displayName: editItem.displayName,
        value: editItem.value,
        mesCode: editItem.mesCode,
        displayOrder: editItem.displayOrder,
        isDefault: editItem.isDefault,
      });
    } else {
      form.reset({
        typeId: defaultTypeId ?? 0,
        choiceKey: "",
        displayName: "",
        value: null,
        mesCode: null,
        displayOrder: 0,
        isDefault: false,
      });
    }
  }, [editItem, defaultTypeId, form]);

  const createMutation = trpc.elementChoices.create.useMutation({
    onSuccess: () => {
      utils.elementChoices.list.invalidate();
      toast.success("Element choice created");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Failed to create: ${err.message}`);
    },
  });

  const updateMutation = trpc.elementChoices.update.useMutation({
    onSuccess: () => {
      utils.elementChoices.list.invalidate();
      toast.success("Element choice updated");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: ChoiceFormValues) {
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
            {isEdit ? "Edit Choice" : "Add Choice"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="typeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Element Type</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(parseInt(val, 10))}
                    value={field.value ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select element type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {elementTypes.map((et) => (
                        <SelectItem key={et.id} value={String(et.id)}>
                          {et.typeNameKo} ({et.typeKey})
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
              name="choiceKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Choice Key</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. art_120" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (KO)</FormLabel>
                  <FormControl>
                    <Input placeholder="아트지 120g" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mesCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MES Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="MES code (optional)"
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
