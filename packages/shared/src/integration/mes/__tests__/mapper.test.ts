/**
 * Unit tests for MES mapper functions
 *
 * Tests cover toMesDispatch, mapMesStatus, verifyMesMappings,
 * and parseMesStatusCallback.
 */
import { describe, it, expect } from 'vitest';
import {
  toMesDispatch,
  mapMesStatus,
  verifyMesMappings,
  isValidMesStatus,
  getValidMesStatuses,
  parseMesStatusCallback,
} from '../mapper.js';
import type {
  OrderForMesDispatch,
  ProductMappingForDispatch,
  OptionChoiceMappingForDispatch,
} from '../mapper.js';

const baseOrder: OrderForMesDispatch = {
  orderId: 'ORD-001',
  productId: 1,
  quantity: 100,
  selectedOptions: [
    { choiceId: 10, code: 'MAT-001', value: 'Birch wood' },
    { choiceId: 20, code: 'PRC-001', value: 'Laser cut' },
  ],
};

const baseProductMapping: ProductMappingForDispatch = {
  id: 1,
  productId: 1,
  mesItemId: 100,
  coverType: null,
  isActive: true,
};

const baseMesItem = { itemCode: '100-0001' };

function makeVerifiedMappings(): OptionChoiceMappingForDispatch[] {
  return [
    {
      optionChoiceId: 10,
      mesCode: 'MAT-BIRCH',
      mappingType: 'material',
      mappingStatus: 'verified',
    },
    {
      optionChoiceId: 20,
      mesCode: 'PRC-LASER',
      mappingType: 'process',
      mappingStatus: 'verified',
    },
  ];
}

describe('mapMesStatus', () => {
  it('should map Korean status to PRODUCTION_WAITING', () => {
    expect(mapMesStatus('제작대기')).toBe('PRODUCTION_WAITING');
  });

  it('should map Korean status to PRODUCING', () => {
    expect(mapMesStatus('제작중')).toBe('PRODUCING');
  });

  it('should map Korean status to PRODUCTION_DONE', () => {
    expect(mapMesStatus('제작완료')).toBe('PRODUCTION_DONE');
  });

  it('should map Korean status to SHIPPED', () => {
    expect(mapMesStatus('출고완료')).toBe('SHIPPED');
  });

  it('should return undefined for unrecognized status', () => {
    expect(mapMesStatus('unknown')).toBeUndefined();
  });
});

describe('isValidMesStatus', () => {
  it('should return true for valid MES statuses', () => {
    expect(isValidMesStatus('제작대기')).toBe(true);
    expect(isValidMesStatus('제작중')).toBe(true);
    expect(isValidMesStatus('제작완료')).toBe(true);
    expect(isValidMesStatus('출고완료')).toBe(true);
  });

  it('should return false for invalid status', () => {
    expect(isValidMesStatus('invalid')).toBe(false);
  });
});

describe('getValidMesStatuses', () => {
  it('should return all valid Korean status strings', () => {
    const statuses = getValidMesStatuses();
    expect(statuses).toContain('제작대기');
    expect(statuses).toContain('제작중');
    expect(statuses).toContain('제작완료');
    expect(statuses).toContain('출고완료');
    expect(statuses).toHaveLength(4);
  });
});

describe('toMesDispatch', () => {
  it('should build dispatch request with verified mappings', () => {
    const mappings = makeVerifiedMappings();

    const result = toMesDispatch(baseOrder, baseProductMapping, mappings, baseMesItem);

    expect(result).not.toBeNull();
    expect(result!.itemCode).toBe('100-0001');
    expect(result!.materialCodes).toEqual(['MAT-BIRCH']);
    expect(result!.processCodes).toEqual(['PRC-LASER']);
    expect(result!.quantity).toBe(100);
    expect(result!.orderId).toBe('ORD-001');
  });

  it('should return null when product mapping is null', () => {
    const result = toMesDispatch(baseOrder, null, makeVerifiedMappings(), baseMesItem);
    expect(result).toBeNull();
  });

  it('should return null when mesItem is null', () => {
    const result = toMesDispatch(baseOrder, baseProductMapping, makeVerifiedMappings(), null);
    expect(result).toBeNull();
  });

  it('should return null when option mapping has pending status', () => {
    const mappings: OptionChoiceMappingForDispatch[] = [
      {
        optionChoiceId: 10,
        mesCode: 'MAT-BIRCH',
        mappingType: 'material',
        mappingStatus: 'pending',
      },
      {
        optionChoiceId: 20,
        mesCode: 'PRC-LASER',
        mappingType: 'process',
        mappingStatus: 'verified',
      },
    ];

    const result = toMesDispatch(baseOrder, baseProductMapping, mappings, baseMesItem);
    expect(result).toBeNull();
  });

  it('should return null when option mapping has mapped but not verified status', () => {
    const mappings: OptionChoiceMappingForDispatch[] = [
      {
        optionChoiceId: 10,
        mesCode: 'MAT-BIRCH',
        mappingType: 'material',
        mappingStatus: 'mapped',
      },
      {
        optionChoiceId: 20,
        mesCode: 'PRC-LASER',
        mappingType: 'process',
        mappingStatus: 'verified',
      },
    ];

    const result = toMesDispatch(baseOrder, baseProductMapping, mappings, baseMesItem);
    expect(result).toBeNull();
  });

  it('should return null when option mapping has null mesCode', () => {
    const mappings: OptionChoiceMappingForDispatch[] = [
      {
        optionChoiceId: 10,
        mesCode: null,
        mappingType: 'material',
        mappingStatus: 'verified',
      },
      {
        optionChoiceId: 20,
        mesCode: 'PRC-LASER',
        mappingType: 'process',
        mappingStatus: 'verified',
      },
    ];

    const result = toMesDispatch(baseOrder, baseProductMapping, mappings, baseMesItem);
    expect(result).toBeNull();
  });

  it('should correctly separate material and process codes', () => {
    const order: OrderForMesDispatch = {
      orderId: 'ORD-002',
      productId: 1,
      quantity: 50,
      selectedOptions: [
        { choiceId: 10, code: 'M1', value: 'Material A' },
        { choiceId: 11, code: 'M2', value: 'Material B' },
        { choiceId: 20, code: 'P1', value: 'Process A' },
      ],
    };

    const mappings: OptionChoiceMappingForDispatch[] = [
      { optionChoiceId: 10, mesCode: 'MAT-A', mappingType: 'material', mappingStatus: 'verified' },
      { optionChoiceId: 11, mesCode: 'MAT-B', mappingType: 'material', mappingStatus: 'verified' },
      { optionChoiceId: 20, mesCode: 'PRC-A', mappingType: 'process', mappingStatus: 'verified' },
    ];

    const result = toMesDispatch(order, baseProductMapping, mappings, baseMesItem);

    expect(result!.materialCodes).toEqual(['MAT-A', 'MAT-B']);
    expect(result!.processCodes).toEqual(['PRC-A']);
  });
});

describe('verifyMesMappings', () => {
  it('should return valid when all mappings are verified', () => {
    const result = verifyMesMappings(
      baseOrder,
      baseProductMapping,
      makeVerifiedMappings(),
      baseMesItem
    );

    expect(result.valid).toBe(true);
    expect(result.itemCode).toBe('100-0001');
    expect(result.unmappedChoices).toHaveLength(0);
  });

  it('should return invalid when product mapping is null', () => {
    const result = verifyMesMappings(
      baseOrder,
      null,
      makeVerifiedMappings(),
      baseMesItem
    );

    expect(result.valid).toBe(false);
    expect(result.itemCode).toBeNull();
    expect(result.unmappedChoices).toHaveLength(2);
  });

  it('should list unmapped choices', () => {
    const mappings: OptionChoiceMappingForDispatch[] = [
      {
        optionChoiceId: 10,
        mesCode: 'MAT-BIRCH',
        mappingType: 'material',
        mappingStatus: 'verified',
      },
      // choiceId 20 has no mapping
    ];

    const result = verifyMesMappings(
      baseOrder,
      baseProductMapping,
      mappings,
      baseMesItem
    );

    expect(result.valid).toBe(false);
    expect(result.unmappedChoices).toContain(20);
  });
});

describe('parseMesStatusCallback', () => {
  it('should parse valid callback with mesJobId field', () => {
    const result = parseMesStatusCallback({
      mesJobId: 'JOB-001',
      status: '제작중',
      barcode: 'BC-123',
      timestamp: '2024-01-01T00:00:00Z',
    });

    expect(result).not.toBeNull();
    expect(result!.mesJobId).toBe('JOB-001');
    expect(result!.status).toBe('제작중');
    expect(result!.barcode).toBe('BC-123');
    expect(result!.timestamp).toBe('2024-01-01T00:00:00Z');
  });

  it('should parse valid callback with mes_job_id field (snake_case)', () => {
    const result = parseMesStatusCallback({
      mes_job_id: 'JOB-002',
      status: '제작완료',
    });

    expect(result).not.toBeNull();
    expect(result!.mesJobId).toBe('JOB-002');
  });

  it('should return null for missing mesJobId', () => {
    const result = parseMesStatusCallback({ status: '제작중' });
    expect(result).toBeNull();
  });

  it('should return null for invalid status', () => {
    const result = parseMesStatusCallback({ mesJobId: 'JOB-001', status: 'invalid' });
    expect(result).toBeNull();
  });

  it('should return null for missing status', () => {
    const result = parseMesStatusCallback({ mesJobId: 'JOB-001' });
    expect(result).toBeNull();
  });
});
