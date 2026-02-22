import { z } from 'zod';

// === Query Schemas ===

export const CategoryTreeQuerySchema = z.object({
  depth: z.coerce.number().int().min(0).optional(),
  include_inactive: z.coerce.boolean().default(false),
});

export const ProductListQuerySchema = z.object({
  category_id: z.coerce.number().int().positive().optional(),
  product_type: z.string().optional(),
  pricing_model: z.string().optional(),
  is_active: z.coerce.boolean().default(true),
  search: z.string().max(200).optional(),
  sort: z.enum(['name', 'created_at', 'display_order']).default('display_order'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ProductPaperQuerySchema = z.object({
  cover_type: z.string().optional(),
});

// === Response Types (for documentation, not runtime validation) ===

export type CategoryNode = {
  id: number;
  code: string;
  name: string;
  depth: number;
  display_order: number;
  icon_url: string | null;
  is_active: boolean;
  children: CategoryNode[];
};

export type CategoryTreeResponse = {
  data: CategoryNode[];
  meta: { total: number };
};

export type CategoryDetailResponse = {
  data: {
    id: number;
    code: string;
    name: string;
    depth: number;
    display_order: number;
    icon_url: string | null;
    is_active: boolean;
    parent_id: number | null;
    product_count: number;
    children_count: number;
    created_at: string;
    updated_at: string;
  };
};

export type ProductSummary = {
  id: number;
  category_id: number;
  huni_code: string;
  name: string;
  slug: string;
  product_type: string;
  pricing_model: string;
  order_method: string;
  editor_enabled: boolean;
  description: string | null;
  is_active: boolean;
  category: {
    id: number;
    code: string;
    name: string;
  };
};

export type ProductDetail = ProductSummary & {
  edicus_code: string | null;
  shopby_id: number | null;
  sheet_standard: string | null;
  mes_registered: boolean;
  sizes_count: number;
  options_count: number;
  created_at: string;
  updated_at: string;
};

export type ProductSizeItem = {
  id: number;
  code: string;
  display_name: string;
  cut_width: number | null;
  cut_height: number | null;
  work_width: number | null;
  work_height: number | null;
  bleed: number | null;
  imposition_count: number | null;
  is_custom: boolean;
  custom_min_w?: number | null;
  custom_min_h?: number | null;
  custom_max_w?: number | null;
  custom_max_h?: number | null;
  display_order: number;
};

export type ProductPaperItem = {
  id: number;
  code: string;
  name: string;
  abbreviation: string | null;
  weight: number | null;
  cover_type: string | null;
  is_default: boolean;
  display_order: number;
};

export type ProductOptionItem = {
  id: number;
  option_definition: {
    id: number;
    key: string;
    name: string;
    option_class: string;
    option_type: string;
    ui_component: string;
  };
  display_order: number;
  is_required: boolean;
  is_visible: boolean;
  default_choice_id: number | null;
  choices: {
    id: number;
    code: string;
    name: string;
    price_key: string | null;
    ref_paper_id: number | null;
    display_order: number;
  }[];
};

export type ProductConstraintItem = {
  id: number;
  constraint_type: string;
  source_option_id: number | null;
  source_field: string;
  operator: string;
  value: string | null;
  target_option_id: number | null;
  target_field: string;
  target_action: string;
  description: string | null;
  priority: number;
};

export type ProductDependencyItem = {
  id: number;
  parent_option_id: number;
  parent_choice_id: number | null;
  child_option_id: number;
  dependency_type: string;
};

export type ProductListQueryInput = z.infer<typeof ProductListQuerySchema>;
export type CategoryTreeQueryInput = z.infer<typeof CategoryTreeQuerySchema>;
export type ProductPaperQueryInput = z.infer<typeof ProductPaperQuerySchema>;
