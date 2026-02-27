import { eq, and } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import {
  products,
  productSizes,
  papers,
  printModes,
  postProcesses,
  bindings,
  priceTiers,
  fixedPrices,
  packagePrices,
  foilPrices,
  impositionRules,
  lossQuantityConfigs,
  paperProductMappings,
} from '@widget-creator/shared/db/schema';
import {
  calculatePrice,
  assembleQuote,
  PricingError,
  ConstraintError,
} from '@widget-creator/core';
import type {
  PricingInput,
  PricingLookupData,
  SizeSelection,
  QuoteInput,
} from '@widget-creator/core';

/**
 * Extended SelectedOption that includes pricing-specific reference IDs.
 * The core SelectedOption from options/types.ts lacks these fields;
 * pricing/types.ts defines them but does not re-export from core index.
 */
interface SelectedOption {
  optionKey: string;
  choiceCode: string;
  choiceId?: number;
  refPaperId?: number;
  refPrintModeId?: number;
  refPostProcessId?: number;
  unitPrice?: number;
}
import { QuoteRequestSchema } from '@/api/_lib/schemas/pricing';
import type { QuoteRequestInput } from '@/api/_lib/schemas/pricing';
import { ApiError } from '@/api/_lib/middleware/error-handler';
import { toSnakeCase } from '@/api/_lib/utils/transform';
import { withMiddleware } from '@/api/_lib/middleware/with-middleware';
import { withCors } from '@/api/_lib/middleware/cors';
import { withRateLimit } from '@/api/_lib/middleware/rate-limit';
import { withWidgetAuth } from '@/api/_lib/middleware/auth';
import { withValidation } from '@/api/_lib/middleware/validation';

const ERROR_BASE_URL = 'https://widget.huni.co.kr/errors';

export const POST = withMiddleware(
  withCors('widget'),
  withRateLimit('widget-token'),
  withWidgetAuth(),
  withValidation(QuoteRequestSchema, 'body'),
)(async (_req, ctx) => {
  const input = ctx.validatedBody as QuoteRequestInput;

  // Load product
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, input.product_id), eq(products.isActive, true)));

  if (!product) {
    throw new ApiError(
      `${ERROR_BASE_URL}/not-found`,
      'Not Found',
      404,
      `Product ${input.product_id} not found`,
    );
  }

  // Load selected size
  const [size] = await db
    .select()
    .from(productSizes)
    .where(
      and(
        eq(productSizes.id, input.size_id),
        eq(productSizes.productId, input.product_id),
        eq(productSizes.isActive, true),
      ),
    );

  if (!size) {
    throw new ApiError(
      `${ERROR_BASE_URL}/validation`,
      'Validation Error',
      400,
      `Size ${input.size_id} is not available for product ${input.product_id}`,
      [{ field: 'size_id', code: 'invalid_reference', message: `Size ${input.size_id} not found for this product` }],
    );
  }

  // Validate paper mapping if paper_id provided
  if (input.paper_id) {
    const [mapping] = await db
      .select()
      .from(paperProductMappings)
      .where(
        and(
          eq(paperProductMappings.paperId, input.paper_id),
          eq(paperProductMappings.productId, input.product_id),
          eq(paperProductMappings.isActive, true),
        ),
      );

    if (!mapping) {
      throw new ApiError(
        `${ERROR_BASE_URL}/validation`,
        'Validation Error',
        400,
        `Paper ID ${input.paper_id} is not compatible with product ID ${input.product_id}`,
        [{
          field: 'paper_id',
          code: 'invalid_reference',
          message: `Paper ${input.paper_id} is not mapped to product ${input.product_id} via paper_product_mapping`,
        }],
      );
    }
  }

  // Load all lookup data in parallel
  const [
    allPriceTiers,
    allFixedPrices,
    allPackagePrices,
    allFoilPrices,
    allImpositionRules,
    allLossConfigs,
    allPapers,
    allPrintModes,
    allPostProcesses,
    allBindings,
  ] = await Promise.all([
    db.select().from(priceTiers).where(eq(priceTiers.isActive, true)),
    db.select().from(fixedPrices).where(and(eq(fixedPrices.productId, input.product_id), eq(fixedPrices.isActive, true))),
    db.select().from(packagePrices).where(and(eq(packagePrices.productId, input.product_id), eq(packagePrices.isActive, true))),
    db.select().from(foilPrices).where(eq(foilPrices.isActive, true)),
    db.select().from(impositionRules).where(eq(impositionRules.isActive, true)),
    db.select().from(lossQuantityConfigs).where(eq(lossQuantityConfigs.isActive, true)),
    db.select().from(papers).where(eq(papers.isActive, true)),
    db.select().from(printModes).where(eq(printModes.isActive, true)),
    db.select().from(postProcesses).where(eq(postProcesses.isActive, true)),
    db.select().from(bindings).where(eq(bindings.isActive, true)),
  ]);

  // Build PricingLookupData
  const lookupData: PricingLookupData = {
    priceTiers: allPriceTiers.map((t) => ({
      optionCode: t.optionCode,
      minQty: t.minQty,
      maxQty: t.maxQty,
      unitPrice: Number(t.unitPrice),
      sheetStandard: null,
    })),
    fixedPrices: allFixedPrices.map((f) => ({
      productId: f.productId,
      sizeId: f.sizeId,
      paperId: f.paperId,
      printModeId: f.printModeId,
      sellingPrice: Number(f.sellingPrice),
      costPrice: Number(f.costPrice ?? 0),
      baseQty: f.baseQty,
    })),
    packagePrices: allPackagePrices.map((p) => ({
      productId: p.productId,
      sizeId: p.sizeId,
      printModeId: p.printModeId,
      pageCount: p.pageCount,
      minQty: p.minQty,
      maxQty: p.maxQty,
      sellingPrice: Number(p.sellingPrice),
    })),
    foilPrices: allFoilPrices.map((f) => ({
      foilType: f.foilType,
      width: Number(f.width),
      height: Number(f.height),
      sellingPrice: Number(f.sellingPrice),
    })),
    impositionRules: allImpositionRules.map((r) => ({
      cutWidth: Number(r.cutWidth),
      cutHeight: Number(r.cutHeight),
      sheetStandard: r.sheetStandard,
      impositionCount: r.impositionCount,
    })),
    lossConfigs: allLossConfigs.map((l) => ({
      scopeType: l.scopeType as 'product' | 'category' | 'global',
      scopeId: l.scopeId,
      lossRate: Number(l.lossRate),
      minLossQty: l.minLossQty,
    })),
    papers: allPapers.map((p) => ({
      id: p.id,
      name: p.name,
      weight: p.weight,
      costPer4Cut: Number(p.costPer4Cut ?? 0),
      sellingPer4Cut: Number(p.sellingPer4Cut ?? 0),
    })),
    printModes: allPrintModes.map((m) => ({
      id: m.id,
      name: m.name,
      priceCode: String(m.priceCode),
      sides: m.sides as 'single' | 'double',
      colorType: m.colorType,
    })),
    postProcesses: allPostProcesses.map((p) => ({
      id: p.id,
      name: p.name,
      groupCode: p.groupCode,
      processType: p.processType,
      priceCode: String(p.code),
      priceBasis: p.priceBasis as 'per_sheet' | 'per_unit',
      sheetStandard: p.sheetStandard,
    })),
    bindings: allBindings.map((b) => ({
      id: b.id,
      name: b.name,
      priceCode: b.code,
      minPages: b.minPages ?? 0,
      maxPages: b.maxPages ?? 9999,
      pageStep: b.pageStep ?? 1,
    })),
  };

  // Build SizeSelection
  const sizeSelection: SizeSelection = {
    sizeId: size.id,
    cutWidth: Number(size.cutWidth ?? 0),
    cutHeight: Number(size.cutHeight ?? 0),
    impositionCount: size.impositionCount,
    isCustom: size.isCustom,
  };

  // Build selected options from request
  const selectedOptions: SelectedOption[] = [];
  if (input.paper_id) {
    const paper = allPapers.find((p) => p.id === input.paper_id);
    if (paper) {
      selectedOptions.push({
        optionKey: 'paper',
        choiceCode: paper.code,
        refPaperId: paper.id,
      });
    }
  }
  if (input.print_mode_id) {
    const pm = allPrintModes.find((m) => m.id === input.print_mode_id);
    if (pm) {
      selectedOptions.push({
        optionKey: 'print_mode',
        choiceCode: pm.code,
        refPrintModeId: pm.id,
      });
    }
  }
  if (input.binding_id) {
    const binding = allBindings.find((b) => b.id === input.binding_id);
    if (binding) {
      selectedOptions.push({
        optionKey: 'binding',
        choiceCode: binding.code,
      });
    }
  }
  for (const pp of input.post_processes) {
    const proc = allPostProcesses.find((p) => p.id === pp.id);
    if (proc) {
      selectedOptions.push({
        optionKey: `post_process_${proc.groupCode}`,
        choiceCode: pp.sub_option ?? proc.code,
        refPostProcessId: proc.id,
      });
    }
  }

  // Call pricing engine
  let pricingResult;
  try {
    const pricingInput: PricingInput = {
      pricingModel: product.pricingModel as PricingInput['pricingModel'],
      productId: product.id,
      categoryId: product.categoryId,
      quantity: input.quantity,
      selectedOptions,
      sizeSelection,
      lookupData,
    };
    pricingResult = calculatePrice(pricingInput);
  } catch (error) {
    if (error instanceof PricingError) {
      throw new ApiError(
        `${ERROR_BASE_URL}/price-calculation`,
        'Price Calculation Error',
        400,
        error.message,
      );
    }
    if (error instanceof ConstraintError) {
      throw new ApiError(
        `${ERROR_BASE_URL}/option-constraint`,
        'Constraint Violation',
        422,
        error.message,
      );
    }
    throw error;
  }

  // Assemble quote
  const quoteInput: QuoteInput = {
    productId: product.id,
    productName: product.name,
    pricingResult,
    selectedOptions,
    quantity: input.quantity,
    sizeSelection,
  };

  const quoteResult = await assembleQuote(quoteInput);

  // Build response
  const breakdown = pricingResult.breakdown;
  const response = {
    productId: product.id,
    productName: product.name,
    pricingModel: product.pricingModel,
    quantity: input.quantity,
    breakdown: {
      baseCost: 0,
      printCost: breakdown.printCost,
      paperCost: breakdown.paperCost,
      coatingCost: breakdown.coatingCost,
      bindingCost: breakdown.bindingCost,
      postprocessCost: breakdown.postProcessCost,
      accessoryCost: breakdown.packagingCost,
      subtotal: quoteResult.subtotal,
      vat: quoteResult.vatAmount,
      total: quoteResult.totalPrice,
    },
    unitPrice: quoteResult.unitPrice,
    currency: 'KRW',
    selectedOptions: buildSelectedOptionsDisplay(selectedOptions, lookupData, input),
    validUntil: new Date(quoteResult.expiresAt).toISOString(),
  };

  return Response.json({ data: toSnakeCase(response) });
});

function buildSelectedOptionsDisplay(
  selectedOptions: SelectedOption[],
  lookupData: PricingLookupData,
  input: { page_count?: number; post_processes: { id: number; sub_option?: string }[] },
): Record<string, string | number | string[]> {
  const display: Record<string, string | number | string[]> = {};

  for (const opt of selectedOptions) {
    if (opt.optionKey === 'paper' && opt.refPaperId) {
      const paper = lookupData.papers.find((p) => p.id === opt.refPaperId);
      if (paper) display.paper = paper.name;
    }
    if (opt.optionKey === 'print_mode' && opt.refPrintModeId) {
      const pm = lookupData.printModes.find((m) => m.id === opt.refPrintModeId);
      if (pm) display.print_mode = pm.name;
    }
    if (opt.optionKey === 'binding') {
      const binding = lookupData.bindings.find((b) => b.priceCode === opt.choiceCode);
      if (binding) display.binding = binding.name;
    }
  }

  if (input.page_count) {
    display.page_count = input.page_count;
  }

  const ppNames = input.post_processes
    .map((pp) => {
      const proc = lookupData.postProcesses.find((p) => p.id === pp.id);
      const suffix = pp.sub_option ? ` (${pp.sub_option})` : '';
      return proc ? `${proc.name}${suffix}` : null;
    })
    .filter((n): n is string => n !== null);

  if (ppNames.length > 0) {
    display.post_processes = ppNames;
  }

  return display;
}
