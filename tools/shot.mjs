// node tools/shot.mjs out.png "<js run in the page before the render>" [w h samples t]
import { launch, openPage } from './pw.mjs';
import fs from 'node:fs';
const [,, out, js = '', w = 640, h = 360, n = 2, t = 0] = process.argv;
const T0 = Date.now(); const b = await launch({ gpu: false });
const page = await openPage(b, `/index.html?render=1&solved=1&w=${w}&h=${h}&samples=${n}`, { width: +w, height: +h });
await page.waitForFunction(() => window.READY || window.FAIL, null, { timeout: 0 });
if (await page.evaluate(() => window.FAIL)) { console.log('FAIL', await page.evaluate(() => window.FAIL)); await b.close(); process.exit(1); }
console.log('built', ((Date.now() - T0) / 1000).toFixed(1), 's');
if (js) { const r = await page.evaluate(js); if (r !== undefined) console.log(r); }
const d = await page.evaluate((tt) => { window.seek(tt); return document.getElementById('c').toDataURL('image/png'); }, +t);
fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64'));
await b.close();
