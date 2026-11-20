// node tools/transitions.mjs [w=480] [h=270] [samples=1] : the TRANSITIONS SCAN. At every camera change (every hard cut,
// every move, every walk round to his left and back) a strip of frames every 1/8 s, rendered in software, saved to
// checks/transitions/NN_<what>.jpg, and checked automatically:
//   - a caption plaque over the examiner's hands, the contact point or his face
//   - a sleeve or forearm near the lens (closer than 1.5 units = 15 cm) or filling more than 45% of the frame
//   - the gloved hands still moving when a cut lands (more than 2 mm in the first 1/8 s after the cut)
//   - the camera going through the bed or the bedside table (a camera inside their bounding boxes)
// The results go to checks/transitions/report.json; the strips are for the eye (pans through empty teal, swings).
import { launch, openPage, ROOT } from './pw.mjs';
import { checkSolved } from './hash.mjs';
import fs from 'node:fs'; import path from 'node:path';
checkSolved();
const [w = 480, h = 270, n = 1] = process.argv.slice(2).map(Number);
const OUT = path.join(ROOT, 'checks', 'transitions'); fs.mkdirSync(OUT, { recursive: true });
const T0 = Date.now(), b = await launch({ gpu: false });
const page = await openPage(b, `/index.html?render=1&solved=1&w=${w}&h=${h}&samples=${n}`, { width: w, height: h });
await page.waitForFunction(() => window.READY || window.FAIL, null, { timeout: 0 });
const fail = await page.evaluate(() => window.FAIL); if (fail) { console.log('FAIL', fail); process.exit(1); }
console.log('built', ((Date.now() - T0) / 1000).toFixed(0), 's');
// the camera changes: from the camera timeline itself
const events = await page.evaluate(() => {
  const W = window.CNS5_WORLD, out = [];
  for (const s of W.segs) {
    out.push({ kind: 'cut', t: s.t0, to: s.keys[0][1] });
    for (const r of s.paths) out.push({ kind: 'move', t0: r.t0, t1: r.t1, from: W.shotOf(r.t0 + 1e-3), to: W.shotOf(r.t1 + 1e-3) });
  }
  return out.filter((e) => !(e.kind === 'cut' && e.t === 0));
});
const report = [];
let k = 0;
for (const e of events) {
  k++;
  const ts = []; const a = e.kind === 'cut' ? e.t - 0.5 : e.t0 - 0.25, z = e.kind === 'cut' ? e.t + 0.75 : e.t1 + 0.25;
  for (let t = Math.max(0, a); t <= Math.min(89.99, z) + 1e-6; t += 0.125) ts.push(+t.toFixed(3));
  const r = await page.evaluate(async ({ ts, cut }) => {
    const W = window.CNS5_WORLD, THREE = window.THREE, cv = document.getElementById('c'), Wd = cv.width, Hd = cv.height, flags = [], frames = [];
    const proj = (p) => { const v = p.clone().project(W.S.camera); return [(v.x + 1) / 2 * Wd, (1 - v.y) / 2 * Hd, v.z]; };
    // the caption plaque's rectangle (the same layout as shared/caption.js)
    const cx = document.createElement('canvas').getContext('2d');
    const plaque = (t) => { for (const c of W.CAPTIONS) if (t >= c.t0 && t <= c.t1) { const k = Wd / 1920, fs = 56 * k, padX = 40 * k, padY = 22 * k, lh = fs * 1.22, margin = 54 * k; cx.font = `600 ${fs}px "Fredoka", sans-serif`; const words = c.text.split(' '), lines = []; let cur = ''; for (const wd of words) { const nn = cur ? cur + ' ' + wd : wd; if (cx.measureText(nn).width > 1500 * k && cur) { lines.push(cur); cur = wd; } else cur = nn; } if (cur) lines.push(cur); const tw = Math.max(...lines.map((l) => cx.measureText(l).width)), bw = tw + padX * 2, bh = lines.length * lh + padY * 2; const x = (Wd - bw) / 2, y = c.place === 'bottom' ? Hd - margin - bh : margin; return [x, y, bw, bh, c.text]; } return null; };
    const meshes = (o) => { const m = []; o.traverse((q) => { if (q.isMesh && q.visible) m.push(q); }); return m; };
    const exPts = () => ['R', 'L'].map((s) => W.EX[s].hand.world('palm'));
    const box = new THREE.Box3(), table = new THREE.Box3().setFromObject(W.table.group), bedG = W.S.scene.getObjectByName('bed'), bedBox = new THREE.Box3().setFromObject(bedG);
    let prevHands = null;
    for (const t of ts) {
      window.CAPTIONS = true; window.seek(t);
      const cam = W.S.camera, pl = plaque(t);
      // caption over the hands, the contact or his face
      if (pl) {
        const pts = [['examiner hand R', W.EX.R.hand.world('palm')], ['examiner hand L', W.EX.L.hand.world('palm')], ['his face', W.P.head.localToWorld(new THREE.Vector3(0, -0.2, 0.6))], ['his right hand', W.P.arms.R.hand.world('palm')], ['his left hand', W.P.arms.L.hand.world('palm')]];
        for (const [nm, p] of pts) { const [x, y, z] = proj(p); if (z < 1 && x > pl[0] && x < pl[0] + pl[2] && y > pl[1] && y < pl[1] + pl[3]) flags.push({ t, what: `caption over ${nm}` }); }
      }
      // sleeves and forearms near the lens or filling the frame
      for (const s of ['R', 'L']) {
        const ms = meshes(W.EX[s].group); let near = 1e9; box.makeEmpty();
        for (const m of ms) { m.geometry.computeBoundingSphere(); const c = m.geometry.boundingSphere.center.clone().applyMatrix4(m.matrixWorld), r = m.geometry.boundingSphere.radius * m.matrixWorld.getMaxScaleOnAxis(); near = Math.min(near, c.distanceTo(cam.position) - r); }
        // projected area of the forearm and sleeve (rough: sample their vertices)
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const m of meshes(W.EX[s].fore).concat(meshes(W.EX[s].upper))) { const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i += 7) { const v = new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld), q = v.project(cam); if (q.z > 1) continue; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); } }
        const area = Math.max(0, Math.min(1, x1) - Math.max(-1, x0)) * Math.max(0, Math.min(1, y1) - Math.max(-1, y0)) / 4;
        if (near < 1.5) flags.push({ t, what: `examiner ${s} sleeve/forearm ${(near * 10).toFixed(0)} cm from the lens` });
        if (area > 0.45) flags.push({ t, what: `examiner ${s} forearm and sleeve cover ${(area * 100).toFixed(0)}% of the frame (bounding box)` });
      }
      if (table.containsPoint(cam.position) || bedBox.containsPoint(cam.position)) flags.push({ t, what: 'camera inside the bed or the table' });
      const hands = exPts();
      if (cut != null && prevHands && t > cut && t - 0.125 <= cut + 1e-6) { const d = Math.max(...hands.map((p, i) => p.distanceTo(prevHands[i]))); if (d > 0.02) flags.push({ t, what: `hands still moving at the cut (${(d * 100).toFixed(1)} mm in 1/8 s)` }); }
      if (cut == null || t > cut) prevHands = hands.map((p) => p.clone());
      frames.push(cv.toDataURL('image/jpeg', 0.8));
    }
    // a strip: the frames in rows of 8 with their times
    const cols = 8, fw = Wd / 2, fh = Hd / 2, rows = Math.ceil(frames.length / cols), s = document.createElement('canvas'); s.width = cols * fw; s.height = rows * fh; const x = s.getContext('2d');
    for (const [i, d] of frames.entries()) { const im = new Image(); im.src = d; await im.decode(); const X = (i % cols) * fw, Y = Math.floor(i / cols) * fh; x.drawImage(im, X, Y, fw, fh); x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(X + 2, Y + 2, 54, 16); x.fillStyle = '#fff'; x.font = '12px sans-serif'; x.fillText(ts[i].toFixed(3) + ' s', X + 5, Y + 14); }
    return { strip: s.toDataURL('image/jpeg', 0.82), flags };
  }, { ts, cut: e.kind === 'cut' ? e.t : null });
  const name = `${String(k).padStart(2, '0')}_${e.kind}_${e.kind === 'cut' ? e.t.toFixed(2) + '_to_' + e.to : e.t0.toFixed(2) + '-' + e.t1.toFixed(2) + '_' + e.from + '_to_' + e.to}`;
  fs.writeFileSync(path.join(OUT, name + '.jpg'), Buffer.from(r.strip.split(',')[1], 'base64'));
  report.push({ name, ...e, frames: ts.length, flags: r.flags });
  console.log(name, r.flags.length ? r.flags.length + ' flags: ' + [...new Set(r.flags.map((f) => f.what))].join('; ') : 'clean');
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
await b.close();
console.log('done', ((Date.now() - T0) / 1000).toFixed(0), 's');
