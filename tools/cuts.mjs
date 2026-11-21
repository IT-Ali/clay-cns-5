// node tools/cuts.mjs : every hard cut of the part, checked frame by frame (30 fps). For each cut: the frame where the camera
// cuts (it moves over 1 unit or turns over 0.1 rad between two frames), the frame where the examiner walks round (a jump of
// over 20 cm), and any change of the patient (head, hands) or the examiner (gloves) between two pose frames (the poses step on
// every 2nd frame, 15 a second). A cut is ok when it is on the pose grid, the camera cuts on its frame only, the walk round is
// on that same frame, and nothing changes between pose frames: the new camera never shows an old pose.
// Writes checks/transitions/cuts.json ({ allOk, cuts }) and a strip per cut at 1/30 s (3 frames either side) in
// checks/transitions/cuts/.
import { launch, openPage, ROOT } from './pw.mjs';
import { checkSolved } from './hash.mjs';
import fs from 'node:fs'; import path from 'node:path';
checkSolved();
const W = 480, H = 270, OUT = path.join(ROOT, 'checks', 'transitions'), SO = path.join(OUT, 'cuts'); fs.mkdirSync(SO, { recursive: true });
const b = await launch({ gpu: false });
const page = await openPage(b, `/index.html?render=1&solved=1&w=${W}&h=${H}&samples=2`, { width: W, height: H });
await page.waitForFunction(() => window.READY || window.FAIL, null, { timeout: 0 });
const fail = await page.evaluate(() => window.FAIL); if (fail) { console.log('FAIL', fail); process.exit(1); }
const cuts = await page.evaluate(() => window.CNS5_WORLD.CAM_KEYS.filter(([t, , o]) => o && o.cut && t > 0).map(([t, name]) => ({ t, to: name })));
const res = [];
for (const [n, c] of cuts.entries()) {
  const f = Math.round(c.t * 30), frames = [f - 3, f - 2, f - 1, f, f + 1, f + 2, f + 3];
  const r = await page.evaluate(async ({ frames }) => {
    const W5 = window.CNS5_WORLD, THREE = window.THREE, cv = document.getElementById('c'), Wd = cv.width, Hd = cv.height;
    const pts = (o) => o.getWorldPosition(new THREE.Vector3());
    const sig = () => ({
      cam: W5.S.camera.position.toArray().concat(W5.S.camera.getWorldDirection(new THREE.Vector3()).toArray()),
      pat: [pts(W5.P.head), pts(W5.P.arms.R.hand.group), pts(W5.P.arms.L.hand.group), W5.P.arms.R.hand.world('palm'), W5.P.arms.L.hand.world('palm')],
      ex: [pts(W5.EX.R.hand.group), pts(W5.EX.L.hand.group)],
    });
    const sigs = [], strip = document.createElement('canvas'); strip.width = frames.length * Wd; strip.height = Hd; const x = strip.getContext('2d');
    for (const [k, fr] of frames.entries()) {
      window.CAPTIONS = true; window.seek(fr / 30); sigs.push(sig());
      const img = new Image(); img.src = cv.toDataURL('image/png'); await img.decode(); x.drawImage(img, k * Wd, 0);
      x.fillStyle = 'rgba(0,0,0,0.65)'; x.fillRect(k * Wd + 4, 4, 150, 22); x.fillStyle = '#fff'; x.font = '14px sans-serif'; x.fillText(`f${fr}  ${(fr / 30).toFixed(3)} s`, k * Wd + 9, 20);
    }
    const d = (a, b) => Math.max(...a.map((p, i) => p.distanceTo(b[i])));
    const steps = []; for (let k = 1; k < sigs.length; k++) {
      const a = sigs[k - 1].cam, c = sigs[k].cam, dp = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]), da = Math.acos(Math.min(1, a[3] * c[3] + a[4] * c[4] + a[5] * c[5]));
      steps.push({ from: frames[k - 1], to: frames[k], camera: dp > 1 || da > 0.1, cameraMove: +dp.toFixed(3), patientCm: +(d(sigs[k].pat, sigs[k - 1].pat) * 10).toFixed(2), examinerCm: +(d(sigs[k].ex, sigs[k - 1].ex) * 10).toFixed(2) });
    }
    return { steps, strip: strip.toDataURL('image/jpeg', 0.85) };
  }, { frames });
  // the camera cuts on f; the examiner's walk round (a jump of more than 20 cm) is on f too; and nothing of the patient or the
  // examiner changes between two pose frames (the poses step on even frames only: f is one of them)
  const camF = r.steps.filter((s) => s.camera).map((s) => s.to), walk = r.steps.filter((s) => s.examinerCm > 20 || s.patientCm > 20);
  const offGrid = r.steps.filter((s) => (s.to - f) % 2 !== 0 && (s.patientCm > 0.05 || s.examinerCm > 0.05));
  const ok = camF.length === 1 && camF[0] === f && walk.every((s) => s.to === f) && offGrid.length === 0;
  const name = `${String(n + 1).padStart(2, '0')}_cut_${c.t.toFixed(3)}_to_${c.to}`;
  fs.writeFileSync(path.join(SO, name + '.jpg'), Buffer.from(r.strip.split(',')[1], 'base64'));
  res.push({ cut: name, t: +c.t.toFixed(4), frame: f, onPoseGrid: Math.abs(c.t * 15 - Math.round(c.t * 15)) < 1e-6, cameraChangesAt: camF, walkRoundAt: walk.map((s) => s.to), changesBetweenPoseFrames: offGrid.map((s) => s.to), steps: r.steps, ok });
  console.log(name, 'frame', f, ok ? 'ok' : 'NOT OK', JSON.stringify(r.steps.map((s) => `${s.to}:${s.camera ? 'C' : ''}p${s.patientCm}e${s.examinerCm}`)));
}
const out = { allOk: res.every((r) => r.ok && r.onPoseGrid), rule: 'each cut on the pose grid; the camera cuts (moves over 1 unit or turns over 0.1 rad in one frame) on the cut frame only; the examiner walk round (over 20 cm in one frame) on that same frame; no change of the patient or the examiner between pose frames', cuts: res };
fs.writeFileSync(path.join(OUT, 'cuts.json'), JSON.stringify(out, null, 1));
console.log('allOk', out.allOk);
await b.close();
