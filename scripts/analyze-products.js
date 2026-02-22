const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../ref/wowpress/catalog/products');
const files = fs.readdirSync(dir);
const results = [];

for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const opts = d.options || {};
  results.push({
    file: f,
    name: d.meta ? d.meta.name : 'unknown',
    category: (d.categoryPath || []).join(' > '),
    covers: (opts.covers || []).length,
    sizes: (opts.sizes || []).length,
    papers: (opts.papers || []).length,
    colors: (opts.colors || []).length,
    prints: (opts.printMethods || []).length,
    postProc: (opts.postProcessing || []).length,
    addons: (opts.addons || []).length,
    ordqty: (opts.quantities || []).length,
    hasRaw: d.raw ? true : false
  });
}

results.sort((a, b) => {
  const scoreA = a.covers + a.sizes + a.papers + a.colors + a.prints + a.postProc + a.addons;
  const scoreB = b.covers + b.sizes + b.papers + b.colors + b.prints + b.postProc + b.addons;
  return scoreB - scoreA;
});

console.log('=== Top 10 products by option richness ===\n');
for (const r of results.slice(0, 10)) {
  const score = r.covers + r.sizes + r.papers + r.colors + r.prints + r.postProc + r.addons;
  console.log(`${r.file} | ${r.name} | ${r.category} | score=${score}`);
  console.log(`  covers=${r.covers} sizes=${r.sizes} papers=${r.papers} colors=${r.colors} prints=${r.prints} postProc=${r.postProc} addons=${r.addons} qty=${r.ordqty} raw=${r.hasRaw}`);
}

console.log('\n=== Total products:', results.length);
