// cns5/kin.js: forward kinematics of the patient's arms for part 5 (not in shared/). Classic script; needs THREE, K, HANDS
// and the neuro patient. Defines window.KIN.
// An arm is given by joint angles (degrees) and turned into a state for P.setArm (HOME.applyArm): { wrist, quat, pose, pole,
// E (elbow), Sh (shoulder) }. Every pose is built on his RIGHT and mirrored (z -> -z) for his LEFT, so both sides match.
//   flex   upper arm raised forward from hanging along his trunk (shoulder flexion)
//   abd    upper arm out to his side (shoulder abduction)
//   elbow  elbow flexion (0 = straight)
//   plane  turns the plane the forearm bends in, about the upper arm (0 = toward his front, + = toward his midline)
//   pron   forearm rotation: 0 = handshake (thumb up, palm toward his midline), + = pronation (palm down), - = supination
//   wrist  + = extension (the back of the hand comes up), - = flexion
//   dev    + = radial deviation (toward the thumb)
(function (root) {
  const THREE = root.THREE, K = root.K, HANDS = root.HANDS;
  const KIN = (root.KIN = {});
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rad = Math.PI / 180;
  KIN.L1 = 3.0; KIN.L2 = 2.6;
  KIN.mirror = (v) => V(v.x, v.y, -v.z);
  KIN.frame = (P) => { P.torso.updateMatrixWorld(true); const m = P.torso.matrixWorld; return { F: V(0, 0, 1).transformDirection(m), U: V(0, 1, 0).transformDirection(m), Lat: V(-1, 0, 0).transformDirection(m) }; };   // Lat = his RIGHT (+Z)
  const rot = (v, axis, a) => v.clone().applyAxisAngle(axis.clone().normalize(), a);
  // the right arm from angles: world directions and points
  KIN.rightArm = (P, a) => {
    const { F, U, Lat } = KIN.frame(P), Sh = P.shoulder('R');
    const flex = (a.flex || 0) * rad, abd = (a.abd || 0) * rad, el = (a.elbow || 0) * rad;
    let u = U.clone().negate().multiplyScalar(Math.cos(flex)).addScaledVector(F, Math.sin(flex)).normalize();
    u = u.multiplyScalar(Math.cos(abd)).addScaledVector(Lat, Math.sin(abd)).normalize();
    if (a.uDir) u = a.uDir.clone().normalize();
    // the direction the elbow bends toward: his front, made square to the upper arm, turned by `plane` (+ toward his midline)
    let b = F.clone().addScaledVector(u, -F.dot(u)).normalize();
    b = rot(b, u, -(a.plane || 0) * rad);
    const f = u.clone().multiplyScalar(Math.cos(el)).addScaledVector(b, Math.sin(el)).normalize();
    const E = Sh.clone().addScaledVector(u, KIN.L1), W = E.clone().addScaledVector(f, KIN.L2);
    // the back of the hand at pron 0 (handshake): his right side, square to the forearm
    let d = Lat.clone().addScaledVector(f, -Lat.dot(f));
    if (d.lengthSq() < 1e-6) d = U.clone().addScaledVector(f, -U.dot(f));
    d.normalize();
    d = rot(d, f, -(a.pron || 0) * rad);                // + pronation: the back of the hand turns up
    const wr = (a.wrist || 0) * rad, dv = (a.dev || 0) * rad;
    let fh = f.clone().multiplyScalar(Math.cos(wr)).addScaledVector(d, Math.sin(wr)), dh = d.clone().multiplyScalar(Math.cos(wr)).addScaledVector(f, -Math.sin(wr));
    // radial deviation: about the back-of-hand axis, toward the thumb (thumb side of a right hand = -(fh x dh))
    const thumb = new THREE.Vector3().crossVectors(fh, dh).negate();
    fh = fh.multiplyScalar(Math.cos(dv)).addScaledVector(thumb, Math.sin(dv)).normalize();
    return { Sh, E, W, u, f, b, d, fh, dh: dh.normalize() };
  };
  // pole for P.setArm that reproduces the elbow E exactly
  KIN.pole = (Sh, E, W) => {
    const dir = W.clone().sub(Sh), dist = dir.length(); dir.normalize();
    const ax = (KIN.L1 * KIN.L1 - KIN.L2 * KIN.L2 + dist * dist) / (2 * dist);
    const p = E.clone().sub(Sh.clone().addScaledVector(dir, ax));
    if (p.lengthSq() < 1e-8) return V(0, -1, 0);
    return p.normalize();
  };
  // frames on the RIGHT arm for the angles a (unscaled { p, q }): the hand, the forearm, the elbow (x along the upper arm,
  // y toward the back of the elbow) and the upper arm (at the shoulder). Examiner hands are stored relative to these.
  const basis = (x, y) => { const X = x.clone().normalize(), Y = y.clone().addScaledVector(X, -y.dot(X)).normalize(), Z = new THREE.Vector3().crossVectors(X, Y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); };
  KIN.basis = basis;
  KIN.frames = (P, a) => {
    const r = KIN.rightArm(P, a);
    return { hand: { p: r.W.clone(), q: HANDS.quat(r.fh, r.dh) }, fore: { p: r.E.clone(), q: basis(r.f, r.d) }, elbow: { p: r.E.clone(), q: basis(r.u, r.b.clone().negate()) }, upper: { p: r.Sh.clone(), q: basis(r.u, r.b.clone().negate()) }, world: { p: V(0, 0, 0), q: new THREE.Quaternion() }, r };
  };
  // an arm state for side 'R' | 'L' from the angles (the left is the mirror of the right)
  KIN.arm = (P, side, a, pose) => {
    const r = KIN.rightArm(P, a), m = side === 'L' ? KIN.mirror : (v) => v.clone();
    const Sh = P.shoulder(side), E = m(r.E), W = m(r.W);
    return { wrist: W, quat: HANDS.quat(m(r.fh), m(r.dh)), pose: pose || a.pose, pole: KIN.pole(Sh, E, W), E, Sh, f: m(r.f), u: m(r.u), angles: Object.assign({}, a) };
  };
  // mirror a world transform (position + quaternion of a hand built as HANDS.quat(x, y)) to the other side
  KIN.mirrorQuat = (q) => { const x = V(1, 0, 0).applyQuaternion(q), y = V(0, 1, 0).applyQuaternion(q); return HANDS.quat(KIN.mirror(x), KIN.mirror(y)); };
  KIN.mirrorState = (st) => {
    const o = Object.assign({}, st);
    for (const k of ['wrist', 'pole', 'back', 'E', 'Sh', 'at']) if (st[k] && st[k].isVector3) o[k] = KIN.mirror(st[k]);
    if (st.quat) o.quat = KIN.mirrorQuat(st.quat);
    return o;
  };
  // the angles that blend two arm states (for moves between poses): plain lerp of each angle
  KIN.lerpAngles = (a, b, u) => { const o = {}; for (const k of new Set(Object.keys(a).concat(Object.keys(b)))) { if (k === 'pose' || k === 'uDir') continue; o[k] = K.lerp(a[k] || 0, b[k] || 0, u); } return o; };
})(typeof window !== 'undefined' ? window : globalThis);
