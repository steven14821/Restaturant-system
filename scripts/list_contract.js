const fs = require('fs');
const p = require('path');
const base = 'D:/restaurant-system/node_modules/@restaurante/contract';
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const full = p.join(d, f);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full);
    else console.log(full.replace(base + '/', '').replace(base + '\\', ''));
  }
}
walk(base);
