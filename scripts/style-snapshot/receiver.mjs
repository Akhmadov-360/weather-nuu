// node receiver.mjs <outDir>  — saves each POST /snap/<name> body to <outDir>/<name>.json
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = resolve(process.argv[2] ?? '.superpowers/style-snapshots/out');
mkdirSync(outDir, { recursive: true });

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.end();
  const m = /^\/snap\/([\w.-]+)$/.exec(req.url ?? '');
  if (req.method !== 'POST' || !m) { res.statusCode = 404; return res.end(); }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    writeFileSync(join(outDir, `${m[1]}.json`), Buffer.concat(chunks));
    res.statusCode = 204;
    res.end();
  });
}).listen(5199, () => console.log(`receiver on :5199 -> ${outDir}`));
