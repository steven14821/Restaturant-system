const fs = require('fs');
const p = require('path');
function walk(d){
  for (const f of fs.readdirSync(d)){
    const full = p.join(d,f);
    const st = fs.statSync(full);
    if (st.isDirectory()){
      if (f === 'node_modules' || f === '.next') continue;
      walk(full);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.mjs')){
      try {
        const c = fs.readFileSync(full,'utf8');
        if (c.includes('@restaurante/contract/http')) console.log(full);
      } catch(e){}
    }
  }
}
walk('D:/restaurant-system');
