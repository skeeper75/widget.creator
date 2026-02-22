import {
  pgTable,
  serial,
  varchar,
  integer,
  smallint,
  boolean,
  timestamp,
  text,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// HuniOptionDefinition: Master option type definitions
export const optionDefinitions = pgTable('option_definitions', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  optionClass: varchar('option_class', { length: 20 }).notNull(),
  optionType: varchar('option_type', { length: 30 }).notNull(),
  uiComponent: varchar('ui_component', { length: 30 }).notNull(),
  description: varchar('description', { length: 500 }),
  displayOrder: smallint('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('option_definitions_option_class_idx').on(t.optionClass),
]);

// HuniProductOption: Product-specific option configurations
export const productOptions = pgTable('product_options', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull(),
  optionDefinitionId: integer('option_definition_id').notNull(),
  displayOrder: smallint('display_order').default(0).notNull(),
  isRequired: boolean('is_required').default(false).notNull(),
  isVisible: boolean('is_visible').default(true).notNull(),
  isInternal: boolean('is_internal').default(false).notNull(),
  uiComponentOverride: varchar('ui_component_override', { length: 30 }),
  defaultChoiceId: integer('default_choice_id'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  unique('product_options_product_id_option_definition_id_key').on(t.productId, t.optionDefinitionId),
  index('product_options_product_id_idx').on(t.productId),
  index('product_options_product_id_is_visible_display_order_idx').on(t.productId, t.isVisible, t.displayOrder),
]);

// HuniOptionChoice: Available choices per option definition
export const optionChoices = pgTable('option_choices', {
  id: serial('id').primaryKey(),
  optionDefinitionId: integer('option_definition_id').notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  priceKey: varchar('price_key', { length: 50 }),
  refPaperId: integer('ref_paper_id'),
  refMaterialId: integer('ref_material_id'),
  refPrintModeId: integer('ref_print_mode_id'),
  refPostProcessId: integer('ref_post_process_id'),
  refBindingId: integer('ref_binding_id'),
  displayOrder: smallint('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  unique('option_choices_option_definition_id_code_key').on(t.optionDefinitionId, t.code),
  index('option_choices_option_definition_id_idx').on(t.optionDefinitionId),
  index('option_choices_price_key_idx').on(t.priceKey),
  index('option_choices_ref_paper_id_idx').on(t.refPaperId),
  index('option_choices_ref_print_mode_id_idx').on(t.refPrintModeId),
]);

// HuniOptionConstraint: UI visibility and value constraints per product
export const optionConstraints = pgTable('option_constraints', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull(),
  constraintType: varchar('constraint_type', { length: 20 }).notNull(),
  sourceOptionId: integer('source_option_id'),
  sourceField: varchar('source_field', { length: 50 }).notNull(),
  operator: varchar('operator', { length: 10 }).notNull(),
  value: varchar('value', { length: 200 }),
  valueMin: varchar('value_min', { length: 100 }),
  valueMax: varchar('value_max', { length: 100 }),
  targetOptionId: integer('target_option_id'),
  targetField: varchar('target_field', { length: 50 }).notNull(),
  targetAction: varchar('target_action', { length: 20 }).notNull(),
  targetValue: varchar('target_value', { length: 200 }),
  description: varchar('description', { length: 500 }),
  priority: smallint('priority').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('option_constraints_product_id_idx').on(t.productId),
  index('option_constraints_constraint_type_idx').on(t.constraintType),
  index('option_constraints_source_option_id_idx').on(t.sourceOptionId),
  index('option_constraints_target_option_id_idx').on(t.targetOptionId),
]);

// HuniOptionDependency: Parent-child option dependency rules
export const optionDependencies = pgTable('option_dependencies', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull(),
  parentOptionId: integer('parent_option_id').notNull(),
  parentChoiceId: integer('parent_choice_id'),
  childOptionId: integer('child_option_id').notNull(),
  dependencyType: varchar('dependency_type', { length: 20 }).default('visibility').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('option_dependencies_product_id_idx').on(t.productId),
  index('option_dependencies_parent_option_id_parent_choice_id_idx').on(t.parentOptionId, t.parentChoiceId),
  index('option_dependencies_child_option_id_idx').on(t.childOptionId),
]);
