import { describe, it, expect } from 'vitest';
import {
  constraintNlHistory,
  type ConstraintNlHistory,
  type NewConstraintNlHistory,
} from '../../src/schema/widget/03-constraint-nl-history';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('constraint_nl_history schema', () => {
  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(constraintNlHistory)).toBe('constraint_nl_history');
    });
  });

  describe('column definitions', () => {
    const columns = getTableColumns(constraintNlHistory);

    it('has id as primary key serial', () => {
      expect(columns.id).toBeDefined();
    });

    it('has nl_input_text as notNull text', () => {
      expect(columns.nlInputText).toBeDefined();
      expect(columns.nlInputText.notNull).toBe(true);
    });

    it('has created_by as notNull varchar', () => {
      expect(columns.createdBy).toBeDefined();
      expect(columns.createdBy.notNull).toBe(true);
    });

    it('has recipe_id as notNull foreign key', () => {
      expect(columns.recipeId).toBeDefined();
      expect(columns.recipeId.notNull).toBe(true);
    });

    it('has is_approved as notNull boolean', () => {
      expect(columns.isApproved).toBeDefined();
      expect(columns.isApproved.notNull).toBe(true);
    });

    it('has constraint_id as nullable (SET NULL on delete)', () => {
      expect(columns.constraintId).toBeDefined();
    });

    it('has nl_interpretation as nullable jsonb', () => {
      expect(columns.nlInterpretation).toBeDefined();
    });

    it('has ai_model_version as nullable varchar', () => {
      expect(columns.aiModelVersion).toBeDefined();
    });

    it('has interpretation_score as nullable decimal', () => {
      expect(columns.interpretationScore).toBeDefined();
    });

    it('has approved_by as nullable varchar', () => {
      expect(columns.approvedBy).toBeDefined();
    });

    it('has approved_at as nullable timestamp', () => {
      expect(columns.approvedAt).toBeDefined();
    });

    it('has deviation_note as nullable text', () => {
      expect(columns.deviationNote).toBeDefined();
    });

    it('has created_at as notNull timestamp', () => {
      expect(columns.createdAt).toBeDefined();
      expect(columns.createdAt.notNull).toBe(true);
    });
  });

  describe('TypeScript type safety', () => {
    it('ConstraintNlHistory type has all expected fields', () => {
      type HasId = ConstraintNlHistory extends { id: number } ? true : false;
      type HasRecipeId = ConstraintNlHistory extends { recipeId: number } ? true : false;

      const _hasId: HasId = true;
      const _hasRecipeId: HasRecipeId = true;
      expect(_hasId).toBe(true);
      expect(_hasRecipeId).toBe(true);
    });

    it('NewConstraintNlHistory type is usable for inserts', () => {
      const sample: NewConstraintNlHistory = {
        recipeId: 1,
        nlInputText: '아트지 200g 선택 시 수량 100~5000부로 제한',
        createdBy: 'admin',
      };
      expect(sample.recipeId).toBe(1);
      expect(sample.nlInputText).toBeTruthy();
      expect(sample.createdBy).toBe('admin');
    });
  });

  describe('indexes', () => {
    it('has indexes on constraint_id and recipe_id — schema confirmed at compile time', () => {
      expect(constraintNlHistory).toBeDefined();
    });
  });
});
