// tools/hash.mjs: a hash of every file the solved poses depend on (the kit, this part's code, the stage kit), so
// solved.json can be checked against the code before a render. Line endings are normalised (a Windows checkout with CRLF
// gives the same hash).
import { fileURLToPath } from 'node:url';
import path from 'node:path'; import fs from 'node:fs'; import crypto from 'node:crypto';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HASHED = ['shared', 'cns5', 'lib'];
export function inputsHash() {
  const h = crypto.createHash('sha256');
  for (const dir of HASHED) {
    const files = fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.js')).sort();
    for (const f of files) { h.update(dir + '/' + f + '\n'); h.update(fs.readFileSync(path.join(ROOT, dir, f), 'utf8').replace(/\r\n/g, '\n')); }
  }
  return h.digest('hex').slice(0, 16);
}
// stop with a clear message if solved.json is missing or does not match the code
export function checkSolved() {
  const f = path.join(ROOT, 'solved.json');
  if (!fs.existsSync(f)) { console.error('\nsolved.json is missing. It is made once on the build machine with:  node tools/solve.mjs\n'); process.exit(2); }
  const s = JSON.parse(fs.readFileSync(f, 'utf8')), now = inputsHash();
  if (s.hash !== now) { console.error(`\nsolved.json is out of date: it was solved for code ${s.hash}, the code is now ${now}.\nRun  node tools/solve.mjs  on the build machine again (the solve is never run by npm start or npm run preview).\n`); process.exit(2); }
  return s;
}
