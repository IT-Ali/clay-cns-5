// node tools/frame-scan.mjs [from=0] [to=last] : a per-frame scan of the WHOLE part (every frame at 30 fps), measured on the
// scene itself (no picture is rendered except a small colour mask):
//   - lens: the nearest examiner vertex (glove, forearm, sleeve) to the camera; flagged under 15 cm (1.5 units), which also
//     catches any part passing through the camera plane near the lens
//   - examiner share: the part of the frame the examiner actually covers (a 192x108 mask render with depth: his body hides
//     what is behind it); flagged over 35 %
//   - caption over his face: the caption plaque's rectangle (the layout of shared/caption.js) over his face, in front
//   - cup frames: every tone frame finds its solved elbow cup (solved.json cupFrames), never the fallback
// Writes checks/transitions/frame-scan.json (every flag, and the worst value of each measure per second) and merges the
// summary into checks/transitions/report.json (frameScan).
import { launch, openPage, ROOT } from './pw.mjs';
import { checkSolved } from './hash.mjs';
import fs from 'node:fs'; import path from 'node:path';
checkSolved();
const W = 480, H = 270, FPS = 30, OUT = path.join(ROOT, 'checks', 'transitions'); fs.mkdirSync(OUT, { recursive: true });
const b = await launch({ gpu: false });
const page = await openPage(b, `/index.html?render=1&solved=1&w=${W}&h=${H}&samples=1`, { width: W, height: H });
await page.waitForFunction(() => window.READY || window.FAIL, null, { timeout: 0 });
const fail = await page.evaluate(() => window.FAIL); if (fail) { console.log('FAIL', fail); process.exit(1); }
const D = await page.evaluate(() => window.DURATION), NF = Math.round(D * FPS);
const [a0 = 0, a1 = NF - 1] = process.argv.slice(2).map(Number);
await page.evaluate(({ W, H }) => {
  const W5 = window.CNS5_WORLD, THREE = window.THREE, S = W5.S, R = S.renderer;
  const exMeshes = []; for (const s of ['R', 'L']) W5.EX[s].group.traverse((m) => { if (m.isMesh) exMeshes.push(m); });
  const exSet = new Set(exMeshes), all = []; S.scene.traverse((m) => { if (m.isMesh) all.push(m); });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff }), black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const rt = new THREE.WebGLRenderTarget(192, 108), buf = new Uint8Array(192 * 108 * 4), v = new THREE.Vector3();
  const cx = document.createElement('canvas').getContext('2d');
  const plaque = (t) => { for (const c of W5.CAPTIONS) if (t >= c.t0 && t <= c.t1) { const place = c.place || 'top', k = W / 1920, fs = 56 * k, padX = 40 * k, padY = 22 * k, lh = fs * 1.22, margin = 54 * k, corner = place.length === 2, maxW = (corner ? 860 : 1500) * k; cx.font = `600 ${fs}px "Fredoka", sans-serif`; const words = c.text.split(' '), lines = []; let cur = ''; for (const wd of words) { const nn = cur ? cur + ' ' + wd : wd; if (cx.measureText(nn).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = nn; } if (cur) lines.push(cur); const tw = Math.max(...lines.map((l) => cx.measureText(l).width)), bw = tw + padX * 2, bh = lines.length * lh + padY * 2; let x = (W - bw) / 2, y = margin; if (place === 'bottom') y = H - margin - bh; if (place === 'tl') { x = margin; y = margin; } else if (place === 'tr') { x = W - margin - bw; y = margin; } else if (place === 'bl') { x = margin; y = H - margin - bh; } else if (place === 'br') { x = W - margin - bw; y = H - margin - bh; } return [x, y, bw, bh]; } return null; };
  // his face: points over it (eyes, nose, mouth, chin, brow) in head space
  const facePts = [[0, 0.15, 0.62], [0.22, 0.25, 0.55], [-0.22, 0.25, 0.55], [0, -0.15, 0.62], [0, -0.45, 0.55], [0, 0.55, 0.55]];
  window.SCAN = (t) => {
    window.CUP_MISS = 0;
    const tt = window.CNS5.seekTime ? window.CNS5.seekTime(t) : t;
    window.CNS5_UPDATE(tt); S.scene.updateMatrixWorld(true);
    const cam = S.camera; cam.updateMatrixWorld(true); const cp = cam.getWorldPosition(new THREE.Vector3());
    let near = 1e9, nearName = '';
    for (const m of exMeshes) { let vis = true, o = m; while (o) { if (!o.visible) { vis = false; break; } o = o.parent; } if (!vis) continue;
      const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i += 2) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); const d = v.distanceTo(cp); if (d < near) { near = d; nearName = m.name || m.parent.name || 'examiner'; } } }
    // the mask: examiner white, everything else black, with depth
    const keep = all.map((m) => m.material), bg = S.scene.background, fog = S.scene.fog;
    all.forEach((m) => { m.material = exSet.has(m) ? white : black; });
    S.scene.background = new THREE.Color(0); S.scene.fog = null;
    const prevRT = R.getRenderTarget(), ac = R.autoClear; R.autoClear = true;
    R.setRenderTarget(rt); R.clear(); R.render(S.scene, cam); R.readRenderTargetPixels(rt, 0, 0, 192, 108, buf); R.setRenderTarget(prevRT); R.autoClear = ac;
    all.forEach((m, i) => { m.material = keep[i]; }); S.scene.background = bg; S.scene.fog = fog;
    let n = 0; for (let i = 0; i < buf.length; i += 4) if (buf[i] > 127) n++;
    // caption over his face
    const pl = plaque(t); let face = 0;
    if (pl) for (const q of facePts) { const p = W5.P.head.localToWorld(new THREE.Vector3(...q)).project(cam); if (p.z > 1) continue; const x = (p.x + 1) / 2 * W, y = (1 - p.y) / 2 * H; if (x > pl[0] && x < pl[0] + pl[2] && y > pl[1] && y < pl[1] + pl[3]) face++; }
    return { nearCm: +(near * 10).toFixed(1), nearPart: nearName, examinerPct: +(100 * n / (192 * 108)).toFixed(1), captionOverFace: face, cupMiss: window.CUP_MISS || 0, shot: W5.shotOf(t) };
  };
}, { W, H });
const flags = [], perSec = {}, T0 = Date.now();
for (let i = a0; i <= a1; i++) {
  const t = i / FPS, r = await page.evaluate((t) => window.SCAN(t), t);
  const sec = Math.floor(t), ps = perSec[sec] = perSec[sec] || { minNearCm: 1e9, maxExaminerPct: 0, captionOverFace: 0, cupMiss: 0 };
  ps.minNearCm = Math.min(ps.minNearCm, r.nearCm); ps.maxExaminerPct = Math.max(ps.maxExaminerPct, r.examinerPct); ps.captionOverFace += r.captionOverFace ? 1 : 0; ps.cupMiss += r.cupMiss;
  const why = [];
  if (r.nearCm < 15) why.push(`examiner ${r.nearCm} cm from the lens (${r.nearPart})`);
  if (r.examinerPct > 35) why.push(`examiner covers ${r.examinerPct}% of the frame`);
  if (r.captionOverFace) why.push('caption over his face');
  if (r.cupMiss) why.push('elbow cup frame not found in solved.json');
  if (why.length) flags.push({ frame: i, t: +t.toFixed(3), shot: r.shot, ...r, why });
  if (i % 300 === 0) console.log(`frame ${i}/${NF - 1}  ${((Date.now() - T0) / 1000).toFixed(0)} s  flags so far ${flags.length}`);
}
const res = { frames: [a0, a1], fps: FPS, limits: { lensCm: 15, examinerPct: 35 }, flags: flags.length, flagged: flags, perSecond: perSec };
fs.writeFileSync(path.join(OUT, 'frame-scan.json'), JSON.stringify(res, null, 1));
const rp = path.join(OUT, 'report.json'); let rep = {}; try { rep = JSON.parse(fs.readFileSync(rp, 'utf8')); } catch (e) { /* none yet */ }
if (Array.isArray(rep)) rep = { transitions: rep };
rep.frameScan = { frames: [a0, a1], flags: flags.length, limits: res.limits, flagged: flags.map((f) => ({ frame: f.frame, t: f.t, shot: f.shot, why: f.why })) };
fs.writeFileSync(rp, JSON.stringify(rep, null, 1));
console.log(`frame scan: ${a1 - a0 + 1} frames, ${flags.length} flagged`);
await b.close();
