// cns5/cns5-style.js: "Soft Clay" style object for PART 5 OF 11 of the neurological (CNS) examination video:
// the motor system of the ARMS (inspection, tone, pronator drift, power). Classic script. Needs THREE, K (lib/stage.js),
// SOUND (lib/sound.js), the shared/ scripts (v5, neuro mode), cns5/contact5.js (C5) and cns5/kin.js (KIN).
// Defines window.CNS5 (the style object). Units: 1 = 10 cm. Head at screen left (-X), feet at screen right (+X), the
// patient's RIGHT side toward the camera (+Z), the examiner on his right (on his LEFT, -Z, for the left-side tests).
//
// STORYBOARD = ANIMATION: every camera (W.CAM) and every contact pose (SOL, solved once by tools/solve.mjs into
// solved.json) is defined once here; the storyboard (tools/storyboard.mjs) renders its stills from this same data
// through window.CNS5_WORLD.
(function (root) {
  const THREE = root.THREE, K = root.K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const Q = () => new THREE.Quaternion();
  const SOLVE_VERSION = 'cns5-solve-v1';

  // ================================================================ CONTENT (the story, in order; times in seconds)
  const D = 90;
  const HOME_HOLD = 1.0;              // the CNS home shot, still, at both ends
  // every cut lands on the pose grid (the patient and the examiner move on twos, 15 poses a second; the camera follows t):
  // a cut at a time off the grid would show the old pose for one frame under the new camera
  const G = (x) => Math.ceil(x * 15 - 1e-6) / 15;
  const BEATS = [
    { n: 1, name: 'Position', t0: 0, t1: 5 },
    { n: 2, name: 'Inspection', t0: 5, t1: 13, hold: [5.3, 6.8] },
    { n: 3, name: 'Tone - right arm', t0: 13, t1: 23, hold: [13.3, 14.8] },
    { n: 4, name: 'Tone - left arm', t0: 23, t1: 29.6 },
    { n: 5, name: 'Pronator drift', t0: 29.6, t1: 42, hold: [29.9, 31.4] },
    { n: 6, name: 'Shoulder abduction C5', t0: 42, t1: 50, hold: [42.3, 43.8] },
    { n: 7, name: 'Elbow flexion C5 C6', t0: 50, t1: 58, hold: [50.3, 51.8] },
    { n: 8, name: 'Elbow extension C7', t0: 58, t1: 65, hold: [58.2, 59.7] },
    { n: 9, name: 'Wrist extension C6 C7', t0: 65, t1: G(72.5), hold: [65.2, 66.7] },
    { n: 10, name: 'Finger flexion C8', t0: G(72.5), t1: 80, hold: [72.7, 74.2] },
    { n: 11, name: 'Finger abduction T1', t0: 80, t1: 87, hold: [80.2, 81.7] },
    { n: 12, name: 'End', t0: 87, t1: 90 },
  ];
  const B = (n) => BEATS[n - 1];
  // a power test: the right side, a hard cut to his left (the examiner has walked round), the left side, a hard cut back
  const power = (n, k = 1, kL = k) => {
    const b = B(n), h1 = b.hold[1];
    const R = { pose: [h1 + 0.05, h1 + 0.6 * k], exIn: [h1 + 0.35 * k, h1 + 0.95 * k], press: [h1 + 0.95 * k, h1 + 2.1 * k], exOut: [h1 + 2.1 * k, h1 + 2.4 * k], down: [h1 + 2.38 * k, h1 + 2.78 * k] };
    const c = G(h1 + 2.85 * k);                 // the cut to his left, on the pose grid
    const L = { pose: [c + 0.05, c + 0.5 * kL], exIn: [c + 0.3 * kL, c + 0.8 * kL], press: [c + 0.8 * kL, c + 1.8 * kL], exOut: [c + 1.8 * kL, c + 2.08 * kL], down: [c + 2.06 * kL, c + 2.4 * kL] };
    return { R, L, cutL: c, cutR: G(b.t1) };
  };
  // every event of the part: the picture and the sound both read this table
  const T = {
    push: [1.0, 5.0],
    no: 6.85, inspect: [7.35, 12.7],
    // tone, right: the examiner's hands go to where the handshake and the elbow cup will be and wait; his hand rises into the
    // grip (exIn ends before his offer does); then the examiner moves the arm
    toneR: { offer: [14.9, 15.55], exIn: [14.8, 15.45], moves: 15.8, speed: 1.16, release: [21.6, 22.15], down: [21.7, 22.45] },
    toneL: { cut: 23.0, offer: [23.15, 23.7], exIn: [23.05, 23.6], moves: 23.95, speed: 1.52, release: [28.42, 28.9], down: [28.5, 29.15], cutR: 29.6 },
    drift: { lift: [31.5, 32.5], close: [32.25, 32.55], still: [32.6, 39.6], open: [39.6, 39.8], lower: [39.9, 40.95] },
    abd: power(6, 1.12), elbF: power(7, 1.12), elbE: power(8), wrist: power(9, 1.05), grip: power(10, 1.1), fing: power(11),
    end: { cam: 87.0, pull: [87.25, 89.0] },
  };
  // the tone moves (angles, degrees, from the handshake position), at irregular, changing speeds: wrist, forearm, elbow, shoulder
  const TONE_BASE = { flex: 14, abd: 10, elbow: 55, plane: 22, pron: 0, wrist: 0 };
  const TONE_MOVES = [   // [dt from the previous key, changes]
    [0.0, {}], [0.38, { wrist: -45 }], [0.55, { wrist: 38 }], [0.3, { wrist: -28 }], [0.42, { wrist: 30 }], [0.25, { wrist: 0 }],
    [0.48, { pron: -72 }], [0.33, { pron: 55 }], [0.55, { pron: -55 }], [0.25, { pron: 0 }],
    [0.42, { elbow: 112 }], [0.6, { elbow: 28 }], [0.32, { elbow: 96 }], [0.36, { elbow: 55 }],
    [0.36, { abd: 30 }], [0.45, { abd: 4 }], [0.28, { abd: 22 }], [0.3, { abd: 10 }],
  ];
  const CAPTIONS = [
    { t0: 1.4, t1: 4.8, text: 'Motor system: the arms', place: 'top' },
    { t0: 7.5, t1: 12.75, text: 'Look: no wasting, no fasciculation, no tremor (ask about pain first)', place: 'top' },
    { t0: 15.9, t1: 22.6, text: 'Tone: let it go floppy - wrist, forearm, elbow, shoulder: normal', place: 'top' },
    { t0: 24.0, t1: 29.3, text: 'Same on the left: normal tone', place: 'top' },
    { t0: 32.7, t1: 39.5, text: 'Pronator drift: arms out, palms up, eyes closed - no drift', place: 'bottom' },
    { t0: T.abd.R.press[0], t1: T.abd.L.exOut[1], text: 'Shoulder abduction (C5): against gravity, then against my hand - full power', place: 'top' },
    { t0: T.elbF.R.press[0], t1: T.elbF.L.exOut[1], text: 'Elbow flexion (C5, C6): pull me towards you - full power', place: 'bottom' },
    { t0: T.elbE.R.press[0], t1: T.elbE.L.exOut[1], text: 'Elbow extension (C7): push me away - full power', place: 'bottom' },
    { t0: T.wrist.R.press[0], t1: T.wrist.L.exOut[1], text: "Wrist extension (C6, C7): don't let me push it down - full power", place: 'top' },
    { t0: T.grip.R.press[0], t1: T.grip.L.exOut[1], text: 'Finger flexion (C8): squeeze my fingers - full power', place: 'top' },
    { t0: T.fing.R.press[0], t1: T.fing.L.exOut[1], text: "Finger abduction (T1): spread them, don't let me push them in - full power", place: 'top' },
  ];
  // silent speech: [time, visemes] (between keys the mouth is at rest); 3 poses per viseme
  const SPEECH = [[T.no, ['E', 'O', 'O', 'rest']]];      // "No" (no pain in the arms or shoulders)
  const VIS_DUR = 0.2;

  // the patient's arm positions for the power tests (RIGHT arm; the left is the mirror), angles in degrees (cns5/kin.js)
  const TEST = {
    abd: { a: { flex: 0, abd: 90, elbow: 90, plane: 0, pron: -90 }, pose: 'fist', give: { abd: -0.55 }, firm: 'deltoid' },     // = NEURO.arm 'abduct90'
    elbF: { a: { flex: 2, abd: 9, elbow: 90, plane: 0, pron: -88 }, pose: 'fist', give: { elbow: -0.6 }, firm: 'biceps' },
    elbE: { a: { flex: 2, abd: 9, elbow: 90, plane: 0, pron: -88 }, pose: 'fist', give: { elbow: 0.6 }, firm: 'triceps' },
    wrist: { a: { flex: 8, abd: 9, elbow: 22, plane: 12, pron: 90, wrist: 42 }, pose: 'fist', give: { wrist: -1.8 }, firm: 'wristExt' },
    grip: { a: { flex: 2, abd: 10, elbow: 52, plane: 16, pron: 0 }, pose: 'grip', give: { elbow: 0.55 }, firm: 'fingerFlex' },
  };

  const FING_GIVE = 0.019;     // finger abduction: his index finger gives 1.9 mm at the examiner's finger, then holds
  // the angles of the tone moves, in order (each key, and halfway to the next): the elbow cup is solved on this path
  const TONE_PATH = (() => { const keys = []; let a = Object.assign({}, TONE_BASE); for (const [, ch] of TONE_MOVES) { a = Object.assign({}, a, ch); keys.push(Object.assign({}, a)); } const out = []; keys.forEach((k, i) => { out.push(k); if (i < keys.length - 1) { const m = {}; for (const q of Object.keys(k)) m[q] = (k[q] + keys[i + 1][q]) / 2; out.push(m); } }); return out; })();

  // ================================================================ stop-motion time and helpers
  const POSES = 15;
  const poseT = (t) => Math.floor(t * POSES + 1e-3) / POSES;          // = SET.poseTime
  const seg = (t, w, e) => K.seg(t, w[0], w[1], e || K.ease.inOut);
  const inWin = (t, w) => t >= w[0] && t <= w[1];
  // breathing: about 14 a minute, starting from the home breath at the end of the first second and back to it, exactly,
  // at the start of the last second (P.breathe has a 4.6 s period)
  const BREATH_K = 4.6 * 14 / 60;
  const breathT = (t) => K.clamp(t - HOME_HOLD, 0, D - 2 * HOME_HOLD) * BREATH_K;
  // serialisation of solved poses (solved.json)
  const A = (v) => v.toArray().map((x) => Math.round(x * 1e6) / 1e6);
  const toV = (a) => V(a[0], a[1], a[2]);
  const toQ = (a) => new THREE.Quaternion(a[0], a[1], a[2], a[3]);
  const clonePose = (p) => JSON.parse(JSON.stringify(p));

  const style = {
    id: 'cns5-soft-clay', name: 'Soft Clay - CNS part 5: motor system of the arms', duration: D,
    fonts: ['600 56px "Fredoka"'],
    render: Object.assign({}, root.SET.RENDER),
    content: { BEATS, CAPTIONS, T, HOME_HOLD, SPEECH, TEST, TONE_BASE, SOLVE_VERSION },
    captions: true,      // the CAPTIONS switch (window.CAPTIONS = false renders the clean version)
    // The end hold plays the start hold backwards (the same still scene; only the film grain, which follows the frame
    // number, differs), so the LAST frame is the FIRST frame exactly: the parts join with no jump.
    seekTime(t) { return t >= D - HOME_HOLD - 1e-6 ? Math.max(0, D - 1 / 30 - t) : t; },

    build(S) {
      const SET = root.SET, BED = root.BED, PATIENT = root.PATIENT, SHEET = root.SHEET, HANDS = root.HANDS, CLAY = root.CLAY, CAPTION = root.CAPTION, HOME = root.HOME, NEURO = root.NEURO, C5 = root.C5, KIN = root.KIN;
      // ------------------------------------------------------------ the CNS home (exactly as shared/README.md)
      const L = SET.build(S);
      const bed = BED.build(S);
      const table = BED.table(S);
      const P = PATIENT.build(S, { neuro: true });
      const SH = SHEET.build(S, P, { from: 'foot' });
      bed.placePillow(P.headBack(), 7.15);
      const exM = { glove: CLAY.mat('#5a8fd8', '#3e73c3', { rough: 0.42, sheen: 0.25, streak: 0.5, freq: 2, tile: 0.8, bump: 0.45, lump: 0.006, lumpSize: 0.6 }), sleeve: CLAY.mat('#24636a', '#1d5359', { rough: 0.82, streak: 0.4, scale: 1.6, side: THREE.DoubleSide }) };
      const EX = { R: HANDS.examinerArm(S, exM, 'R'), L: HANDS.examinerArm(S, exM, 'L') };
      HOME.apply(P, EX, SH, 'cns');
      const FACE0 = { pupilR: 3.5, pupilL: 3.5 };      // normal pupils for the CNS video (README)
      P.setFace({}); P.breathe(0);
      P.group.updateMatrixWorld(true);
      const Hh = NEURO.HAND;
      const SLEEVE = { R: [0, -0.42, 1], L: [0, -0.42, -1] };   // the sleeve leaves toward the side the examiner stands on

      // ------------------------------------------------------------ meshes and surfaces
      const visibleMeshes = (o) => C5.meshesUnder(o).filter((m) => { let p = m; while (p) { if (!p.visible) return false; p = p.parent; } return true; });
      const armSkin = (side) => [P.arms[side].armMesh].concat(visibleMeshes(P.arms[side].hand.body));     // his arm, palm and fingers (the hand's own palm piece is hidden)
      const handOf = (side) => EX[side].hand;
      const gloveMeshes = (side) => visibleMeshes(handOf(side).group);
      const exAll = (side) => visibleMeshes(EX[side].group);
      const legMeshes = () => { const out = []; P.group.traverse((m) => { if (!m.isMesh || !m.visible) return; let o = m, arm = false; while (o) { if (o === P.arms.R.group || o === P.arms.L.group || o === P.head) arm = true; o = o.parent; } if (!arm) out.push(m); }); return out; };
      const bedMeshes = () => visibleMeshes(S.scene.getObjectByName('bed')).concat(visibleMeshes(table.group));

      // ------------------------------------------------------------ the patient's arm states
      const REST = { R: HOME.restArm('R', 'reclined45', SH), L: HOME.restArm('L', 'reclined45', SH) };
      // pronator drift: the kit's 'outstretched' arm (horizontal at shoulder height, palm up, fingers together) with the hand
      // straight ahead of the shoulder: the two arms parallel, the hands exactly shoulder-width apart (the kit brings each hand
      // 2.5 cm in, which reads as a V from the foot end)
      const DRIFT_ARM = (s) => { const a = NEURO.arm(P, s, 'outstretched', { drift: 0 }), sh = P.shoulder(s); a.wrist = a.wrist.clone(); a.wrist.z = sh.z; return a; };
      // his fist (searched on the meshes, tools/fist-search.js): each fingertip curled onto the palm (0.5 mm, no finger bone
      // inside it); the thumb across the middle bones of the index and middle fingers, its shaft in front of the index so no
      // ring or loop shows from the thumb side (the kit's fist, and this part's first fist, read as an 'OK' ring from there)
      const FIST = { curl: { index: [1.7, 1.75, 1.2], middle: [1.5, 2, 1], ring: [1.65, 1.85, 1], little: [1.5, 1.8, 0.8] }, spread: 0, thumb: [0.601, 0.365, 0.337, 1.146] };
      const PPOSE = { relaxed: Hh.relaxed, fist: FIST, grip: Hh.grip, spread: Hh.spread, together: Hh.together };
      const kinState = (side, a, pose) => KIN.arm(P, side, a, pose);
      const applyArm = (side, st) => HOME.applyArm(P, side, st);
      const withGive = (a, give, u) => { const o = Object.assign({}, a); for (const [k, v] of Object.entries(give || {})) o[k] = (o[k] || 0) + v * u; return o; };

      // ------------------------------------------------------------ examiner helpers
      const applyEx = (side, st) => { HANDS.SLEEVE_DIR = SLEEVE[st.left ? 'L' : 'R']; HOME.applyEx(EX, side, st); HANDS.SLEEVE_DIR = SLEEVE.R; };
      const relTo = (fr, wrist, quat, back) => { const iq = fr.q.clone().invert(); return { p: wrist.clone().sub(fr.p).applyQuaternion(iq), q: iq.clone().multiply(quat), back: back.clone().applyQuaternion(iq) }; };
      const fromRel = (fr, rel) => ({ wrist: fr.p.clone().add(toV(rel.p).applyQuaternion(fr.q)), quat: fr.q.clone().multiply(toQ(rel.q)), back: toV(rel.back).applyQuaternion(fr.q).normalize(), pose: rel.pose });
      const POSE = {
        travel: { all: [0.25, 0.35, 0.2], spread: 0.25, thumb: [0.2, 0, 0.15, 0.1] },        // between contacts: relaxed, fingers together, slightly curled
        flat: { all: [0.04, 0.06, 0.03], spread: 0.12, thumb: [0.12, 0, 0.06, 0.04] },
        shake: { all: [0.35, 0.5, 0.3], spread: 0.1, thumb: [0.15, 0, 0.12, 0.08] },
        cup: { all: [0.25, 0.35, 0.2], spread: 0.1, thumb: [0.2, 0, 0.12, 0.08] },
        wrap: { all: [0.3, 0.4, 0.25], spread: 0.08, thumb: [0.3, 0, 0.15, 0.1] },
        point: { curl: { index: [0.08, 0.12, 0.08], middle: [1.45, 1.6, 1.0], ring: [1.5, 1.6, 1.0], little: [1.5, 1.6, 1.0] }, spread: 0.1, thumb: [0.85, 0.6, 0.5, 0.4] },
        two: { curl: { index: [0.05, 0.08, 0.05], middle: [0.05, 0.08, 0.05], ring: [1.5, 1.65, 1.05], little: [1.5, 1.65, 1.05] }, fan: { index: 0.02, middle: -0.02, ring: 0.05, little: 0.12 }, thumb: [0.9, 0.65, 0.55, 0.45] },   // index and middle side by side (never a V)
      };

      // ---- the tone sequences (angles over time): the right arm, then the left (a little faster)
      const toneKeys = (t0, speed) => { const out = []; let t = t0, a = Object.assign({}, TONE_BASE); for (const [dt, ch] of TONE_MOVES) { t += dt / speed; a = Object.assign({}, a, ch); out.push([t, Object.assign({}, a)]); } return out; };
      const TONE_R = toneKeys(T.toneR.moves, T.toneR.speed), TONE_L = toneKeys(T.toneL.moves, T.toneL.speed);
      if (TONE_R[TONE_R.length - 1][0] > T.toneR.release[0] - 0.05 || TONE_L[TONE_L.length - 1][0] > T.toneL.release[0] - 0.05) throw new Error('tone moves run past the release');
      const toneEase = (i) => [K.ease.inOut, (x) => 1 - Math.pow(1 - x, 2.2), (x) => x * x * (3 - 2 * x), K.ease.out][i % 4];   // irregular: each move eases its own way
      // the arm angles at every pose frame while the examiner holds his arm (the same keys and eases as his arm timeline below)
      const angKey = (a) => ['flex', 'abd', 'elbow', 'plane', 'pron', 'wrist', 'dev'].map((k) => (a[k] || 0).toFixed(3)).join(',');
      const toneFrameAngles = () => {
        const out = new Map();
        for (const [w, keys] of [[T.toneR, TONE_R], [T.toneL, TONE_L]]) {
          const kk = [[w.offer[1], TONE_BASE, K.ease.inOut]].concat(keys.map(([t, a], i) => [t, a, toneEase(i)]), [[w.down[0], TONE_BASE, K.ease.inOut]]);
          for (let f = Math.ceil(w.offer[1] * POSES - 1e-6); f / POSES <= w.release[1]; f++) {
            const tp = f / POSES; let i = 0; while (i < kk.length - 1 && kk[i + 1][0] <= tp) i++;
            const a = i === kk.length - 1 ? kk[i][1] : (kk[i][1] === kk[i + 1][1] ? kk[i][1] : KIN.lerpAngles(kk[i][1], kk[i + 1][1], kk[i + 1][2](K.clamp((tp - kk[i][0]) / (kk[i + 1][0] - kk[i][0])))));
            out.set(angKey(a), a);
          }
        }
        return [...out.values()];
      };

      // ============================================================ SOLVING (tools/solve.mjs runs this once; renders load it)
      // The contact solver works on the RIGHT side (his right arm, the examiner on his right); the left side is the exact
      // mirror (z -> -z), measured again on the left meshes. Every gap is measured on the real meshes (cns5/contact5.js).
      function solveAll(only, prev) {
        const T0 = performance.now();
        const SOL = prev ? JSON.parse(JSON.stringify(prev)) : { rel: {}, cup: null, ppose: {}, abdf: {} };
        SOL.version = SOLVE_VERSION; SOL.log = [];
        const want = (k) => !only || only.includes(k);
        const log = (s) => { SOL.log.push(s); if (root.console) console.log('[cns5] ' + s); };
        const poseR = (a, pose) => { const st = kinState('R', a, pose); applyArm('R', st); P.arms.R.group.updateMatrixWorld(true); return st; };
        const surfArm = (side, at, r = 2.4) => C5.surface(armSkin(side), at, r);
        const rc = new THREE.Raycaster();
        const hitMeshes = (meshes, from, dir) => { rc.set(from, dir.clone().normalize()); const h = rc.intersectObjects(meshes, false)[0]; if (!h) return null; return { p: h.point.clone(), n: h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize() }; };
        const hitArm = (side, from, dir) => { P.arms[side].group.updateMatrixWorld(true); return hitMeshes([P.arms[side].armMesh], from, dir); };
        const F4 = ['index', 'middle', 'ring', 'little'];
        // a finger settled onto a surface: bent at its three joints until its smallest gap is 0.5 mm; if it cannot reach,
        // it is turned a little toward its neighbours (never more than 0.15 rad, so the fingers stay together)
        const fanOf = (pose, k) => (pose.fan && pose.fan[k] != null ? pose.fan[k] : HANDS.FINGERS[k].spread * (pose.spread == null ? 1 : pose.spread) * 2.2);
        // the pad (the end bone) of a finger or thumb
        const padMeshes = (hand, f) => C5.meshesUnder(f === 'thumb' ? hand.thumb.ip : hand.fingers[f].dip);
        const PAD_MAX = 0.012;   // a pad further than 1.2 mm from the skin is bent onto it
        // bend the two end joints of a finger (the middle one 0.6 as much as the end one) until its pad is at the target gap on
        // every surface of Ss, with no part of the finger sinking in; place(i) puts the hand where surface i is measured
        // bend a finger's joints along direction D (added to its curl, per unit t) until its pad is at the target gap on every
        // surface of Ss with no part of the finger sinking in; the end joints first (D = 0, 0.6, 1), and if the pad still hangs
        // off (the finger already touching along its middle bone), the other mixes; no joint past its limit. The thumb: its two
        // outer joints (pose.thumb[2], [3]). place(i) puts the hand where surface i is measured.
        const PAD_DIRS = [[0, 0.6, 1], [0, 1, 0.6], [-0.3, 0.8, 0.8], [-0.5, 1, 1], [0.3, 0.3, 1]];
        const THUMB_DIRS = [[0.5, 1], [1, 0.5], [0, 1]];
        const padTo = (hand, pose, f, Ss, place = () => {}) => {
          const thumb = f === 'thumb', c0 = thumb ? pose.thumb.slice() : pose.curl[f].slice(), LIM = thumb ? [9, 9, 1.3, 1.4] : [1.6, 1.9, 1.45];
          const whole = () => (thumb ? C5.parts(hand, 'thumb') : C5.parts(hand, f));
          let best = null;
          for (const D of (thumb ? THUMB_DIRS : PAD_DIRS)) {
            const setT = (t) => { if (thumb) pose.thumb = [c0[0], c0[1], c0[2] + D[0] * t, c0[3] + D[1] * t]; else pose.curl[f] = c0.map((v, i) => v + D[i] * t); };
            const at = (t) => { setT(t); let pad = -1e9, wh = 1e9; Ss.forEach((S, i) => { place(i); hand.pose(pose); hand.group.updateMatrixWorld(true); pad = Math.max(pad, C5.gap(padMeshes(hand, f), S).gap); wh = Math.min(wh, C5.gap(whole(), S).gap); }); return { pad, whole: wh }; };
            const idx = thumb ? [2, 3] : [0, 1, 2], dd = thumb ? D : D;
            let tMax = 1.6; idx.forEach((j, k) => { const d = dd[k]; if (d > 0) tMax = Math.min(tMax, (LIM[j] - c0[j]) / d); });
            tMax = Math.max(0, tMax);
            let lo = 0, hi = tMax;
            const rHi = at(hi); if (rHi.pad > C5.TARGET && rHi.whole >= 0.0003) lo = hi;
            else for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2, r = at(m); if (r.pad > C5.TARGET && r.whole >= 0.0003) lo = m; else hi = m; }
            const r = at(lo); if (!best || r.pad < best.r.pad) best = { r, t: lo, D };
            if (r.pad <= PAD_MAX) break;
          }
          if (thumb) pose.thumb = [c0[0], c0[1], c0[2] + best.D[0] * best.t, c0[3] + best.D[1] * best.t]; else pose.curl[f] = c0.map((v, i) => v + best.D[i] * best.t);
          place(0); hand.pose(pose); hand.group.updateMatrixWorld(true); return best.r;
        };
        const settleFinger = (hand, pose, f, S0, o = {}) => {
          const fans = {}; for (const k of F4) fans[k] = fanOf(pose, k); pose.fan = fans;
          if (!pose.curl) { pose.curl = {}; for (const k of F4) pose.curl[k] = (pose.all || [0.12, 0.18, 0.1]).slice(); }
          const f0 = pose.fan[f]; let best = null;
          const ratios = o.ratio ? [o.ratio] : [[0.5, 1, 0.8], [0.9, 1, 0.6], [1.0, 0.6, 0.4], [0.3, 1, 1]];
          search: for (const ratio of ratios) for (const df of (o.fans || [0, -0.05, 0.05, -0.1, 0.1, -0.15, 0.15])) {
            pose.fan[f] = f0 + df;
            // o.cap: no joint past what a finger can bend (knuckle 1.6, middle joint 1.9, end joint 1.4 rad)
            const hi = Math.min(o.hi == null ? 2.9 : o.hi, o.cap ? Math.min(1.6 / ratio[0], 1.9 / ratio[1], 1.4 / ratio[2]) : 9);
            const r = C5.curlTo(hand, pose, f, S0, { lo: o.lo == null ? -0.35 : o.lo, hi, ratio });
            const sc = Math.abs(r.gap - C5.TARGET) + 3 * Math.max(0, -r.gap) + 0.02 * Math.abs(df);
            if (!best || sc < best.sc) best = { sc, df, curl: pose.curl[f].slice(), gap: r.gap };
            if (r.gap >= 0 && r.gap <= 0.009) break search;
          }
          pose.fan[f] = f0 + best.df; pose.curl[f] = best.curl; hand.pose(pose); hand.group.updateMatrixWorld(true);
          // the pad too: a finger touching only along its middle bones has its two end joints bent further until the pad rests on the skin
          if (o.pad !== false && C5.gap(padMeshes(hand, f), S0).gap > PAD_MAX) padTo(hand, pose, f, [S0]);
          return C5.gap(C5.parts(hand, f), S0).gap;
        };
        // lay a gloved hand on a surface: the contact settled to 0.5 mm along n, then each finger (and the thumb) onto it
        const layHand = (side, contact, at, n, fingerDir, base, S0, back, o = {}) => {
          const ft = fingerDir.clone().addScaledVector(n, -fingerDir.dot(n)).normalize(), dip = o.dip || 0;
          const hand = handOf(side), pose = clonePose(base);
          const quat = HANDS.quat(ft.clone().multiplyScalar(Math.cos(dip)).addScaledVector(n, -Math.sin(dip)), n.clone().multiplyScalar(Math.cos(dip)).addScaledVector(ft, Math.sin(dip)));
          // the fingers start straight and the thumb out, so the palm (or the named part) reaches the skin first
          const fingers = o.fingers || (contact === 'palm' || o.part === 'fingers' ? F4 : []);
          if (o.open !== false && fingers.length) { pose.curl = {}; for (const f of F4) pose.curl[f] = fingers.includes(f) ? [-0.08, 0, 0] : ((base.curl && base.curl[f]) || base.all).slice(); if (o.thumb !== false) pose.thumb = [-0.3, 0, 0.05, 0.05]; }
          hand.pose(pose); HANDS.place(hand, contact, at.clone().addScaledVector(n, 0.15), quat);
          const part = () => (o.part === 'fingers' ? C5.parts(hand, 'fingers') : contact === 'palm' ? C5.parts(hand, 'palm') : C5.parts(hand, contact.replace('Pad', 'Tip')));
          const all = () => C5.parts(hand, 'palm').concat(C5.parts(hand, 'fingers'), C5.parts(hand, 'thumb'));
          // down: the contact part to 0.5 mm, and no part of the hand into the skin
          const down = () => { const w = hand.group.position.clone(); C5.settle((d) => { hand.group.position.copy(w).addScaledVector(n, d); hand.group.updateMatrixWorld(true); }, () => Math.min(C5.gap(part(), S0).gap, C5.gap(all(), S0).gap + (C5.TARGET - 0.001))); };
          // each round: the fingers and thumb opened, the palm down to 0.5 mm, then each finger and the thumb bent onto the skin
          // (the last step is always the fingers, so they never hold the palm off the skin)
          const openUp = () => { for (const f of fingers) pose.curl[f] = [Math.min(pose.curl[f][0], -0.05), 0, 0]; if (o.thumb !== false && contact !== 'indexPad') pose.thumb = [-0.3, pose.thumb[1], 0.05, 0.05]; hand.pose(pose); hand.group.updateMatrixWorld(true); };
          for (let k = 0; k < (o.rounds || 3); k++) {
            if (k) openUp();
            down();
            for (const f of fingers) settleFinger(hand, pose, f, S0, { fans: k ? [0, -0.05, 0.05] : undefined, cap: o.cap });
            if (o.thumb !== false && contact !== 'indexPad') C5.thumbTo(hand, pose, S0, { lo: -0.9, hi: 1.2 });
          }
          if (o.thumb !== false && contact !== 'indexPad' && C5.gap(C5.parts(hand, 'thumb'), S0).gap < C5.TARGET) C5.thumbTo(hand, pose, S0, { lo: -1.8, hi: 1.2 });
          // the thumb's pad onto the skin too (its outer joints bent) when it touches only along its base
          if (o.thumb !== false && contact !== 'indexPad' && C5.gap(padMeshes(hand, 'thumb'), S0).gap > PAD_MAX) padTo(hand, pose, 'thumb', [S0]);
          hand.pose(pose); hand.group.updateMatrixWorld(true);
          return { wrist: hand.group.position.clone(), quat: hand.group.quaternion.clone(), pose, back: back.clone().normalize() };
        };
        // the gaps of the palm, each finger and the thumb (mm)
        const handGaps = (side, S0, parts) => { const h = handOf(side), out = {}; for (const pt of parts) out[pt] = C5.gap(C5.parts(h, pt), S0).gap; return out; };
        const gapErr = (g, need) => { let e = 0; for (const k of need) { const v = g[k], wt = k === 'palm' ? 10 : 1; e += wt * (Math.max(0, v - 0.011) * 3 + Math.max(0, -v) * 30 + Math.abs(v - C5.TARGET) * 0.2); } return e; };   // the palm (the named part) counts most
        // search where along the fingers (and to the side) a hand is laid, and how it is turned about the skin normal, for the
        // pose in which the palm and every named part rest on the skin; hitFn(point, n) re-finds the skin under each try
        const searchLay = (side, contact, at, n, fdirs, offs, sides, base, Sfn, back, o, need, hitFn) => {
          let best = null;
          for (const fd of fdirs) for (const so of offs) for (const sd of sides) {
            const ft = fd.clone().addScaledVector(n, -fd.dot(n)).normalize(), lat = new THREE.Vector3().crossVectors(n, ft);
            const p0 = at.clone().addScaledVector(ft, so).addScaledVector(lat, sd), h = hitFn(p0.clone().addScaledVector(n, 1.2), n.clone().negate()) || { p: p0, n };
            const S0 = Sfn(h.p), st = layHand(side, contact, h.p, h.n, fd, base, S0, back, o);
            const g = handGaps(side, S0, need), e = gapErr(g, need) + 0.01 * (Math.abs(so) + Math.abs(sd));
            if (!best || e < best.e) best = { e, st, g, so, sd, fd: fd.clone(), at: h.p.clone(), n: h.n.clone() };
          }
          applyEx(side, best.st);
          return best;
        };
        const fmt = (g) => Object.entries(g).map(([k, v]) => `${k} ${(v * 100).toFixed(2)}`).join(', ');
        const { F, U, Lat } = KIN.frame(P);
        const store = (name, frameName, a, st, extra) => { const fr = KIN.frames(P, a)[frameName], r = relTo(fr, st.wrist, st.quat, st.back); SOL.rel[name] = Object.assign({ frame: frameName, p: A(r.p), q: [r.q.x, r.q.y, r.q.z, r.q.w], back: A(r.back), pose: st.pose }, extra || {}); };

        // ---- 1. tone: the handshake. Palm to palm, the thumb webs together, the examiner's fingers across the little-finger
        // edge of his hand onto its back, the thumbs crossing over the backs of the hands; his relaxed fingers round the
        // examiner's hand the same way
        if (want('shake')) {
          const a = TONE_BASE, ph = P.arms.R.hand, ex = handOf('R');
          const web = (h) => h.group.localToWorld(V(0.62, -0.1, -0.33));
          let best = null;
          for (const deg of [40, 50, 60]) {
            const ppose = clonePose(Hh.relaxed); ppose.spread = 0.25;
            poseR(a, ppose);
            const fr = KIN.frames(P, a).hand, fh = V(1, 0, 0).applyQuaternion(fr.q), dh = V(0, 1, 0).applyQuaternion(fr.q), lit = V(0, 0, 1).applyQuaternion(fr.q);
            const th = deg * Math.PI / 180, exF = fh.clone().negate().multiplyScalar(Math.cos(th)).addScaledVector(lit, Math.sin(th)).normalize(), n = dh.clone().negate();
            const quat = HANDS.quat(exF, n);   // the back of the examiner's hand faces away from his palm (-dh)
            const pose = clonePose(POSE.shake);
            ex.pose(pose); ex.group.quaternion.copy(quat); ex.group.position.set(0, 0, 0); ex.group.updateMatrixWorld(true);
            ex.group.position.copy(web(ph).addScaledVector(n, 0.25).sub(web(ex))); ex.group.updateMatrixWorld(true);
            const ctr = ph.world('palm'), Sp = () => surfArm('R', ctr, 2.4), Se = () => C5.surface(gloveMeshes('R'), ctr, 2.4);
            const exAllP = () => C5.parts(ex, 'palm').concat(C5.parts(ex, 'fingers'), C5.parts(ex, 'thumb'));
            const settleEx = () => { const w = ex.group.position.clone(), S0 = Sp(); C5.settle((d) => { ex.group.position.copy(w).addScaledVector(n, d); ex.group.updateMatrixWorld(true); }, () => Math.min(C5.gap(C5.parts(ex, 'palm'), S0).gap, C5.gap(exAllP(), S0).gap + 0.004)); };
            // open his fingers and the examiner's first, so the palms can meet
            ppose.curl = {}; for (const f of F4) ppose.curl[f] = [0.05, 0.08, 0.05]; ppose.thumb = [0.0, 0, 0.05, 0.05]; applyArm('R', kinState('R', a, ppose));
            pose.curl = {}; for (const f of F4) pose.curl[f] = [0.05, 0.08, 0.05]; pose.thumb = [0.0, 0, 0.05, 0.05]; ex.pose(pose);
            settleEx();
            for (let k = 0; k < 3; k++) {
              let S0 = Sp();
              for (const f of F4) settleFinger(ex, pose, f, S0, { lo: 0, hi: 2.9, pad: false });
              C5.thumbTo(ex, pose, S0, { lo: -0.9, hi: 1.3 });
              const S1 = Se();
              for (const f of F4) settleFinger(ph, ppose, f, S1, { lo: 0, hi: 2.4, ratio: [0.55, 1, 0.7], pad: false });
              C5.thumbTo(ph, ppose, S1, { lo: -0.3, hi: 1.3 });
              applyArm('R', kinState('R', a, ppose));
              settleEx();
            }
            // then the pads: his fingers' pads onto the back of the examiner's hand (the examiner's are done over the whole path below)
            { const S1 = Se(); for (const f of F4) if (C5.gap(padMeshes(ph, f), S1).gap > PAD_MAX) padTo(ph, ppose, f, [S1]); applyArm('R', kinState('R', a, ppose)); }
            ex.pose(pose); ex.group.updateMatrixWorld(true);
            const Sp0 = Sp(), Se0 = Se();
            const g = Object.assign(handGaps('R', Sp0, ['palm', 'thumb'].concat(F4)), Object.fromEntries(F4.concat(['thumb']).map((f) => ['his' + f, C5.gap(f === 'thumb' ? C5.meshesUnder(ph.thumb.mcp) : C5.meshesUnder(ph.fingers[f].mcp), Se0).gap])));
            const e = gapErr(g, Object.keys(g));
            log(`tone: handshake at ${deg} deg: ${fmt(g)}`);
            if (!best || e < best.e) best = { e, deg, ppose: clonePose(ppose), st: { wrist: ex.group.position.clone(), quat: ex.group.quaternion.clone(), pose: clonePose(pose), back: V(0.5, -0.32, 1) } };
          }
          SOL.ppose.shake = best.ppose;
          poseR(a, best.ppose);
          store('shake', 'hand', a, best.st);
          log(`tone: handshake chosen at ${best.deg} deg`);
          // the examiner's fingers round the back of his hand: one curl each that stays between 0.03 and 1.5 mm on every pose
          // of the tone moves (his skin near the wrist changes as the wrist and forearm move)
          {
            const ex = handOf('R'), rel0 = SOL.rel.shake, pose = clonePose(rel0.pose), base = {};
            for (const f of F4) base[f] = pose.curl[f].slice();
            const smp = TONE_PATH.map((aa) => { poseR(aa, SOL.ppose.shake); const st = fromRel(KIN.frames(P, aa).hand, rel0); return { st, S: C5.surface(armSkin('R'), st.wrist, 2.8) }; });
            const gapsFor = (f) => smp.map(({ st, S }) => { ex.pose(pose); ex.group.position.copy(st.wrist); ex.group.quaternion.copy(st.quat); ex.group.updateMatrixWorld(true); return C5.gap(C5.parts(ex, f), S).gap; });
            const msg = [];
            for (const f of F4) {
              const set = (t) => { pose.curl[f] = base[f].map((v, i) => v + t * [0.5, 1, 0.8][i]); };
              let lo = -0.7, hi = 0.6; set(lo); let g = gapsFor(f);
              if (Math.min(...g) >= 0.003) { for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; set(m); const gm = gapsFor(f); if (Math.min(...gm) >= 0.003) { lo = m; g = gm; } else hi = m; } set(lo); }
              // and its pad onto the back of his hand on every pose (the end joints bent further)
              const place = (i) => { ex.group.position.copy(smp[i].st.wrist); ex.group.quaternion.copy(smp[i].st.quat); };
              const pr = padTo(ex, pose, f, smp.map((x) => x.S), place);
              g = gapsFor(f);
              msg.push(`${f} ${(Math.min(...g) * 100).toFixed(2)}-${(Math.max(...g) * 100).toFixed(2)} (pad up to ${(pr.pad * 100).toFixed(2)})`);
            }
            // the index finger, which wraps nearest his wrist, is bent again at every pose of the path (0.5 mm each)
            { const f = 'index', b0 = pose.curl.index.slice(), ts = [], gs = [];
              smp.forEach(({ st, S }) => { const g1 = (t) => { pose.curl[f] = b0.map((v, i) => v + t * [0.5, 1, 0.8][i]); ex.pose(pose); ex.group.position.copy(st.wrist); ex.group.quaternion.copy(st.quat); ex.group.updateMatrixWorld(true); return C5.gap(C5.parts(ex, f), S).gap; };
                let lo = -0.8, hi = 1.0; if (g1(lo) < C5.TARGET) { ts.push(lo); gs.push(g1(lo)); return; } if (g1(hi) > C5.TARGET) { ts.push(hi); gs.push(g1(hi)); return; }
                for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2; if (g1(m) > C5.TARGET) lo = m; else hi = m; } ts.push(lo); gs.push(g1(lo)); });
              pose.curl.index = b0; SOL.shakeIndex = { base: b0, t: ts.map((v) => +v.toFixed(5)) };
              msg[0] = `index (bent per pose) ${(Math.min(...gs) * 100).toFixed(2)}-${(Math.max(...gs) * 100).toFixed(2)}`; }
            SOL.rel.shake.pose = pose;
            log(`tone: the examiner's fingers over the ${smp.length} poses of the moves (mm): ${msg.join(', ')}`);
          }
        }
        // ---- the cup under the back of the elbow (the examiner's other hand): here only where it sits (searched at the start of
        // the moves); it is then solved at every pose frame of the moves (cupF below), as the skin of the elbow changes when the
        // elbow bends and the forearm turns: at each the palm is laid on and the fingers (and their pads) bent round onto the skin
        // lay the cup at arm angles aa: the hand turned th (deg) about the skin normal from 'fingers across the elbow toward his
        // side', slid so (along) and sd (across); the palm, every finger and every pad scored; no finger joint past its limit
        const CUP_NEED = ['palm'].concat(F4, F4.map((f) => f + 'Tip'));
        const cupLay = (aa, ths, offs, sides, prevPose) => {
          poseR(aa, SOL.ppose.shake);
          const frE = KIN.frames(P, aa).elbow, post = V(0, 1, 0).applyQuaternion(frE.q), ux = V(1, 0, 0).applyQuaternion(frE.q);
          const c = frE.p.clone().addScaledVector(ux, -0.15), h = hitArm('R', c.clone().addScaledVector(post, 1.2), post.clone().negate());
          const fd0 = Lat.clone().negate().addScaledVector(ux, 0.15), fds = ths.map((th) => fd0.clone().applyAxisAngle(post, th * Math.PI / 180));
          const r = searchLay('L', 'palm', h.p, h.n, fds, offs, sides, prevPose || POSE.cup, (p) => surfArm('R', p, 1.8), V(0.15, -0.62, 1), { rounds: 2, cap: true }, CUP_NEED, (from, dir) => hitArm('R', from, dir));
          r.th = ths[fds.findIndex((d) => d.distanceTo(r.fd) < 1e-9)];
          return r;
        };
        // a cup is good when the palm and every finger are 0.03-1.2 mm from the skin and every pad within 1.2 mm
        const cupBad = (r) => CUP_NEED.some((k) => r.g[k] < 0.0003 || r.g[k] > 0.012);
        if (want('cup')) {
          const a = TONE_BASE;
          const b0 = cupLay(a, [-60, -40, -20, 0, 20, 40, 60], [-0.2, -0.1, 0, 0.1], [-0.3, -0.15, 0, 0.15]);
          log(`tone: elbow cup turned ${b0.th} deg, offset ${b0.so.toFixed(2)} along, ${b0.sd.toFixed(2)} across: ${fmt(b0.g)}`);
          SOL.cupBase = { th: b0.th, so: b0.so, sd: b0.sd, pose: b0.st.pose }; delete SOL.cupPath; delete SOL.cup; delete SOL.cupFrames;   // the frames are solved again from this base (cupF)
        }
        // ---- the cup at EVERY pose frame his arm takes while it is held (the arm moves on twos, so these are the only angles
        // it shows): no blending between solved poses, which let the fingers sink into the elbow between them.
        // Blocks cupF0..cupF3 each solve a quarter of the frames (so they can run side by side); cupF solves all four; cupFix
        // solves again only the stored frames with a part outside 0.03-1.5 mm.
        for (let q = 0; q < 4; q++) if (want('cupF' + q) || want('cupF') || want('cupFix')) {
          const pp = SOL.ppose.shake, frames = toneFrameAngles().filter((_, i) => i % 4 === q);
          SOL.cupFrames = SOL.cupFrames || {}; let worst = 0, padW = 0, n = 0;
          const err = (r) => Math.max(...['palm'].concat(F4).map((k) => Math.abs(r.g[k] - C5.TARGET)));
          // the cup's place on his elbow (from the cup block; searched the same way here if this solved.json predates it)
          if (!SOL.cupBase || SOL.cupBase.th == null) throw new Error('cupF needs the cup base: run node tools/solve.mjs --only cup first');
          const B = SOL.cupBase;
          // a palm left touching at under 0.03 mm (or just inside) is lifted off along the skin normal to 0.05 mm; then every
          // finger outside 0.03-1.2 mm is settled onto the skin again (the fingers wrap round the elbow, so the lift moves them)
          const liftClear = (r) => {
            const S0 = surfArm('R', r.at, 1.8), need = ['palm'].concat(F4);
            for (let k = 0; k < 4 && r.g.palm < 0.0003; k++) { r.st.wrist.addScaledVector(r.n, 0.0005 - r.g.palm); applyEx('L', r.st); r.g = handGaps('L', S0, need); }
            for (const f of F4) if (r.g[f] < 0.0003 || r.g[f] > 0.012 || C5.gap(padMeshes(handOf('L'), f), S0).gap > PAD_MAX) { applyEx('L', r.st); settleFinger(handOf('L'), r.st.pose, f, S0, { cap: true }); applyEx('L', r.st); }
            r.g = handGaps('L', S0, need); for (const f of F4) r.g[f + 'Pad'] = C5.gap(padMeshes(handOf('L'), f), S0).gap;
            return r;
          };
          const solveFrame = (aa) => {
            let r = cupLay(aa, [B.th], [B.so], [B.sd], B.pose);
            if (cupBad(r)) { const r2 = cupLay(aa, [B.th - 20, B.th, B.th + 20], [B.so - 0.15, B.so, B.so + 0.15], [B.sd - 0.15, B.sd, B.sd + 0.15], B.pose); if (r2.e < r.e) r = r2; }
            return liftClear(r);
          };
          // cupFix: only the frames already in solved.json with a part outside 0.03-1.5 mm
          const fixOnly = only && only.includes('cupFix');
          for (const aa of frames) {
            if (fixOnly) { const old = SOL.cupFrames[angKey(aa)]; if (old && Object.values(old.g).every((v) => v >= 0.03 && v <= 1.5)) continue; }
            const r = solveFrame(aa);
            const fr = KIN.frames(P, aa).elbow, rel = relTo(fr, r.st.wrist, r.st.quat, r.st.back);
            worst = Math.max(worst, err(r)); padW = Math.max(padW, ...F4.map((f) => r.g[f + 'Pad'])); n++;
            SOL.cupFrames[angKey(aa)] = { p: A(rel.p), q: [rel.q.x, rel.q.y, rel.q.z, rel.q.w], back: A(rel.back), pose: r.st.pose, g: Object.fromEntries(Object.entries(r.g).map(([k, v]) => [k, +(v * 100).toFixed(2)])) };
          }
          log(`tone: elbow cup solved at ${n} pose frames (part ${q + 1} of 4; largest error from 0.5 mm: ${(worst * 100).toFixed(2)} mm; pads up to ${(padW * 100).toFixed(2)} mm)`);
        }

        // ---- 2. the power tests: the examiner's hand on the named point, laid on his skin (searched)
        const all6 = ['palm'].concat(F4, ['thumb']);
        // shoulder abduction: the palm on the outside (top) of the upper arm just above the elbow, pressing down; the
        // fingers toward his shoulder, turned so the hand and forearm stay clear of his raised forearm and fist
        if (want('abd')) {
          const a = TEST.abd.a; poseR(a, FIST);
          const fr = KIN.frames(P, a), u = fr.r.u, E = fr.r.E, up = V(0, 1, 0).addScaledVector(u, -u.y).normalize();
          const c = E.clone().addScaledVector(u, -0.75), h = hitArm('R', c.clone().addScaledVector(up, 1.4), up.clone().negate());
          const fds = [0, 15, -15, 30].map((d) => u.clone().negate().applyAxisAngle(h.n, d * Math.PI / 180));
          const back = V(-0.35, 0.6, 0.75);
          const b = searchLay('R', 'palm', h.p, h.n, fds, [-0.15, 0, 0.15], [-0.12, 0, 0.12], POSE.flat, (p) => surfArm('R', p), back, { rounds: 2 }, all6, (from, dir) => hitArm('R', from, dir));
          store('abd', 'upper', a, b.st);
          log(`abduction: palm on the lower lateral upper arm: ${fmt(b.g)}`);
        }
        // elbow flexion / extension: the palm on the front (palm side) or the back of the wrist, the fingers across it and
        // round its far edge, the thumb round the near edge
        for (const [name, sgn] of [['elbF', -1], ['elbE', 1]]) {
          if (!want(name)) continue;
          const a = TEST[name].a; poseR(a, FIST);
          const fr = KIN.frames(P, a), f = fr.r.f, E = fr.r.E, dh = V(0, 1, 0).applyQuaternion(fr.hand.q), n0 = dh.clone().multiplyScalar(sgn);
          const c = E.clone().addScaledVector(f, KIN.L2 - 0.42), h = hitArm('R', c.clone().addScaledVector(n0, 1.4), n0.clone().negate());
          const back = (sgn < 0 ? V(0.15, 0.6, 0.8) : V(0.6, -0.28, 0.8));
          const b = searchLay('R', 'palm', h.p, h.n, [Lat.clone().negate()], [-0.4, -0.3, -0.2, -0.1, 0], [-0.1, 0, 0.1], POSE.wrap, (p) => surfArm('R', p), back, { rounds: 2 }, all6, (from, dir) => hitArm('R', from, dir));
          store(name, 'fore', a, b.st);
          log(`${name}: palm on the ${sgn < 0 ? 'front' : 'back'} of the wrist (slid ${b.so.toFixed(2)} along the fingers): ${fmt(b.g)}`);
        }
        // wrist extension: the examiner's other palm up under his forearm, its fingers along the underside toward his wrist
        // (steadying it), the fingers of the main hand flat on the back of his
        // fist over the knuckles, pressing down
        if (want('wrist')) {
          const a = withGive(TEST.wrist.a, TEST.wrist.give, 1); poseR(a, FIST);   // solved in the held position (after the give)
          const fr = KIN.frames(P, a), f = fr.r.f, E = fr.r.E, dh = V(0, 1, 0).applyQuaternion(fr.hand.q);
          const c = E.clone().addScaledVector(f, KIN.L2 - 0.85), h = hitArm('R', c.clone().addScaledVector(V(0, -1, 0), 1.4), V(0, 1, 0));
          const bS = searchLay('L', 'palm', h.p, h.n, [f.clone()], [-0.45, -0.3, -0.15, 0], [-0.08, 0, 0.08], POSE.flat, (p) => surfArm('R', p), V(-0.75, -0.15, 0.65), { rounds: 2 }, all6, (from, dir) => hitArm('R', from, dir));
          store('wristSup', 'fore', a, bS.st);
          log(`wrist: support under the forearm: ${fmt(bS.g)}`);
          const ph = P.arms.R.hand, kn = ph.group.localToWorld(V(0.72, 0.6, 0)), h2 = hitArm('R', kn, dh.clone().negate());
          const bF = searchLay('R', 'middleProxPalm', h2.p, h2.n, [Lat.clone().negate().addScaledVector(f, 0.15)], [-0.3, -0.15, 0, 0.15], [-0.1, 0, 0.1], POSE.flat, (p) => surfArm('R', p), V(0.6, 0.55, 0.6), { rounds: 3, thumb: false, part: 'fingers' }, F4, (from, dir) => hitArm('R', from, dir));
          store('wrist', 'hand', a, bF.st);
          log(`wrist: the fingers on the back of the fist: ${fmt(bF.g)}`);
        }
        // finger flexion: the examiner's index and middle fingers side by side through his grip (pointing from his thumb
        // side to his little-finger side), their backs against his palm, his fingers closed round them and his thumb over them
        if (want('grip')) {
          const a = TEST.grip.a, ph = P.arms.R.hand, ex = handOf('R'), pose = clonePose(POSE.two);
          const open = { curl: { index: [0.5, 0.65, 0.4], middle: [0.5, 0.65, 0.4], ring: [0.5, 0.65, 0.4], little: [0.5, 0.65, 0.4] }, spread: 0.15, thumb: [0.35, 0.6, 0.15, 0.1] };
          let ppose = { curl: { index: [0, 0, 0], middle: [0, 0, 0], ring: [0, 0, 0], little: [0, 0, 0] }, spread: 0.1, thumb: [-0.2, 0.3, 0.05, 0.05] };
          poseR(a, ppose);
          const fr = KIN.frames(P, a).hand, X = V(1, 0, 0).applyQuaternion(fr.q), Y = V(0, 1, 0).applyQuaternion(fr.q), Z = V(0, 0, 1).applyQuaternion(fr.q);
          const L2W = (x, y, z) => fr.p.clone().addScaledVector(X, x).addScaledVector(Y, y).addScaledVector(Z, z);
          const quat = HANDS.quat(Z, Y);
          ex.pose(pose);
          const centreOf = () => { ex.group.updateMatrixWorld(true); const dEx = V(0, 1, 0).applyQuaternion(ex.group.quaternion); return ex.world('indexMidBack').add(ex.world('middleMidBack')).multiplyScalar(0.5).addScaledVector(dEx, -0.09); };
          const putAt = (c) => { ex.group.quaternion.copy(quat); ex.group.position.set(0, 0, 0); ex.group.updateMatrixWorld(true); ex.group.position.copy(c.clone().sub(centreOf())); ex.group.updateMatrixWorld(true); };
          const two = () => C5.parts(ex, 'index').concat(C5.parts(ex, 'middle'));
          // the two fingers across the middle of his palm (his fingers open), then onto his palm to 0.5 mm
          let best = null;
          for (const x of [0.62, 0.72, 0.82]) for (const z of [0.0, 0.08, 0.16]) {
            putAt(L2W(x, -0.45, z));
            const w = ex.group.position.clone(); C5.settle((d) => { ex.group.position.copy(w).addScaledVector(Y, -d); ex.group.updateMatrixWorld(true); }, () => C5.gap(two(), C5.surface([P.arms.R.armMesh], centreOf(), 2.0)).gap);
            const gAll = C5.gap(two(), C5.surface(armSkin('R'), centreOf(), 2.0)).gap, gPalm = C5.gap(two(), C5.surface([P.arms.R.armMesh], centreOf(), 2.0)).gap;
            const sc = Math.abs(gPalm - C5.TARGET) * 5 + 30 * Math.max(0, -gAll) + 0.1 * Math.abs(x - 0.72);
            if (!best || sc < best.sc) best = { sc, x, z, pos: ex.group.position.clone(), gPalm, gAll };
          }
          ex.group.position.copy(best.pos); ex.group.updateMatrixWorld(true);
          // close his fingers and thumb onto the gloved fingers
          const Sg = C5.surface(gloveMeshes('R'), centreOf(), 2.0);
          for (const f of F4) settleFinger(ph, ppose, f, Sg, { lo: 0.0, hi: 2.8, ratio: [0.62, 1, 0.75], fans: [0, -0.04, 0.04, -0.08, 0.08] });
          // his thumb over the gloved fingers: its swing bisected for each opposition, the one resting at 0.5 mm kept
          // NEURO.HAND.grip's thumb, its two joints flexed (and its swing and turn nudged) until the pad rests on the glove
          { const tm = C5.meshesUnder(ph.thumb.mcp), tip = C5.meshesUnder(ph.thumb.ip), g0 = Hh.grip.thumb; let bt = null;
            for (const sw of [0, 0.15, 0.3, -0.15]) for (const op of [0, 0.25, 0.5, -0.25]) for (let m = g0[2]; m <= 1.7; m += 0.1) for (let ip = g0[3]; ip <= 1.5; ip += 0.1) {
              ppose.thumb = [g0[0] + sw, g0[1] + op, m, ip]; ph.pose(ppose); ph.group.updateMatrixWorld(true);
              const ga = C5.gap(tm, Sg).gap; if (ga < 0) break;
              const gp = C5.gap(tip, Sg).gap, sc = Math.abs(gp - C5.TARGET) + 0.01 * (Math.abs(sw) + Math.abs(op));
              if (!bt || sc < bt.sc) bt = { sc, t: ppose.thumb.slice(), gp };
            }
            ppose.thumb = bt.t; ph.pose(ppose);
            log(`grip: his thumb pad ${(bt.gp * 100).toFixed(2)} mm from the glove (thumb ${bt.t.map((v) => v.toFixed(2)).join(', ')})`); }
          applyArm('R', kinState('R', a, ppose));
          const g = Object.fromEntries(F4.concat(['thumb']).map((f) => [f, C5.gap(f === 'thumb' ? C5.meshesUnder(ph.thumb.mcp) : C5.meshesUnder(ph.fingers[f].mcp), Sg).gap]));
          g.palm = C5.gap(two(), C5.surface([P.arms.R.armMesh], centreOf(), 2.0)).gap;
          SOL.ppose.grip = ppose; SOL.ppose.gripOpen = open;
          store('grip', 'hand', a, { wrist: ex.group.position.clone(), quat: ex.group.quaternion.clone(), pose, back: V(0.2, 0.75, 0.6) });
          log(`grip: the gloved fingers across his palm (x ${best.x}, z ${best.z}); his fingers and thumb round them: ${fmt(g)}`);
        }
        // finger abduction: his hand palm down on the front of his thigh, fingers spread (each side solved on its own thigh);
        // the pad of the examiner's index finger on the thumb side of his index finger, pushing it toward the middle finger
        if (want('fing')) for (const s of ['R', 'L']) {
          const sz = s === 'R' ? 1 : -1, thigh = legMeshes(), ph = P.arms[s].hand;
          const knee = P.legPoint(s, 'patella'), along = knee.clone().sub(P.legPoint(s, 'hip')).normalize();
          const at0 = knee.clone().addScaledVector(along, -2.4);
          const hh = hitMeshes(thigh, at0.clone().add(V(0, 3, 0.25 * sz)), V(0, -1, 0)), n = hh.n;
          const fd = along.clone().add(V(0, 0, -0.12 * sz)).normalize();
          const quat = HANDS.quat(fd.clone().addScaledVector(n, -fd.dot(n)).normalize(), n);
          const ppose = clonePose(Hh.spread);
          const pole = V(0.1, -0.6, sz).normalize();
          const placeHand = (pt) => { ph.pose(ppose); const w = HANDS.place(ph, 'palm', pt, quat); const st = { wrist: w, quat: quat.clone(), pose: ppose, pole }; applyArm(s, st); return st; };
          const pt = hh.p.clone().addScaledVector(n, 0.15); let st = placeHand(pt);
          const settleP = () => { const p0 = pt.clone(); C5.settle((d) => { pt.copy(p0).addScaledVector(n, d); st = placeHand(pt); }, () => { const S1 = C5.surface(thigh, ph.world('palm'), 0.9); return Math.min(C5.gap([P.arms[s].armMesh], S1, { near: 0.55 }).gap, C5.gap(visibleMeshes(ph.body), S1).gap + 0.004); }); };
          settleP();
          for (let k = 0; k < 2; k++) {
            const S0 = C5.surface(thigh, pt, 2.4);
            for (const f of F4) settleFinger(ph, ppose, f, S0, { lo: -0.25, hi: 0.9, ratio: [0.6, 1, 0.7], fans: [0] });
            C5.thumbTo(ph, ppose, S0, { lo: -0.6, hi: 0.8 });
            st = placeHand(pt); settleP();
          }
          SOL.abdf[s] = { wrist: A(st.wrist), quat: [st.quat.x, st.quat.y, st.quat.z, st.quat.w], pole: A(st.pole), pose: clonePose(ppose) };
          const basePose = clonePose(ppose);
          const F0 = ph.fingers.index; F0.mcp.updateMatrixWorld(true);
          // his thumb side of the index finger: from the middle finger's knuckle toward the index finger's (works on both hands)
          const iK = F0.mcp.getWorldPosition(V(0, 0, 0)), mK = ph.fingers.middle.mcp.getWorldPosition(V(0, 0, 0)), iT = F0.dip.getWorldPosition(V(0, 0, 0));
          const fdir = iT.clone().sub(iK).normalize(), side = iK.clone().sub(mK); side.addScaledVector(fdir, -side.dot(fdir)).addScaledVector(n, -side.dot(n)).normalize();
          const pp = F0.mcp.localToWorld(V(F0.f.L[0] * 0.55, 0.02, 0)), Sx = C5.surface(visibleMeshes(F0.mcp), pp, 0.8);
          const hi = hitMeshes(visibleMeshes(F0.mcp), pp.clone().addScaledVector(side, 0.6), side.clone().negate());
          const hand = s, st2 = layHand(hand, 'indexPad', hi.p, hi.n, V(0, -1, 0).addScaledVector(hi.n, -0.3).add(V(0.25, 0, 0)), POSE.point, Sx, V(0.2, 0.65, 0.75 * sz), { dip: 0.55, thumb: false });
          // the give: his index finger turned toward the middle finger (about 2 mm at the examiner's finger) and bent again
          // onto his thigh, so it never sinks into it
          { const lever = hi.p.distanceTo(F0.mcp.getWorldPosition(V(0, 0, 0))), pg = clonePose(basePose); pg.fan.index += FING_GIVE / lever;
            ph.pose(pg); applyArm(s, { wrist: st.wrist, quat: st.quat, pose: pg, pole: st.pole });
            const gI = settleFinger(ph, pg, 'index', C5.surface(thigh, pt, 2.4), { lo: -0.4, hi: 0.9, ratio: [0.6, 1, 0.7], fans: [0] });
            SOL.abdf[s].poseGive = clonePose(pg);
            log(`finger abduction ${s}: in the give his index finger rests ${(gI * 100).toFixed(2)} mm above the thigh`);
            ph.pose(basePose); applyArm(s, { wrist: st.wrist, quat: st.quat, pose: basePose, pole: st.pole }); }
          SOL.rel['fing' + s] = { frame: 'world', p: A(st2.wrist), q: [st2.quat.x, st2.quat.y, st2.quat.z, st2.quat.w], back: A(st2.back), pose: st2.pose, push: A(side.clone().negate()), lever: +(hi.p.distanceTo(F0.mcp.getWorldPosition(V(0, 0, 0)))).toFixed(4) };
          const gp = C5.gap(C5.parts(handOf(hand), 'indexTip'), Sx).gap;
          log(`finger abduction ${s}: his hand on the thigh, the examiner's index pad on the thumb side of his index finger (${(gp * 100).toFixed(2)} mm)`);
          applyArm(s, REST[s]);
        }
        applyArm('R', REST.R); applyArm('L', REST.L); applyEx('R', ST.exRest.R); applyEx('L', ST.exRest.L);
        P.arms.R.hand.pose(REST.R.pose); P.arms.L.hand.pose(REST.L.pose);
        SOL.ms = Math.round(performance.now() - T0);
        log('solved in ' + (SOL.ms / 1000).toFixed(1) + ' s');
        return SOL;
      }

      // ------------------------------------------------------------ the examiner's rest states (exactly the home)
      const ST = { exRest: { R: HOME.solveEx(EX, 'R', HOME.exRest('R', 'cns', SH)), L: HOME.solveEx(EX, 'L', HOME.exRest('L', 'cns', SH)) } };
      // on his LEFT (after walking round): the mirror of the home rest, the examiner's hands swapped (his left hand is now
      // the one toward the patient's feet)
      ST.exRestLeft = { L: Object.assign(KIN.mirrorState(ST.exRest.R), { left: true }), R: Object.assign(KIN.mirrorState(ST.exRest.L), { left: true }) };

      // ------------------------------------------------------------ the solution: solved here, or loaded from solved.json
      let SOL = null;
      if (root.SOLVED && !root.SOLVE_ONLY) {
        if (root.SOLVED.version !== SOLVE_VERSION) throw new Error('solved.json is out of date (' + root.SOLVED.version + ' != ' + SOLVE_VERSION + '): run node tools/solve.mjs');
        SOL = root.SOLVED;
      } else SOL = solveAll(root.SOLVE_ONLY || null, root.SOLVE_ONLY ? root.SOLVED : null);   // tools/solve.mjs --only a,b re-solves those blocks into solved.json
      root.SOLVED_OUT = SOL;
      HOME.apply(P, EX, SH, 'cns'); P.setFace({}); P.breathe(0);

      // ============================================================ runtime states from the solution
      const PP = { shake: SOL.ppose.shake, grip: SOL.ppose.grip, spread: SOL.ppose.spread };
      // the examiner's hand for a stored contact, for the patient's arm at angles a, on side 'R' or 'L' (mirror)
      // the examiner's forearm: mostly from where the examiner stands (world), so it does not swing round with his hand
      const WORLD_BACK = { shake: [V(0.85, -0.3, 0.45).normalize(), 0.75], cup: [V(0.15, -0.62, 1).normalize(), 0.7], wristSup: [V(-0.75, -0.15, 0.65).normalize(), 1], fing: [V(0.2, 0.65, 0.75).normalize(), 1] };
      const exAt = (name, a, side, extra) => {
        const rel = SOL.rel[name], fr = KIN.frames(P, a)[rel.frame], st = fromRel(fr, rel);
        if (WORLD_BACK[name]) st.back = st.back.clone().lerp(WORLD_BACK[name][0], WORLD_BACK[name][1]).normalize();
        if (extra) st.wrist.add(extra);
        return side === 'L' ? Object.assign(KIN.mirrorState(st), { left: true }) : st;
      };
      // the cup under the elbow: the solution at the poses of the tone path either side of his current angles
      // where his arm is on the tone path: the two path poses either side and how far between them
      const pathPos = (a, side, tp) => {
        const keys = side === 'R' ? TONE_R : TONE_L, n = 2 * keys.length - 1;
        if (tp == null || tp <= keys[0][0]) return [0, 0, 0];
        if (tp >= keys[keys.length - 1][0]) return [n - 1, n - 1, 0];
        let i = 0; while (keys[i + 1][0] <= tp) i++;
        const a0 = keys[i][1], a1 = keys[i + 1][1]; let pr = 0;
        for (const k of Object.keys(a1)) { const d = a1[k] - (a0[k] || 0); if (Math.abs(d) > 1e-6) { pr = K.clamp(((a[k] || 0) - (a0[k] || 0)) / d); break; } }
        const j = 2 * i; return pr < 0.5 ? [j, j + 1, pr * 2] : [j + 1, j + 2, (pr - 0.5) * 2];
      };
      const cupAt = (a, side, tp) => {
        // solved at this very pose frame (every frame the examiner holds his arm); before and after the hold, his arm is at TONE_BASE
        const rel = SOL.cupFrames[angKey(a)] || ((root.CUP_MISS = (root.CUP_MISS || 0) + 1), SOL.cupFrames[angKey(TONE_BASE)]);   // CUP_MISS: counted by tools/frame-scan.mjs (must stay 0)
        const st = fromRel(KIN.frames(P, a).elbow, rel);
        st.back = st.back.clone().lerp(WORLD_BACK.cup[0], WORLD_BACK.cup[1]).normalize();
        return side === 'L' ? Object.assign(KIN.mirrorState(st), { left: true }) : st;
      };
      const abdfState = (side, give) => {
        const s = SOL.abdf[side], pose = give ? blendPose(s.pose, s.poseGive, give) : clonePose(s.pose);   // pushed toward the middle finger, about 2 mm at the examiner's finger
        return { wrist: toV(s.wrist), quat: toQ(s.quat), pose, pole: toV(s.pole) };
      };
      const fingEx = (side, give) => {
        const r = SOL.rel['fing' + side], b = WORLD_BACK.fing[0].clone(); if (side === 'L') b.z = -b.z;
        return { wrist: toV(r.p).addScaledVector(toV(r.push), FING_GIVE * (give || 0)), quat: toQ(r.q), back: b.normalize(), pose: r.pose, left: side === 'L' };
      };

      // ============================================================ timelines (all on the pose clock)
      const PK = ['index', 'middle', 'ring', 'little'];
      const FING = HANDS.FINGERS;
      function blendPose(a, b, u) {
        if (a === b || u <= 0) return a; if (u >= 1) return b;
        const ca = (p, k) => (p.curl && p.curl[k]) || p.all || [0.12, 0.18, 0.1];
        const fa = (p, k) => (p.fan && p.fan[k] != null ? p.fan[k] : FING[k].spread * (p.spread == null ? 1 : p.spread) * 2.2);
        const curl = {}, fan = {}; for (const k of PK) { curl[k] = ca(a, k).map((v, i) => K.lerp(v, ca(b, k)[i], u)); fan[k] = K.lerp(fa(a, k), fa(b, k), u); }
        const ta = a.thumb || [0.15, 0, 0.12, 0.08], tb = b.thumb || [0.15, 0, 0.12, 0.08];
        return { curl, fan, thumb: ta.map((v, i) => K.lerp(v, tb[i], u)) };
      }
      const lerpEx = (a, b, u) => ({ wrist: a.wrist.clone().lerp(b.wrist, u), quat: a.quat.clone().slerp(b.quat, u), pose: blendPose(a.pose, b.pose, u), back: a.back.clone().lerp(b.back, u).normalize(), left: u < 0.5 ? a.left : b.left });
      // a patient arm state: { kin: angles, pose } (joint angles, blended joint by joint) or a plain state (rest, the thigh)
      const armOf = (side, s) => (s.kin ? Object.assign(kinState(side, s.kin, s.pose), { kin: s.kin }) : s);
      const lerpArm = (side) => (a, b, u) => {
        if (a.kin && b.kin) { const ang = KIN.lerpAngles(a.kin, b.kin, u); return Object.assign(kinState(side, ang, blendPose(a.pose, b.pose, u)), { kin: ang }); }
        const A0 = armOf(side, a), B0 = armOf(side, b);
        return { wrist: A0.wrist.clone().lerp(B0.wrist, u), quat: A0.quat.clone().slerp(B0.quat, u), pose: blendPose(A0.pose, B0.pose, u), pole: A0.pole.clone().lerp(B0.pole, u).normalize() };
      };
      // keys: [time, state or (tp) => state, { arc: V3 (a lift in the middle of the move into this key), relax, jump, ease }]
      const keyed = (keys, lerp) => (tp) => {
        let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= tp) i++;
        const val = (k) => (typeof keys[k][1] === 'function' ? keys[k][1](tp) : keys[k][1]);
        if (i === keys.length - 1) return val(i);
        const o = keys[i + 1][2] || {};
        if (o.jump) return val(i);
        const a = val(i), b = val(i + 1); if (a === b) return a;
        const t0 = keys[i][0], t1 = keys[i + 1][0];
        const u = (o.ease || K.ease.inOut)(K.clamp((tp - t0) / (t1 - t0)));
        const s = lerp(a, b, u);
        if (o.arc && s.wrist) s.wrist.addScaledVector(o.arc, Math.sin(Math.PI * u));
        if (o.relax && s.pose) s.pose = blendPose(s.pose, POSE.travel, Math.sin(Math.PI * u) * o.relax);
        return s;
      };
      const up = (y, z = 0, x = 0) => V(x, y, z);
      const kin = (a, pose) => ({ kin: a, pose });

      // ---- his arms
      const testKeys = (side, w, name, extra = {}) => {
        const t = TEST[name], pose = PPOSE[t.pose], aGive = withGive(t.a, t.give, 1);
        const p0 = w.pose[0], p1 = w.pose[1], pr0 = w.press[0];
        return [
          [p0, REST[side]], [p1, kin(t.a, pose), { arc: up(0.6, side === 'R' ? 0.4 : -0.4, 0.3) }],
          [pr0, kin(t.a, pose)], [pr0 + 0.3, kin(aGive, pose), { ease: K.ease.out }], [w.down[0], kin(aGive, pose)],
          [w.down[1], REST[side], { arc: up(0.45, side === 'R' ? 0.3 : -0.3, 0.2) }],
        ];
      };
      const ARM_KEYS = { R: [[0, REST.R]], L: [[0, REST.L]] };
      {
        const R = ARM_KEYS.R, Lk = ARM_KEYS.L, shake = (a) => kin(a, PP.shake);
        // tone right
        R.push([T.toneR.offer[0], REST.R], [T.toneR.offer[1], shake(TONE_BASE), { arc: up(0.4, 0.2) }]);
        TONE_R.forEach(([t, a], i) => R.push([t, shake(a), { ease: toneEase(i) }]));
        R.push([T.toneR.down[0], shake(TONE_BASE)], [T.toneR.down[1], REST.R, { arc: up(0.3, 0.2) }]);
        // tone left
        Lk.push([T.toneL.offer[0], REST.L], [T.toneL.offer[1], shake(TONE_BASE), { arc: up(0.4, -0.2) }]);
        TONE_L.forEach(([t, a], i) => Lk.push([t, shake(a), { ease: toneEase(i) }]));
        Lk.push([T.toneL.down[0], shake(TONE_BASE)], [T.toneL.down[1], REST.L, { arc: up(0.3, -0.2) }]);
        // pronator drift: both arms straight out in front at shoulder height, parallel, palms up, fingers together
        for (const s of ['R', 'L']) {
          const out = DRIFT_ARM(s);
          const dk = ARM_KEYS[s];
          dk.push([T.drift.lift[0], REST[s]], [T.drift.lift[1], out, { arc: up(0.5, 0, 0.6) }], [T.drift.lower[0], out], [T.drift.lower[1], REST[s], { arc: up(0.4, 0, 0.5) }]);
        }
        // the power tests
        for (const [name, w] of [['abd', T.abd], ['elbF', T.elbF], ['elbE', T.elbE], ['wrist', T.wrist], ['grip', T.grip]]) {
          const tn = name;
          const gp = name === 'grip' ? { kin: TEST.grip.a, pose: PP.grip } : null;
          const rk = testKeys('R', w.R, tn), lk = testKeys('L', w.L, tn);
          if (gp) {   // the grip: his hand comes up open, closes round the fingers, squeezes, opens again
            const open = SOL.ppose.gripOpen || blendPose(Hh.relaxed, PP.grip, 0.35), aGive = withGive(TEST.grip.a, TEST.grip.give, 1);
            for (const [k, ww] of [[rk, w.R], [lk, w.L]]) {
              k.splice(0, k.length, [ww.pose[0], k === rk ? REST.R : REST.L], [ww.pose[1], kin(TEST.grip.a, open), { arc: up(0.5, k === rk ? 0.3 : -0.3, 0.2) }],
                [ww.exIn[1] - 0.05, kin(TEST.grip.a, open)], [ww.press[0], kin(TEST.grip.a, PP.grip)], [ww.press[0] + 0.3, kin(aGive, PP.grip), { ease: K.ease.out }], [ww.exOut[0], kin(aGive, PP.grip)],
                [ww.exOut[0] + 0.18, kin(TEST.grip.a, open)], [ww.down[1], k === rk ? REST.R : REST.L, { arc: up(0.45, k === rk ? 0.3 : -0.3, 0.2) }]);
            }
          }
          R.push(...rk); Lk.push(...lk);
        }
        // finger abduction: the hand onto the thigh, fingers spread; pushed 2-3 mm, holds
        for (const [s, ww] of [['R', T.fing.R], ['L', T.fing.L]]) {
          const k = ARM_KEYS[s], st0 = abdfState(s, 0), stG = abdfState(s, 1);
          k.push([ww.pose[0], REST[s]], [ww.pose[1], st0, { arc: up(0.4, s === 'R' ? 0.2 : -0.2) }], [ww.press[0], st0], [ww.press[0] + 0.3, stG, { ease: K.ease.out }], [ww.exOut[0] + 0.05, stG], [ww.exOut[1], st0], [ww.down[1], REST[s], { arc: up(0.4, s === 'R' ? 0.2 : -0.2) }]);
        }
        R.push([D, REST.R]); Lk.push([D, REST.L]);
        for (const k of [R, Lk]) k.sort((a, b) => a[0] - b[0]);
      }
      const armAt = { R: keyed(ARM_KEYS.R, lerpArm('R')), L: keyed(ARM_KEYS.L, lerpArm('L')) };
      // the angles of his arm at tp (for the examiner's hands attached to it)
      const anglesAt = (side, tp) => { const s = armAt[side](tp); return s.kin || null; };

      // ---- the examiner's hands
      const EXR = ST.exRest, EXL = ST.exRestLeft;
      const REL_TEST = { abd: 'abd', elbF: 'elbF', elbE: 'elbE', wrist: 'wrist', wristSup: 'wrist', grip: 'grip' };
      // while his arm is not in a joint-angle pose (moving to or from rest) the hand that is coming or going uses the test
      // position (with its give): a fixed value, so every frame is the same whatever order frames are rendered in
      const att = (name, side) => (tp) => { const t = TEST[REL_TEST[name]]; return exAt(name, anglesAt(side, tp) || withGive(t.a, t.give, 1), side); };
      const cup = (side) => (tp) => cupAt(anglesAt(side, tp) || TONE_BASE, side, tp);
      const shakeAt = (side) => (tp) => {
        const a = anglesAt(side, tp) || TONE_BASE, st = exAt('shake', a, side), si = SOL.shakeIndex;
        if (si) { const [j0, j1, u] = pathPos(a, side, tp), t = K.lerp(si.t[j0], si.t[j1], u); st.pose = clonePose(st.pose); st.pose.curl.index = si.base.map((v, i) => v + t * [0.5, 1, 0.8][i]); }
        return st;
      };
      const EK = { R: [[0, EXR.R]], L: [[0, EXR.L]] };
      {
        const tr = T.toneR, tl = T.toneL;
        // tone right: R hand shakes his hand, L hand under his elbow
        // the gloves reach the handshake and the cup where his hand and elbow will arrive (at the end of his offer) and wait
        // there; from the moment his hand is in the grip they follow it (a hold key, not a cut: the two states are the same then)
        const meet = (side) => shakeAt(side)(tr.offer[1] + 0.07), meetL = (side) => shakeAt(side)(tl.offer[1] + 0.07);
        EK.R.push([tr.exIn[0], EXR.R], [tr.exIn[1], meet('R'), { arc: up(0.6, 0.5), relax: 0.6 }], [tr.offer[1], shakeAt('R'), { jump: true, hold: true }], [tr.release[0], shakeAt('R')], [tr.release[1], EXR.R, { arc: up(0.5, 0.6), relax: 0.6 }]);
        EK.L.push([tr.exIn[0], EXR.L], [tr.exIn[1], cup('R'), { arc: up(0.3, 0.6), relax: 0.6 }], [tr.release[0], cup('R')], [tr.release[1], EXR.L, { arc: up(0.3, 0.6), relax: 0.6 }]);
        // tone left: walked round; his L hand is shaken by the examiner's L hand, the R hand cups the elbow
        EK.L.push([tl.cut, EXL.L, { jump: true }], [tl.exIn[0], EXL.L], [tl.exIn[1], meetL('L'), { arc: up(0.6, -0.5), relax: 0.6 }], [tl.offer[1], shakeAt('L'), { jump: true, hold: true }], [tl.release[0], shakeAt('L')], [tl.release[1], EXL.L, { arc: up(0.5, -0.6), relax: 0.6 }], [tl.cutR, EXR.L, { jump: true }]);
        EK.R.push([tl.cut, EXL.R, { jump: true }], [tl.exIn[0], EXL.R], [tl.exIn[1], cup('L'), { arc: up(0.3, -0.6), relax: 0.6 }], [tl.release[0], cup('L')], [tl.release[1], EXL.R, { arc: up(0.3, -0.6), relax: 0.6 }], [tl.cutR, EXR.R, { jump: true }]);
        // the power tests: the main hand (R on his right, L on his left) to the named point; the other hand rests
        const main = (name, w, side, hand, rel, sup) => {
          const k = EK[hand], rest = side === 'R' ? EXR[hand] : EXL[hand], dz = side === 'R' ? 1 : -1;
          k.push([w.exIn[0], rest], [w.exIn[1], att(rel, side), { arc: up(0.55, 0.5 * dz), relax: 0.7 }], [w.exOut[0], att(rel, side)], [w.exOut[1] + 0.25, rest, { arc: up(0.5, 0.5 * dz), relax: 0.7 }]);
          if (sup) { const o = EK[hand === 'R' ? 'L' : 'R'], r2 = side === 'R' ? EXR[hand === 'R' ? 'L' : 'R'] : EXL[hand === 'R' ? 'L' : 'R']; o.push([w.pose[1] - 0.25, r2], [w.pose[1] + 0.12, att(sup, side), { arc: up(0.25, 0.5 * dz), relax: 0.6 }], [w.exOut[1], att(sup, side)], [w.down[1], r2, { arc: up(0.3, 0.5 * dz), relax: 0.6 }]); }
        };
        const both = (name, w, rel, sup) => {
          main(name, w.R, 'R', 'R', rel, sup);
          for (const h of ['R', 'L']) EK[h].push([w.cutL, EXL[h], { jump: true }]);
          main(name, w.L, 'L', 'L', rel, sup);
          for (const h of ['R', 'L']) EK[h].push([w.cutR, EXR[h], { jump: true }]);
        };
        both('abd', T.abd, 'abd'); both('elbF', T.elbF, 'elbF'); both('elbE', T.elbE, 'elbE'); both('wrist', T.wrist, 'wrist', 'wristSup'); both('grip', T.grip, 'grip');
        // finger abduction (a world pose: his hand rests on the thigh)
        for (const [side, ww] of [['R', T.fing.R], ['L', T.fing.L]]) {
          const hand = side, k = EK[hand], rest = side === 'R' ? EXR[hand] : EXL[hand], dz = side === 'R' ? 1 : -1;
          const g = (tp) => fingEx(side, seg(tp, [ww.press[0], ww.press[0] + 0.3], K.ease.out) * (1 - seg(tp, [ww.exOut[0], ww.exOut[0] + 0.15])));
          if (side === 'L') for (const h of ['R', 'L']) EK[h].push([T.fing.cutL, EXL[h], { jump: true }]);
          k.push([ww.exIn[0], rest], [ww.exIn[1], g, { arc: up(0.5, 0.5 * dz), relax: 0.7 }], [ww.exOut[0], g], [ww.exOut[1] + 0.25, rest, { arc: up(0.5, 0.5 * dz), relax: 0.7 }]);
        }
        for (const h of ['R', 'L']) EK[h].push([T.fing.cutR, EXR[h], { jump: true }], [D, EXR[h]]);
        for (const k of [EK.R, EK.L]) k.sort((a, b) => a[0] - b[0]);
      }
      // every jump (a cut: the examiner walked round) must be on the pose grid, so it lands on the camera's cut frame
      for (const k of [EK.R, EK.L, ARM_KEYS.R, ARM_KEYS.L]) for (const [t, , o] of k) if (o && o.jump && !o.hold && Math.abs(t * 15 - Math.round(t * 15)) > 1e-6) throw new Error('a jump off the pose grid at ' + t + ' s');
      const exAtT = { R: keyed(EK.R, lerpEx), L: keyed(EK.L, lerpEx) };

      // ---- the muscle working: a subtle firming of the belly while he holds against the hand (no lump; about 1 mm)
      const FIRM = { deltoid: { x: 0.55, w: 0.5, dir: 'lat', amp: 0.008 }, biceps: { x: 1.75, w: 0.55, dir: 'front', amp: 0.01 }, triceps: { x: 1.6, w: 0.6, dir: 'back', amp: 0.01 }, wristExt: { x: 3.9, w: 0.55, dir: 'dorsal', amp: 0.007 }, fingerFlex: { x: 3.9, w: 0.55, dir: 'palmar', amp: 0.007 } };
      const firmAmt = (tp) => {
        for (const [name, w] of [['abd', T.abd], ['elbF', T.elbF], ['elbE', T.elbE], ['wrist', T.wrist], ['grip', T.grip]]) for (const side of ['R', 'L']) {
          const ww = w[side]; if (tp < ww.press[0] - 0.2 || tp > ww.exOut[1] + 0.2) continue;
          return { side, firm: TEST[name].firm, u: seg(tp, [ww.press[0] - 0.1, ww.press[0] + 0.35]) * (1 - seg(tp, [ww.exOut[0], ww.exOut[1]])) };
        }
        return null;
      };
      const firmArm = (side, name, u) => {
        if (!u || u < 1e-3) return;
        const f = FIRM[name], a = P.arms[side], m = a.armMesh, pos = m.geometry.attributes.position, B = m.userData.base;
        const Sh = a.up.position, E = a.fore.position, W0 = a.hand.group.position;
        const ux = V(1, 0, 0).applyQuaternion(a.up.quaternion), fx = E.clone().sub(Sh).normalize(), fo = W0.clone().sub(E).normalize();
        const bend = fo.clone().addScaledVector(fx, -fo.dot(fx)); if (bend.lengthSq() < 1e-6) bend.copy(V(0, 1, 0)); bend.normalize();
        const dh = V(0, 1, 0).applyQuaternion(a.hand.group.quaternion);
        const lat = V(0, 0, side === 'R' ? 1 : -1);
        const L1 = KIN.L1, p = V(0, 0, 0), r = V(0, 0, 0);
        for (let i = 0; i < pos.count; i++) {
          const x = B[3 * i], g = Math.exp(-(((x - f.x) / f.w) ** 2)); if (g < 0.02) continue;
          p.set(pos.getX(i), pos.getY(i), pos.getZ(i));
          const onUpper = x < L1, o = onUpper ? Sh : E, ax = onUpper ? fx : fo;
          r.copy(p).sub(o); r.addScaledVector(ax, -r.dot(ax)); const rl = r.length(); if (rl < 1e-6) continue; r.multiplyScalar(1 / rl);
          let d = f.dir === 'front' ? bend : f.dir === 'back' ? bend.clone().negate() : f.dir === 'dorsal' ? dh : f.dir === 'palmar' ? dh.clone().negate() : lat.clone().addScaledVector(ax, -lat.dot(ax)).normalize();
          d = d.clone().addScaledVector(ax, -d.dot(ax)).normalize();
          const c = Math.max(0, r.dot(d)); if (c <= 0) continue;
          p.addScaledVector(r, f.amp * u * g * c * c);
          pos.setXYZ(i, p.x, p.y, p.z);
        }
        pos.needsUpdate = true; m.geometry.computeVertexNormals();
      };

      // ---- the face: eyes closed for the drift, "no" in silent visemes
      const visemeAt = (tp) => { for (const [t0, list] of SPEECH) { const k = Math.floor((tp - t0) / VIS_DUR + 1e-6); if (k >= 0 && k < list.length) return list[k]; } return null; };
      const faceAt = (tp) => {
        const f = Object.assign({}, FACE0);
        const vis = visemeAt(tp); if (vis && vis !== 'rest') f.viseme = vis;
        const c = seg(tp, T.drift.close) * (1 - seg(tp, T.drift.open)); if (c > 0.01) f.closed = c;
        return f;
      };

      // ---- every contact of the part, measured on the meshes at the moment it holds (review panels and the gap table)
      // part: the touching part's meshes; surf: what it touches. R = his right side (the examiner on his right), L = his left.
      const CONTACT_SPECS = [];
      {
        const exP = (h, name) => () => C5.parts(handOf(h), name);
        const hisF = (s, f) => () => (f === 'thumb' ? C5.meshesUnder(P.arms[s].hand.thumb.mcp) : C5.meshesUnder(P.arms[s].hand.fingers[f].mcp));
        const hisPad = (s, f) => () => C5.meshesUnder(f === 'thumb' ? P.arms[s].hand.thumb.ip : P.arms[s].hand.fingers[f].dip);   // the pad (end bone)
        const skin = (s) => () => armSkin(s), glove = (h) => () => gloveMeshes(h);
        const sideName = (s) => (s === 'R' ? 'right' : 'left');
        const add = (o) => CONTACT_SPECS.push(o);
        const F4 = ['index', 'middle', 'ring', 'little'];
        for (const s of ['R', 'L']) {
          const main = s, sup = s === 'R' ? 'L' : 'R', sd = sideName(s);
          // tone: at every pose frame from the start of the moves until the examiner lets go (the grip and the cup follow his arm)
          const tw = s === 'R' ? T.toneR : T.toneL, tt = [];
          for (let f = Math.ceil(tw.moves * POSES - 1e-6); f / POSES < tw.release[0]; f++) tt.push(f / POSES);
          add({ id: 'shake-palm-' + s, group: 'tone', side: s, ts: tt, name: `Tone ${sd}: examiner's palm on his palm`, part: exP(main, 'palm'), surf: skin(s) });
          for (const f of F4) add({ id: `shake-ex-${f}-${s}`, group: 'tone', side: s, ts: tt, name: `Tone ${sd}: examiner's ${f} finger round the back of his hand`, part: exP(main, f), pad: exP(main, f + 'Tip'), surf: skin(s), finger: f });
          add({ id: 'shake-exthumb-' + s, group: 'tone', side: s, ts: tt, name: `Tone ${sd}: examiner's thumb over the back of his hand`, part: exP(main, 'thumb'), pad: exP(main, 'thumbTip'), surf: skin(s) });
          for (const f of F4) add({ id: `shake-his-${f}-${s}`, group: 'tone', side: s, ts: tt, name: `Tone ${sd}: his ${f} finger round the examiner's hand`, part: hisF(s, f), pad: hisPad(s, f), surf: glove(main), finger: f, his: true });
          add({ id: 'shake-histhumb-' + s, group: 'tone', side: s, ts: tt, name: `Tone ${sd}: his thumb over the back of the examiner's hand`, part: hisF(s, 'thumb'), pad: hisPad(s, 'thumb'), surf: glove(main), his: true });
          add({ id: 'cup-palm-' + s, group: 'tone', side: s, ts: tt, name: `Tone ${sd}: examiner's palm cupping the back of his elbow`, part: exP(sup, 'palm'), surf: skin(s) });
          for (const f of F4) add({ id: `cup-${f}-${s}`, group: 'tone', side: s, ts: tt, name: `Tone ${sd}: examiner's ${f} finger round his elbow`, part: exP(sup, f), pad: exP(sup, f + 'Tip'), surf: skin(s), finger: f });
          // the power tests: in the middle of the hold (after the 2-3 mm give)
          const holdT = (w) => (w[s].press[0] + w[s].press[1]) / 2;
          const lay = (test, w, label, hand, parts) => { for (const pt of parts) add({ id: `${test}-${pt}-${s}`, group: test, side: s, ts: [holdT(w)], name: `${label} ${sd}: examiner's ${pt === 'palm' ? 'palm' : pt === 'thumb' ? 'thumb' : pt + ' finger'}`, part: exP(hand, pt), pad: pt === 'palm' ? null : exP(hand, pt + 'Tip'), surf: skin(s), finger: pt }); };
          lay('abd', T.abd, 'Shoulder abduction', main, ['palm', 'index', 'middle', 'ring', 'little', 'thumb']);
          lay('elbF', T.elbF, 'Elbow flexion', main, ['palm', 'index', 'middle', 'ring', 'little', 'thumb']);
          lay('elbE', T.elbE, 'Elbow extension', main, ['palm', 'index', 'middle', 'ring', 'little', 'thumb']);
          lay('wrist', T.wrist, 'Wrist extension (on the back of the fist)', main, F4);
          lay('wristSup', T.wrist, 'Wrist extension (support under the forearm)', sup, ['palm', 'index', 'middle', 'ring', 'little', 'thumb']);
          // his own fist (shoulder abduction, elbow flexion and extension, wrist extension): the thumb across the middle bones of
          // the index and middle fingers, and each fingertip on his palm
          const fistT = [holdT(T.abd), holdT(T.elbF), holdT(T.elbE), holdT(T.wrist)];
          const midBones = () => ['index', 'middle'].flatMap((f) => P.arms[s].hand.fingers[f].pip.children.filter((m) => m.isMesh));
          add({ id: 'fist-thumb-' + s, group: 'fist', side: s, ts: fistT, name: `His fist ${sd}: his thumb across the middle bones of his index and middle fingers`, part: hisPad(s, 'thumb'), surf: midBones, his: true });
          for (const f of F4) add({ id: `fist-${f}-${s}`, group: 'fist', side: s, ts: fistT, name: `His fist ${sd}: the tip of his ${f} finger on his palm`, part: hisPad(s, f), surf: () => [P.arms[s].armMesh], his: true, finger: f });
          const gt = [holdT(T.grip)];
          for (const f of F4) add({ id: `grip-his-${f}-${s}`, group: 'grip', side: s, ts: gt, name: `Grip ${sd}: his ${f} finger round the gloved fingers`, part: hisF(s, f), pad: hisPad(s, f), surf: glove(main), finger: f, his: true });
          add({ id: 'grip-histhumb-' + s, group: 'grip', side: s, ts: gt, name: `Grip ${sd}: his thumb over the gloved fingers`, part: hisF(s, 'thumb'), pad: hisPad(s, 'thumb'), surf: glove(main), his: true });
          add({ id: 'grip-two-' + s, group: 'grip', side: s, ts: gt, name: `Grip ${sd}: the examiner's index and middle fingers on his palm`, part: () => C5.parts(handOf(main), 'index').concat(C5.parts(handOf(main), 'middle')), surf: () => [P.arms[s].armMesh] });
          const ft = [holdT(T.fing)];
          add({ id: 'fing-ex-' + s, group: 'fing', side: s, ts: ft, name: `Finger abduction ${sd}: the pad of the examiner's index on the thumb side of his index finger`, part: exP(main, 'indexTip'), surf: hisF(s, 'index') });
          add({ id: 'fing-palm-' + s, group: 'fing', side: s, ts: ft, name: `Finger abduction ${sd}: his palm resting on his thigh`, part: () => [P.arms[s].armMesh], surf: legMeshes, his: true, near: true });
          for (const f of F4.concat(['thumb'])) add({ id: `fing-${f}-${s}`, group: 'fing', side: s, ts: ft, name: `Finger abduction ${sd}: his ${f === 'thumb' ? 'thumb' : f + ' finger'} resting on his thigh`, part: hisF(s, f), pad: hisPad(s, f), surf: legMeshes, his: true, finger: f });
        }
      }
      // measure one contact now: the smallest signed gap (negative = sinking in) from the part's vertices to the surface
      const measureContact = (c) => {
        const part = c.part(); if (!part.length) return null;
        const ctr = V(0, 0, 0); let n = 0; for (const m of part) { m.updateWorldMatrix(true, false); if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); ctr.add(m.geometry.boundingSphere.center.clone().applyMatrix4(m.matrixWorld)); n++; } ctr.multiplyScalar(1 / n);
        const S0 = C5.surface(c.surf(), ctr, c.near ? 0.9 : 1.6);
        const opts = c.near ? { near: 0.9 } : {};
        // his palm on the thigh: only the palm skin (the hand region of his arm piece)
        if (c.near) { const h = P.arms[c.side].hand, pc = h.world('palm'); const S1 = C5.surface(c.surf(), pc, 0.9); return C5.gap(part, S1, { near: 0.55 }); }
        return C5.gap(part, S0, opts);
      };

      Object.assign(root.CNS5_WORLD = root.CNS5_WORLD || {}, { DRIFT_ARM, S, P, SH, EX, bed, table, L, ST, SOL, C5, KIN, NEURO, HANDS, T, BEATS, CAPTIONS, TEST, armAt, exAtT, anglesAt, exAt, cupAt, abdfState, fingEx, armSkin, gloveMeshes, legMeshes, visibleMeshes, faceAt, applyEx, applyArm, REST, TONE_BASE, kinState, PP, firmAmt, CONTACT_SPECS, measureContact, handOf });

      // ============================================================ cameras: one object per shot, used by the storyboard too
      const cams = root.CNS5_CAMS(Object.assign({ V, P, SET, KIN, NEURO, TEST, TONE_BASE, kinState, REST, SOL, exAt, abdfState }, root.CNS5_WORLD));
      const { CAM, CAM_KEYS } = cams;
      // camera timeline: holds, smooth moves through runs of different shots, and hard cuts ({ cut: true })
      const toPt = (c) => (Array.isArray(c.focus) ? c.focus : c.target);
      const vec = (c) => [...c.pos, ...c.target, ...toPt(c), c.fov, c.aperture, ...(c.up || [0, 1, 0])];
      const segs = []; {
        let cur = null;
        for (let i = 0; i < CAM_KEYS.length; i++) {
          const [t, name, o] = CAM_KEYS[i];
          if (!cur || (o && o.cut)) { cur = { t0: t, keys: [[t, name]] }; segs.push(cur); continue; }
          cur.keys.push([t, name]);
        }
        for (const s of segs) {
          s.runs = []; let run = [s.keys[0]];
          for (let i = 1; i < s.keys.length; i++) { if (s.keys[i][1] === s.keys[i - 1][1]) { if (run.length > 1) s.runs.push(run); run = [s.keys[i]]; } else run.push(s.keys[i]); }
          if (run.length > 1) s.runs.push(run);
          s.paths = s.runs.map((r) => ({ t0: r[0][0], t1: r[r.length - 1][0], f: K.path(r.map(([tt, n]) => [tt, vec(CAM[n])])) }));
        }
      }
      const camAt = (t) => {
        let s = segs[0]; for (const g of segs) if (g.t0 <= t + 1e-9) s = g;
        let i = 0; while (i < s.keys.length - 1 && s.keys[i + 1][0] <= t) i++;
        const rp = s.paths.find((r) => t > r.t0 && t < r.t1);
        if (!rp) return CAM[s.keys[i][1]];
        const v = rp.f(t); return { pos: v.slice(0, 3), target: v.slice(3, 6), focus: v.slice(6, 9), fov: v[9], aperture: v[10], up: v.slice(11, 14) };
      };
      const shotOf = (t) => { let s = segs[0]; for (const g of segs) if (g.t0 <= t + 1e-9) s = g; let i = 0; while (i < s.keys.length - 1 && s.keys[i + 1][0] <= t) i++; return s.keys[i][1]; };
      Object.assign(root.CNS5_WORLD, { CAM, CAM_KEYS, camAt, shotOf, segs });

      // ------------------------------------------------------------ the frame for time t
      const homeLock = (t) => t <= HOME_HOLD + 1e-6 || t >= D - HOME_HOLD - 1e-6;
      const shoot = (c) => {
        const cam = S.camera; cam.position.set(...c.pos);
        cam.up.set(0, 1, 0); if (c.up) cam.up.set(...c.up).normalize();
        cam.lookAt(...c.target);
        if (c.fov && c.fov !== cam.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
        K.focus(cam, c.focus || c.target, c.aperture == null ? 0.05 : c.aperture);
      };
      const update = (t) => {
        const tp = poseT(t), still = homeLock(t);
        // the patient (README order: shrug, head, legs, arms, face and breathing)
        P.setShrug(0); P.setHead({});
        for (const s of ['R', 'L']) applyArm(s, armAt[s](tp));
        const fm = firmAmt(tp); if (fm) firmArm(fm.side, fm.firm, fm.u);
        P.setFace(still ? {} : faceAt(tp));
        P.breathe(still ? 0 : breathT(tp));
        // the examiner
        applyEx('R', exAtT.R(tp)); applyEx('L', exAtT.L(tp));
        if (root.DEBUG_STATE) root.DEBUG_STATE(tp);
        if (still && !root.CAM_OVERRIDE) SET.shoot(S, SET.HOME_CNS); else shoot(root.CAM_OVERRIDE || camAt(t));   // the home hold: the README's own call
        // the home hold: the lights exactly as shared/README.md (L.set(0, {}), the lamp at full power, no flicker)
        if (still) { L.set(0, {}); L.lamp.intensity = SET.LAMP.power; } else L.set(tp, cams.lights ? cams.lights(t, shotOf(t)) : {});
      };
      const overlay = (ctx, t, W, Hh2) => {
        const on = root.CAPTIONS != null ? !!root.CAPTIONS : style.captions;
        if (on) CAPTION.at(ctx, t, CAPTIONS, W, Hh2);
        if (root.REVIEW_OVERLAY) root.REVIEW_OVERLAY(ctx, t, W, Hh2);
      };
      root.CNS5_UPDATE = update;      // the frame without rendering it (tools/frame-scan.mjs measures every frame this way)
      return { update, overlay };
    },

    // ================================================================ sound: real events only, from the same table T
    sound(k) {
      // the quiet room under everything, faded in over the first 0.5 s and out over the last 0.5 s (no clicks at the joins)
      k.noise(0, { dur: D, color: 'brown', filter: 'lowpass', f: 300, gain: 0.11, a: 0.5, hold: D - 1.0, bus: 'amb' });
      k.noise(0, { dur: D, color: 'pink', filter: 'highpass', f: 4500, gain: 0.012, a: 0.5, hold: D - 1.0, bus: 'amb' });
      // a very soft rustle of the sheet and the mattress when his arms move off or come back to rest (on the exact pose of the event)
      const rustle = (t0, pan, g = 1, dur = 0.22) => { const t = Math.round(t0 * POSES) / POSES; k.noise(t, { dur, color: 'pink', filter: 'bandpass', f: 1500, q: 0.8, gain: 0.05 * g, a: 0.04, pan }); k.noise(t + 0.02, { dur: dur * 0.7, color: 'brown', filter: 'lowpass', f: 600, gain: 0.05 * g, a: 0.03, pan }); };
      rustle(T.toneR.offer[0], 0.25); rustle(T.toneR.down[1], 0.25);
      rustle(T.toneL.offer[0], -0.25); rustle(T.toneL.down[1], -0.25);
      rustle(T.drift.lift[0], 0, 1.2, 0.3); rustle(T.drift.lower[1], 0, 1.2, 0.3);
      for (const w of [T.abd, T.elbF, T.elbE, T.wrist, T.grip, T.fing]) { rustle(w.R.pose[0], 0.25); rustle(w.R.down[1], 0.25); rustle(w.L.pose[0], -0.25); rustle(w.L.down[1], -0.25); }
    },
  };
  root.CNS5 = style;
})(typeof window !== 'undefined' ? window : globalThis);
