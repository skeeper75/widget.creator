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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

const formSchema = z.object({
  parentOptionId: z.number({ required_error: "Parent option is required" }),
  parentChoiceId: z.number().nullable().optional(),
  childOptionId: z.number({ required_error: "Child option is required" }),
  dependencyType: z.string().min(1, "Dependency type is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface DependencyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number | null;
  optionDefinitions: Array<{ id: number; key: string; name: string }>;
  onSuccess: () => void;
}

export function DependencyForm({
  open,
  onOpenChange,
  productId,
  optionDefinitions,
  onSuccess,
}: DependencyFormProps) {
  const createMutation = trpc.optionDependencies.create.useMutation({
    onSuccess: () => {
      toast.success("Dependency created");
      onSuccess();
    },
    onError: (err) => {
      toast.error(`Failed to create: ${err.message}`);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parentOptionId: undefined,
      parentChoiceId: null,
      childOptionId: undefined,
      dependencyType: "visibility",
    },
  });

  const onSubmit = (values: FormValues) => {
    if (productId == null) return;
    createMutation.mutate({
      productId,
      parentOptionId: values.parentOptionId,
      parentChoiceId: values.parentChoiceId ?? null,
      childOptionId: values.childOptionId,
      dependencyType: values.dependencyType,
      isActive: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Dependency</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="parentOptionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Option</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value?.toString() ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {optionDefinitions.map((def) => (
                        <SelectItem key={def.id} value={def.id.toString()}>
                          {def.name} ({def.key})
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
              name="parentChoiceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Choice ID (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Leave empty for any choice"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : null,
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
              name="childOptionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Child Option</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value?.toString() ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select child option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {optionDefinitions.map((def) => (
                        <SelectItem key={def.id} value={def.id.toString()}>
                          {def.name} ({def.key})
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
              name="dependencyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dependency Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="visibility">Visibility</SelectItem>
                      <SelectItem value="value_filter">
                        Value Filter
                      </SelectItem>
                      <SelectItem value="auto_select">Auto Select</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
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
