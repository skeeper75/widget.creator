// Strategy registry for pricing models (REQ-PRICE-011)

import type { PricingModel, PricingStrategy } from './types.js';
import { calculateFormula } from './models/formula.js';
import { calculateFormulaCutting } from './models/formula-cutting.js';
import { calculateFixedUnit } from './models/fixed-unit.js';
import { calculatePackage } from './models/package.js';
import { calculateComponent } from './models/component.js';
import { calculateFixedSize } from './models/fixed-size.js';
import { calculateFixedPerUnit } from './models/fixed-per-unit.js';

export const pricingRegistry: Record<PricingModel, PricingStrategy> = {
  formula: calculateFormula,
  formula_cutting: calculateFormulaCutting,
  fixed_unit: calculateFixedUnit,
  package: calculatePackage,
  component: calculateComponent,
  fixed_size: calculateFixedSize,
  fixed_per_unit: calculateFixedPerUnit,
};
