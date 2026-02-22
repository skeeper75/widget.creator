import { describe, it, expect } from 'vitest';
import { evaluatePaperCondition } from '../../../src/constraints/handlers/paper-condition.js';
import type { OptionConstraint, SelectedOption } from '../../../src/options/types.js';
import type { Paper } from '../../../src/constraints/types.js';

function makeConstraint(overrides: Partial<OptionConstraint> = {}): OptionConstraint {
  return {
    id: 1, productId: 1, constraintType: 'paper_condition',
    sourceField: 'paperType', targetField: 'coating',
    operator: 'gte', value: '180',
    valueMin: null, valueMax: null, targetValue: null,
    priority: 1, isActive: true,
    description: 'Paper must be 180g+ for coating',
    ...overrides,
  };
}

const testPapers: Paper[] = [
  { id: 1, name: 'Art 250g', weight: 250, costPer4Cut: 200, sellingPer4Cut: 240 },
  { id: 2, name: 'Art 150g', weight: 150, costPer4Cut: 150, sellingPer4Cut: 180 },
  { id: 3, name: 'Kraft 120g', weight: 120, costPer4Cut: 100, sellingPer4Cut: 130 },
];

describe('evaluatePaperCondition', () => {
  it('returns disable when no paper is selected', () => {
    const result = evaluatePaperCondition(makeConstraint(), new Map(), testPapers);
    expect(result.action).toBe('disable');
    expect(result.violated).toBe(false);
  });

  it('returns disable when paper is not found', () => {
    const selections = new Map<string, SelectedOption>([
      ['paperType', { optionKey: 'paperType', choiceCode: 'X', refPaperId: 999 }],
    ]);
    const result = evaluatePaperCondition(makeConstraint(), selections, testPapers);
    expect(result.action).toBe('disable');
  });

  it('enables when paper weight >= threshold (gte)', () => {
    const selections = new Map<string, SelectedOption>([
      ['paperType', { optionKey: 'paperType', choiceCode: 'ART250', refPaperId: 1 }],
    ]);
    const result = evaluatePaperCondition(makeConstraint(), selections, testPapers);
    expect(result.action).toBe('enable');
  });

  it('disables when paper weight < threshold (gte)', () => {
    const selections = new Map<string, SelectedOption>([
      ['paperType', { optionKey: 'paperType', choiceCode: 'ART150', refPaperId: 2 }],
    ]);
    const result = evaluatePaperCondition(makeConstraint(), selections, testPapers);
    expect(result.action).toBe('disable');
  });

  it('enables when paper weight <= threshold (lte)', () => {
    const selections = new Map<string, SelectedOption>([
      ['paperType', { optionKey: 'paperType', choiceCode: 'KRAFT120', refPaperId: 3 }],
    ]);
    const constraint = makeConstraint({ operator: 'lte', value: '150' });
    const result = evaluatePaperCondition(constraint, selections, testPapers);
    expect(result.action).toBe('enable');
  });

  it('disables when paper weight > threshold (lte)', () => {
    const selections = new Map<string, SelectedOption>([
      ['paperType', { optionKey: 'paperType', choiceCode: 'ART250', refPaperId: 1 }],
    ]);
    const constraint = makeConstraint({ operator: 'lte', value: '150' });
    const result = evaluatePaperCondition(constraint, selections, testPapers);
    expect(result.action).toBe('disable');
  });

  it('enables when paper weight matches exactly (eq)', () => {
    const selections = new Map<string, SelectedOption>([
      ['paperType', { optionKey: 'paperType', choiceCode: 'ART250', refPaperId: 1 }],
    ]);
    const constraint = makeConstraint({ operator: 'eq', value: '250' });
    const result = evaluatePaperCondition(constraint, selections, testPapers);
    expect(result.action).toBe('enable');
  });

  it('disables for unknown operator', () => {
    const selections = new Map<string, SelectedOption>([
      ['paperType', { optionKey: 'paperType', choiceCode: 'ART250', refPaperId: 1 }],
    ]);
    const constraint = makeConstraint({ operator: 'unknown' });
    const result = evaluatePaperCondition(constraint, selections, testPapers);
    expect(result.action).toBe('disable');
  });

  it('handles paper with null weight', () => {
    const papers: Paper[] = [
      { id: 10, name: 'Unknown', weight: null, costPer4Cut: 100, sellingPer4Cut: 120 },
    ];
    const selections = new Map<string, SelectedOption>([
      ['paperType', { optionKey: 'paperType', choiceCode: 'UNK', refPaperId: 10 }],
    ]);
    const result = evaluatePaperCondition(makeConstraint(), selections, papers);
    expect(result.action).toBe('disable'); // 0 < 180
  });
});
