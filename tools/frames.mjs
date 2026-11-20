// node tools/frames.mjs outDir w h samples t1 t2 ... : renders frames of the animation (software WebGL) for checks
import { launch, openPage } from './pw.mjs';
import fs from 'node:fs'; import path from 'node:path';
const [,, out, w = 480, h = 270, n = 1, ...ts] = process.argv;
fs.mkdirSync(out, { recursive: true });
const T0 = Date.now(), b = await launch({ gpu: false });
const page = await openPage(b, `/index.html?render=1&w=${w}&h=${h}&samples=${n}${process.env.CLEAN ? '&captions=0' : ''}`, { width: +w, height: +h });
await page.waitForFunction(() => window.READY || window.FAIL, null, { timeout: 0 });
const fail = await page.evaluate(() => window.FAIL); if (fail) { console.log('FAIL', fail); process.exit(1); }
console.log('built', ((Date.now() - T0) / 1000).toFixed(0), 's');
if (process.env.JS) console.log(await page.evaluate(process.env.JS));
for (const t of ts) {
  const d = await page.evaluate((tt) => { window.seek(tt); return document.getElementById('c').toDataURL('image/jpeg', 0.9); }, +t);
  fs.writeFileSync(path.join(out, 't' + (+t).toFixed(2).padStart(6, '0') + '.jpg'), Buffer.from(d.split(',')[1], 'base64'));
}
console.log('frames done', ((Date.now() - T0) / 1000).toFixed(0), 's');
await b.close();
