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
import { products } from './huni-catalog.schema';
import { papers, materials } from './huni-materials.schema';
import { printModes, postProcesses, bindings } from './huni-processes.schema';

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
  // @MX:NOTE: [AUTO] SPEC-IM-002 Section 12.8.1 - UI metadata columns for Admin rendering
  // Groups options into UI sections; drives chip_group column count and collapse state
  sectionKey: varchar('section_key', { length: 30 }),
  labelKo: varchar('label_ko', { length: 100 }),
  tooltipKo: varchar('tooltip_ko', { length: 500 }),
  unitKo: varchar('unit_ko', { length: 20 }),
  helpTextKo: varchar('help_text_ko', { length: 300 }),
  labelIcon: varchar('label_icon', { length: 50 }),
  layoutWidth: varchar('layout_width', { length: 10 }).default('full'),
  chipColumns: varchar('chip_columns', { length: 5 }).default('auto'),
  collapsedDefault: boolean('collapsed_default').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('option_definitions_option_class_idx').on(t.optionClass),
]);

// HuniOptionChoice: Available choices per option definition
export const optionChoices = pgTable('option_choices', {
  id: serial('id').primaryKey(),
  optionDefinitionId: integer('option_definition_id').notNull().references(() => optionDefinitions.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  priceKey: varchar('price_key', { length: 50 }),
  refPaperId: integer('ref_paper_id').references(() => papers.id, { onDelete: 'set null' }),
  refMaterialId: integer('ref_material_id').references(() => materials.id, { onDelete: 'set null' }),
  refPrintModeId: integer('ref_print_mode_id').references(() => printModes.id, { onDelete: 'set null' }),
  refPostProcessId: integer('ref_post_process_id').references(() => postProcesses.id, { onDelete: 'set null' }),
  refBindingId: integer('ref_binding_id').references(() => bindings.id, { onDelete: 'set null' }),
  displayOrder: smallint('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  // @MX:NOTE: [AUTO] SPEC-IM-002 Section 12.8.2 + Section 13.4.1 - UI display columns for choice rendering
  // Covers image display, swatch colors, badges, sublabels, premium flags, and guide popups
  imageUrl: varchar('image_url', { length: 500 }),
  imageAltKo: varchar('image_alt_ko', { length: 200 }),
  swatchColor: varchar('swatch_color', { length: 7 }),
  swatchGradient: varchar('swatch_gradient', { length: 200 }),
  badgeType: varchar('badge_type', { length: 20 }),
  badgeTextKo: varchar('badge_text_ko', { length: 30 }),
  sublabelKo: varchar('sublabel_ko', { length: 100 }),
  priceDeltaText: varchar('price_delta_text', { length: 30 }),
  isPremium: boolean('is_premium').default(false),
  tooltipKo: varchar('tooltip_ko', { length: 300 }),
  // @MX:NOTE: [AUTO] SPEC-IM-002 Section 13.4.1 - Guide system columns for choice-level help popups
  guideImageUrl: varchar('guide_image_url', { length: 500 }),
  guideTitleKo: varchar('guide_title_ko', { length: 100 }),
  guideBodyKo: text('guide_body_ko'),
  guidePopupPosition: varchar('guide_popup_position', { length: 20 }).default('right'),
  guidePopupWidth: integer('guide_popup_width'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  unique('option_choices_option_definition_id_code_key').on(t.optionDefinitionId, t.code),
  index('option_choices_option_definition_id_idx').on(t.optionDefinitionId),
  index('option_choices_price_key_idx').on(t.priceKey),
  index('option_choices_ref_paper_id_idx').on(t.refPaperId),
  index('option_choices_ref_print_mode_id_idx').on(t.refPrintModeId),
]);

// HuniProductOption: Product-specific option configurations
export const productOptions = pgTable('product_options', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  optionDefinitionId: integer('option_definition_id').notNull().references(() => optionDefinitions.id, { onDelete: 'cascade' }),
  displayOrder: smallint('display_order').default(0).notNull(),
  isRequired: boolean('is_required').default(false).notNull(),
  isVisible: boolean('is_visible').default(true).notNull(),
  isInternal: boolean('is_internal').default(false).notNull(),
  uiComponentOverride: varchar('ui_component_override', { length: 30 }),
  defaultChoiceId: integer('default_choice_id').references(() => optionChoices.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').default(true).notNull(),
  // @MX:NOTE: [AUTO] SPEC-IM-002 Section 12.8.3 - Per-product option overrides and stepper constraints
  // Admin can override labels, set stepper min/max/step, filter visible choices via JSON array
  labelOverrideKo: varchar('label_override_ko', { length: 100 }),
  tooltipOverrideKo: varchar('tooltip_override_ko', { length: 500 }),
  layoutWidthOverride: varchar('layout_width_override', { length: 10 }),
  minValue: integer('min_value'),
  maxValue: integer('max_value'),
  stepValue: integer('step_value'),
  collapsedDefault: boolean('collapsed_default'),
  choiceFilter: varchar('choice_filter', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  unique('product_options_product_id_option_definition_id_key').on(t.productId, t.optionDefinitionId),
  index('product_options_product_id_idx').on(t.productId),
  index('product_options_product_id_is_visible_display_order_idx').on(t.productId, t.isVisible, t.displayOrder),
]);

// HuniOptionConstraint: UI visibility and value constraints per product
export const optionConstraints = pgTable('option_constraints', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  constraintType: varchar('constraint_type', { length: 20 }).notNull(),
  sourceOptionId: integer('source_option_id').references(() => optionDefinitions.id, { onDelete: 'set null' }),
  sourceField: varchar('source_field', { length: 50 }).notNull(),
  operator: varchar('operator', { length: 10 }).notNull(),
  value: varchar('value', { length: 200 }),
  valueMin: varchar('value_min', { length: 100 }),
  valueMax: varchar('value_max', { length: 100 }),
  targetOptionId: integer('target_option_id').references(() => optionDefinitions.id, { onDelete: 'set null' }),
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
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  parentOptionId: integer('parent_option_id').notNull().references(() => optionDefinitions.id, { onDelete: 'restrict' }),
  parentChoiceId: integer('parent_choice_id').references(() => optionChoices.id, { onDelete: 'set null' }),
  childOptionId: integer('child_option_id').notNull().references(() => optionDefinitions.id, { onDelete: 'restrict' }),
  dependencyType: varchar('dependency_type', { length: 20 }).default('visibility').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('option_dependencies_product_id_idx').on(t.productId),
  index('option_dependencies_parent_option_id_parent_choice_id_idx').on(t.parentOptionId, t.parentChoiceId),
  index('option_dependencies_child_option_id_idx').on(t.childOptionId),
]);
