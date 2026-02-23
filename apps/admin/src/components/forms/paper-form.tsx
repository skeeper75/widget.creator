"use client";

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

const paperFormSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(50, "Code must be 50 characters or fewer"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  abbreviation: z.string().max(20).nullable().optional(),
  weight: z.number().int().positive().nullable().optional(),
  sheetSize: z.string().max(50).nullable().optional(),
  costPerRear: z.string().nullable().optional(),
  sellingPerRear: z.string().nullable().optional(),
  costPer4Cut: z.string().nullable().optional(),
  sellingPer4Cut: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

type PaperFormValues = z.infer<typeof paperFormSchema>;

interface PaperFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PaperForm({ open, onOpenChange, onSuccess }: PaperFormProps) {
  const createMutation = trpc.papers.create.useMutation({
    onSuccess: () => {
      toast.success("Paper created");
      onSuccess();
    },
    onError: (err) => {
      toast.error(`Failed to create: ${err.message}`);
    },
  });

  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperFormSchema),
    defaultValues: {
      code: "",
      name: "",
      abbreviation: null,
      weight: null,
      sheetSize: null,
      costPerRear: null,
      sellingPerRear: null,
      costPer4Cut: null,
      sellingPer4Cut: null,
      displayOrder: 0,
      isActive: true,
    },
  });

  const onSubmit = (values: PaperFormValues) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Paper</DialogTitle>
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
                      <Input placeholder="e.g. SC-200" {...field} />
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
                      <Input placeholder="Paper name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="abbreviation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abbreviation</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SC200"
                        maxLength={20}
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
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="200"
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
                name="sheetSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sheet Size</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. A3, T3"
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
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
