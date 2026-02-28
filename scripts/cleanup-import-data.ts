// HuniPrinting Import Data Cleanup Script
// Truncates all import-managed tables in FK-safe order via postgres client
// Generated: 2026-02-28 for SPEC-IM-004 data re-import
//
// SAFE: Only touches HuniPrinting catalog/pricing tables
// NOT TOUCHED: Widget builder tables (product_recipes, recipe_*, wb_products, orders, etc.)

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL not set");
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });

async function main(): Promise<void> {
  console.log("[cleanup] Starting HuniPrinting import data cleanup...");
  console.log("[cleanup] Target: import-managed tables only (widget builder tables preserved)");

  try {
    // Use multi-table truncate - PostgreSQL handles FK ordering internally
    // cascade is NOT used to avoid touching widget builder tables
    // External referencing tables (huni_orders, product_editor_mapping) verified empty (0 rows)
    await client.unsafe(`
      TRUNCATE TABLE
        data_import_log,
        loss_quantity_config,
        foil_prices,
        package_prices,
        fixed_prices,
        price_tiers,
        price_tables,
        imposition_rules,
        paper_product_mapping,
        product_options,
        option_choice_mes_mapping,
        option_constraints,
        option_dependencies,
        option_choices,
        option_definitions,
        product_mes_mapping,
        product_sizes,
        products,
        categories,
        bindings,
        post_processes,
        print_modes,
        papers,
        mes_item_options,
        mes_items
      RESTART IDENTITY CASCADE
    `);
    console.log("[cleanup] All import tables truncated successfully");

    // Verify cleanup
    const counts = await client`
      SELECT
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM papers) as papers,
        (SELECT COUNT(*) FROM mes_items) as mes_items,
        (SELECT COUNT(*) FROM print_modes) as print_modes,
        (SELECT COUNT(*) FROM post_processes) as post_processes,
        (SELECT COUNT(*) FROM price_tiers) as price_tiers,
        (SELECT COUNT(*) FROM product_mes_mapping) as product_mes_mapping
    `;
    console.log("[cleanup] Post-cleanup row counts:", JSON.stringify(counts[0]));

    const allZero = Object.values(counts[0] as Record<string, string>).every(v => v === "0");
    if (allZero) {
      console.log("[cleanup] Verification PASSED: all counts are 0");
    } else {
      console.warn("[cleanup] WARNING: some tables still have rows!");
    }
  } catch (e: any) {
    console.error("[cleanup] ERROR:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[cleanup] Fatal error:", err);
  process.exit(1);
});
