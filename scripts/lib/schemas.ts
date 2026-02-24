/**
 * Zod schemas for seed.ts JSON data inputs.
 *
 * Validates loaded JSON at runtime before DB seeding to catch
 * malformed or missing data early.
 *
 * Usage:
 *   import { loadAndValidate, PaperJsonSchema } from './lib/schemas';
 *   const papers = loadAndValidate(PaperJsonSchema, 'pricing/paper.json');
 */
import { z } from 'zod';
import * as fs from 'node:fs';

// ============================================================
// Paper (pricing/paper.json)
// ============================================================

const PaperRecordSchema = z.object({
  name: z.string(),
  abbreviation: z.string().nullable(),
  gramWeight: z.number().nullable(),
  fullSheetSize: z.string().nullable(),
  sellingPerReam: z.number(),
  costPerReam: z.number().nullable(),
  sellingPer4Cut: z.number().nullable(),
});

export const PaperJsonSchema = z.object({
  papers: z.array(PaperRecordSchema),
});

export type PaperJson = z.infer<typeof PaperJsonSchema>;

// ============================================================
// Goods (pricing/products/goods.json)
// ============================================================

const GoodsItemSchema = z.object({
  category: z.string(),
  productName: z.string(),
  productOption: z.string().nullable(),
  selectOption: z.string().nullable(),
  cost: z.number(),
  sellingPrice: z.number(),
  sellingPriceVatIncl: z.number(),
});

export const GoodsJsonSchema = z.object({
  data: z.array(GoodsItemSchema),
});

export type GoodsJson = z.infer<typeof GoodsJsonSchema>;

// ============================================================
// Option Constraints (products/option-constraints.json)
// ============================================================

const ConstraintRecordSchema = z.object({
  product_code: z.string(),
  sheet_name: z.string(),
  constraint_type: z.enum(['size_show', 'size_range', 'paper_condition']),
  rule_text: z.string(),
  description: z.string(),
  row: z.number(),
  col: z.number(),
  product_name: z.string(),
});

export const OptionConstraintsJsonSchema = z.object({
  metadata: z.object({
    source: z.string(),
    generated_at: z.string(),
    total_constraints: z.number(),
  }),
  constraints: z.array(ConstraintRecordSchema),
});

export type OptionConstraintsJson = z.infer<typeof OptionConstraintsJsonSchema>;

// ============================================================
// Digital Print (pricing/digital-print.json)
// ============================================================

const PrintTypeSchema = z.object({
  code: z.number(),
  name: z.string(),
});

export const DigitalPrintJsonSchema = z.object({
  printTypes: z.array(PrintTypeSchema),
  // priceTable is nested: quantity (string key) -> printCode (string key) -> unit price (number)
  priceTable: z.record(z.string(), z.record(z.string(), z.number())),
});

export type DigitalPrintJson = z.infer<typeof DigitalPrintJsonSchema>;

// ============================================================
// Binding (pricing/binding.json)
// ============================================================

const BindingPriceTierSchema = z.object({
  quantity: z.number(),
  unitPrice: z.number(),
});

const BindingTypeSchema = z.object({
  name: z.string(),
  code: z.number(),
  priceTiers: z.array(BindingPriceTierSchema),
});

export const BindingJsonSchema = z.object({
  bindingTypes: z.array(BindingTypeSchema),
});

export type BindingJson = z.infer<typeof BindingJsonSchema>;

// ============================================================
// Finishing (pricing/finishing.json)
// ============================================================

const FinishingSubOptionSchema = z.object({
  name: z.string(),
  code: z.number().nullable(),
});

const FinishingPriceTierSchema = z.object({
  quantity: z.number(),
  prices: z.record(z.string(), z.number()),
});

const FinishingTypeSchema = z.object({
  code: z.string(),
  name: z.string(),
  subOptions: z.array(FinishingSubOptionSchema),
  priceTiers: z.array(FinishingPriceTierSchema),
});

export const FinishingJsonSchema = z.object({
  finishingTypes: z.record(z.string(), FinishingTypeSchema),
});

export type FinishingJson = z.infer<typeof FinishingJsonSchema>;

// ============================================================
// Helper: Load and validate JSON
// ============================================================

/**
 * Load a JSON file and validate it against a Zod schema.
 * Throws ZodError with detailed path info on validation failure.
 *
 * @param schema Zod schema to validate against
 * @param filePath Absolute path to the JSON file
 * @returns Parsed and validated data
 */
export function loadAndValidate<T>(schema: z.ZodSchema<T>, filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(raw);
  return schema.parse(json);
}
