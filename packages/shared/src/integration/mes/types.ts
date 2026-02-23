/**
 * MES Integration Types
 *
 * Types for Manufacturing Execution System (TS.BackOffice.Huni) integration.
 */

/**
 * MES API configuration
 */
export interface MesApiConfig {
  /** Base URL for MES API */
  baseUrl: string;
  /** API key for authentication (optional) */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * MES dispatch request for production order
 */
export interface MesDispatchRequest {
  /** MES item code (NNN-NNNN format) */
  itemCode: string;
  /** Material codes for production */
  materialCodes: string[];
  /** Process codes for production */
  processCodes: string[];
  /** Production quantity */
  quantity: number;
  /** Widget Builder order ID for correlation */
  orderId: string;
  /** Optional memo for production notes */
  memo?: string;
}

/**
 * MES dispatch response
 */
export interface MesDispatchResponse {
  /** MES job ID for tracking */
  mesJobId: string;
  /** MES item code */
  itemCode: string;
  /** Dispatch status */
  status: 'accepted' | 'rejected';
  /** Estimated completion date */
  estimatedCompletion?: string;
  /** Error message if rejected */
  errorMessage?: string;
}

/**
 * MES status callback from external system
 */
export interface MesStatusCallback {
  /** MES job ID */
  mesJobId: string;
  /** Current status in Korean */
  status: '제작대기' | '제작중' | '제작완료' | '출고완료';
  /** Barcode for tracking (optional) */
  barcode?: string;
  /** Timestamp of status change */
  timestamp?: string;
}

/**
 * MES item from master data
 */
export interface MesItem {
  id: number;
  itemCode: string;
  groupCode: string | null;
  name: string;
  abbreviation: string | null;
  itemType: string;
  unit: string;
  isActive: boolean;
}

/**
 * MES item option
 */
export interface MesItemOption {
  id: number;
  mesItemId: number;
  optionNumber: number;
  optionValue: string | null;
  isActive: boolean;
}

/**
 * Product to MES item mapping
 */
export interface ProductMesMapping {
  id: number;
  productId: number;
  mesItemId: number;
  coverType: string | null;
  isActive: boolean;
}

/**
 * Option choice to MES code mapping
 */
export interface OptionChoiceMesMapping {
  id: number;
  optionChoiceId: number;
  mesItemId: number | null;
  mesCode: string | null;
  mappingType: 'material' | 'process';
  mappingStatus: 'pending' | 'mapped' | 'verified';
  mappedBy: string | null;
  mappedAt: Date | null;
  notes: string | null;
  isActive: boolean;
}

/**
 * MES mapping status type
 */
export type MesMappingStatus = 'pending' | 'mapped' | 'verified';

/**
 * MES mapping type
 */
export type MesMappingType = 'material' | 'process';
