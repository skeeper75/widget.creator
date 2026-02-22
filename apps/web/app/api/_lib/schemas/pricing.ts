import { z } from 'zod';

// === Request Schemas ===

export const QuoteRequestSchema = z.object({
  product_id: z.number().int().positive(),
  size_id: z.number().int().positive(),
  paper_id: z.number().int().positive().optional(),
  print_mode_id: z.number().int().positive().optional(),
  quantity: z.number().int().min(1).max(100000),
  page_count: z.number().int().min(1).optional(),
  binding_id: z.number().int().positive().optional(),
  post_processes: z
    .array(
      z.object({
        id: z.number().int().positive(),
        sub_option: z.string().optional(),
      }),
    )
    .default([]),
  accessories: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().int().min(1),
      }),
    )
    .default([]),
});

export const QuotePreviewRequestSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(100000),
  size_id: z.number().int().positive().optional(),
  paper_id: z.number().int().positive().optional(),
  print_mode_id: z.number().int().positive().optional(),
  page_count: z.number().int().min(1).optional(),
  binding_id: z.number().int().positive().optional(),
});

export const PriceTierQuerySchema = z.object({
  option_code: z.string().optional(),
  price_table_id: z.coerce.number().int().positive().optional(),
});

export const FixedPriceQuerySchema = z.object({
  size_id: z.coerce.number().int().positive().optional(),
  paper_id: z.coerce.number().int().positive().optional(),
  print_mode_id: z.coerce.number().int().positive().optional(),
});

// === Response Types ===

export type QuoteBreakdown = {
  base_cost: number;
  print_cost: number;
  paper_cost: number;
  coating_cost: number;
  binding_cost: number;
  postprocess_cost: number;
  accessory_cost: number;
  subtotal: number;
  vat: number;
  total: number;
};

export type QuoteResponse = {
  data: {
    product_id: number;
    product_name: string;
    pricing_model: string;
    quantity: number;
    breakdown: QuoteBreakdown;
    unit_price: number;
    currency: string;
    selected_options: Record<string, string | number | string[]>;
    valid_until: string;
  };
};

export type QuotePreviewResponse = {
  data: {
    product_id: number;
    quantity: number;
    price_range: {
      min: number;
      max: number;
      currency: string;
    };
    is_estimate: boolean;
    missing_options: string[];
  };
};

export type PriceTierGroup = {
  price_table: {
    id: number;
    code: string;
    name: string;
    price_type: string;
    quantity_basis: string;
  };
  tiers: {
    id: number;
    option_code: string;
    min_qty: number;
    max_qty: number;
    unit_price: number;
  }[];
};

export type FixedPriceItem = {
  id: number;
  size_id: number | null;
  paper_id: number | null;
  print_mode_id: number | null;
  option_label: string | null;
  base_qty: number;
  selling_price: number;
  vat_included: boolean;
};

export type QuoteRequestInput = z.infer<typeof QuoteRequestSchema>;
export type QuotePreviewRequestInput = z.infer<typeof QuotePreviewRequestSchema>;
export type PriceTierQueryInput = z.infer<typeof PriceTierQuerySchema>;
export type FixedPriceQueryInput = z.infer<typeof FixedPriceQuerySchema>;
