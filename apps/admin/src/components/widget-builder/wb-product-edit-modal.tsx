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
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// @MX:NOTE: [AUTO] Schema mirrors wbProductsRouter create/update schemas (SPEC-MDM-001)
const WbProductFormSchema = z.object({
  productKey: z.string().min(1, "Product key is required").max(50),
  productNameKo: z.string().min(1, "Korean name is required").max(100),
  productNameEn: z.string().max(100).optional(),
  categoryId: z.number().int().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  productType: z.string().nullable().optional(),
  isPremium: z.boolean(),
  hasEditor: z.boolean(),
  hasUpload: z.boolean(),
  thumbnailUrl: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0),
  isVisible: z.boolean(),
});

type WbProductFormValues = z.infer<typeof WbProductFormSchema>;

interface WbProductEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: {
    id: number;
    productKey: string;
    productNameKo: string;
    productNameEn: string | null;
    categoryId: number | null;
    subcategory: string | null;
    productType: string | null;
    isPremium: boolean;
    hasEditor: boolean;
    hasUpload: boolean;
    thumbnailUrl: string | null;
    displayOrder: number;
    isVisible: boolean;
  } | null;
  onSuccess?: () => void;
}

// @MX:ANCHOR: [AUTO] WbProductEditModal — shared by wb-products page create and edit flows
// @MX:REASON: Fan_in >= 3: used by wb-products page create and edit flows
export function WbProductEditModal({
  open,
  onOpenChange,
  editItem,
  onSuccess,
}: WbProductEditModalProps) {
  const isEdit = Boolean(editItem);
  const utils = trpc.useUtils();

  // Fetch active categories for the category select
  const categoriesQuery = trpc.productCategories.list.useQuery(
    { isActive: true },
    { enabled: open },
  );

  const form = useForm<WbProductFormValues>({
    resolver: zodResolver(WbProductFormSchema),
    defaultValues: {
      productKey: "",
      productNameKo: "",
      productNameEn: "",
      categoryId: null,
      subcategory: null,
      productType: null,
      isPremium: false,
      hasEditor: false,
      hasUpload: true,
      thumbnailUrl: null,
      displayOrder: 0,
      isVisible: true,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (editItem) {
      form.reset({
        productKey: editItem.productKey,
        productNameKo: editItem.productNameKo,
        productNameEn: editItem.productNameEn ?? "",
        categoryId: editItem.categoryId,
        subcategory: editItem.subcategory,
        productType: editItem.productType,
        isPremium: editItem.isPremium,
        hasEditor: editItem.hasEditor,
        hasUpload: editItem.hasUpload,
        thumbnailUrl: editItem.thumbnailUrl,
        displayOrder: editItem.displayOrder,
        isVisible: editItem.isVisible,
      });
    } else {
      form.reset({
        productKey: "",
        productNameKo: "",
        productNameEn: "",
        categoryId: null,
        subcategory: null,
        productType: null,
        isPremium: false,
        hasEditor: false,
        hasUpload: true,
        thumbnailUrl: null,
        displayOrder: 0,
        isVisible: true,
      });
    }
  }, [editItem, form]);

  const createMutation = trpc.wbProducts.create.useMutation({
    onSuccess: () => {
      utils.wbProducts.list.invalidate();
      toast.success("위젯 상품이 생성되었습니다");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`생성 실패: ${err.message}`);
    },
  });

  const updateMutation = trpc.wbProducts.update.useMutation({
    onSuccess: () => {
      utils.wbProducts.list.invalidate();
      toast.success("위젯 상품이 수정되었습니다");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`수정 실패: ${err.message}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: WbProductFormValues) {
    if (isEdit && editItem) {
      updateMutation.mutate({
        id: editItem.id,
        productNameKo: values.productNameKo,
        productNameEn: values.productNameEn || undefined,
        categoryId: values.categoryId,
        subcategory: values.subcategory,
        productType: values.productType,
        isPremium: values.isPremium,
        hasEditor: values.hasEditor,
        hasUpload: values.hasUpload,
        thumbnailUrl: values.thumbnailUrl,
        displayOrder: values.displayOrder,
        isVisible: values.isVisible,
      });
    } else {
      createMutation.mutate({
        ...values,
        productNameEn: values.productNameEn || undefined,
      });
    }
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "위젯 상품 수정" : "위젯 상품 추가"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상품 키</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. business_card_standard"
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
                name="productNameKo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>한국어 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="명함 스탠다드" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="productNameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>영문 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="Business Card Standard" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v, 10))}
                      value={field.value != null ? String(field.value) : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="카테고리 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">미지정</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.categoryNameKo}
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
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>상품 유형</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. standard"
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
              name="subcategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>서브카테고리 (선택)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="서브카테고리"
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="isPremium"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">프리미엄</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hasEditor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">에디터</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hasUpload"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">업로드</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isVisible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">노출 여부</FormLabel>
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
