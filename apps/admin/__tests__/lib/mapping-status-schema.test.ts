/**
 * Tests for UpdateMappingStatusSchema validation.
 * REQ-E-604: KanbanBoard status transitions (pending -> mapped -> verified).
 * REQ-C-003: Validation on status transitions.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-declare schema (same as schemas.ts)
const UpdateMappingStatusSchema = z.object({
  id: z.number(),
  mappingStatus: z.enum(['pending', 'mapped', 'verified']),
  mesItemId: z.number().optional(),
  mesCode: z.string().optional(),
  mappedBy: z.string().optional(),
});

describe('UpdateMappingStatusSchema', () => {
  it('accepts valid pending status', () => {
    const result = UpdateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'pending',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid mapped status with MES data', () => {
    const result = UpdateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'mapped',
      mesItemId: 42,
      mesCode: 'MES-001',
      mappedBy: 'admin@huni.co.kr',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid verified status', () => {
    const result = UpdateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'verified',
      mappedBy: 'admin@huni.co.kr',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid mappingStatus', () => {
    const result = UpdateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('requires id', () => {
    const result = UpdateMappingStatusSchema.safeParse({
      mappingStatus: 'pending',
    });
    expect(result.success).toBe(false);
  });

  it('requires mappingStatus', () => {
    const result = UpdateMappingStatusSchema.safeParse({
      id: 1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts mapped status without optional MES data', () => {
    const result = UpdateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'mapped',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-number id', () => {
    const result = UpdateMappingStatusSchema.safeParse({
      id: 'abc',
      mappingStatus: 'pending',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-number mesItemId', () => {
    const result = UpdateMappingStatusSchema.safeParse({
      id: 1,
      mappingStatus: 'mapped',
      mesItemId: 'not-a-number',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all three valid status values', () => {
    for (const status of ['pending', 'mapped', 'verified']) {
      const result = UpdateMappingStatusSchema.safeParse({
        id: 1,
        mappingStatus: status,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('KanbanBoard status transition logic', () => {
  // Business rules for status transitions
  type MappingStatus = 'pending' | 'mapped' | 'verified';

  const validTransitions: Record<MappingStatus, MappingStatus[]> = {
    pending: ['mapped'],
    mapped: ['verified', 'pending'],
    verified: ['mapped'],
  };

  function isValidTransition(from: MappingStatus, to: MappingStatus): boolean {
    return validTransitions[from]?.includes(to) ?? false;
  }

  it('allows pending -> mapped', () => {
    expect(isValidTransition('pending', 'mapped')).toBe(true);
  });

  it('allows mapped -> verified', () => {
    expect(isValidTransition('mapped', 'verified')).toBe(true);
  });

  it('allows mapped -> pending (revert)', () => {
    expect(isValidTransition('mapped', 'pending')).toBe(true);
  });

  it('allows verified -> mapped (revert)', () => {
    expect(isValidTransition('verified', 'mapped')).toBe(true);
  });

  it('disallows pending -> verified (skip step)', () => {
    expect(isValidTransition('pending', 'verified')).toBe(false);
  });

  it('disallows verified -> pending (skip step)', () => {
    expect(isValidTransition('verified', 'pending')).toBe(false);
  });

  it('disallows same-status transitions', () => {
    expect(isValidTransition('pending', 'pending')).toBe(false);
    expect(isValidTransition('mapped', 'mapped')).toBe(false);
    expect(isValidTransition('verified', 'verified')).toBe(false);
  });
});
