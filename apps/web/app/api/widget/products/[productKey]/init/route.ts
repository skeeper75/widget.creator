import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull, or, gte, lte } from 'drizzle-orm';
import { db } from '@widget-creator/shared/db';
import {
  wbProducts,
  productRecipes,
  recipeOptionBindings,
  optionElementTypes,
  optionElementChoices,
  recipeConstraints,
  productPriceConfigs,
  printCostBase,
  postprocessCost,
  qtyDiscount,
} from '@widget-creator/db';
import { withMiddleware } from '../../../../_lib/middleware/with-middleware.js';
import { withCors } from '../../../../_lib/middleware/cors.js';
import { withRateLimit } from '../../../../_lib/middleware/rate-limit.js';
import { notFound, ApiError } from '../../../../_lib/middleware/error-handler.js';
import type { MiddlewareContext } from '../../../../_lib/middleware/with-middleware.js';

// @MX:ANCHOR: [AUTO] Widget init endpoint — single-call widget bootstrap: product + recipe + rules + default quote
// @MX:REASON: fan_in >= 3: widget client initial load, widget embed, Shopby product page integration
// @MX:SPEC: SPEC-WB-006 FR-WB006-03, FR-WB006-08

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
        uiActions.push({ type: 'show_message', message: action.message, level: action.level ?? 'info' });
      } else if (action.type === 'block') {
        violations.push({
          constraintName: constraint.constraintName,
          message: action.message ?? `Blocked by constraint: ${constraint.constraintName}`,
        });
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

async function calculateDefaultPrice(
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
        if (ppRow.priceType === 'per_unit') {
          processCost += Number(ppRow.unitPrice) * quantity;
        } else {
          processCost += Number(ppRow.unitPrice);
        }
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
          rate: `${(Number(discountRow.discountRate) * 100).toFixed(0)}%`,
          label: discountRow.discountLabel ?? '',
        }
      : null,
  };
}

export const GET = withMiddleware(
  withCors('public'),
  withRateLimit('anonymous'),
)(async (_req: NextRequest, ctx: MiddlewareContext) => {
  const { productKey } = ctx.params;

  if (!productKey) {
    throw new ApiError(
      'https://widget.huni.co.kr/errors/validation',
      'Validation Error',
      400,
      'productKey is required',
    );
  }

  // Load product by productKey
  const [product] = await db
    .select()
    .from(wbProducts)
    .where(and(eq(wbProducts.productKey, productKey), eq(wbProducts.isActive, true)))
    .limit(1);

  if (!product) {
    throw notFound('Product', productKey);
  }

  // Load active recipe, price config, and constraints in parallel
  const [activeRecipe, priceConfig] = await Promise.all([
    db
      .select()
      .from(productRecipes)
      .where(
        and(
          eq(productRecipes.productId, product.id),
          eq(productRecipes.isDefault, true),
          eq(productRecipes.isArchived, false),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select()
      .from(productPriceConfigs)
      .where(and(eq(productPriceConfigs.productId, product.id), eq(productPriceConfigs.isActive, true)))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  if (!activeRecipe) {
    throw new ApiError(
      'https://widget.huni.co.kr/errors/not-found',
      'Not Found',
      404,
      `No active recipe found for product ${productKey}`,
    );
  }

  // Load option bindings with type and choices in parallel with constraints
  const [bindings, constraints] = await Promise.all([
    db
      .select({
        bindingId: recipeOptionBindings.id,
        typeId: recipeOptionBindings.typeId,
        displayOrder: recipeOptionBindings.displayOrder,
        processingOrder: recipeOptionBindings.processingOrder,
        isRequired: recipeOptionBindings.isRequired,
        defaultChoiceId: recipeOptionBindings.defaultChoiceId,
        typeKey: optionElementTypes.typeKey,
        typeNameKo: optionElementTypes.typeNameKo,
        uiControl: optionElementTypes.uiControl,
        optionCategory: optionElementTypes.optionCategory,
      })
      .from(recipeOptionBindings)
      .innerJoin(optionElementTypes, eq(recipeOptionBindings.typeId, optionElementTypes.id))
      .where(and(eq(recipeOptionBindings.recipeId, activeRecipe.id), eq(recipeOptionBindings.isActive, true)))
      .orderBy(recipeOptionBindings.displayOrder),
    db
      .select()
      .from(recipeConstraints)
      .where(and(eq(recipeConstraints.recipeId, activeRecipe.id), eq(recipeConstraints.isActive, true))),
  ]);

  // Load choices for each option type
  const typeIds = bindings.map((b) => b.typeId);
  const allChoices = typeIds.length > 0
    ? await db
        .select()
        .from(optionElementChoices)
        .where(and(eq(optionElementChoices.isActive, true)))
        .then((rows) => rows.filter((r) => typeIds.includes(r.typeId)))
    : [];

  // Build recipe structure with choices per type
  const recipeStructure = bindings.map((binding) => {
    const choices = allChoices
      .filter((c) => c.typeId === binding.typeId)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const defaultChoice = binding.defaultChoiceId
      ? choices.find((c) => c.id === binding.defaultChoiceId)
      : choices.find((c) => c.isDefault);

    return {
      bindingId: binding.bindingId,
      typeKey: binding.typeKey,
      typeNameKo: binding.typeNameKo,
      uiControl: binding.uiControl,
      optionCategory: binding.optionCategory,
      displayOrder: binding.displayOrder,
      processingOrder: binding.processingOrder,
      isRequired: binding.isRequired,
      defaultChoiceId: defaultChoice?.id ?? null,
      choices: choices.map((c) => ({
        id: c.id,
        choiceKey: c.choiceKey,
        displayName: c.displayName,
        value: c.value,
        isDefault: c.isDefault,
        thumbnailUrl: c.thumbnailUrl,
        colorHex: c.colorHex,
        priceImpact: c.priceImpact,
        widthMm: c.widthMm ? Number(c.widthMm) : null,
        heightMm: c.heightMm ? Number(c.heightMm) : null,
      })),
    };
  });

  // Build default selections from default choices
  const defaultSelections: Selections = {};
  for (const option of recipeStructure) {
    const defaultChoice = option.choices.find((c) => c.id === option.defaultChoiceId);
    if (defaultChoice) {
      defaultSelections[option.typeKey] = defaultChoice.value ?? defaultChoice.choiceKey;
    }
  }

  // Build constraint rules for client-side json-rules-engine
  const constraintRules = constraints.map((c) => ({
    name: c.constraintName,
    conditions: {
      all: [
        {
          fact: c.triggerOptionType,
          operator: c.triggerOperator.toLowerCase(),
          value: c.triggerValues,
        },
      ],
    },
    event: {
      type: 'constraint',
      params: {
        actions: c.actions,
        priority: c.priority,
      },
    },
    priority: c.priority,
  }));

  // Calculate default quote with default selections
  const priceMode = priceConfig?.priceMode ?? 'LOOKUP';
  const [defaultQuote] = await Promise.all([
    calculateDefaultPrice(product.id, priceMode, defaultSelections),
  ]);

  // Evaluate constraints for default selections
  const { uiActions, violations, addons } = evaluateConstraints(constraints, defaultSelections);

  const responseData = {
    product: {
      id: product.id,
      productKey: product.productKey,
      productNameKo: product.productNameKo,
      productNameEn: product.productNameEn,
      mesItemCd: product.mesItemCd,
      hasEditor: product.hasEditor,
      hasUpload: product.hasUpload,
      thumbnailUrl: product.thumbnailUrl,
    },
    recipe: {
      id: activeRecipe.id,
      recipeVersion: activeRecipe.recipeVersion,
      recipeName: activeRecipe.recipeName,
      options: recipeStructure,
    },
    constraintRules,
    defaultSelections,
    defaultQuote: {
      isValid: violations.length === 0,
      uiActions,
      pricing: defaultQuote,
      violations,
      addons,
    },
  };

  return NextResponse.json(responseData, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=60',
      'Content-Type': 'application/json',
    },
  });
});
