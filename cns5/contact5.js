// cns5/contact5.js: the contact solver of part 5 (from part 4) (not in shared/). Classic script; needs THREE, K, HANDS.
// Every contact is measured on the REAL meshes: the touching part's vertices against the triangles of the surface it
// touches (skin, a prop, the glass), as a signed distance (negative = sinking in). The solvers move a hand or a prop
// along the contact normal, or bend fingers, until the smallest gap is the target (0.5 mm by default), so nothing
// floats and nothing sinks. 1 world unit = 10 cm, so 1 mm = 0.01.
//   C5.surface(meshes, centre, radius)        -> a surface: the world triangles of the meshes near centre
//   C5.gap(partMeshes, surface, opts)         -> { gap, at, on, n } smallest signed gap (world units) and where
//   C5.parts(hand, name)                      -> meshes of a hand part: 'palm', 'index', 'indexTip', 'thumb', 'thumbTip', ...
//   C5.settle(move(d), measure(), target)     -> slides along a direction until measure() = target; returns d
//   C5.mm(units)                              -> millimetres (for the review labels)
(function (root) {
  const THREE = root.THREE;
  const C5 = (root.C5 = {});
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  C5.MM = 0.01;                 // 1 mm in world units
  C5.TARGET = 0.005;            // the gap every contact is solved to: 0.5 mm
  C5.LIMIT = 0.015;             // the most a contact may show: 1.5 mm
  C5.mm = (u) => u / C5.MM;

  const _a = V(0, 0, 0), _b = V(0, 0, 0), _c = V(0, 0, 0), _p = V(0, 0, 0), _q = V(0, 0, 0), _n = V(0, 0, 0), _t = new THREE.Triangle();
  // world triangles of the meshes (visible ones) with at least one corner within `radius` of `centre`
  C5.surface = (meshes, centre, radius = 0.6) => {
    const out = [], r2 = radius * radius;
    for (const m of meshes) {
      if (!m || !m.isMesh) continue;
      m.updateWorldMatrix(true, false);
      const P = m.geometry.attributes.position, I = m.geometry.index, mw = m.matrixWorld;
      const neg = mw.determinant() < 0;
      const n = I ? I.count : P.count;
      const W = new Float32Array(P.count * 3);
      for (let i = 0; i < P.count; i++) { _a.fromBufferAttribute(P, i).applyMatrix4(mw); W[3 * i] = _a.x; W[3 * i + 1] = _a.y; W[3 * i + 2] = _a.z; }
      for (let k = 0; k < n; k += 3) {
        const i0 = I ? I.getX(k) : k, i1 = I ? I.getX(k + 1) : k + 1, i2 = I ? I.getX(k + 2) : k + 2;
        let near = false;
        for (const i of [i0, i1, i2]) { const dx = W[3 * i] - centre.x, dy = W[3 * i + 1] - centre.y, dz = W[3 * i + 2] - centre.z; if (dx * dx + dy * dy + dz * dz < r2) { near = true; break; } }
        if (!near) continue;
        const t = [W[3 * i0], W[3 * i0 + 1], W[3 * i0 + 2], W[3 * i1], W[3 * i1 + 1], W[3 * i1 + 2], W[3 * i2], W[3 * i2 + 1], W[3 * i2 + 2]];
        if (neg !== !!m.userData.flipNormals) { for (let j = 0; j < 3; j++) { const s = t[3 + j]; t[3 + j] = t[6 + j]; t[6 + j] = s; } }   // a mirrored mesh: keep the normal outward
        out.push(t);
      }
    }
    return { tris: out, centre: centre.clone(), radius };
  };
  // the triangles are bucketed in a grid of CELL-sized cells; a distance query only looks at the cells within RMAX,
  // so any distance beyond RMAX (3 cm) is reported as RMAX (enough for every solver here: they only need near contact)
  const CELL = 0.05, RMAX = 0.3;
  C5.RMAX = RMAX;
  const key = (i, j, k) => i * 73856093 ^ j * 19349663 ^ k * 83492791;
  const gridOf = (S) => {
    if (S.grid) return S.grid;
    const g = new Map();
    S.tris.forEach((t, n) => {
      const lo = [0, 1, 2].map((a) => Math.floor(Math.min(t[a], t[3 + a], t[6 + a]) / CELL)), hi = [0, 1, 2].map((a) => Math.floor(Math.max(t[a], t[3 + a], t[6 + a]) / CELL));
      for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) { const kk = key(i, j, k); let b = g.get(kk); if (!b) g.set(kk, (b = [])); b.push(n); }
    });
    return (S.grid = g);
  };
  // signed distance from p to the surface (sign from the face normal of the nearest triangle), capped at RMAX
  C5.dist = (p, S, rmax = RMAX) => {
    const g = gridOf(S), seen = new Set();
    let best = rmax, bq = null, bn = null;
    const ci = Math.floor(p.x / CELL), cj = Math.floor(p.y / CELL), ck = Math.floor(p.z / CELL);
    for (let r = 0; r * CELL <= best + CELL; r++) {
      for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) for (let k = ck - r; k <= ck + r; k++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj), Math.abs(k - ck)) !== r) continue;
        const b = g.get(key(i, j, k)); if (!b) continue;
        for (const n of b) {
          if (seen.has(n)) continue; seen.add(n);
          const t = S.tris[n];
          _a.set(t[0], t[1], t[2]); _b.set(t[3], t[4], t[5]); _c.set(t[6], t[7], t[8]);
          _t.set(_a, _b, _c); _t.closestPointToPoint(p, _q);
          const d = _q.distanceTo(p);
          if (d < best) { best = d; bq = _q.clone(); _t.getNormal(_n); bn = _n.clone(); }
        }
      }
    }
    if (!bq) return { d: rmax, q: null, n: null };
    const s = _p.copy(p).sub(bq).dot(bn) < 0 ? -1 : 1;
    return { d: s * best, q: bq, n: bn };
  };
  // smallest signed gap between the vertices of `meshes` and the surface S. opts.near: only vertices this close to S.centre
  C5.gap = (meshes, S, o = {}) => {
    let best = { gap: RMAX, at: null, on: null, n: null };
    const near2 = (o.near || S.radius) ** 2, step = o.step || 1;
    const pp = V(0, 0, 0);
    for (const m of meshes) {
      if (!m || !m.isMesh || !m.visible) continue;
      m.updateWorldMatrix(true, false);
      const P = m.geometry.attributes.position;
      for (let i = 0; i < P.count; i += step) {
        pp.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld);
        if (pp.distanceToSquared(S.centre) > near2) continue;
        const r = C5.dist(pp, S, best.gap > 0 ? Math.min(RMAX, best.gap + 1e-9) : RMAX);
        if (r.d < best.gap && r.q) best = { gap: r.d, at: pp.clone(), on: r.q, n: r.n };
      }
    }
    return best;
  };
  const meshesUnder = (o) => { const out = []; o.traverse((m) => { if (m.isMesh) out.push(m); }); return out; };
  C5.meshesUnder = meshesUnder;
  // the meshes of a named part of a hand
  C5.parts = (hand, name) => {
    const F = hand.fingers, T = hand.thumb;
    if (name === 'palm') return hand.body.children.filter((m) => m.isMesh).concat(T.meta.children.filter((m) => m.isMesh));
    if (name === 'hand') return meshesUnder(hand.body);
    if (name === 'thumb') return meshesUnder(T.mcp);
    if (name === 'thumbTip') return meshesUnder(T.ip);
    const m = /^(index|middle|ring|little)(Tip)?$/.exec(name);
    if (m) return meshesUnder(m[2] ? F[m[1]].dip : F[m[1]].mcp);
    if (name === 'fingers') return ['index', 'middle', 'ring', 'little'].flatMap((k) => meshesUnder(F[k].mcp));
    throw new Error('C5.parts: ' + name);
  };
  // slide something along a direction until measure() returns the target: move(d) applies the total offset d
  C5.settle = (move, measure, target = C5.TARGET, iters = 16) => {
    let d = 0;
    for (let i = 0; i < iters; i++) {
      move(d); const g = measure();
      if (!isFinite(g)) break;
      const e = g - target; if (Math.abs(e) < 0.0002) break;
      d -= e;
    }
    move(d);
    return d;
  };
  // bend one finger at its three joints (ratios k) until its smallest gap to S is the target; returns the curl
  C5.curlTo = (hand, pose, finger, S, o = {}) => {
    const k = o.ratio || [0.55, 1, 0.7], lo0 = o.lo == null ? -0.2 : o.lo, hi0 = o.hi == null ? 1.9 : o.hi, target = o.target == null ? C5.TARGET : o.target;
    const meshes = C5.parts(hand, finger);
    if (!pose.curl) { pose.curl = {}; for (const f of ['index', 'middle', 'ring', 'little']) pose.curl[f] = (pose.all || [0.12, 0.18, 0.1]).slice(); }
    const set = (c) => { pose.curl[finger] = k.map((r) => r * c); hand.pose(pose); hand.group.updateMatrixWorld(true); };
    // bisection: gap falls as the finger curls toward the surface
    let lo = lo0, hi = hi0;
    set(lo); const g0 = C5.gap(meshes, S, o).gap;
    if (g0 < target) return { c: lo, gap: g0 };
    set(hi); const g1 = C5.gap(meshes, S, o).gap;
    if (g1 > target) return { c: hi, gap: g1 };
    for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; set(mid); const g = C5.gap(meshes, S, o).gap; if (g > target) lo = mid; else hi = mid; }
    set(lo); return { c: lo, gap: C5.gap(meshes, S, o).gap };
  };
  // swing the thumb (pose.thumb[0], with its joints following) in until its pad rests on S at the target gap
  C5.thumbTo = (hand, pose, S, o = {}) => {
    const t0 = (pose.thumb || [0.15, 0, 0.12, 0.08]).slice(), meshes = C5.parts(hand, 'thumb'), target = o.target == null ? C5.TARGET : o.target;
    const set = (m) => { pose.thumb = [m, t0[1], t0[2] + 0.4 * (m - t0[0]), t0[3] + 0.3 * (m - t0[0])]; hand.pose(pose); hand.group.updateMatrixWorld(true); return C5.gap(meshes, S).gap; };
    let lo = o.lo == null ? -0.3 : o.lo, hi = o.hi == null ? 1.4 : o.hi;
    if (set(lo) < target) return set(lo);
    if (set(hi) > target) return set(hi);
    for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (set(m) > target) lo = m; else hi = m; }
    return set(lo);
  };
  // frames: a pose relative to a parent object (so a hand on his jaw follows the head, a hand on a fork follows the fork)
  C5.relative = (parent, pos, quat) => {
    parent.updateWorldMatrix(true, false);
    const inv = parent.matrixWorld.clone().invert(), pq = parent.getWorldQuaternion(new THREE.Quaternion());
    return { parent, p: pos.clone().applyMatrix4(inv), q: pq.clone().invert().multiply(quat) };
  };
  C5.resolve = (rel) => {
    rel.parent.updateWorldMatrix(true, false);
    return { p: rel.p.clone().applyMatrix4(rel.parent.matrixWorld), q: rel.parent.getWorldQuaternion(new THREE.Quaternion()).multiply(rel.q) };
  };
})(typeof window !== 'undefined' ? window : globalThis);
