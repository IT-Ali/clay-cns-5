// node tools/solve.mjs : runs every solve of part 5 ONCE (the contact poses: handshake, elbow cup grid, the hands on the
// named points, the grip, his hand on the thigh) in software WebGL and writes solved.json. npm start and npm run preview
// LOAD it and never solve again; they stop with a clear message if it is missing or out of date.
// node tools/solve.mjs --only shake,cup  re-solves only those blocks (shake, cup, abd, elbF, elbE, wrist, grip, fing) into
// the existing solved.json. solved.json also stores a hash of the files the solution depends on (shared/, cns5/, lib/), so a changed file is caught.
import { launch, openPage, ROOT } from './pw.mjs';
import { inputsHash } from './hash.mjs';
import fs from 'node:fs'; import path from 'node:path';
const ai = process.argv.indexOf('--only'), only = ai > 0 ? process.argv[ai + 1] : '';
if (only && !fs.existsSync(path.join(ROOT, 'solved.json'))) { console.log('--only needs an existing solved.json'); process.exit(1); }
const T0 = Date.now(), b = await launch({ gpu: false });
const page = await openPage(b, '/index.html?render=1&w=320&h=180&samples=1&solve=1' + (only ? '&solved=1&only=' + only : ''), { width: 320, height: 180 });
await page.waitForFunction(() => window.READY || window.FAIL, null, { timeout: 0 });
const fail = await page.evaluate(() => window.FAIL); if (fail) { console.log('FAIL', fail); process.exit(1); }
const sol = await page.evaluate(() => window.SOLVED_OUT);
sol.hash = inputsHash();
sol.solvedAt = new Date().toISOString();
fs.writeFileSync(path.join(ROOT, 'solved.json'), JSON.stringify(sol));
console.log(`solved.json written (${(fs.statSync(path.join(ROOT, 'solved.json')).size / 1024).toFixed(0)} kB) in ${((Date.now() - T0) / 1000).toFixed(0)} s`);
for (const l of sol.log || []) console.log('  ' + l);
await b.close();
