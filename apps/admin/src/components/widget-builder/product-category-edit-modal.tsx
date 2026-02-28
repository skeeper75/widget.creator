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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// @MX:NOTE: [AUTO] Schema mirrors productCategoriesRouter create/update schemas (SPEC-MDM-001)
const CategoryFormSchema = z.object({
  categoryKey: z.string().min(1, "Category key is required").max(50),
  categoryNameKo: z.string().min(1, "Korean name is required").max(100),
  categoryNameEn: z.string().max(100).optional(),
  displayOrder: z.number().int().min(0),
  description: z.string().nullable().optional(),
});

type CategoryFormValues = z.infer<typeof CategoryFormSchema>;

interface ProductCategoryEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: {
    id: number;
    categoryKey: string;
    categoryNameKo: string;
    categoryNameEn: string | null;
    displayOrder: number;
    description: string | null;
  } | null;
  onSuccess?: () => void;
}

// @MX:ANCHOR: [AUTO] ProductCategoryEditModal — shared by categories page create and edit flows
// @MX:REASON: Fan_in >= 3: used by categories page create and edit flows
export function ProductCategoryEditModal({
  open,
  onOpenChange,
  editItem,
  onSuccess,
}: ProductCategoryEditModalProps) {
  const isEdit = Boolean(editItem);
  const utils = trpc.useUtils();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: {
      categoryKey: "",
      categoryNameKo: "",
      categoryNameEn: "",
      displayOrder: 0,
      description: null,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (editItem) {
      form.reset({
        categoryKey: editItem.categoryKey,
        categoryNameKo: editItem.categoryNameKo,
        categoryNameEn: editItem.categoryNameEn ?? "",
        displayOrder: editItem.displayOrder,
        description: editItem.description,
      });
    } else {
      form.reset({
        categoryKey: "",
        categoryNameKo: "",
        categoryNameEn: "",
        displayOrder: 0,
        description: null,
      });
    }
  }, [editItem, form]);

  const createMutation = trpc.productCategories.create.useMutation({
    onSuccess: () => {
      utils.productCategories.list.invalidate();
      toast.success("카테고리가 생성되었습니다");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`생성 실패: ${err.message}`);
    },
  });

  const updateMutation = trpc.productCategories.update.useMutation({
    onSuccess: () => {
      utils.productCategories.list.invalidate();
      toast.success("카테고리가 수정되었습니다");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`수정 실패: ${err.message}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: CategoryFormValues) {
    if (isEdit && editItem) {
      updateMutation.mutate({
        id: editItem.id,
        categoryNameKo: values.categoryNameKo,
        categoryNameEn: values.categoryNameEn || undefined,
        displayOrder: values.displayOrder,
        description: values.description,
      });
    } else {
      createMutation.mutate({
        ...values,
        categoryNameEn: values.categoryNameEn || undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "카테고리 수정" : "카테고리 추가"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categoryKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리 키</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. business_card"
                      {...field}
                      disabled={isEdit}
                      className={isEdit ? "font-mono text-sm bg-muted" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryNameKo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>한국어 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="명함" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryNameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>영문 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="Business Card" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>표시 순서</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명 (선택)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="카테고리 설명"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                취소
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "저장 중..." : isEdit ? "수정" : "생성"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
