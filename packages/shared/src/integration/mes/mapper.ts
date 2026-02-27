/**
 * MES Data Mapper
 *
 * Transforms between Widget Builder domain types and MES API formats.
 */

import type { OrderStatus } from '../../events/types.js';
import type {
  MesDispatchRequest,
  MesStatusCallback,
  MesMappingStatus,
  MesMappingType,
} from './types.js';

/**
 * Minimal option choice mapping needed for MES dispatch
 */
export interface OptionChoiceMappingForDispatch {
  optionChoiceId: number;
  mesCode: string | null;
  mappingType: MesMappingType;
  mappingStatus: MesMappingStatus;
}

/**
 * Minimal product mapping needed for MES dispatch
 */
export interface ProductMappingForDispatch {
  id: number;
  productId: number;
  mesItemId: number;
  coverType: string | null;
  isActive: boolean;
}

/**
 * MES status to OrderStatus mapping
 */
const MES_STATUS_MAP: Record<string, OrderStatus> = {
  '제작대기': 'PRODUCTION_WAITING',
  '제작중': 'PRODUCING',
  '제작완료': 'PRODUCTION_DONE',
  '출고완료': 'SHIPPED',
};

/**
 * Map MES Korean status to Widget Builder OrderStatus
 *
 * @param mesStatus - MES status in Korean
 * @returns Corresponding OrderStatus, or undefined if not recognized
 */
export function mapMesStatus(mesStatus: string): OrderStatus | undefined {
  return MES_STATUS_MAP[mesStatus];
}

/**
 * Get all valid MES status values
 */
export function getValidMesStatuses(): string[] {
  return Object.keys(MES_STATUS_MAP);
}

/**
 * Validate MES status value
 */
export function isValidMesStatus(status: string): status is keyof typeof MES_STATUS_MAP {
  return status in MES_STATUS_MAP;
}

/**
 * Order data needed for MES dispatch
 */
export interface OrderForMesDispatch {
  orderId: string;
  productId: number;
  quantity: number;
  selectedOptions: Array<{
    choiceId: number;
    code: string;
    value: string;
  }>;
}

/**
 * Result of MES mapping verification
 */
export interface MesMappingVerification {
  valid: boolean;
  itemCode: string | null;
  materialCodes: string[];
  processCodes: string[];
  unmappedChoices: number[];
}

/**
 * Verify all option choices have verified MES mappings
 * and build the MES dispatch request
 *
 * @param order - Order data for dispatch
 * @param productMesMapping - Product to MES item mapping
 * @param optionMappings - Option choice to MES code mappings
 * @param mesItem - MES item code from product mapping
 * @returns MesDispatchRequest if all mappings verified, null otherwise
 */
export function toMesDispatch(
  order: OrderForMesDispatch,
  productMesMapping: ProductMappingForDispatch | null,
  optionMappings: OptionChoiceMappingForDispatch[],
  mesItem: { itemCode: string } | null
): MesDispatchRequest | null {
  // Verify product has MES mapping
  if (!productMesMapping || !mesItem) {
    return null;
  }

  const materialCodes: string[] = [];
  const processCodes: string[] = [];
  const unmappedChoices: number[] = [];

  // Process each option choice mapping
  for (const option of order.selectedOptions) {
    const mapping = optionMappings.find((m) => m.optionChoiceId === option.choiceId);

    if (!mapping) {
      unmappedChoices.push(option.choiceId);
      continue;
    }

    // Only use verified mappings
    if (mapping.mappingStatus !== 'verified') {
      unmappedChoices.push(option.choiceId);
      continue;
    }

    if (!mapping.mesCode) {
      unmappedChoices.push(option.choiceId);
      continue;
    }

    // Add to appropriate code list
    if (mapping.mappingType === 'material') {
      materialCodes.push(mapping.mesCode);
    } else if (mapping.mappingType === 'process') {
      processCodes.push(mapping.mesCode);
    }
  }

  // If any choices are unmapped, cannot dispatch
  if (unmappedChoices.length > 0) {
    return null;
  }

  return {
    itemCode: mesItem.itemCode,
    materialCodes,
    processCodes,
    quantity: order.quantity,
    orderId: order.orderId,
  };
}

/**
 * Verify MES mappings for an order
 *
 * @param order - Order data for verification
 * @param productMesMapping - Product to MES item mapping
 * @param optionMappings - Option choice to MES code mappings
 * @param mesItem - MES item from product mapping
 * @returns Verification result with mapping details
 */
export function verifyMesMappings(
  order: OrderForMesDispatch,
  productMesMapping: ProductMappingForDispatch | null,
  optionMappings: OptionChoiceMappingForDispatch[],
  mesItem: { itemCode: string } | null
): MesMappingVerification {
  const materialCodes: string[] = [];
  const processCodes: string[] = [];
  const unmappedChoices: number[] = [];

  // Verify product has MES mapping
  if (!productMesMapping || !mesItem) {
    return {
      valid: false,
      itemCode: null,
      materialCodes: [],
      processCodes: [],
      unmappedChoices: order.selectedOptions.map((o) => o.choiceId),
    };
  }

  // Process each option choice mapping
  for (const option of order.selectedOptions) {
    const mapping = optionMappings.find((m) => m.optionChoiceId === option.choiceId);

    if (!mapping || mapping.mappingStatus !== 'verified' || !mapping.mesCode) {
      unmappedChoices.push(option.choiceId);
      continue;
    }

    if (mapping.mappingType === 'material') {
      materialCodes.push(mapping.mesCode);
    } else if (mapping.mappingType === 'process') {
      processCodes.push(mapping.mesCode);
    }
  }

  return {
    valid: unmappedChoices.length === 0,
    itemCode: mesItem.itemCode,
    materialCodes,
    processCodes,
    unmappedChoices,
  };
}

/**
 * Parse MES status callback
 *
 * @param callback - Raw callback data from MES
 * @returns Parsed and validated callback data
 */
export function parseMesStatusCallback(callback: Record<string, unknown>): MesStatusCallback | null {
  const mesJobId = callback.mesJobId ?? callback.mes_job_id;
  const status = callback.status;
  const barcode = callback.barcode;
  const timestamp = callback.timestamp;

  if (typeof mesJobId !== 'string' || typeof status !== 'string') {
    return null;
  }

  if (!isValidMesStatus(status)) {
    return null;
  }

  return {
    mesJobId,
    status: status as MesStatusCallback['status'],
    barcode: typeof barcode === 'string' ? barcode : undefined,
    timestamp: typeof timestamp === 'string' ? timestamp : undefined,
  };
}
