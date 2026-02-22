-- SPEC-INFRA-001: Create 19 missing Huni tables
-- Generated: 2026-02-22

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

