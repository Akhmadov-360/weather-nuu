// node diff.mjs <beforeDir> <afterDir>  — compares computed-style snapshots by name.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [beforeDir, afterDir] = process.argv.slice(2);
if (!beforeDir || !afterDir) { console.error('usage: diff.mjs <before> <after>'); process.exit(2); }

let totalChanged = 0;
for (const f of readdirSync(beforeDir).filter((x) => x.endsWith('.json')).sort()) {
  if (!existsSync(join(afterDir, f))) { console.log(`${f}: MISSING in after`); totalChanged++; continue; }
  const a = JSON.parse(readFileSync(join(beforeDir, f), 'utf8'));
  const b = JSON.parse(readFileSync(join(afterDir, f), 'utf8'));
  const byProp = new Map();
  const changedEls = new Set();
  let structural = 0;
  for (const path of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!a[path] || !b[path]) { structural++; changedEls.add(path); continue; }
    for (const p of Object.keys(a[path])) {
      if (a[path][p] !== b[path][p]) {
        changedEls.add(path);
        if (!byProp.has(p)) byProp.set(p, []);
        byProp.get(p).push(`${path}: ${a[path][p]}  ->  ${b[path][p]}`);
      }
    }
  }
  console.log(`${f}: ${changedEls.size} changed element(s)${structural ? `, ${structural} structural` : ''}`);
  for (const [p, rows] of [...byProp].sort((x, y) => y[1].length - x[1].length)) {
    console.log(`  ${p}: ${rows.length}`);
    for (const r of rows.slice(0, 5)) console.log(`    ${r}`);
  }
  totalChanged += changedEls.size;
}
console.log(`TOTAL changed elements: ${totalChanged}`);
process.exit(totalChanged ? 1 : 0);
