// node tools/merge-solved.mjs a.json b.json ... : merges the per-frame elbow cup (cupFrames) and the logs of side-by-side
// `solve.mjs --only cupF0 --out a.json` runs into solved.json and stamps it with the current inputs hash.
import { ROOT } from './pw.mjs';
import { inputsHash } from './hash.mjs';
import fs from 'node:fs'; import path from 'node:path';
const f = path.join(ROOT, 'solved.json'), sol = JSON.parse(fs.readFileSync(f, 'utf8'));
for (const p of process.argv.slice(2)) {
  const s = JSON.parse(fs.readFileSync(p, 'utf8'));
  sol.cupFrames = Object.assign(sol.cupFrames || {}, s.cupFrames || {}); if (s.cupBase) sol.cupBase = s.cupBase;
  for (const l of s.log || []) if (/pose frames/.test(l)) { sol.log.push(l); console.log(l); }
}
sol.hash = inputsHash(); sol.solvedAt = new Date().toISOString();
fs.writeFileSync(f, JSON.stringify(sol));
console.log('solved.json:', Object.keys(sol.cupFrames).length, 'cup frames');
