CREATE TABLE "option_element_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_key" varchar(50) NOT NULL,
	"type_name_ko" varchar(100) NOT NULL,
	"type_name_en" varchar(100) NOT NULL,
	"ui_control" varchar(30) NOT NULL,
	"option_category" varchar(20) DEFAULT 'spec' NOT NULL,
	"allows_custom" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "option_element_types_type_key_unique" UNIQUE("type_key")
);
--> statement-breakpoint
CREATE TABLE "option_element_choices" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_id" integer NOT NULL,
	"choice_key" varchar(100) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"value" varchar(100),
	"mes_code" varchar(100),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"width_mm" numeric(8, 2),
	"height_mm" numeric(8, 2),
	"bleed_mm" numeric(4, 2),
	"basis_weight_gsm" integer,
	"finish_category" varchar(50),
	"thumbnail_url" varchar(500),
	"color_hex" varchar(7),
	"price_impact" varchar(50),
	"price_key" varchar(200),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_oec_type_choice" UNIQUE("type_id","choice_key")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_key" varchar(50) NOT NULL,
	"category_name_ko" varchar(100) NOT NULL,
	"category_name_en" varchar(100),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_category_key_unique" UNIQUE("category_key")
);
--> statement-breakpoint
CREATE TABLE "wb_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"mes_item_cd" varchar(20),
	"edicus_code" varchar(20),
	"edicus_ps_code" varchar(50),
	"shopby_product_no" varchar(50),
	"product_key" varchar(100) NOT NULL,
	"product_name_ko" varchar(200) NOT NULL,
	"product_name_en" varchar(200),
	"category_id" integer NOT NULL,
	"subcategory" varchar(100),
	"product_type" varchar(50),
	"is_premium" boolean DEFAULT false NOT NULL,
	"has_editor" boolean DEFAULT false NOT NULL,
	"has_upload" boolean DEFAULT true NOT NULL,
	"file_spec" jsonb,
	"thumbnail_url" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wb_products_mes_item_cd_unique" UNIQUE("mes_item_cd"),
	CONSTRAINT "wb_products_edicus_code_unique" UNIQUE("edicus_code"),
	CONSTRAINT "wb_products_shopby_product_no_unique" UNIQUE("shopby_product_no"),
	CONSTRAINT "wb_products_product_key_unique" UNIQUE("product_key")
);
--> statement-breakpoint
CREATE TABLE "product_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"recipe_name" varchar(100) NOT NULL,
	"recipe_version" integer DEFAULT 1 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_pr_version" UNIQUE("product_id","recipe_version")
);
--> statement-breakpoint
CREATE TABLE "recipe_option_bindings" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"type_id" integer NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"processing_order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"default_choice_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_rob_recipe_type" UNIQUE("recipe_id","type_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_choice_restrictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_binding_id" integer NOT NULL,
	"choice_id" integer NOT NULL,
	"restriction_mode" varchar(20) NOT NULL,
	CONSTRAINT "uq_rcr" UNIQUE("recipe_binding_id","choice_id")
);
--> statement-breakpoint
CREATE TABLE "constraint_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_key" varchar(100) NOT NULL,
	"template_name_ko" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(50),
	"trigger_option_type" varchar(50),
	"trigger_operator" varchar(20),
	"trigger_values_pattern" jsonb,
	"extra_conditions_pattern" jsonb,
	"actions_pattern" jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "constraint_templates_template_key_unique" UNIQUE("template_key")
);
--> statement-breakpoint
CREATE TABLE "addon_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_name" varchar(100) NOT NULL,
	"group_label" varchar(100),
	"display_mode" varchar(20) DEFAULT 'list' NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_constraints" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"constraint_name" varchar(100) NOT NULL,
	"trigger_option_type" varchar(50) NOT NULL,
	"trigger_operator" varchar(20) NOT NULL,
	"trigger_values" jsonb NOT NULL,
	"extra_conditions" jsonb,
	"actions" jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"input_mode" varchar(20) DEFAULT 'manual' NOT NULL,
	"template_id" integer,
	"comment" text,
	"created_by" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addon_group_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"label_override" varchar(100),
	"is_default" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"price_override" integer,
	CONSTRAINT "uq_agi" UNIQUE("group_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "constraint_nl_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"constraint_id" integer,
	"recipe_id" integer NOT NULL,
	"nl_input_text" text NOT NULL,
	"nl_interpretation" jsonb,
	"ai_model_version" varchar(50),
	"interpretation_score" numeric(3, 2),
	"is_approved" boolean DEFAULT false NOT NULL,
	"approved_by" varchar(100),
	"approved_at" timestamp with time zone,
	"deviation_note" text,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_price_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"price_mode" varchar(20) NOT NULL,
	"formula_text" text,
	"unit_price_sqm" numeric(12, 2),
	"min_area_sqm" numeric(6, 4) DEFAULT '0.1',
	"imposition" integer,
	"cover_price" numeric(12, 2),
	"binding_cost" numeric(12, 2),
	"base_cost" numeric(12, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ppc_product" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "price_nl_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"price_config_id" integer,
	"rule_type" varchar(30) NOT NULL,
	"nl_input_text" text NOT NULL,
	"nl_interpretation" jsonb,
	"ai_model_version" varchar(50),
	"interpretation_score" numeric(3, 2),
	"is_approved" boolean DEFAULT false NOT NULL,
	"approved_by" varchar(100),
	"approved_at" timestamp with time zone,
	"applied_tiers" jsonb,
	"deviation_note" text,
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_cost_base" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"plate_type" varchar(50) NOT NULL,
	"print_mode" varchar(50) NOT NULL,
	"qty_min" integer NOT NULL,
	"qty_max" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postprocess_cost" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"process_code" varchar(50) NOT NULL,
	"process_name_ko" varchar(100) NOT NULL,
	"qty_min" integer DEFAULT 0,
	"qty_max" integer DEFAULT 999999,
	"unit_price" numeric(12, 2) NOT NULL,
	"price_type" varchar(20) DEFAULT 'fixed' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qty_discount" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"qty_min" integer NOT NULL,
	"qty_max" integer NOT NULL,
	"discount_rate" numeric(5, 4) NOT NULL,
	"discount_label" varchar(50),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_qd_product_range" UNIQUE("product_id","qty_min","qty_max")
);
--> statement-breakpoint
CREATE TABLE "simulation_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"selections" jsonb NOT NULL,
	"result_status" varchar(10) NOT NULL,
	"total_price" numeric(12, 2),
	"constraint_violations" jsonb,
	"price_breakdown" jsonb,
	"message" text
);
--> statement-breakpoint
CREATE TABLE "simulation_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"total_cases" integer NOT NULL,
	"passed_count" integer DEFAULT 0 NOT NULL,
	"warned_count" integer DEFAULT 0 NOT NULL,
	"errored_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_by" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "publish_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"action" varchar(20) NOT NULL,
	"completeness" jsonb NOT NULL,
	"simulation_run_id" integer,
	"created_by" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_code" varchar(50) NOT NULL,
	"product_id" integer NOT NULL,
	"recipe_id" integer NOT NULL,
	"recipe_version" integer NOT NULL,
	"selections" jsonb NOT NULL,
	"price_breakdown" jsonb NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"applied_constraints" jsonb,
	"addon_items" jsonb,
	"shopby_order_no" varchar(50),
	"mes_order_id" varchar(50),
	"mes_status" varchar(20) DEFAULT 'pending',
	"customer_name" varchar(100),
	"customer_email" varchar(200),
	"customer_phone" varchar(20),
	"status" varchar(20) DEFAULT 'created' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_code_unique" UNIQUE("order_code")
);
--> statement-breakpoint
CREATE TABLE "quote_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"selections" jsonb NOT NULL,
	"quote_result" jsonb NOT NULL,
	"source" varchar(20) NOT NULL,
	"response_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "option_element_choices" ADD CONSTRAINT "option_element_choices_type_id_option_element_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."option_element_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wb_products" ADD CONSTRAINT "wb_products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_product_id_wb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."wb_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_option_bindings" ADD CONSTRAINT "recipe_option_bindings_recipe_id_product_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."product_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_option_bindings" ADD CONSTRAINT "recipe_option_bindings_type_id_option_element_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."option_element_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_option_bindings" ADD CONSTRAINT "recipe_option_bindings_default_choice_id_option_element_choices_id_fk" FOREIGN KEY ("default_choice_id") REFERENCES "public"."option_element_choices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_choice_restrictions" ADD CONSTRAINT "recipe_choice_restrictions_recipe_binding_id_recipe_option_bindings_id_fk" FOREIGN KEY ("recipe_binding_id") REFERENCES "public"."recipe_option_bindings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_choice_restrictions" ADD CONSTRAINT "recipe_choice_restrictions_choice_id_option_element_choices_id_fk" FOREIGN KEY ("choice_id") REFERENCES "public"."option_element_choices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_constraints" ADD CONSTRAINT "recipe_constraints_recipe_id_product_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."product_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_constraints" ADD CONSTRAINT "recipe_constraints_template_id_constraint_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."constraint_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_group_items" ADD CONSTRAINT "addon_group_items_group_id_addon_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."addon_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_group_items" ADD CONSTRAINT "addon_group_items_product_id_wb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."wb_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constraint_nl_history" ADD CONSTRAINT "constraint_nl_history_constraint_id_recipe_constraints_id_fk" FOREIGN KEY ("constraint_id") REFERENCES "public"."recipe_constraints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constraint_nl_history" ADD CONSTRAINT "constraint_nl_history_recipe_id_product_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."product_recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_configs" ADD CONSTRAINT "product_price_configs_product_id_wb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."wb_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_nl_history" ADD CONSTRAINT "price_nl_history_product_id_wb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."wb_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_nl_history" ADD CONSTRAINT "price_nl_history_price_config_id_product_price_configs_id_fk" FOREIGN KEY ("price_config_id") REFERENCES "public"."product_price_configs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_cost_base" ADD CONSTRAINT "print_cost_base_product_id_wb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."wb_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postprocess_cost" ADD CONSTRAINT "postprocess_cost_product_id_wb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."wb_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qty_discount" ADD CONSTRAINT "qty_discount_product_id_wb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."wb_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_cases" ADD CONSTRAINT "simulation_cases_run_id_simulation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."simulation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_product_id_wb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."wb_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_history" ADD CONSTRAINT "publish_history_product_id_wb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."wb_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_history" ADD CONSTRAINT "publish_history_simulation_run_id_simulation_runs_id_fk" FOREIGN KEY ("simulation_run_id") REFERENCES "public"."simulation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_wb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."wb_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_recipe_id_product_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."product_recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_logs" ADD CONSTRAINT "quote_logs_product_id_wb_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."wb_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_oet_type_key" ON "option_element_types" USING btree ("type_key");--> statement-breakpoint
CREATE INDEX "idx_oet_active" ON "option_element_types" USING btree ("is_active") WHERE "option_element_types"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_oet_category" ON "option_element_types" USING btree ("option_category");--> statement-breakpoint
CREATE INDEX "idx_oec_type_id" ON "option_element_choices" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "idx_oec_mes_code" ON "option_element_choices" USING btree ("mes_code") WHERE "option_element_choices"."mes_code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_oec_active" ON "option_element_choices" USING btree ("type_id","is_active") WHERE "option_element_choices"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_pc_active" ON "product_categories" USING btree ("is_active") WHERE "product_categories"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_prod_category" ON "wb_products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_prod_mes_item" ON "wb_products" USING btree ("mes_item_cd");--> statement-breakpoint
CREATE INDEX "idx_prod_edicus" ON "wb_products" USING btree ("edicus_code");--> statement-breakpoint
CREATE INDEX "idx_prod_edicus_ps" ON "wb_products" USING btree ("edicus_ps_code");--> statement-breakpoint
CREATE INDEX "idx_prod_shopby" ON "wb_products" USING btree ("shopby_product_no");--> statement-breakpoint
CREATE INDEX "idx_prod_subcategory" ON "wb_products" USING btree ("category_id","subcategory");--> statement-breakpoint
CREATE INDEX "idx_prod_active" ON "wb_products" USING btree ("is_active") WHERE "wb_products"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_pr_product" ON "product_recipes" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_pr_default" ON "product_recipes" USING btree ("product_id","is_default");--> statement-breakpoint
CREATE INDEX "idx_rob_recipe" ON "recipe_option_bindings" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_rob_display" ON "recipe_option_bindings" USING btree ("recipe_id","display_order");--> statement-breakpoint
CREATE INDEX "idx_rob_processing" ON "recipe_option_bindings" USING btree ("recipe_id","processing_order");--> statement-breakpoint
CREATE INDEX "idx_rcr_binding" ON "recipe_choice_restrictions" USING btree ("recipe_binding_id");--> statement-breakpoint
CREATE INDEX "idx_ct_active" ON "constraint_templates" USING btree ("is_active") WHERE "constraint_templates"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_ag_active" ON "addon_groups" USING btree ("is_active") WHERE "addon_groups"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_rc_recipe" ON "recipe_constraints" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_rc_trigger" ON "recipe_constraints" USING btree ("recipe_id","trigger_option_type");--> statement-breakpoint
CREATE INDEX "idx_rc_active" ON "recipe_constraints" USING btree ("recipe_id","is_active") WHERE "recipe_constraints"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_rc_priority" ON "recipe_constraints" USING btree ("recipe_id","priority");--> statement-breakpoint
CREATE INDEX "idx_agi_group" ON "addon_group_items" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_cnlh_constraint" ON "constraint_nl_history" USING btree ("constraint_id");--> statement-breakpoint
CREATE INDEX "idx_cnlh_recipe" ON "constraint_nl_history" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_ppc_price_mode" ON "product_price_configs" USING btree ("price_mode");--> statement-breakpoint
CREATE INDEX "idx_pnh_product" ON "price_nl_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_pnh_rule_type" ON "price_nl_history" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "idx_pnh_approved" ON "price_nl_history" USING btree ("is_approved","product_id");--> statement-breakpoint
CREATE INDEX "idx_pcb_product" ON "print_cost_base" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_pcb_lookup" ON "print_cost_base" USING btree ("product_id","plate_type","print_mode","qty_min");--> statement-breakpoint
CREATE INDEX "idx_ppc_product" ON "postprocess_cost" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_ppc_code" ON "postprocess_cost" USING btree ("process_code");--> statement-breakpoint
CREATE INDEX "idx_qd_product" ON "qty_discount" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_sc_run" ON "simulation_cases" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_sc_status" ON "simulation_cases" USING btree ("run_id","result_status");--> statement-breakpoint
CREATE INDEX "idx_sr_product" ON "simulation_runs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_sr_status" ON "simulation_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ph_product" ON "publish_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_ord_product" ON "orders" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_ord_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ord_mes" ON "orders" USING btree ("mes_order_id");--> statement-breakpoint
CREATE INDEX "idx_ord_shopby" ON "orders" USING btree ("shopby_order_no");--> statement-breakpoint
CREATE INDEX "idx_ord_created" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ql_product" ON "quote_logs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_ql_created" ON "quote_logs" USING btree ("created_at");