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
CREATE TABLE "orders" (
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
	CONSTRAINT "orders_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
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
ALTER TABLE "categories" ADD COLUMN "sheet_name" varchar(50);--> statement-breakpoint
ALTER TABLE "order_design_files" ADD CONSTRAINT "order_design_files_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integration_dead_letters_status_idx" ON "integration_dead_letters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "integration_dead_letters_adapter_name_idx" ON "integration_dead_letters" USING btree ("adapter_name");--> statement-breakpoint
CREATE INDEX "integration_dead_letters_created_at_idx" ON "integration_dead_letters" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_design_files_order_id_idx" ON "order_design_files" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_customer_email_idx" ON "orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "orders_widget_id_idx" ON "orders" USING btree ("widget_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "widgets_widget_id_idx" ON "widgets" USING btree ("widget_id");--> statement-breakpoint
CREATE INDEX "widgets_status_idx" ON "widgets" USING btree ("status");--> statement-breakpoint
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
CREATE INDEX "categories_sheet_name_idx" ON "categories" USING btree ("sheet_name");