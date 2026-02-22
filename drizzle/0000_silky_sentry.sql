CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"parent_id" integer,
	"depth" smallint DEFAULT 0 NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"icon_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "product_sizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"cut_width" numeric(8, 2),
	"cut_height" numeric(8, 2),
	"work_width" numeric(8, 2),
	"work_height" numeric(8, 2),
	"bleed" numeric(5, 2) DEFAULT '3.0',
	"imposition_count" smallint,
	"sheet_standard" varchar(5),
	"display_order" smallint DEFAULT 0 NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"custom_min_w" numeric(8, 2),
	"custom_min_h" numeric(8, 2),
	"custom_max_w" numeric(8, 2),
	"custom_max_h" numeric(8, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_sizes_product_id_code_key" UNIQUE("product_id","code")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"huni_code" varchar(10) NOT NULL,
	"edicus_code" varchar(15),
	"shopby_id" integer,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"product_type" varchar(30) NOT NULL,
	"pricing_model" varchar(30) NOT NULL,
	"sheet_standard" varchar(5),
	"figma_section" varchar(50),
	"order_method" varchar(20) DEFAULT 'upload' NOT NULL,
	"editor_enabled" boolean DEFAULT false NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"mes_registered" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_huni_code_unique" UNIQUE("huni_code"),
	CONSTRAINT "products_edicus_code_unique" UNIQUE("edicus_code"),
	CONSTRAINT "products_shopby_id_unique" UNIQUE("shopby_id"),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"material_type" varchar(30) NOT NULL,
	"thickness" varchar(20),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materials_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "paper_product_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"paper_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"cover_type" varchar(10),
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paper_product_mapping_paper_id_product_id_cover_type_key" UNIQUE("paper_id","product_id","cover_type")
);
--> statement-breakpoint
CREATE TABLE "papers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"abbreviation" varchar(20),
	"weight" smallint,
	"sheet_size" varchar(50),
	"cost_per_rear" numeric(12, 2),
	"selling_per_rear" numeric(12, 2),
	"cost_per4_cut" numeric(10, 2),
	"selling_per4_cut" numeric(10, 2),
	"display_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "papers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "bindings" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(50) NOT NULL,
	"min_pages" smallint,
	"max_pages" smallint,
	"page_step" smallint,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bindings_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "imposition_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"cut_size_code" varchar(30) NOT NULL,
	"cut_width" numeric(8, 2) NOT NULL,
	"cut_height" numeric(8, 2) NOT NULL,
	"work_width" numeric(8, 2) NOT NULL,
	"work_height" numeric(8, 2) NOT NULL,
	"imposition_count" smallint NOT NULL,
	"sheet_standard" varchar(5) NOT NULL,
	"description" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "imposition_rules_cut_width_cut_height_sheet_standard_key" UNIQUE("cut_width","cut_height","sheet_standard")
);
--> statement-breakpoint
CREATE TABLE "post_processes" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_code" varchar(20) NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"process_type" varchar(30) NOT NULL,
	"sub_option_code" smallint,
	"sub_option_name" varchar(50),
	"price_basis" varchar(15) DEFAULT 'per_unit' NOT NULL,
	"sheet_standard" varchar(5),
	"display_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_processes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "print_modes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"sides" varchar(10) NOT NULL,
	"color_type" varchar(20) NOT NULL,
	"price_code" smallint NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "print_modes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "fixed_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"size_id" integer,
	"paper_id" integer,
	"material_id" integer,
	"print_mode_id" integer,
	"option_label" varchar(100),
	"base_qty" integer DEFAULT 1 NOT NULL,
	"selling_price" numeric(12, 2) NOT NULL,
	"cost_price" numeric(12, 2),
	"vat_included" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foil_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"foil_type" varchar(30) NOT NULL,
	"foil_color" varchar(30),
	"plate_material" varchar(20),
	"target_product_type" varchar(30),
	"width" numeric(8, 2) NOT NULL,
	"height" numeric(8, 2) NOT NULL,
	"selling_price" numeric(12, 2) NOT NULL,
	"cost_price" numeric(12, 2),
	"display_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loss_quantity_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_type" varchar(20) NOT NULL,
	"scope_id" integer,
	"loss_rate" numeric(5, 4) NOT NULL,
	"min_loss_qty" integer DEFAULT 0 NOT NULL,
	"description" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loss_quantity_config_scope_type_scope_id_key" UNIQUE("scope_type","scope_id")
);
--> statement-breakpoint
CREATE TABLE "package_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"size_id" integer NOT NULL,
	"print_mode_id" integer NOT NULL,
	"page_count" smallint NOT NULL,
	"min_qty" integer NOT NULL,
	"max_qty" integer DEFAULT 999999 NOT NULL,
	"selling_price" numeric(12, 2) NOT NULL,
	"cost_price" numeric(12, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"price_type" varchar(10) NOT NULL,
	"quantity_basis" varchar(20) NOT NULL,
	"sheet_standard" varchar(5),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_tables_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "price_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"price_table_id" integer NOT NULL,
	"option_code" varchar(50) NOT NULL,
	"min_qty" integer NOT NULL,
	"max_qty" integer DEFAULT 999999 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_choices" (
	"id" serial PRIMARY KEY NOT NULL,
	"option_definition_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"price_key" varchar(50),
	"ref_paper_id" integer,
	"ref_material_id" integer,
	"ref_print_mode_id" integer,
	"ref_post_process_id" integer,
	"ref_binding_id" integer,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "option_choices_option_definition_id_code_key" UNIQUE("option_definition_id","code")
);
--> statement-breakpoint
CREATE TABLE "option_constraints" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"constraint_type" varchar(20) NOT NULL,
	"source_option_id" integer,
	"source_field" varchar(50) NOT NULL,
	"operator" varchar(10) NOT NULL,
	"value" varchar(200),
	"value_min" varchar(100),
	"value_max" varchar(100),
	"target_option_id" integer,
	"target_field" varchar(50) NOT NULL,
	"target_action" varchar(20) NOT NULL,
	"target_value" varchar(200),
	"description" varchar(500),
	"priority" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"option_class" varchar(20) NOT NULL,
	"option_type" varchar(30) NOT NULL,
	"ui_component" varchar(30) NOT NULL,
	"description" varchar(500),
	"display_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "option_definitions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "option_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"parent_option_id" integer NOT NULL,
	"parent_choice_id" integer,
	"child_option_id" integer NOT NULL,
	"dependency_type" varchar(20) DEFAULT 'visibility' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"option_definition_id" integer NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"ui_component_override" varchar(30),
	"default_choice_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_options_product_id_option_definition_id_key" UNIQUE("product_id","option_definition_id")
);
--> statement-breakpoint
CREATE TABLE "mes_item_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"mes_item_id" integer NOT NULL,
	"option_number" smallint NOT NULL,
	"option_value" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mes_item_options_mes_item_id_option_number_key" UNIQUE("mes_item_id","option_number")
);
--> statement-breakpoint
CREATE TABLE "mes_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_code" varchar(20) NOT NULL,
	"group_code" varchar(20),
	"name" varchar(200) NOT NULL,
	"abbreviation" varchar(50),
	"item_type" varchar(20) NOT NULL,
	"unit" varchar(10) DEFAULT 'EA' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mes_items_item_code_unique" UNIQUE("item_code")
);
--> statement-breakpoint
CREATE TABLE "option_choice_mes_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"option_choice_id" integer NOT NULL,
	"mes_item_id" integer,
	"mes_code" varchar(50),
	"mapping_type" varchar(20) NOT NULL,
	"mapping_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"mapped_by" varchar(100),
	"mapped_at" timestamp with time zone,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "option_choice_mes_mapping_option_choice_id_mapping_type_key" UNIQUE("option_choice_id","mapping_type")
);
--> statement-breakpoint
CREATE TABLE "product_editor_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"editor_type" varchar(30) DEFAULT 'edicus' NOT NULL,
	"template_id" varchar(100),
	"template_config" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_editor_mapping_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "product_mes_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"mes_item_id" integer NOT NULL,
	"cover_type" varchar(10),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_mes_mapping_product_id_mes_item_id_cover_type_key" UNIQUE("product_id","mes_item_id","cover_type")
);
--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "product_sizes_product_id_idx" ON "product_sizes" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_product_type_idx" ON "products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "products_pricing_model_idx" ON "products" USING btree ("pricing_model");--> statement-breakpoint
CREATE INDEX "materials_material_type_idx" ON "materials" USING btree ("material_type");--> statement-breakpoint
CREATE INDEX "papers_weight_idx" ON "papers" USING btree ("weight");--> statement-breakpoint
CREATE INDEX "imposition_rules_sheet_standard_idx" ON "imposition_rules" USING btree ("sheet_standard");--> statement-breakpoint
CREATE INDEX "post_processes_group_code_idx" ON "post_processes" USING btree ("group_code");--> statement-breakpoint
CREATE INDEX "post_processes_process_type_idx" ON "post_processes" USING btree ("process_type");--> statement-breakpoint
CREATE INDEX "print_modes_price_code_idx" ON "print_modes" USING btree ("price_code");--> statement-breakpoint
CREATE INDEX "fixed_prices_product_id_idx" ON "fixed_prices" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "fixed_prices_size_id_idx" ON "fixed_prices" USING btree ("size_id");--> statement-breakpoint
CREATE INDEX "fixed_prices_product_id_size_id_paper_id_print_mode_id_idx" ON "fixed_prices" USING btree ("product_id","size_id","paper_id","print_mode_id");--> statement-breakpoint
CREATE INDEX "foil_prices_foil_type_idx" ON "foil_prices" USING btree ("foil_type");--> statement-breakpoint
CREATE INDEX "foil_prices_foil_type_width_height_idx" ON "foil_prices" USING btree ("foil_type","width","height");--> statement-breakpoint
CREATE INDEX "foil_prices_target_product_type_idx" ON "foil_prices" USING btree ("target_product_type");--> statement-breakpoint
CREATE INDEX "loss_quantity_config_scope_type_idx" ON "loss_quantity_config" USING btree ("scope_type");--> statement-breakpoint
CREATE INDEX "package_prices_product_id_idx" ON "package_prices" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "package_prices_product_id_size_id_print_mode_id_page_count_min_qty_idx" ON "package_prices" USING btree ("product_id","size_id","print_mode_id","page_count","min_qty");--> statement-breakpoint
CREATE INDEX "price_tables_price_type_idx" ON "price_tables" USING btree ("price_type");--> statement-breakpoint
CREATE INDEX "price_tables_sheet_standard_idx" ON "price_tables" USING btree ("sheet_standard");--> statement-breakpoint
CREATE INDEX "price_tiers_price_table_id_idx" ON "price_tiers" USING btree ("price_table_id");--> statement-breakpoint
CREATE INDEX "price_tiers_option_code_idx" ON "price_tiers" USING btree ("option_code");--> statement-breakpoint
CREATE INDEX "price_tiers_price_table_id_option_code_min_qty_idx" ON "price_tiers" USING btree ("price_table_id","option_code","min_qty");--> statement-breakpoint
CREATE INDEX "option_choices_option_definition_id_idx" ON "option_choices" USING btree ("option_definition_id");--> statement-breakpoint
CREATE INDEX "option_choices_price_key_idx" ON "option_choices" USING btree ("price_key");--> statement-breakpoint
CREATE INDEX "option_choices_ref_paper_id_idx" ON "option_choices" USING btree ("ref_paper_id");--> statement-breakpoint
CREATE INDEX "option_choices_ref_print_mode_id_idx" ON "option_choices" USING btree ("ref_print_mode_id");--> statement-breakpoint
CREATE INDEX "option_constraints_product_id_idx" ON "option_constraints" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "option_constraints_constraint_type_idx" ON "option_constraints" USING btree ("constraint_type");--> statement-breakpoint
CREATE INDEX "option_constraints_source_option_id_idx" ON "option_constraints" USING btree ("source_option_id");--> statement-breakpoint
CREATE INDEX "option_constraints_target_option_id_idx" ON "option_constraints" USING btree ("target_option_id");--> statement-breakpoint
CREATE INDEX "option_definitions_option_class_idx" ON "option_definitions" USING btree ("option_class");--> statement-breakpoint
CREATE INDEX "option_dependencies_product_id_idx" ON "option_dependencies" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "option_dependencies_parent_option_id_parent_choice_id_idx" ON "option_dependencies" USING btree ("parent_option_id","parent_choice_id");--> statement-breakpoint
CREATE INDEX "option_dependencies_child_option_id_idx" ON "option_dependencies" USING btree ("child_option_id");--> statement-breakpoint
CREATE INDEX "product_options_product_id_idx" ON "product_options" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_options_product_id_is_visible_display_order_idx" ON "product_options" USING btree ("product_id","is_visible","display_order");--> statement-breakpoint
CREATE INDEX "mes_item_options_mes_item_id_idx" ON "mes_item_options" USING btree ("mes_item_id");--> statement-breakpoint
CREATE INDEX "mes_items_group_code_idx" ON "mes_items" USING btree ("group_code");--> statement-breakpoint
CREATE INDEX "mes_items_item_type_idx" ON "mes_items" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "option_choice_mes_mapping_option_choice_id_idx" ON "option_choice_mes_mapping" USING btree ("option_choice_id");--> statement-breakpoint
CREATE INDEX "option_choice_mes_mapping_mes_item_id_idx" ON "option_choice_mes_mapping" USING btree ("mes_item_id");--> statement-breakpoint
CREATE INDEX "option_choice_mes_mapping_mapping_status_idx" ON "option_choice_mes_mapping" USING btree ("mapping_status");--> statement-breakpoint
CREATE INDEX "product_editor_mapping_editor_type_idx" ON "product_editor_mapping" USING btree ("editor_type");--> statement-breakpoint
CREATE INDEX "product_mes_mapping_product_id_idx" ON "product_mes_mapping" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_mes_mapping_mes_item_id_idx" ON "product_mes_mapping" USING btree ("mes_item_id");