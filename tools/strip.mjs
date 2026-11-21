// node tools/strip.mjs <out.jpg> <from> <to> <step> [w=480] [h=270] [samples=2] [cols=6] : a strip of animation frames (captions
// on) from `from` to `to` every `step` seconds, each labelled with its time and frame number, rendered in software from the same
// page as the film. Frame times are snapped to the 30 fps frame grid.
import { launch, openPage, ROOT } from './pw.mjs';
import fs from 'node:fs'; import path from 'node:path';
const [out, from, to, step, w = 480, h = 270, n = 2, cols = 6] = process.argv.slice(2);
const b = await launch({ gpu: false });
const page = await openPage(b, `/index.html?render=1&solved=1&w=${w}&h=${h}&samples=${n}`, { width: +w, height: +h });
await page.waitForFunction(() => window.READY || window.FAIL, null, { timeout: 0 });
const fail = await page.evaluate(() => window.FAIL); if (fail) { console.log('FAIL', fail); process.exit(1); }
const frames = []; for (let t = +from; t <= +to + 1e-6; t += +step) frames.push(Math.round(t * 30));
const jpg = await page.evaluate(async ({ frames, cols }) => {
  const c = document.getElementById('c'), W = c.width, H = c.height, rows = Math.ceil(frames.length / cols), cv = document.createElement('canvas');
  cv.width = cols * W; cv.height = rows * H; const x = cv.getContext('2d');
  for (const [k, f] of frames.entries()) {
    window.CAPTIONS = true; window.seek(f / 30);
    const img = new Image(); img.src = c.toDataURL('image/png'); await img.decode();
    const cx = (k % cols) * W, cy = Math.floor(k / cols) * H; x.drawImage(img, cx, cy);
    x.fillStyle = 'rgba(0,0,0,0.65)'; x.fillRect(cx + 4, cy + 4, 150, 22); x.fillStyle = '#fff'; x.font = '14px sans-serif'; x.fillText(`${(f / 30).toFixed(3)} s  f${f}`, cx + 9, cy + 20);
  }
  return cv.toDataURL('image/jpeg', 0.85);
}, { frames, cols: +cols });
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, Buffer.from(jpg.split(',')[1], 'base64'));
console.log(out, frames.length, 'frames');
await b.close();
