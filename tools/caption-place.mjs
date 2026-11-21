// node tools/caption-place.mjs : for every caption, each place shared/caption.js offers (top, bottom, the four corners), the
// frames (every 2nd) in which the plaque would cover his face, his hands or the examiner's hands. Used to choose the places;
// writes checks/transitions/caption-places.json.
import { launch, openPage, ROOT } from './pw.mjs';
import fs from 'node:fs'; import path from 'node:path';
const W = 480, H = 270, b = await launch({ gpu: false });
const page = await openPage(b, `/index.html?render=1&solved=1&w=${W}&h=${H}&samples=1`, { width: W, height: H });
await page.waitForFunction(() => window.READY || window.FAIL, null, { timeout: 0 });
const res = await page.evaluate(({ W, H }) => {
  const W5 = window.CNS5_WORLD, THREE = window.THREE, cx = document.createElement('canvas').getContext('2d'), out = [];
  const rect = (c, place) => { const k = W / 1920, fs = 56 * k, padX = 40 * k, padY = 22 * k, lh = fs * 1.22, margin = 54 * k, corner = place.length === 2, maxW = (corner ? 860 : 1500) * k; cx.font = `600 ${fs}px "Fredoka", sans-serif`; const words = c.text.split(' '), lines = []; let cur = ''; for (const wd of words) { const nn = cur ? cur + ' ' + wd : wd; if (cx.measureText(nn).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = nn; } if (cur) lines.push(cur); const tw = Math.max(...lines.map((l) => cx.measureText(l).width)), bw = tw + padX * 2, bh = lines.length * lh + padY * 2; let x = (W - bw) / 2, y = margin; if (place === 'bottom') y = H - margin - bh; if (place === 'tl') { x = margin; y = margin; } else if (place === 'tr') { x = W - margin - bw; y = margin; } else if (place === 'bl') { x = margin; y = H - margin - bh; } else if (place === 'br') { x = W - margin - bw; y = H - margin - bh; } return [x, y, bw, bh]; };
  const facePts = [[0, 0.15, 0.62], [0.22, 0.25, 0.55], [-0.22, 0.25, 0.55], [0, -0.15, 0.62], [0, -0.45, 0.55], [0, 0.55, 0.55]];
  for (const c of W5.CAPTIONS) {
    const places = ['top', 'bottom', 'tl', 'tr', 'bl', 'br'], cnt = Object.fromEntries(places.map((p) => [p, { face: 0, hands: 0, exHands: 0 }])); let n = 0;
    for (let f = Math.ceil(c.t0 * 30); f / 30 <= c.t1; f += 2) {
      const t = f / 30; window.CNS5_UPDATE(window.CNS5.seekTime(t)); W5.S.scene.updateMatrixWorld(true); const cam = W5.S.camera; cam.updateMatrixWorld(true); n++;
      const pr = (p) => { const v = p.clone().project(cam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
      const face = facePts.map((q) => pr(W5.P.head.localToWorld(new THREE.Vector3(...q)))), hands = ['R', 'L'].map((s) => pr(W5.P.arms[s].hand.world('palm'))), ex = ['R', 'L'].map((s) => pr(W5.EX[s].hand.world('palm')));
      for (const p of places) { const r = rect(c, p), inR = (q) => q && q[0] > r[0] && q[0] < r[0] + r[2] && q[1] > r[1] && q[1] < r[1] + r[3];
        if (face.some(inR)) cnt[p].face++; if (hands.some(inR)) cnt[p].hands++; if (ex.some(inR)) cnt[p].exHands++; }
    }
    out.push({ text: c.text, t0: c.t0, t1: c.t1, now: c.place, frames: n, places: cnt });
  }
  return out;
}, { W, H });
fs.writeFileSync(path.join(ROOT, 'checks', 'transitions', 'caption-places.json'), JSON.stringify(res, null, 1));
for (const r of res) console.log(`${r.t0.toFixed(2)}-${r.t1.toFixed(2)} [${r.now}] ${r.text.slice(0, 40)} | ` + Object.entries(r.places).map(([p, c]) => `${p}: f${c.face} h${c.hands} e${c.exHands}`).join('  '));
await b.close();
