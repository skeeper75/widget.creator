-- HuniPrinting Import Data Cleanup SQL
-- Truncates all import-managed tables in FK-safe order
-- Generated: 2026-02-28 for SPEC-IM-004 data re-import
--
-- SAFE: Only touches HuniPrinting catalog/pricing tables
-- NOT TOUCHED: Widget builder tables (product_recipes, recipe_*, wb_products, orders, etc.)

-- Single TRUNCATE with all import tables
-- PostgreSQL handles FK ordering internally for multi-table TRUNCATE
TRUNCATE TABLE
  -- Import log (clear first)
  data_import_log,
  -- Pricing layer (most dependent - deps on products, product_sizes, papers, print_modes)
  loss_quantity_config,
  foil_prices,
  package_prices,
  fixed_prices,
  price_tiers,
  price_tables,
  -- Production rules (deps on product_sizes, papers, products)
  imposition_rules,
  paper_product_mapping,
  -- Options layer (deps on option_definitions, products, mes_items, option_choices)
  product_options,
  option_choice_mes_mapping,
  option_constraints,
  option_dependencies,
  option_choices,
  option_definitions,
  -- Integration mapping (deps on products, mes_items)
  product_mes_mapping,
  -- Catalog layer (deps on categories)
  product_sizes,
  products,
  categories,
  -- Manufacturing layer (referenced by option_choices)
  bindings,
  post_processes,
  print_modes,
  -- Foundation layer (no import-table deps)
  papers,
  mes_item_options,
  mes_items
RESTART IDENTITY;
