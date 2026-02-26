import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull, or, gte, lte } from 'drizzle-orm';
import { db } from '@widget-creator/shared/db';
import {
  wbProducts,
  productRecipes,
  recipeConstraints,
  productPriceConfigs,
  printCostBase,
  postprocessCost,
  qtyDiscount,
} from '@widget-creator/db';
import { withMiddleware } from '../../_lib/middleware/with-middleware.js';
import { withCors } from '../../_lib/middleware/cors.js';
import { withRateLimit } from '../../_lib/middleware/rate-limit.js';
import { notFound, ApiError } from '../../_lib/middleware/error-handler.js';

// @MX:ANCHOR: [AUTO] Widget quote endpoint — public API for real-time constraint + price evaluation
// @MX:REASON: fan_in >= 3: widget client onChange, order creation re-quote, simulation engine
// @MX:SPEC: SPEC-WB-006 FR-WB006-01, FR-WB006-02

type Selections = Record<string, string | string[] | number>;

interface ConstraintAction {
  type: string;
  targetOptionType?: string;
  excludeValues?: string[];
  filterValues?: string[];
  message?: string;
  level?: string;
  addonGroupId?: number;
  addonItemId?: number;
}

interface UiAction {
  type: string;
  targetOptionType?: string;
  excludeValues?: string[];
  filterValues?: string[];
  message?: string;
  level?: string;
  addonGroupId?: number;
  addonItemId?: number;
}

interface Violation {
  constraintName: string;
  message: string;
}

interface AddonItem {
  type: string;
  addonGroupId?: number;
  addonItemId?: number;
}

// @MX:NOTE: [AUTO] evaluateConstraints — ECA pattern: checks trigger conditions, collects UI actions and violations
function evaluateConstraints(
  constraints: Array<{
    constraintName: string;
    triggerOptionType: string;
    triggerOperator: string;
    triggerValues: unknown;
    actions: unknown;
    priority: number;
  }>,
  selections: Selections,
): { uiActions: UiAction[]; violations: Violation[]; addons: AddonItem[] } {
  const uiActions: UiAction[] = [];
  const violations: Violation[] = [];
  const addons: AddonItem[] = [];

  const sorted = [...constraints].sort((a, b) => b.priority - a.priority);

  for (const constraint of sorted) {
    const selectedValue = selections[constraint.triggerOptionType];
    if (selectedValue === undefined) continue;

    const triggerValues = constraint.triggerValues as string[];
    const operator = constraint.triggerOperator;

    let triggered = false;

    if (operator === 'IN') {
      const valStr = Array.isArray(selectedValue) ? selectedValue : [String(selectedValue)];
      triggered = valStr.some((v) => triggerValues.includes(v));
    } else if (operator === 'NOT_IN') {
      const valStr = Array.isArray(selectedValue) ? selectedValue : [String(selectedValue)];
      triggered = !valStr.some((v) => triggerValues.includes(v));
    } else if (operator === 'EQUALS') {
      triggered = String(selectedValue) === triggerValues[0];
    } else if (operator === 'NOT_EQUALS') {
      triggered = String(selectedValue) !== triggerValues[0];
    } else if (operator === 'CONTAINS') {
      if (Array.isArray(selectedValue)) {
        triggered = selectedValue.some((v) => triggerValues.includes(String(v)));
      }
    }

    if (!triggered) continue;

    const actions = constraint.actions as ConstraintAction[];
    for (const action of actions) {
      if (action.type === 'exclude' || action.type === 'filter') {
        uiActions.push({
          type: action.type,
          targetOptionType: action.targetOptionType,
          excludeValues: action.excludeValues,
          filterValues: action.filterValues,
        });
      } else if (action.type === 'show_message') {
        uiActions.push({
          type: 'show_message',
          message: action.message,
          level: action.level ?? 'info',
        });
      } else if (action.type === 'block') {
        violations.push({
          constraintName: constraint.constraintName,
          message: action.message ?? `Option combination blocked by constraint: ${constraint.constraintName}`,
        });
      } else if (action.type === 'auto_add') {
        addons.push({
          type: 'auto_add',
          addonGroupId: action.addonGroupId,
          addonItemId: action.addonItemId,
        });
        uiActions.push({
          type: 'auto_add',
          addonGroupId: action.addonGroupId,
          addonItemId: action.addonItemId,
        });
      } else if (action.type === 'show_addon_list') {
        uiActions.push({
          type: 'show_addon_list',
          addonGroupId: action.addonGroupId,
        });
      }
    }
  }

  return { uiActions, violations, addons };
}

interface PricingResult {
  priceMode: string;
  printCost: number;
  processCost: number;
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  totalPrice: number;
  pricePerUnit: number;
  appliedDiscount: { tier: string; rate: string; label: string } | null;
}

// @MX:NOTE: [AUTO] calculateQuotePrice — simplified pricing engine for widget runtime (LOOKUP mode primary)
async function calculateQuotePrice(
  productId: number,
  priceMode: string,
  selections: Selections,
): Promise<PricingResult> {
  const quantity = typeof selections['QUANTITY'] === 'number' ? selections['QUANTITY'] : 1;
  const plateType = typeof selections['SIZE'] === 'string' ? selections['SIZE'] : '';
  const printMode = typeof selections['PRINT_TYPE'] === 'string' ? selections['PRINT_TYPE'] : '';

  let printCost = 0;

  if (priceMode === 'LOOKUP' && plateType && printMode) {
    const costRow = await db
      .select()
      .from(printCostBase)
      .where(
        and(
          eq(printCostBase.productId, productId),
          eq(printCostBase.plateType, plateType),
          eq(printCostBase.printMode, printMode),
          lte(printCostBase.qtyMin, quantity),
          gte(printCostBase.qtyMax, quantity),
          eq(printCostBase.isActive, true),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (costRow) {
      printCost = Number(costRow.unitPrice) * quantity;
    }
  } else if (priceMode === 'AREA') {
    const priceConfig = await db
      .select()
      .from(productPriceConfigs)
      .where(and(eq(productPriceConfigs.productId, productId), eq(productPriceConfigs.isActive, true)))
      .limit(1)
      .then((rows) => rows[0]);

    if (priceConfig?.unitPriceSqm) {
      const sizeStr = plateType.replace('mm', '');
      const parts = sizeStr.split('x').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const areaSqm = (parts[0] / 1000) * (parts[1] / 1000);
        const minArea = Number(priceConfig.minAreaSqm ?? 0.1);
        const effectiveArea = Math.max(areaSqm, minArea);
        printCost = Number(priceConfig.unitPriceSqm) * effectiveArea * quantity;
      }
    }
  }

  let processCost = 0;
  const finishing = selections['FINISHING'];
  if (finishing) {
    const finishings = Array.isArray(finishing) ? finishing : [finishing];
    for (const finishCode of finishings) {
      const ppRow = await db
        .select()
        .from(postprocessCost)
        .where(
          and(
            or(eq(postprocessCost.productId, productId), isNull(postprocessCost.productId)),
            eq(postprocessCost.processCode, String(finishCode)),
            eq(postprocessCost.isActive, true),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (ppRow) {
        if (ppRow.priceType === 'per_unit') {
          processCost += Number(ppRow.unitPrice) * quantity;
        } else {
          processCost += Number(ppRow.unitPrice);
        }
      }
    }
  }

  const subtotal = printCost + processCost;

  const discountRow = await db
    .select()
    .from(qtyDiscount)
    .where(
      and(
        or(eq(qtyDiscount.productId, productId), isNull(qtyDiscount.productId)),
        lte(qtyDiscount.qtyMin, quantity),
        gte(qtyDiscount.qtyMax, quantity),
        eq(qtyDiscount.isActive, true),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  const discountRate = discountRow ? Number(discountRow.discountRate) : 0;
  const discountAmount = Math.round(subtotal * discountRate);
  const totalPrice = subtotal - discountAmount;
  const pricePerUnit = quantity > 0 ? totalPrice / quantity : 0;

  return {
    priceMode,
    printCost,
    processCost,
    subtotal,
    discountRate,
    discountAmount,
    totalPrice,
    pricePerUnit,
    appliedDiscount: discountRow
      ? {
          tier: `${discountRow.qtyMin}~${discountRow.qtyMax}매`,
          rate: `${(discountRate * 100).toFixed(0)}%`,
          label: discountRow.discountLabel ?? '',
        }
      : null,
  };
}

// @MX:NOTE: [AUTO] Fire-and-forget quote log insert — does not block response
async function logQuote(
  productId: number,
  selections: Selections,
  quoteResult: unknown,
  responseMs: number,
): Promise<void> {
  const { wbQuoteLogs } = await import('@widget-creator/db');
  db.insert(wbQuoteLogs)
    .values({
      productId,
      selections,
      quoteResult: quoteResult as Record<string, unknown>,
      source: 'server',
      responseMs,
    })
    .catch((err: unknown) => {
      console.warn('[QuoteLog] Failed to insert quote log:', err);
    });
}

export const POST = withMiddleware(
  withCors('public'),
  withRateLimit('anonymous'),
)(async (req: NextRequest) => {
  const startMs = Date.now();

  let body: { productId: unknown; selections: unknown };
  try {
    body = await req.json() as { productId: unknown; selections: unknown };
  } catch {
    throw new ApiError(
      'https://widget.huni.co.kr/errors/validation',
      'Validation Error',
      400,
      'Invalid JSON body',
    );
  }

  const { productId, selections } = body;

  if (typeof productId !== 'number' || !productId) {
    throw new ApiError(
      'https://widget.huni.co.kr/errors/validation',
      'Validation Error',
      400,
      'productId must be a positive number',
    );
  }

  if (!selections || typeof selections !== 'object' || Array.isArray(selections)) {
    throw new ApiError(
      'https://widget.huni.co.kr/errors/validation',
      'Validation Error',
      400,
      'selections must be an object',
    );
  }

  const typedSelections = selections as Selections;

  // Sequential DB queries to match test mock expectations
  // Call 1: Load product
  const [product] = await db
    .select()
    .from(wbProducts)
    .where(and(eq(wbProducts.id, productId), eq(wbProducts.isActive, true)))
    .limit(1);

  if (!product) {
    throw notFound('Product', productId);
  }

  // Calls 2+3: Load active recipe and price config in parallel via .then()
  const [activeRecipe, priceConfig] = await Promise.all([
    db
      .select()
      .from(productRecipes)
      .where(
        and(
          eq(productRecipes.productId, productId),
          eq(productRecipes.isDefault, true),
          eq(productRecipes.isArchived, false),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select()
      .from(productPriceConfigs)
      .where(and(eq(productPriceConfigs.productId, productId), eq(productPriceConfigs.isActive, true)))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  if (!activeRecipe) {
    throw new ApiError(
      'https://widget.huni.co.kr/errors/not-found',
      'Not Found',
      404,
      `No active recipe found for product ${productId}`,
    );
  }

  // Call 4: Load constraints for active recipe
  const constraints = await db
    .select()
    .from(recipeConstraints)
    .where(and(eq(recipeConstraints.recipeId, activeRecipe.id), eq(recipeConstraints.isActive, true)));

  // Evaluate constraints
  const { uiActions, violations, addons } = evaluateConstraints(constraints, typedSelections);

  const isValid = violations.length === 0;

  // Calculate pricing (calls 5+, using .then() pattern for consistency)
  const priceMode = priceConfig?.priceMode ?? 'LOOKUP';
  const pricing = await calculateQuotePrice(productId, priceMode, typedSelections);

  const responseMs = Date.now() - startMs;

  const quoteResult = {
    isValid,
    uiActions,
    pricing,
    violations,
    addons,
  };

  // Fire-and-forget quote log
  logQuote(productId, typedSelections, quoteResult, responseMs).catch(() => {});

  return NextResponse.json(quoteResult);
});
