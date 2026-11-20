// node tools/probe-server.mjs <dir> [w h samples] : development helper (software WebGL). Builds the page ONCE, then runs
// every job file dropped in <dir>/jobs/*.js in the page (the body of an async function; it may return
// { imgs: { name: dataURL }, out }), writes the images to <dir>/ and the result to <dir>/<job>.json, then deletes the job.
// In the page: snap(cam, t, samples) renders a frame from a camera and returns a JPEG data URL.
import { launch, openPage } from './pw.mjs';
import fs from 'node:fs'; import path from 'node:path';
const [,, dir, w = 960, h = 540, n = 2, extra = ''] = process.argv;
const jobs = path.join(dir, 'jobs'); fs.mkdirSync(jobs, { recursive: true });
const b = await launch({ gpu: false });
const page = await openPage(b, `/index.html?render=1&w=${w}&h=${h}&samples=${n}${extra}`, { width: +w, height: +h });
await page.waitForFunction(() => window.READY || window.FAIL, null, { timeout: 0 });
const fail = await page.evaluate(() => window.FAIL); if (fail) { console.log('FAIL', fail); process.exit(1); }
await page.evaluate(() => { window.snap = (cam, t = 0, n) => { window.CAM_OVERRIDE = cam || null; window.seek(t, n); return document.getElementById('c').toDataURL('image/jpeg', 0.9); }; });
fs.writeFileSync(path.join(dir, 'READY'), String(Date.now()));
console.log('probe ready');
for (;;) {
  const list = fs.readdirSync(jobs).filter((f) => f.endsWith('.js')).sort();
  if (!list.length) { await new Promise((r) => setTimeout(r, 300)); continue; }
  for (const f of list) {
    const body = fs.readFileSync(path.join(jobs, f), 'utf8'), name = f.replace(/\.js$/, ''), t0 = Date.now();
    let res;
    try { res = await page.evaluate(`(async () => { ${body}\n })()`); } catch (e) { res = { error: String(e.message || e) }; }
    res = res || {};
    for (const [k, d] of Object.entries(res.imgs || {})) fs.writeFileSync(path.join(dir, k + '.jpg'), Buffer.from(d.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify({ out: res.out, error: res.error, ms: Date.now() - t0 }, null, 1));
    fs.unlinkSync(path.join(jobs, f));
    console.log('job', name, res.error ? 'ERROR ' + res.error : 'ok', Date.now() - t0, 'ms');
  }
}
