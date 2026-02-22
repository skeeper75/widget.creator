// Load zod and the schema manually
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('/home/innojini/dev/widget.creator/ref/wowpress/catalog/products/40006.json', 'utf-8'));
const pi = d.raw.prod_info;

// Check all sub-structures
console.log('colorinfo structure check:');
for (const ci of pi.colorinfo) {
  for (const pg of ci.pagelist) {
    for (const c of pg.colorlist) {
      // Check req_prsjob items
      if (c.req_prsjob) {
        for (const rp of c.req_prsjob) {
          if (typeof rp.jobpresetno === 'undefined') {
            console.log('  colorlist.req_prsjob item missing jobpresetno:', Object.keys(rp).join(', '));
            console.log('  Sample:', JSON.stringify(rp));
          }
        }
      }
    }
  }
}

// Check paper req_awkjob
console.log('paperinfo structure check:');
for (const pg of pi.paperinfo) {
  for (const p of pg.paperlist) {
    if (p.req_awkjob) {
      for (const ra of p.req_awkjob) {
        if (typeof ra.jobno === 'undefined') {
          console.log('  paper.req_awkjob item:', Object.keys(ra).join(', '));
          break;
        }
      }
    }
  }
}

// Check size req_awkjob
console.log('sizeinfo structure check:');
for (const si of pi.sizeinfo) {
  for (const s of si.sizelist) {
    if (s.req_awkjob) {
      for (const ra of s.req_awkjob) {
        if (typeof ra.jobno === 'undefined') {
          console.log('  size.req_awkjob item:', Object.keys(ra).join(', '));
          break;
        }
      }
    }
  }
}
