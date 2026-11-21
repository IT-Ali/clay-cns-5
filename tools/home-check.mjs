// node tools/home-check.mjs [samples=16] : the first and the last frame of the animation (rendered by render.mjs itself,
// 960x540) against each other and against the CNS home shot built exactly as shared/README.md says
// (check/homeref-style.js, index.html?scene=homeref). Writes home-check.json and checks/home/*.png.
import { launch, openPage, ROOT } from './pw.mjs';
import { dataUrl, diff } from './imgdiff.mjs';
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const N = +(process.argv[2] || 16), W = 960, H = 540, OUT = path.join(ROOT, 'checks', 'home');
fs.mkdirSync(OUT, { recursive: true });
const b = await launch({ gpu: false });
// the reference
const ref = await openPage(b, `/index.html?render=1&scene=homeref&captions=0&w=${W}&h=${H}&samples=${N}`, { width: W, height: H });
await ref.waitForFunction(() => window.READY || window.FAIL, null, { timeout: 0 });
if (await ref.evaluate(() => window.FAIL)) { console.log('FAIL', await ref.evaluate(() => window.FAIL)); process.exit(1); }
await ref.evaluate(() => { window.seek(0); });
fs.writeFileSync(path.join(OUT, 'readme_home.png'), Buffer.from((await ref.evaluate(() => document.getElementById('c').toDataURL('image/png'))).split(',')[1], 'base64'));
// the animation's first and last frames, through render.mjs (the same code that makes the film)
const D = +/const D = ([\d.]+)/.exec(fs.readFileSync(path.join(ROOT, 'cns5', 'cns5-style.js'), 'utf8'))[1];   // the part's length
const NF = Math.round(D * 30), last = NF - 1;
const fr = path.join(OUT, 'render');
const r = spawnSync(process.execPath, [path.join(ROOT, 'render.mjs'), '--preview', '--software', '--samples', String(N), '--frames', `0-0,${last}-${last}`, '--frames-only', '--out', fr], { stdio: 'inherit' });
if (r.status !== 0) process.exit(1);
const f0 = path.join(fr, 'frames', 'captions', '000000.png'), fN = path.join(fr, 'frames', 'captions', String(last).padStart(6, '0') + '.png');
fs.copyFileSync(f0, path.join(OUT, 'first_frame.png')); fs.copyFileSync(fN, path.join(OUT, 'last_frame.png'));
const home = path.join(OUT, 'readme_home.png');
const res = {
  size: [W, H], samples: N, frames: { first: 0, last, fps: 30 },
  reference: 'check/homeref-style.js: shared/README.md "The CNS home shot" recipe, rendered alone',
  firstVsLast: await diff(ref, dataUrl(f0), dataUrl(fN)),
  firstVsReadmeHome: await diff(ref, dataUrl(f0), dataUrl(home)),
  lastVsReadmeHome: await diff(ref, dataUrl(fN), dataUrl(home)),
};
res.pass = ['firstVsLast', 'firstVsReadmeHome', 'lastVsReadmeHome'].every((k) => res[k].differingPixels === 0);
fs.writeFileSync(path.join(ROOT, 'home-check.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
await b.close();
