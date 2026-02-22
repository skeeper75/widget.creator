const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../ref/wowpress/catalog/products');
const files = fs.readdirSync(dir);
const results = [];

for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const pi = d.raw && d.raw.prod_info ? d.raw.prod_info : {};

  const countItems = (arr) => {
    if (!Array.isArray(arr)) return 0;
    let total = 0;
    for (const item of arr) {
      // Count sub-items for richer analysis
      if (item.sizelist) total += item.sizelist.length;
      else if (item.paperlist) total += item.paperlist.length;
      else if (item.pagelist) {
        for (const p of item.pagelist || []) {
          total += (p.colorlist || []).length;
        }
      }
      else if (item.jobgrouplist) {
        for (const g of item.jobgrouplist || []) {
          total += (g.awkjoblist || []).length;
        }
      }
      else total += 1;
    }
    return total;
  };

  const sizeCount = countItems(pi.sizeinfo);
  const paperCount = countItems(pi.paperinfo);
  const colorCount = countItems(pi.colorinfo);
  const awkCount = countItems(pi.awkjobinfo);
  const printCount = countItems(pi.prsjobinfo);
  const addonCount = Array.isArray(pi.prodaddinfo) ? pi.prodaddinfo.length : 0;

  results.push({
    file: f,
    id: d.productId,
    name: pi.prodname || (d.meta ? d.meta.name : 'unknown'),
    category: (d.categoryPath || []).join(' > '),
    pjoin: pi.pjoin,
    covers: Array.isArray(pi.coverinfo) ? pi.coverinfo.length : 0,
    sizes: sizeCount,
    papers: paperCount,
    colors: colorCount,
    prints: printCount,
    postProc: awkCount,
    addons: addonCount,
    ordqty: Array.isArray(pi.ordqty) ? pi.ordqty.length : 0,
    score: sizeCount + paperCount + colorCount + awkCount + printCount + addonCount
  });
}

results.sort((a, b) => b.score - a.score);

console.log('=== Top 15 products by detailed option richness ===\n');
for (const r of results.slice(0, 15)) {
  console.log(`${r.file} (${r.id}) | ${r.name} | ${r.category} | score=${r.score} pjoin=${r.pjoin}`);
  console.log(`  cover=${r.covers} size=${r.sizes} paper=${r.papers} color=${r.colors} print=${r.prints} postProc=${r.postProc} addon=${r.addons} qty=${r.ordqty}`);
}
