// node tools/storyboard.mjs [samples=16] [w=960] [h=540] [--only=id,id] [--force]
// Renders the storyboard stills one after another on ONE canvas with S.seek(time), from the animation's own data (the
// cameras in cns5/cams.js, the states and the solved contacts loaded from solved.json), and writes storyboard/panels.json
// and storyboard/contacts.json (every contact measured on the meshes at every moment it holds).
import { launch, openPage, ROOT } from './pw.mjs';
import { checkSolved } from './hash.mjs';
import fs from 'node:fs'; import path from 'node:path';

checkSolved();
const args = process.argv.slice(2), only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const [N = 16, Wd = 960, Ht = 540] = args.filter((a) => !a.startsWith('--')).map(Number);
const OUT = path.join(ROOT, 'storyboard'); fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });
const FORCE = args.includes('--force');

const T0 = Date.now(), b = await launch({ gpu: false });
const page = await openPage(b, `/index.html?render=1&w=${Wd}&h=${Ht}&samples=${N}&solved=1`, { width: Wd, height: Ht });
await page.waitForFunction(() => window.READY || window.FAIL, null, { timeout: 0 });
const fail = await page.evaluate(() => window.FAIL); if (fail) { console.log('FAIL', fail); process.exit(1); }
await page.addScriptTag({ path: path.join(ROOT, 'tools/review-page.js') });
console.log('built', ((Date.now() - T0) / 1000).toFixed(0), 's');
const C = await page.evaluate(() => { const c = window.CNS5.content, T = c.T, mid = (w) => +((w.press[0] + w.press[1]) / 2).toFixed(2); return { T, BEATS: c.BEATS, CAPTIONS: c.CAPTIONS, mids: { abd: mid(T.abd.R), elbF: mid(T.elbF.R), elbE: mid(T.elbE.R), wrist: mid(T.wrist.R), grip: mid(T.grip.R), fing: mid(T.fing.R) } }; });
const T = C.T, cap = (n) => { const b = C.BEATS[n - 1], c = C.CAPTIONS.find((x) => x.t0 >= b.t0 - 0.01 && x.t0 < b.t1); return c ? c.text : '(no caption)'; };
const span = (n) => { const b = C.BEATS[n - 1]; return `${b.t0.toFixed(1)} - ${b.t1.toFixed(1)} s` + (b.hold ? ` · hold ${b.hold[0].toFixed(1)}-${b.hold[1].toFixed(1)} s` : ''); };
const pw = (w) => `right: his movement ${w.R.pose[0].toFixed(1)}-${w.R.pose[1].toFixed(1)} s, the examiner's hand on ${w.R.exIn[1].toFixed(1)} s, holds against it ${w.R.press[0].toFixed(1)}-${w.R.press[1].toFixed(1)} s (gives 2-3 mm, then holds); hard cut to his LEFT at ${w.cutL.toFixed(1)} s: the same (${w.L.press[0].toFixed(1)}-${w.L.press[1].toFixed(1)} s); hard cut back to his right at ${w.cutR.toFixed(1)} s`;
// the beat panels: the key frame of each beat, with the camera of the animation at that time
const BEATS = [
  { id: 'b01', n: 1, t: 4.6, change: 'Starts on the CNS home shot, held still for 1 s (no caption, breathing and lamp flicker off). He breathes quietly (about 14 a minute) from then on.', camera: 'From the CNS home shot, one slow push-in toward his upper body and both arms.', sound: 'Quiet room bed, fading in over the first 0.5 s.' },
  { id: 'b02', n: 2, t: 9.4, change: `Hold (still, no caption: the examiner asks about pain in his arms or shoulders). He answers "no" (silent visemes, ${T.no.toFixed(2)} s). The camera then moves slowly along both arms (${T.inspect[0].toFixed(1)}-${T.inspect[1].toFixed(1)} s): the shoulders and deltoids, the upper arms, the forearms, then the backs of both hands with the first dorsal interosseous. Nothing twitches or shakes; no scars. The examiner's hands stay at rest.`, camera: 'One continuous move from the foot end above him, along both arms from the shoulders down to the backs of the hands.', sound: 'Room only.' },
  { id: 'b03', n: 3, t: 16.6, change: `Hold (the examiner asks him to let the arm go floppy). He offers his right hand; the examiner takes it as in a handshake (palm to palm, the thumb webs together, the examiner's fingers round the little-finger edge onto the back of his hand, the thumbs crossing over the backs of the hands) and cups the back of his elbow with the other palm. From ${T.toneR.moves.toFixed(1)} s the examiner moves the wrist (flexion and extension), turns the forearm (supination and pronation), bends and straightens the elbow and moves the shoulder out and in, at irregular, changing speeds: smooth and loose, no catch. Released at ${T.toneR.release[0].toFixed(1)} s.`, camera: 'From his right side, a little above: the whole arm from the shoulder to the hand and both gloved hands.', sound: 'A soft rustle as his arm leaves the mattress and comes back.' },
  { id: 'b04', n: 4, t: 25.6, change: `Hard cut to his LEFT at ${T.toneL.cut.toFixed(1)} s (the examiner has walked round; the gloved hands already at rest on that side, the sleeves leaving the frame on his left). The same handshake and elbow cup on his left arm, the same moves a little faster; then a hard cut back to his right side at ${T.toneL.cutR.toFixed(1)} s.`, camera: 'Across the bed from his left (never through the bed or the table).', sound: 'Rustle as the arm lifts and is put back.' },
  { id: 'b05', n: 5, t: 36.0, change: `THE KEY BEAT. Hold (the examiner asks him to hold both arms out, palms up, and close his eyes). He lifts both arms straight out in front at shoulder height, parallel, palms up, fingers together (NEURO.arm outstretched, drift 0) and closes his eyes (${T.drift.lift[0].toFixed(1)}-${T.drift.lift[1].toFixed(1)} s); held still ${T.drift.still[0].toFixed(1)}-${T.drift.still[1].toFixed(1)} s (7 s): neither arm turns in or drifts down. He opens his eyes and lowers his arms to rest. The examiner's hands stay at rest at his right side.`, camera: 'From the foot end, a little to his right and a little above shoulder height: both arms full length, both palms and his closed eyes.', sound: 'Rustle as the arms leave and return to the mattress.' },
  { id: 'b06', n: 6, t: C.mids.abd, change: `Hold. ${pw(T.abd)}. He lifts his arm out to the side, elbow bent (NEURO.arm abduct90, a wing); the examiner's palm presses down on the outside of the upper arm just above the elbow (over the lower deltoid).`, camera: 'From the front, a little above and to his side: the shoulder, the upper arm, the examiner\'s hand and the side of his chest.', sound: 'Rustle at the start and the end of each lift.' },
  { id: 'b07', n: 7, t: C.mids.elbF, change: `Hold. ${pw(T.elbF)}. His upper arm by his side on the bed, the elbow bent to 90 degrees, the fist up and the palm side toward him; the examiner's palm on the front (palm side) of his wrist, the fingers across it; he pulls the examiner toward him: the biceps firms a little.`, camera: 'From his side at elbow height, a little toward his head: the whole arm and the biceps.', sound: 'Rustle.' },
  { id: 'b08', n: 8, t: C.mids.elbE, change: `Hold. ${pw(T.elbE)}. The same arm position; the examiner's palm on the back of his wrist; he pushes the examiner away: the triceps firms a little.`, camera: 'The same side camera as beat 7.', sound: 'Rustle.' },
  { id: 'b09', n: 9, t: C.mids.wrist, change: `Hold. ${pw(T.wrist)}. His forearm palm down (resting on the examiner's other palm, which steadies it from below), the hand in a fist; he cocks the wrist up (extension) and the examiner's fingers press down on the back of the fist over the knuckles: the wrist holds.`, camera: 'From his side at wrist height, a little toward his head.', sound: 'Rustle.' },
  { id: 'b10', n: 10, t: C.mids.grip, change: `Hold. ${pw(T.grip)}. The examiner puts the index and middle fingers side by side (together, never a V) into his palm; his fingers close round them (NEURO.HAND.grip, solved onto the gloved fingers) and squeeze; the examiner pulls and cannot pull them out (2 mm give, then holds).`, camera: 'From his side and a little below: his fingers wrapped round the gloved fingers.', sound: 'Rustle.' },
  { id: 'b11', n: 11, t: C.mids.fing, change: `Hold. ${pw(T.fing)}. His hand rests palm down on his thigh, fingers spread (NEURO.HAND.spread, settled onto the thigh); the pad of the examiner's index finger presses on the thumb side of his index finger, pushing it toward the middle finger; it gives about 2 mm and holds (the first dorsal interosseous).`, camera: 'Close-up from above (from the side of his fingertips): his whole hand and the examiner\'s finger.', sound: 'Rustle.' },
  { id: 'b12', n: 12, t: 88.0, change: 'Hard cut back to his right side: the hands are at rest; the camera pulls back to the CNS home shot, held still for the last second (breathing and flicker off): the same frame as the first.', camera: 'Pull back to the CNS home shot.', sound: 'The room bed fades out over the last 0.5 s.' },
].map((b) => Object.assign(b, { span: span(b.n), text: cap(b.n), name: C.BEATS[b.n - 1].name }));
const panelNames = await page.evaluate(() => ({ panels: window.REVIEW.names, pairs: window.REVIEW.pairs }));
const NOTE = {
  'a-plan': ['a) Plan', 'His RIGHT and LEFT against the screen; the examiner on his right; the dashed place is where the examiner stands for the left-side tests.'],
  'b-shakeR': ['b) Tone grips', 'Right: the handshake. Gaps measured on the meshes from each touching part (examiner\'s palm, fingers and thumb on his hand; his fingers and thumb on the glove).'],
  'b-cupR': ['b) Tone grips', 'Right: the examiner\'s palm and fingers cupping the back of his elbow.'],
  'b-shakeL': ['b) Tone grips', 'Left (the examiner on his left): the handshake with the examiner\'s left hand.'],
  'b-cupL': ['b) Tone grips', 'Left: the cup under the back of his elbow.'],
  'c-driftFoot': ['c) Pronator drift', 'From the foot end, start and end of the 7 s hold: the measured heights of both hands and the palm angles.'],
  'c-driftSide': ['c) Pronator drift', 'From his right side, start and end of the hold.'],
  'e-gripSideR': ['e) The grip', 'Right hand from the side: each of his fingers and his thumb on the gloved fingers.'],
  'e-gripBelowR': ['e) The grip', 'Right hand from below.'],
  'e-gripSideL': ['e) The grip', 'Left hand from the side (the examiner on his left).'],
  'e-gripBelowL': ['e) The grip', 'Left hand from below.'],
  'f-raised': ['f) The raised arm', 'The top of the shoulder in the drift camera and in the abduction camera (the known v5 limit).'],
};
for (const n of panelNames.pairs) if (/^d-/.test(n)) NOTE[n] = ['d) Power', `${n.slice(2, -1)} ${n.endsWith('R') ? 'right' : 'left'}: his own movement into the test position | the examiner's hand on the named point (gaps measured on the meshes).`];
const REVIEW = [...panelNames.panels, ...panelNames.pairs].filter((id) => NOTE[id]).map((id) => ({ id, group: NOTE[id][0], note: NOTE[id][1], pair: panelNames.pairs.includes(id) }));
REVIEW.sort((a, b) => a.group.localeCompare(b.group));
if (args.includes('--json')) { fs.writeFileSync(path.join(OUT, 'panels.json'), JSON.stringify({ BEATS, REVIEW, samples: N, size: [Wd, Ht] }, null, 1)); console.log('panels.json written'); await b.close(); process.exit(0); }
const grab = async (file, fn) => { if (!FORCE && !only.length && fs.existsSync(path.join(OUT, 'img', file))) { console.log('   (have)', file); return; } const d = await page.evaluate(fn); fs.writeFileSync(path.join(OUT, 'img', file), Buffer.from(d.split(',')[1], 'base64')); console.log('  ', file, ((Date.now() - T0) / 1000).toFixed(0), 's'); };
for (const p of BEATS) {
  if (only.length && !only.includes(p.id)) continue;
  await grab(p.id + '.jpg', `(() => { window.CAPTIONS = true; REVIEW.beat(); window.seek(${p.t}); return document.getElementById('c').toDataURL('image/jpeg', 0.9); })()`);
}
for (const p of REVIEW) {
  if (only.length && !only.includes(p.id)) continue;
  if (p.pair) { await grab(p.id + '.jpg', `REVIEW.pair('${p.id}')`); continue; }
  await grab(p.id + '.jpg', `(() => { window.CAPTIONS = false; const t = REVIEW.panel('${p.id}'); window.seek(t); const d = document.getElementById('c').toDataURL('image/jpeg', 0.9); REVIEW.beat(); return d; })()`);
}
const measured = await page.evaluate(() => window.REVIEW.MEASURED);
fs.writeFileSync(path.join(OUT, 'panel-measures.json'), JSON.stringify(measured, null, 1));
if (!only.length || args.includes('--report')) { const report = await page.evaluate(() => window.REVIEW.report()); fs.writeFileSync(path.join(OUT, 'contacts.json'), JSON.stringify(report, null, 1)); console.log('contacts.json', report.length, 'contacts'); }
fs.writeFileSync(path.join(OUT, 'panels.json'), JSON.stringify({ BEATS, REVIEW, samples: N, size: [Wd, Ht] }, null, 1));
await b.close();
console.log('done', ((Date.now() - T0) / 1000).toFixed(0), 's');
