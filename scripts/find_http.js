const fs = require('fs');
const p = require('path');
const base = 'D:/restaurant-system/node_modules/@restaurante/contract';
function walk(d) {
  if (!fs.existsSync(d)) { console.log('missing'); return; }
  for (const f of fs.readdirSync(d)) {
    const full = p.join(d, f);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full);
    else if (f.indexOf('http') !== -1) console.log(full);
  }
}
walk(base);
