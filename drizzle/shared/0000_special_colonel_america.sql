CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"parent_id" integer,
	"depth" smallint DEFAULT 0 NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"sheet_name" varchar(50),
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
	"cost_per_ream" numeric(12, 2),
	"selling_per_ream" numeric(12, 2),
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
CREATE TABLE "integration_dead_letters" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_payload" jsonb NOT NULL,
	"adapter_name" varchar(50) NOT NULL,
	"error_message" text NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"replayed_at" timestamp with time zone
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
CREATE TABLE "huni_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"order_number" varchar(30) NOT NULL,
	"status" varchar(30) DEFAULT 'unpaid' NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"currency" varchar(5) DEFAULT 'KRW' NOT NULL,
	"quote_data" jsonb NOT NULL,
	"customer_name" varchar(100) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_phone" varchar(20) NOT NULL,
	"customer_company" varchar(200),
	"shipping_method" varchar(20) NOT NULL,
	"shipping_address" text,
	"shipping_postal_code" varchar(10),
	"shipping_memo" text,
	"shipping_tracking_number" varchar(100),
	"shipping_estimated_date" varchar(30),
	"widget_id" varchar(50),
	"product_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "huni_orders_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "huni_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "order_design_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"file_id" varchar(50) NOT NULL,
	"original_name" varchar(500) NOT NULL,
	"file_number" varchar(500),
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"storage_url" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_design_files_file_id_unique" UNIQUE("file_id")
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"status" varchar(30) NOT NULL,
	"memo" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"widget_id" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"theme" jsonb DEFAULT '{"primary_color":"#5538b6","secondary_color":"#eeebf9","font_family":"Pretendard, sans-serif","border_radius":"8px"}'::jsonb NOT NULL,
	"api_base_url" varchar(500),
	"allowed_origins" jsonb DEFAULT '["*"]'::jsonb NOT NULL,
	"features" jsonb DEFAULT '{"file_upload":true,"editor_integration":true,"price_preview":true}'::jsonb NOT NULL,
	"token_secret" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "widgets_widget_id_unique" UNIQUE("widget_id")
);
--> statement-breakpoint
CREATE TABLE "data_import_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"source_file" varchar(500) NOT NULL,
	"source_hash" varchar(128) NOT NULL,
	"import_version" integer NOT NULL,
	"records_total" integer DEFAULT 0 NOT NULL,
	"records_inserted" integer DEFAULT 0 NOT NULL,
	"records_updated" integer DEFAULT 0 NOT NULL,
	"records_skipped" integer DEFAULT 0 NOT NULL,
	"records_errored" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"error_message" text,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_product_mapping" ADD CONSTRAINT "paper_product_mapping_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_product_mapping" ADD CONSTRAINT "paper_product_mapping_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_prices" ADD CONSTRAINT "fixed_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_prices" ADD CONSTRAINT "fixed_prices_size_id_product_sizes_id_fk" FOREIGN KEY ("size_id") REFERENCES "public"."product_sizes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_prices" ADD CONSTRAINT "fixed_prices_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_prices" ADD CONSTRAINT "fixed_prices_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_prices" ADD CONSTRAINT "fixed_prices_print_mode_id_print_modes_id_fk" FOREIGN KEY ("print_mode_id") REFERENCES "public"."print_modes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_prices" ADD CONSTRAINT "package_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_prices" ADD CONSTRAINT "package_prices_size_id_product_sizes_id_fk" FOREIGN KEY ("size_id") REFERENCES "public"."product_sizes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_prices" ADD CONSTRAINT "package_prices_print_mode_id_print_modes_id_fk" FOREIGN KEY ("print_mode_id") REFERENCES "public"."print_modes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_price_table_id_price_tables_id_fk" FOREIGN KEY ("price_table_id") REFERENCES "public"."price_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_choices" ADD CONSTRAINT "option_choices_option_definition_id_option_definitions_id_fk" FOREIGN KEY ("option_definition_id") REFERENCES "public"."option_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_choices" ADD CONSTRAINT "option_choices_ref_paper_id_papers_id_fk" FOREIGN KEY ("ref_paper_id") REFERENCES "public"."papers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_choices" ADD CONSTRAINT "option_choices_ref_material_id_materials_id_fk" FOREIGN KEY ("ref_material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_choices" ADD CONSTRAINT "option_choices_ref_print_mode_id_print_modes_id_fk" FOREIGN KEY ("ref_print_mode_id") REFERENCES "public"."print_modes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_choices" ADD CONSTRAINT "option_choices_ref_post_process_id_post_processes_id_fk" FOREIGN KEY ("ref_post_process_id") REFERENCES "public"."post_processes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_choices" ADD CONSTRAINT "option_choices_ref_binding_id_bindings_id_fk" FOREIGN KEY ("ref_binding_id") REFERENCES "public"."bindings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_constraints" ADD CONSTRAINT "option_constraints_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_constraints" ADD CONSTRAINT "option_constraints_source_option_id_option_definitions_id_fk" FOREIGN KEY ("source_option_id") REFERENCES "public"."option_definitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_constraints" ADD CONSTRAINT "option_constraints_target_option_id_option_definitions_id_fk" FOREIGN KEY ("target_option_id") REFERENCES "public"."option_definitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_dependencies" ADD CONSTRAINT "option_dependencies_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_dependencies" ADD CONSTRAINT "option_dependencies_parent_option_id_option_definitions_id_fk" FOREIGN KEY ("parent_option_id") REFERENCES "public"."option_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_dependencies" ADD CONSTRAINT "option_dependencies_parent_choice_id_option_choices_id_fk" FOREIGN KEY ("parent_choice_id") REFERENCES "public"."option_choices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_dependencies" ADD CONSTRAINT "option_dependencies_child_option_id_option_definitions_id_fk" FOREIGN KEY ("child_option_id") REFERENCES "public"."option_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_option_definition_id_option_definitions_id_fk" FOREIGN KEY ("option_definition_id") REFERENCES "public"."option_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_default_choice_id_option_choices_id_fk" FOREIGN KEY ("default_choice_id") REFERENCES "public"."option_choices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mes_item_options" ADD CONSTRAINT "mes_item_options_mes_item_id_mes_items_id_fk" FOREIGN KEY ("mes_item_id") REFERENCES "public"."mes_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_choice_mes_mapping" ADD CONSTRAINT "option_choice_mes_mapping_option_choice_id_option_choices_id_fk" FOREIGN KEY ("option_choice_id") REFERENCES "public"."option_choices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_choice_mes_mapping" ADD CONSTRAINT "option_choice_mes_mapping_mes_item_id_mes_items_id_fk" FOREIGN KEY ("mes_item_id") REFERENCES "public"."mes_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_editor_mapping" ADD CONSTRAINT "product_editor_mapping_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_mes_mapping" ADD CONSTRAINT "product_mes_mapping_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_mes_mapping" ADD CONSTRAINT "product_mes_mapping_mes_item_id_mes_items_id_fk" FOREIGN KEY ("mes_item_id") REFERENCES "public"."mes_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "huni_orders" ADD CONSTRAINT "huni_orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_design_files" ADD CONSTRAINT "order_design_files_order_id_huni_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."huni_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_huni_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."huni_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "categories_sheet_name_idx" ON "categories" USING btree ("sheet_name");--> statement-breakpoint
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
CREATE INDEX "integration_dead_letters_status_idx" ON "integration_dead_letters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "integration_dead_letters_adapter_name_idx" ON "integration_dead_letters" USING btree ("adapter_name");--> statement-breakpoint
CREATE INDEX "integration_dead_letters_created_at_idx" ON "integration_dead_letters" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "mes_item_options_mes_item_id_idx" ON "mes_item_options" USING btree ("mes_item_id");--> statement-breakpoint
CREATE INDEX "mes_items_group_code_idx" ON "mes_items" USING btree ("group_code");--> statement-breakpoint
CREATE INDEX "mes_items_item_type_idx" ON "mes_items" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "option_choice_mes_mapping_option_choice_id_idx" ON "option_choice_mes_mapping" USING btree ("option_choice_id");--> statement-breakpoint
CREATE INDEX "option_choice_mes_mapping_mes_item_id_idx" ON "option_choice_mes_mapping" USING btree ("mes_item_id");--> statement-breakpoint
CREATE INDEX "option_choice_mes_mapping_mapping_status_idx" ON "option_choice_mes_mapping" USING btree ("mapping_status");--> statement-breakpoint
CREATE INDEX "product_editor_mapping_editor_type_idx" ON "product_editor_mapping" USING btree ("editor_type");--> statement-breakpoint
CREATE INDEX "product_mes_mapping_product_id_idx" ON "product_mes_mapping" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_mes_mapping_mes_item_id_idx" ON "product_mes_mapping" USING btree ("mes_item_id");--> statement-breakpoint
CREATE INDEX "huni_orders_status_idx" ON "huni_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "huni_orders_customer_email_idx" ON "huni_orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "huni_orders_widget_id_idx" ON "huni_orders" USING btree ("widget_id");--> statement-breakpoint
CREATE INDEX "huni_orders_created_at_idx" ON "huni_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_design_files_order_id_idx" ON "order_design_files" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "widgets_widget_id_idx" ON "widgets" USING btree ("widget_id");--> statement-breakpoint
CREATE INDEX "widgets_status_idx" ON "widgets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "data_import_log_table_name_idx" ON "data_import_log" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "data_import_log_status_idx" ON "data_import_log" USING btree ("status");