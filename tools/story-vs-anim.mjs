// node tools/story-vs-anim.mjs [beats=3,5,6,7,10] : the storyboard panel of each beat (storyboard/img/bNN.jpg, rendered at the
// panel's moment: the middle of what the beat holds still) next to the ANIMATION frame at that moment, rendered by
// render.mjs itself (same page, same pose and camera data, 960x540, the storyboard's 16 samples, captions on).
// Prints the mean pixel difference of each pair and writes story_vs_anim.png (+ checks/story_vs_anim.json).
import { launch, ROOT } from './pw.mjs';
import { dataUrl, diff } from './imgdiff.mjs';
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const beats = (process.argv[2] || '3,5,6,7,10').split(',').map(Number);
const SB = JSON.parse(fs.readFileSync(path.join(ROOT, 'storyboard', 'panels.json'), 'utf8'));
const N = SB.samples || 16, [W, H] = SB.size || [960, 540], FPS = 30;
const OUT = path.join(ROOT, 'checks', 'story_vs_anim'); fs.mkdirSync(OUT, { recursive: true });
const items = beats.map((n) => { const p = SB.BEATS.find((b) => b.n === n); return { n, id: p.id, name: p.name, t: p.t, frame: Math.round(p.t * FPS) }; });
const r = spawnSync(process.execPath, [path.join(ROOT, 'render.mjs'), '--preview', '--software', '--w', String(W), '--h', String(H), '--samples', String(N),
  '--frames', items.map((i) => `${i.frame}-${i.frame}`).join(','), '--frames-only', '--out', path.join(OUT, 'render')], { stdio: 'inherit' });
if (r.status !== 0) process.exit(1);
const b = await launch({ gpu: false }), page = await b.newPage();   // a blank page: only canvas work
const res = [];
for (const it of items) {
  const anim = path.join(OUT, 'render', 'frames', 'captions', String(it.frame).padStart(6, '0') + '.png'), panel = path.join(ROOT, 'storyboard', 'img', it.id + '.jpg');
  it.animFile = path.relative(ROOT, anim); it.panelFile = path.relative(ROOT, panel); it.animT = +(it.frame / FPS).toFixed(4);
  Object.assign(it, await diff(page, dataUrl(panel), dataUrl(anim)));
  it.anim = dataUrl(anim); it.panel = dataUrl(panel);
  res.push(it);
  console.log(`beat ${it.n} (${it.name}): panel t=${it.t} s, animation frame ${it.frame} (t=${it.animT} s): mean pixel difference ${it.meanDiff} (0-255)`);
}
// the sheet: one row per beat, the panel on the left, the animation frame on the right, the difference written under them
const png = await page.evaluate(async ({ res, W, H }) => {
  const s = 0.5, w = W * s, h = H * s, top = 34, rowH = h + 40, c = document.createElement('canvas'); c.width = 2 * w + 30; c.height = top + rowH * res.length + 10;
  const x = c.getContext('2d'); x.fillStyle = '#f4f2ec'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#1d3b3f'; x.font = '600 16px sans-serif'; x.fillText('Storyboard panel', 10, 22); x.fillText('Animation frame (render.mjs, same data)', w + 20, 22);
  for (const [i, r] of res.entries()) {
    const y = top + i * rowH, load = async (src) => { const im = new Image(); im.src = src; await im.decode(); return im; };
    x.drawImage(await load(r.panel), 10, y, w, h); x.drawImage(await load(r.anim), w + 20, y, w, h);
    x.fillStyle = '#1d3b3f'; x.font = '14px sans-serif';
    x.fillText(`Beat ${r.n} ${r.name}: panel t = ${r.t.toFixed(2)} s, frame ${r.frame} (t = ${r.animT.toFixed(2)} s) - mean pixel difference ${r.meanDiff.toFixed(2)} / 255`, 10, y + h + 22);
  }
  return c.toDataURL('image/png');
}, { res, W, H });
fs.writeFileSync(path.join(ROOT, 'story_vs_anim.png'), Buffer.from(png.split(',')[1], 'base64'));
fs.writeFileSync(path.join(ROOT, 'checks', 'story_vs_anim.json'), JSON.stringify(res.map(({ anim, panel, ...k }) => k), null, 1));
console.log('story_vs_anim.png written');
await b.close();
