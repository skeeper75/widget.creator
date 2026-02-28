import postgres from "postgres";

const url = process.env.DATABASE_URL!;
console.log('Connecting to:', url.replace(/:[^:@]+@/, ':***@'));
const client = postgres(url, { max: 1 });

async function main() {
  try {
    // Applied migrations
    const migrations = await client`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
    console.log('Applied migrations:');
    for (const m of migrations) {
      console.log('  hash:', (m as any).hash.substring(0, 20) + '...');
    }
    console.log('  Total:', migrations.length, 'migrations');
    
    // Key table row counts
    const counts = await client`
      SELECT 
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM papers) as papers,
        (SELECT COUNT(*) FROM mes_items) as mes_items,
        (SELECT COUNT(*) FROM print_modes) as print_modes,
        (SELECT COUNT(*) FROM post_processes) as post_processes,
        (SELECT COUNT(*) FROM bindings) as bindings,
        (SELECT COUNT(*) FROM product_sizes) as product_sizes,
        (SELECT COUNT(*) FROM price_tiers) as price_tiers,
        (SELECT COUNT(*) FROM product_mes_mapping) as product_mes_mapping
    `;
    console.log('\nRow counts:', JSON.stringify(counts[0], null, 2));
    
    // Check if SPEC-IM-004 columns exist
    const cols = await client`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name IN ('legacy_huni_id', 'excel_mes_code', 'huni_code')
      ORDER BY column_name
    `;
    console.log('\nSPEC-IM-004 columns on products:', cols.map((r: any) => r.column_name).join(', '));
    
    const pmCols = await client`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'product_mes_mapping'
      ORDER BY column_name
    `;
    console.log('product_mes_mapping columns:', pmCols.map((r: any) => r.column_name).join(', '));
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
main();
