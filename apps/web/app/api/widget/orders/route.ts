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
  wbOrders,
} from '@widget-creator/db';
import { withMiddleware } from '../../_lib/middleware/with-middleware.js';
import { withCors } from '../../_lib/middleware/cors.js';
import { withRateLimit } from '../../_lib/middleware/rate-limit.js';
import { notFound, ApiError } from '../../_lib/middleware/error-handler.js';
import { dispatchToMes } from '../../_lib/services/mes-client.js';

// @MX:ANCHOR: [AUTO] Widget order creation — server-side re-quote + MES dispatch + order snapshot
// @MX:REASON: fan_in >= 3: widget client order confirm, order status API, MES dispatch, Shopby sync
// @MX:SPEC: SPEC-WB-006 FR-WB006-04, FR-WB006-05, FR-WB006-06

type Selections = Record<string, string | string[] | number>;

interface ConstraintAction {
  type: string;
  message?: string;
  targetOptionType?: string;
  excludeValues?: string[];
  filterValues?: string[];
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
        uiActions.push({ type: action.type, targetOptionType: action.targetOptionType, excludeValues: action.excludeValues, filterValues: action.filterValues });
      } else if (action.type === 'show_message') {
        uiActions.push({ type: 'show_message', message: action.message, level: action.level ?? 'info' });
      } else if (action.type === 'block') {
        violations.push({ constraintName: constraint.constraintName, message: action.message ?? `Blocked by constraint: ${constraint.constraintName}` });
      } else if (action.type === 'auto_add') {
        addons.push({ type: 'auto_add', addonGroupId: action.addonGroupId, addonItemId: action.addonItemId });
        uiActions.push({ type: 'auto_add', addonGroupId: action.addonGroupId, addonItemId: action.addonItemId });
      } else if (action.type === 'show_addon_list') {
        uiActions.push({ type: 'show_addon_list', addonGroupId: action.addonGroupId });
      }
    }
  }

  return { uiActions, violations, addons };
}

async function serverReQuote(
  productId: number,
  priceMode: string,
  selections: Selections,
): Promise<{
  priceMode: string;
  printCost: number;
  processCost: number;
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  totalPrice: number;
  pricePerUnit: number;
  appliedDiscount: { tier: string; rate: string; label: string } | null;
}> {
  const quantity = typeof selections['QUANTITY'] === 'number' ? selections['QUANTITY'] : 1;
  const plateType = typeof selections['SIZE'] === 'string' ? selections['SIZE'] : '';
  const printMode = typeof selections['PRINT_TYPE'] === 'string' ? selections['PRINT_TYPE'] : '';

  let printCost = 0;

  if (priceMode === 'LOOKUP' && plateType && printMode) {
    const [costRow] = await db
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
      .limit(1);

    if (costRow) {
      printCost = Number(costRow.unitPrice) * quantity;
    }
  } else if (priceMode === 'AREA') {
    const [priceConfig] = await db
      .select()
      .from(productPriceConfigs)
      .where(and(eq(productPriceConfigs.productId, productId), eq(productPriceConfigs.isActive, true)))
      .limit(1);

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
      const [ppRow] = await db
        .select()
        .from(postprocessCost)
        .where(
          and(
            or(eq(postprocessCost.productId, productId), isNull(postprocessCost.productId)),
            eq(postprocessCost.processCode, String(finishCode)),
            eq(postprocessCost.isActive, true),
          ),
        )
        .limit(1);

      if (ppRow) {
        processCost += ppRow.priceType === 'per_unit' ? Number(ppRow.unitPrice) * quantity : Number(ppRow.unitPrice);
      }
    }
  }

  const subtotal = printCost + processCost;

  const [discountRow] = await db
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
    .limit(1);

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

/**
 * Generate a unique order code in format ORD-YYYYMMDD-XXXX
 * @MX:NOTE: [AUTO] orderCode format — ORD-{YYYYMMDD}-{4 random digits}, used for MES and Shopby correlation
 */
function generateOrderCode(): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const randomPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ORD-${datePart}-${randomPart}`;
}

export const POST = withMiddleware(
  withCors('public'),
  withRateLimit('anonymous'),
)(async (req: NextRequest) => {
  let body: {
    productId: unknown;
    selections: unknown;
    clientQuoteTotal?: unknown;
    customer?: { name?: string; email?: string; phone?: string };
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    throw new ApiError(
      'https://widget.huni.co.kr/errors/validation',
      'Validation Error',
      400,
      'Invalid JSON body',
    );
  }

  const { productId, selections, clientQuoteTotal, customer } = body;

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

  // Load product
  const [product] = await db
    .select()
    .from(wbProducts)
    .where(and(eq(wbProducts.id, productId), eq(wbProducts.isActive, true)))
    .limit(1);

  if (!product) {
    throw notFound('Product', productId);
  }

  // Load active recipe and price config in parallel
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

  // Load constraints for validation
  const constraints = await db
    .select()
    .from(recipeConstraints)
    .where(and(eq(recipeConstraints.recipeId, activeRecipe.id), eq(recipeConstraints.isActive, true)));

  // Server-side re-quote (FR-WB006-04)
  const priceMode = priceConfig?.priceMode ?? 'LOOKUP';
  const [serverPricing, { violations, addons }] = await Promise.all([
    serverReQuote(productId, priceMode, typedSelections),
    Promise.resolve(evaluateConstraints(constraints, typedSelections)),
  ]);

  // If there are block violations, reject the order
  if (violations.length > 0) {
    throw new ApiError(
      'https://widget.huni.co.kr/errors/constraint-violation',
      'Constraint Violation',
      422,
      `Order rejected: ${violations.map((v) => v.message).join('; ')}`,
    );
  }

  const serverTotal = serverPricing.totalPrice;
  const clientTotal = typeof clientQuoteTotal === 'number' ? clientQuoteTotal : null;
  const priceMatched = clientTotal !== null ? Math.abs(clientTotal - serverTotal) < 1 : null;

  // Log price discrepancy if mismatch (FR-WB006-04)
  if (priceMatched === false) {
    console.warn(
      `[Order] Price discrepancy: client=${clientTotal}, server=${serverTotal}, diff=${Math.abs(clientTotal! - serverTotal)}`,
    );
  }

  // Generate unique order code with retry on collision
  let orderCode = generateOrderCode();
  // Simple collision avoidance: if same code exists, regenerate once
  const [existing] = await db
    .select({ id: wbOrders.id })
    .from(wbOrders)
    .where(eq(wbOrders.orderCode, orderCode))
    .limit(1);
  if (existing) {
    orderCode = generateOrderCode();
  }

  // Determine MES status based on mesItemCd
  const mesStatus = product.mesItemCd ? 'pending' : 'not_linked';

  // Build applied constraints list for snapshot
  const appliedConstraintNames = constraints
    .filter((c) => {
      const val = typedSelections[c.triggerOptionType];
      return val !== undefined;
    })
    .map((c) => c.constraintName);

  // Insert order record
  const [newOrder] = await db
    .insert(wbOrders)
    .values({
      orderCode,
      productId,
      recipeId: activeRecipe.id,
      recipeVersion: activeRecipe.recipeVersion,
      selections: typedSelections,
      priceBreakdown: serverPricing as Record<string, unknown>,
      totalPrice: String(serverTotal),
      appliedConstraints: appliedConstraintNames,
      addonItems: addons.length > 0 ? addons : null,
      mesStatus,
      customerName: customer?.name ?? null,
      customerEmail: customer?.email ?? null,
      customerPhone: customer?.phone ?? null,
      status: 'created',
    })
    .returning();

  // Fire-and-forget MES dispatch if product is linked to MES
  if (product.mesItemCd && newOrder) {
    const mesPayload = {
      orderCode: newOrder.orderCode,
      productId: newOrder.productId,
      mesItemCd: product.mesItemCd,
      selections: typedSelections,
      quantity: typedSelections['QUANTITY'] ?? 1,
      priceBreakdown: serverPricing,
      customer: customer ?? null,
    };
    void Promise.resolve(dispatchToMes(newOrder.id, newOrder.orderCode, mesPayload)).catch((err: unknown) => {
      console.error(`[MES] Dispatch failed for order ${newOrder.orderCode}:`, err);
    });
  }

  return NextResponse.json(
    {
      orderCode: newOrder.orderCode,
      status: newOrder.status,
      totalPrice: serverTotal,
      priceMatched,
      mesStatus: newOrder.mesStatus,
      createdAt: newOrder.createdAt,
    },
    { status: 201 },
  );
});
