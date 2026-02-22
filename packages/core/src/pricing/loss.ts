// Loss quantity resolution (REQ-PRICE-012)
// Priority: product > category > global

import type { LossQuantityConfig } from './types.js';

/**
 * Resolve loss configuration by priority: product > category > global.
 * Falls back to defaults if no matching config found.
 */
export function resolveLossConfig(
  productId: number,
  categoryId: number,
  configs: LossQuantityConfig[],
): { lossRate: number; minLossQty: number } {
  // Priority 1: product-specific config
  const productConfig = configs.find(
    c => c.scopeType === 'product' && c.scopeId === productId,
  );
  if (productConfig) {
    return { lossRate: productConfig.lossRate, minLossQty: productConfig.minLossQty };
  }

  // Priority 2: category-specific config
  const categoryConfig = configs.find(
    c => c.scopeType === 'category' && c.scopeId === categoryId,
  );
  if (categoryConfig) {
    return { lossRate: categoryConfig.lossRate, minLossQty: categoryConfig.minLossQty };
  }

  // Priority 3: global config
  const globalConfig = configs.find(c => c.scopeType === 'global');
  if (globalConfig) {
    return { lossRate: globalConfig.lossRate, minLossQty: globalConfig.minLossQty };
  }

  // Fallback defaults
  return { lossRate: 0.03, minLossQty: 10 };
}
