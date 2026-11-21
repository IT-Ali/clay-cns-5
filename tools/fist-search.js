// tools/fist-search.js: the search that gave FIST (cns5-style.js), run as a job in a probe page (tools/probe-server.mjs +
// tools/job.sh), starting from the fingers found by a grid (each fingertip 0.5 mm from the palm, no finger bone inside it): the
// thumb, its pad across the middle bones of the index and middle fingers, its shaft in front of the index seen from the thumb
// side, nothing inside a finger or the palm.
const W5 = window.CNS5_WORLD, P = W5.P, C5 = W5.C5, V = (x, y, z) => new THREE.Vector3(x, y, z), out = [], imgs = {};
const t = 53.51; window.seek(t, 1);
const h = P.arms.R.hand; h.group.updateMatrixWorld(true);
const F4 = ['index', 'middle', 'ring', 'little'], MU = C5.meshesUnder, own = (o) => o.children.filter((m) => m.isMesh), wp = (o) => o.getWorldPosition(V(0, 0, 0));
const pose = {"curl":{"index":[1.7,1.75,1.2],"middle":[1.5,2,1],"ring":[1.65,1.85,1],"little":[1.5,1.8,0.8]},"spread":0,"thumb":[1.45,2.776,-0.123,1.287]};
const ap = () => { h.pose(pose); h.group.updateMatrixWorld(true); };
ap();
// the target: the middle of the middle bones of the index and middle fingers, on their outer face
const midI = wp(h.fingers.index.pip).lerp(wp(h.fingers.index.dip), 0.5), midM = wp(h.fingers.middle.pip).lerp(wp(h.fingers.middle.dip), 0.5);
const T = midI.clone().lerp(midM, 0.5), palmC = h.world('palm'), across = midM.clone().sub(midI).normalize();
let n = T.clone().sub(palmC); n.addScaledVector(across, -n.dot(across)).normalize();
const Spalm = C5.surface([P.arms.R.armMesh], palmC, 1.6);
const SI = C5.surface(own(h.fingers.index.pip), T, 2), SM = C5.surface(own(h.fingers.middle.pip), T, 2), SF = C5.surface(F4.flatMap((f) => MU(h.fingers[f].mcp)), T, 2.5);
const ip = MU(h.thumb.ip), thAll = MU(h.thumb.mcp);
const iA = wp(h.fingers.index.mcp), iB = wp(h.fingers.index.pip);
const segDist = (p, a, b) => { const ab = b.clone().sub(a), u = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, u)); };
const score = (th) => {
  pose.thumb = th; ap();
  const pad = h.world('thumbPad'), d = pad.clone().sub(T), tang = d.clone().addScaledVector(n, -d.dot(n)).length(), outward = d.dot(n);
  const gi = C5.gap(ip, SI).gap, gm = C5.gap(ip, SM).gap, pf = C5.gap(thAll, SF).gap, pp = C5.gap(ip, Spalm).gap;
  const zA = V(0, 0, 1).applyQuaternion(h.group.getWorldQuaternion(new THREE.Quaternion())).normalize(), flat = (p) => p.clone().addScaledVector(zA, -p.dot(zA)); const hole = Math.max(segDist(flat(wp(h.thumb.mcp).lerp(wp(h.thumb.ip), 0.5)), flat(iA), flat(iB)), segDist(flat(wp(h.thumb.mcp)), flat(iA), flat(iB)) * 0.5);
  const s = tang * 1.0 + Math.max(0, -outward) * 2 + Math.abs(Math.min(gi, gm) - 0.005) * 3 + Math.max(0, Math.max(gi, gm) - 0.015) * 3 + 40 * Math.max(0, -pf) + 40 * Math.max(0, -pp) + 3 * Math.max(0, hole - 0.05);
  return { s, tang, outward, gi, gm, pf, pp, hole };
};
let best = { th: pose.thumb.slice(), r: score(pose.thumb.slice()) }; out.push('start ' + JSON.stringify(best.r));
const lim = [[-0.5, 2.6], [-1.5, 3.2], [-0.4, 1.4], [-0.2, 1.4]];
let seed = 41; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
for (let i = 0; i < 1500; i++) { const th = lim.map(([a, b]) => a + (b - a) * rnd()); const r = score(th); if (r.s < best.r.s) best = { th, r }; }
let step = 0.2;
for (let it = 0; it < 120; it++) { let imp = false; for (let j = 0; j < 4; j++) for (const dd of [-step, step]) { const th = best.th.slice(); th[j] += dd; const r = score(th); if (r.s < best.r.s) { best = { th, r }; imp = true; } } if (!imp) step *= 0.5; if (step < 0.001) break; }
score(best.th);
const f = (v) => (v * 100).toFixed(2);
out.push('thumb ' + best.th.map((v) => v.toFixed(3)).join(', ') + ' | pad off the middle of the middle bones ' + f(best.r.tang) + ' mm, to index ' + f(best.r.gi) + ', to middle ' + f(best.r.gm) + ', thumb to fingers ' + f(best.r.pf) + ', to palm ' + f(best.r.pp) + ', base to index ' + f(best.r.hole));
pose.thumb = best.th.map((v) => +v.toFixed(3));
out.push('POSE ' + JSON.stringify(pose));
window.DEBUG_STATE = () => { P.arms.R.hand.pose(pose); };
for (const [k, tt] of [['elbF', 53.51], ['abd', 45.51]]) {
  window.seek(tt, 1); h.group.updateMatrixWorld(true);
  const c = h.group.localToWorld(V(0.45, -0.1, 0)), d = S.camera.position.clone().sub(c).normalize(), q = h.group.getWorldQuaternion(new THREE.Quaternion());
  imgs['f6_' + k] = window.snap({ pos: c.clone().addScaledVector(d, 3).toArray(), target: c.toArray(), fov: 30, focus: c.toArray(), aperture: 0.001 }, tt, 2);
  imgs['f6_' + k + '_front'] = window.snap({ pos: c.clone().addScaledVector(V(1, -0.3, -0.2).applyQuaternion(q).normalize(), 2.6).toArray(), target: c.toArray(), fov: 30, focus: c.toArray(), aperture: 0.001 }, tt, 2);
}
window.DEBUG_STATE = null;
return { out, imgs };
