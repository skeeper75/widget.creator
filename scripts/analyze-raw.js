const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../ref/wowpress/catalog/products');
const files = fs.readdirSync(dir);
const results = [];

for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const raw = d.raw || {};
  const pi = raw.resultMap && raw.resultMap.prod_info ? raw.resultMap.prod_info : raw;

  results.push({
    file: f,
    id: d.productId,
    name: d.meta ? d.meta.name : (pi.prodname || 'unknown'),
    category: (d.categoryPath || []).join(' > '),
    covers: Array.isArray(pi.coverinfo) ? pi.coverinfo.length : 0,
    sizes: Array.isArray(pi.sizeinfo) ? pi.sizeinfo.length : 0,
    papers: Array.isArray(pi.paperinfo) ? pi.paperinfo.length : 0,
    colors: Array.isArray(pi.colorinfo) ? pi.colorinfo.length : 0,
    prints: Array.isArray(pi.prsjobinfo) ? pi.prsjobinfo.length : 0,
    postProc: Array.isArray(pi.awkjobinfo) ? pi.awkjobinfo.length : 0,
    addons: Array.isArray(pi.prodaddinfo) ? pi.prodaddinfo.length : 0,
    ordqty: Array.isArray(pi.ordqty) ? pi.ordqty.length : 0,
    options: Array.isArray(pi.optioninfo) ? pi.optioninfo.length : 0
  });
}

results.sort((a, b) => {
  const scoreA = a.covers + a.sizes + a.papers + a.colors + a.prints + a.postProc + a.addons + a.options;
  const scoreB = b.covers + b.sizes + b.papers + b.colors + b.prints + b.postProc + b.addons + b.options;
  return scoreB - scoreA;
});

console.log('=== Top 15 products by option richness ===\n');
for (const r of results.slice(0, 15)) {
  const score = r.covers + r.sizes + r.papers + r.colors + r.prints + r.postProc + r.addons + r.options;
  console.log(`${r.file} (${r.id}) | ${r.name} | ${r.category} | score=${score}`);
  console.log(`  cover=${r.covers} size=${r.sizes} paper=${r.papers} color=${r.colors} print=${r.prints} postProc=${r.postProc} addon=${r.addons} qty=${r.ordqty} opt=${r.options}`);
}

console.log('\n=== Total products:', results.length);

// Pick the best one and show its structure
const best = results[0];
console.log('\n=== Best candidate:', best.file, best.name, '===');
