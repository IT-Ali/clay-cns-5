// tools/review-page.js: injected into index.html by tools/storyboard.mjs (review only, never in the video).
// Every panel reads the SAME cameras, states and solved contacts as the animation (window.CNS5_WORLD); the review panels
// only add a camera for a close look and a 2D overlay with arrows and gap numbers MEASURED on the meshes of that frame.
(function () {
  const W = window.CNS5_WORLD, THREE = window.THREE, V = (x, y, z) => new THREE.Vector3(x, y, z), C5 = W.C5, T = W.T;
  const proj = (p, w, h) => { const v = p.clone().project(W.S.camera); return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h, v.z]; };
  const k_ = (ctx) => ctx.canvas.width / 960;
  const label = (ctx, x, y, text, o = {}) => {
    const k = k_(ctx); ctx.save(); ctx.font = `600 ${(o.size || 15) * k}px "Fredoka", sans-serif`;
    const tw = ctx.measureText(text).width, pad = 6 * k, bh = (o.size || 15) * 1.5 * k;
    x = Math.max(tw / 2 + pad + 2, Math.min(ctx.canvas.width - tw / 2 - pad - 2, x)); y = Math.max(bh / 2 + 2, Math.min(ctx.canvas.height - bh / 2 - 2, y));
    ctx.fillStyle = o.bg || 'rgba(255,248,232,0.94)'; ctx.strokeStyle = o.ink || '#b3261e'; ctx.lineWidth = 1.5 * k;
    ctx.beginPath(); ctx.roundRect(x - tw / 2 - pad, y - bh / 2, tw + 2 * pad, bh, 6 * k); ctx.fill(); ctx.stroke();
    ctx.fillStyle = o.ink || '#b3261e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1 * k); ctx.restore();
    return [x, y];
  };
  const arrow = (ctx, x0, y0, x1, y1, col = '#b3261e') => {
    const k = k_(ctx); ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0), L = 9 * k; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - L * Math.cos(a - 0.4), y1 - L * Math.sin(a - 0.4)); ctx.lineTo(x1 - L * Math.cos(a + 0.4), y1 - L * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(x1, y1, 2.8 * k, 0, 7); ctx.fill(); ctx.restore();
  };
  const title = (ctx, text) => label(ctx, ctx.canvas.width / 2, ctx.canvas.height - 20 * k_(ctx), text, { size: 15, ink: '#26336b' });
  const short = (c) => c.name.replace(/^[^:]*: /, '');
  // contact callouts: every contact spec matching `filter`, measured NOW on the meshes, an arrow to the touching point
  const MEASURED = [];
  const callouts = (filter, o = {}) => (ctx, t, w, h) => {
    const list = W.CONTACT_SPECS.filter(filter), k = w / 960, res = [];
    for (const c of list) { const g = W.measureContact(c); if (g && g.on) res.push({ c, g, p: proj(g.on, w, h) }); }
    if (!res.length) return;
    const cx = res.reduce((s, r) => s + r.p[0], 0) / res.length, cy = res.reduce((s, r) => s + r.p[1], 0) / res.length;
    // labels on a ring round the touching points, in the order of their angle (so the leaders do not cross)
    res.forEach((r) => { r.ang = Math.atan2(r.p[1] - cy, r.p[0] - cx); });
    res.sort((a, b) => a.ang - b.ang);
    const R = (o.r || 150) * k, n = res.length, a0 = o.a0 == null ? -Math.PI : o.a0, span = o.span || 2 * Math.PI;
    res.forEach((r, i) => {
      const ang = n === 1 ? (o.ang == null ? -2.2 : o.ang) : a0 + span * (i + 0.5) / n;
      const lx = cx + Math.cos(ang) * R * (o.sx || 1), ly = cy + Math.sin(ang) * R * 0.62;
      const mm = r.g.gap * 100, ok = mm >= 0 && mm <= 1.5;
      const at = label(ctx, lx, ly, `${o.names ? o.names(r.c) : r.c.finger || short(r.c)}: ${mm.toFixed(2)} mm`, { size: 12.5, ink: ok ? '#1b6b2f' : '#b3261e' });
      arrow(ctx, at[0], at[1], r.p[0], r.p[1], ok ? '#1b6b2f' : '#b3261e');
      MEASURED.push({ id: r.c.id, t, gapMM: +mm.toFixed(3) });
    });
  };
  const shot = (at, dir, d, ap = 0.004) => { const v = dir.clone().normalize(); return { pos: at.clone().addScaledVector(v, d).toArray(), target: at.toArray(), fov: 28, focus: at.toArray(), aperture: ap }; };
  const mirDir = (side, v) => (side === 'L' ? V(v.x, v.y, -v.z) : v);
  const sideName = (s) => (s === 'R' ? 'RIGHT' : 'LEFT');
  const P = W.P;
  // where a contact group sits at time t (the centroid of the touching parts), for the close-up cameras
  const centreAt = (filter, t) => { window.seek(t, 1); const pts = W.CONTACT_SPECS.filter(filter).map((c) => W.measureContact(c)).filter((g) => g && g.on).map((g) => g.on); const c = V(0, 0, 0); pts.forEach((p) => c.add(p)); return c.multiplyScalar(1 / Math.max(1, pts.length)); };
  const holdT = (w, s) => (w[s].press[0] + w[s].press[1]) / 2;
  const toneT = (s) => (s === 'R' ? T.toneR.moves : T.toneL.moves);

  // ------------------------------------------------------------------ single panels
  const PANELS = {};
  PANELS['a-plan'] = { t: 0.5, cam: () => ({ pos: [0.5, 40, 0.01], target: [0.5, 6, 0], up: [0, 0, -1], fov: 28, focus: [0.5, 8, 0], aperture: 0 }), draw: (ctx, t, w, h) => {
    const k = w / 960, p = (v) => proj(v, w, h);
    let [x, y] = p(P.head.localToWorld(V(0, 0, 0))); label(ctx, x, y - 34 * k, 'HEAD (screen left)', { ink: '#26336b' });
    [x, y] = p(P.legPoint('R', 'toeTip')); label(ctx, x - 20 * k, y + 50 * k, 'FEET (screen right)', { ink: '#26336b' });
    [x, y] = p(P.shoulder('R')); arrow(ctx, x + 70 * k, y + 70 * k, x, y); label(ctx, x + 70 * k, y + 80 * k, 'his RIGHT shoulder (+Z, nearest the camera)');
    [x, y] = p(P.shoulder('L')); arrow(ctx, x + 70 * k, y - 70 * k, x, y); label(ctx, x + 70 * k, y - 80 * k, 'his LEFT shoulder');
    [x, y] = p(W.table.glass.position); label(ctx, x + 40 * k, y - 28 * k, 'bedside table + glass: his LEFT, near his head', { ink: '#26336b' });
    const rR = W.ST.exRest.R.wrist.clone().lerp(W.ST.exRest.L.wrist, 0.5);
    [x, y] = p(rR); label(ctx, x, y + 46 * k, "examiner's hands at rest: on HIS RIGHT (every right-side test)", { ink: '#26336b' });
    const rL = W.ST.exRestLeft.R.wrist.clone().lerp(W.ST.exRestLeft.L.wrist, 0.5), [lx, ly] = p(rL);
    ctx.save(); ctx.setLineDash([7 * k, 6 * k]); ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.ellipse(lx, ly, 70 * k, 34 * k, 0, 0, 7); ctx.stroke(); ctx.restore();
    label(ctx, lx, ly - 50 * k, "the examiner's place on HIS LEFT for the left-side tests (walked round; hard cut)");
    title(ctx, 'Plan from above: his RIGHT = toward the camera = bottom here; his LEFT = the far side, with the table');
  } };
  for (const s of ['R', 'L']) {
    const isTone = (c) => c.group === 'tone' && c.side === s;
    PANELS['b-shake' + s] = { t: toneT(s), cam: () => shot(centreAt((c) => isTone(c) && /shake/.test(c.id), toneT(s)), mirDir(s, V(-0.1, 0.55, 1)), 3.6), draw: (ctx, t, w, h) => { callouts((c) => isTone(c) && /shake/.test(c.id), { r: 175, names: (c) => (c.his ? 'his ' : 'ex. ') + (c.finger || (/thumb/.test(c.id) ? 'thumb' : 'palm')) })(ctx, t, w, h); title(ctx, `Tone, his ${sideName(s)} hand: the handshake (palm to palm, fingers round the backs of the hands, thumbs crossing)`); } };
    PANELS['b-cup' + s] = { t: toneT(s), cam: () => shot(centreAt((c) => isTone(c) && /cup/.test(c.id), toneT(s)), mirDir(s, V(0.6, 0.8, -0.6)), 4.5), draw: (ctx, t, w, h) => { callouts((c) => isTone(c) && /cup/.test(c.id), { r: 150, names: (c) => c.finger || 'palm' })(ctx, t, w, h); title(ctx, `Tone, his ${sideName(s)} arm: the examiner's palm cupping the back of his elbow`); } };
  }
  // the grip round the two gloved fingers, from the side and from below
  for (const s of ['R', 'L']) {
    const isG = (c) => c.group === 'grip' && c.side === s, t = holdT(T.grip, s);
    PANELS['e-gripSide' + s] = { t, cam: () => shot(centreAt(isG, t), mirDir(s, V(0.15, -0.1, 1)), 3.2, 0.003), draw: (ctx, tt, w, h) => { callouts(isG, { r: 165, names: (c) => (/two/.test(c.id) ? 'gloved fingers to his palm' : 'his ' + (c.finger || 'thumb')) })(ctx, tt, w, h); title(ctx, `Finger flexion, his ${sideName(s)} hand from the side: his fingers closed round the two gloved fingers`); } };
    PANELS['e-gripBelow' + s] = { t, cam: () => shot(centreAt(isG, t), mirDir(s, V(-0.2, -1, 0.35)), 3.2, 0.003), draw: (ctx, tt, w, h) => { callouts(isG, { r: 165, names: (c) => (/two/.test(c.id) ? 'gloved fingers to his palm' : 'his ' + (c.finger || 'thumb')) })(ctx, tt, w, h); title(ctx, `Finger flexion, his ${sideName(s)} hand from below: the gloved fingertips come out under his little finger`); } };
  }

  // ------------------------------------------------------------------ pairs: two moments (or two cameras) side by side
  const PAIRS = {};
  // c) pronator drift: start and end of the 7 s hold, from the foot end and from his side, with the measured heights and palm angles
  const driftMeasure = () => {
    const out = {}; for (const s of ['R', 'L']) { const h = P.arms[s].hand; h.group.updateMatrixWorld(true); const palm = h.world('palm'), up = V(0, -1, 0).transformDirection(h.group.matrixWorld).normalize(); out[s] = { y: palm.y, ang: Math.acos(Math.max(-1, Math.min(1, up.y))) * 180 / Math.PI, roll: Math.atan2(up.z, up.y) * 180 / Math.PI }; }
    return out;
  };
  const dA = T.drift.still[0] + 0.2, dB = T.drift.still[1] - 0.2;
  PAIRS['c-driftFoot'] = { cam: 'drift', a: { t: dA, label: `start of the hold (${dA.toFixed(1)} s)` }, b: { t: dB, label: `end of the hold (${dB.toFixed(1)} s)` }, zoom: 1.0, measure: driftMeasure, title: 'Pronator drift from the foot end: both arms out, palms up, eyes closed - nothing turns in or drifts down' };
  PAIRS['c-driftSide'] = { cam: () => shot(V(-2.6, 10.6, 0), V(0.25, 0.08, 1), 26, 0.004), a: { t: dA, label: `start of the hold (${dA.toFixed(1)} s)` }, b: { t: dB, label: `end of the hold (${dB.toFixed(1)} s)` }, zoom: 1.0, measure: driftMeasure, title: 'Pronator drift from his right side: the two hands level, at shoulder height, all through the hold' };
  // d) the six power tests, each side: his own movement into the test position | the examiner's hand on the named point
  const POW = [['abd', 'abdR', 'Shoulder abduction (C5)', (c) => c.group === 'abd'], ['elbF', 'elbR', 'Elbow flexion (C5, C6)', (c) => c.group === 'elbF'], ['elbE', 'elbR', 'Elbow extension (C7)', (c) => c.group === 'elbE'],
    ['wrist', 'wristR', 'Wrist extension (C6, C7)', (c) => c.group === 'wrist' || c.group === 'wristSup'], ['grip', 'gripR', 'Finger flexion (C8)', (c) => c.group === 'grip'], ['fing', 'fingR', 'Finger abduction (T1)', (c) => c.group === 'fing']];
  for (const [key, cam, nm, f] of POW) for (const s of ['R', 'L']) {
    const w = T[key][s], camName = s === 'R' ? cam : cam.replace(/R$/, 'L');
    PAIRS[`d-${key}${s}`] = { cam: camName, zoom: 1.35, focusOf: (c) => c, a: { t: w.pose[1] + 0.02, label: 'his own movement (against gravity)' }, b: { t: holdT(T[key], s), label: "against the examiner's hand (gaps measured)", draw: callouts((c) => f(c) && c.side === s, { r: 85, sx: 1.25, names: (c) => (/fing-ex/.test(c.id) ? "examiner's index pad" : /^fing-/.test(c.id) ? 'his ' + (c.finger || 'palm') + ' on the thigh' : (c.his ? 'his ' : '') + (c.finger || (/thumb/.test(c.id) ? 'thumb' : /two/.test(c.id) ? 'gloved fingers' : 'palm'))) }) }, title: `${nm}, his ${sideName(s)} side` };
  }
  // f) the raised arm: how the top of the shoulder reads in the chosen cameras (the known v5 limit)
  PAIRS['f-raised'] = { two: true, a: { cam: 'drift', t: 36.0, label: 'arms outstretched (drift camera)', zoom: 1.6, focus: () => P.shoulder('R').clone().lerp(P.shoulder('L'), 0.5) }, b: { cam: 'abdR', t: holdT(T.abd, 'R'), label: 'abduct90 (abduction camera)', zoom: 1.4, focus: () => P.shoulder('R') }, title: 'The raised arm: the top of the shoulder reads as a rounded clay joint (v5 limit); filmed a little from above and in front' };

  window.REVIEW = {
    names: Object.keys(PANELS), pairs: Object.keys(PAIRS), MEASURED,
    panel(name) { const p = PANELS[name]; window.CAM_OVERRIDE = typeof p.cam === 'function' ? p.cam() : W.CAM[p.cam]; window.REVIEW_OVERLAY = p.draw; return p.t; },
    beat() { window.CAM_OVERRIDE = null; window.REVIEW_OVERLAY = null; },
    pair(name) {
      const p = PAIRS[name], cv = document.getElementById('c'), Wd = cv.width, Hd = cv.height, k = Wd / 960;
      window.CAPTIONS = false;
      const out = document.createElement('canvas'); out.width = Wd; out.height = Hd; const o = out.getContext('2d');
      const meas = [];
      for (const [i, st] of [p.a, p.b].entries()) {
        const camName = st.cam || p.cam, cam = typeof camName === 'function' ? camName() : W.CAM[camName], zoom = st.zoom || p.zoom || 1;
        window.CAM_OVERRIDE = cam; window.REVIEW_OVERLAY = st.draw || null;
        window.seek(st.t);
        // the crop: round the focus point (or the middle of the frame)
        let fx = Wd / 2, fy = Hd / 2;
        const fp = st.focus ? st.focus() : (p.focusOf && st.draw ? null : null);
        if (fp) { const q = proj(fp, Wd, Hd); fx = q[0]; fy = q[1]; }
        const cw = Wd / 2 / zoom, ch = Hd / zoom, sx = Math.max(0, Math.min(Wd - cw, fx - cw / 2)), sy = Math.max(0, Math.min(Hd - ch, fy - ch / 2));
        o.drawImage(cv, sx, sy, cw, ch, i * Wd / 2, 0, Wd / 2, Hd);
        if (p.measure) meas.push(p.measure());
        label(o, i * Wd / 2 + Wd / 4, 22 * k, st.label + ` - ${st.t.toFixed(2)} s`, { ink: '#26336b', size: 13 });
      }
      o.fillStyle = '#f8eedb'; o.fillRect(Wd / 2 - 2 * k, 0, 4 * k, Hd);
      if (p.measure) {
        meas.forEach((m, i) => {
          const d = (m.R.y - m.L.y) * 100;
          label(o, i * Wd / 2 + Wd / 4, Hd - 92 * k, `right hand ${(m.R.y * 10).toFixed(1)} cm, left ${(m.L.y * 10).toFixed(1)} cm above the floor: difference ${d.toFixed(1)} mm`, { ink: '#1b6b2f', size: 12 });
          label(o, i * Wd / 2 + Wd / 4, Hd - 66 * k, `palms from straight up: right ${m.R.ang.toFixed(1)} deg, left ${m.L.ang.toFixed(1)} deg`, { ink: '#1b6b2f', size: 12 });
        });
        MEASURED.push({ id: name, drift: meas });
      }
      title(o, p.title); window.CAM_OVERRIDE = null; window.REVIEW_OVERLAY = null;
      return out.toDataURL('image/jpeg', 0.9);
    },
    report() {
      // every contact at every moment it holds, measured on the meshes (one seek per moment, all its contacts measured there)
      const at = new Map(), st = new Map();
      for (const c of W.CONTACT_SPECS) { st.set(c, { mn: 1e9, mx: -1e9, worst: null }); for (const t of c.ts) { const k = t.toFixed(4); if (!at.has(k)) at.set(k, { t, cs: [] }); at.get(k).cs.push(c); } }
      for (const { t, cs } of [...at.values()].sort((a, b) => a.t - b.t)) {
        window.seek(t, 1);
        for (const c of cs) {
          const g = W.measureContact(c); if (!g) continue; const s = st.get(c); if (g.gap < s.mn) { s.mn = g.gap; if (g.gap < 0) s.worst = t; } if (g.gap > s.mx) { s.mx = g.gap; if (g.gap > 0.015) s.worst = t; }
          if (c.pad) { const gp = W.measureContact(Object.assign({}, c, { part: c.pad })); if (gp) { s.pmn = Math.min(s.pmn == null ? 1e9 : s.pmn, gp.gap); s.pmx = Math.max(s.pmx == null ? -1e9 : s.pmx, gp.gap); if (gp.gap > 0.015 || gp.gap < 0) s.worst = t; } }
        }
      }
      const res = W.CONTACT_SPECS.map((c) => { const s = st.get(c); return { id: c.id, name: c.name, group: c.group, side: c.side, times: c.ts.map((x) => +x.toFixed(3)), minMM: +(s.mn * 100).toFixed(3), maxMM: +(s.mx * 100).toFixed(3), padMinMM: s.pmn == null ? null : +(s.pmn * 100).toFixed(3), padMaxMM: s.pmx == null ? null : +(s.pmx * 100).toFixed(3), worstAt: s.worst }; });
      return res;
    },
  };
})();
