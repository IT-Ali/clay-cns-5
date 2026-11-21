// cns5/cams.js: the cameras of part 5, one object per shot (the storyboard and the animation read the same objects).
// Classic script; defines window.CNS5_CAMS(W) -> { CAM, CAM_KEYS, lights(t, shot) }. W: the world of cns5-style.js.
// Every left-side shot looks at him across the bed from his LEFT (-Z): never through the bed or the bedside table.
(function (root) {
  root.CNS5_CAMS = (W) => {
    const { V, P, SET, KIN, NEURO, TEST, TONE_BASE, kinState, REST, T, BEATS } = W;
    const mir = (c) => Object.assign({}, c, { pos: [c.pos[0], c.pos[1], -c.pos[2]], target: [c.target[0], c.target[1], -c.target[2]], focus: Array.isArray(c.focus) ? [c.focus[0], c.focus[1], -c.focus[2]] : c.focus });
    // a shot looking at `at` from the direction `dir` (world, normalised here) at distance d
    const shot = (at, dir, d, o = {}) => { const v = dir.clone().normalize(); return { pos: at.clone().addScaledVector(v, d).toArray(), target: (o.target || at).toArray(), fov: 28, focus: (o.focus || at).toArray(), aperture: o.ap == null ? 0.02 : o.ap }; };
    const mid = (a, b, u = 0.5) => a.clone().lerp(b, u);
    const shR = P.shoulder('R'), shL = P.shoulder('L');
    const chest = shR.clone().lerp(shL, 0.5);
    const restW = { R: REST.R.wrist, L: REST.L.wrist };
    const st = (name) => kinState('R', TEST[name].a, null);
    const tone = kinState('R', TONE_BASE, null);
    const drift = W.DRIFT_ARM('R');
    const abd = st('abd'), elb = st('elbF'), wr = st('wrist'), grip = st('grip');
    const hand = (s) => s.wrist.clone().add(V(1, 0, 0).applyQuaternion(s.quat).multiplyScalar(0.55));
    const fing = W.abdfState('R', 0);
    const fingHand = fing.wrist.clone().add(V(1, 0, 0).applyQuaternion(fing.quat).multiplyScalar(0.7));
    const CAM = {
      home: Object.assign({}, SET.HOME_CNS),
      // beat 1: the push-in ends on his upper body and both arms
      upper: shot(V(-3.0, 10.0, 0), V(0.62, 0.55, 0.56), 19.5, { ap: 0.03 }),
      // beat 2: one move along both arms: the shoulders and deltoids, the upper arms, the forearms, the backs of the hands
      inspSh: shot(V(-5.1, 10.3, 0), V(0.78, 0.5, 0.22), 12.5, { ap: 0.02 }),
      inspArm: shot(V(-3.6, 9.1, 0), V(0.6, 0.72, 0.2), 11.5, { ap: 0.02 }),
      inspFore: shot(V(-1.8, 7.7, 0), V(0.4, 0.88, 0.16), 10.5, { ap: 0.02 }),
      inspHands: shot(V(-0.3, 6.6, 0), V(0.3, 0.92, 0.14), 9.8, { ap: 0.018 }),
      // beats 3 and 4: the whole arm from the shoulder to the hand and both gloved hands, from his side
      toneR: shot(mid(shR, tone.wrist, 0.55).add(V(0.2, -0.2, 0.6)), V(-0.25, 0.42, 1), 13.5, { ap: 0.02 }),
      // beat 5: from the foot end, a little to his right, a little above shoulder height: both arms, both palms, his eyes
      // straight down the arms from the foot end, far back on a long lens, so the two parallel arms read parallel (a near camera
      // spreads the nearer hands into a V)
      drift: Object.assign(shot(V(-2.4, 10.6, 0), V(1, 0.2, 0), 70, { ap: 0.003, focus: drift.wrist.clone().lerp(shR, 0.4) }), { fov: 7 }),
      // beat 6: from the front a little above: the shoulder, the upper arm and the examiner's hand
      abdR: shot(mid(shR, abd.E, 0.6).add(V(0.35, 0.85, 0)), V(0.6, 0.6, 0.75), 11.5, { ap: 0.015 }),
      // beats 7 and 8: from his side at elbow height, the whole arm and the biceps
      elbR: shot(mid(elb.E, elb.wrist, 0.5).add(V(-0.3, 0.15, 0)), V(-0.32, 0.12, 1), 11.0, { ap: 0.015 }),
      // beat 9: from his side at wrist height
      wristR: shot(mid(wr.E, hand(wr), 0.6), V(-0.3, 0.18, 1), 9.0, { ap: 0.012 }),
      // beat 10: from his side and a little below
      gripR: shot(hand(grip).add(V(-0.2, 0.1, 0)), V(0.12, -0.25, 1), 6.2, { ap: 0.008 }),
      // beat 11: close-up from above, his whole hand and the examiner's finger
      fingR: shot(fingHand.clone().add(V(0.1, 0.05, -0.12)), V(0.55, 1, 0.08), 6.4, { ap: 0.008 }),
      // beat 12: the start of the pull back (his right side)
      endR: shot(V(-2.0, 8.4, 0.8), V(0.45, 0.45, 0.77), 15.0, { ap: 0.03 }),
    };
    // the left-side shots: across the bed from his LEFT
    CAM.toneL = mir(CAM.toneR);
    CAM.abdL = mir(CAM.abdR);
    CAM.elbL = mir(CAM.elbR); CAM.wristL = mir(CAM.wristR); CAM.gripL = mir(CAM.gripR); CAM.fingL = mir(CAM.fingR);
    const cut = { cut: true };
    const CAM_KEYS = [
      [0, 'home'], [1.0, 'home'], [T.push[1], 'upper'],
      [T.inspect[0], 'upper'], [8.6, 'inspSh'], [10.0, 'inspArm'], [11.3, 'inspFore'], [T.inspect[1], 'inspHands'],
      [13.0, 'toneR', cut], [23.0, 'toneL', cut], [29.6, 'drift', cut],
      [42.0, 'abdR', cut], [T.abd.cutL, 'abdL', cut], [50.0, 'elbR', cut], [T.elbF.cutL, 'elbL', cut], [58.0, 'elbR', cut], [T.elbE.cutL, 'elbL', cut],
      [65.0, 'wristR', cut], [T.wrist.cutL, 'wristL', cut], [72.5, 'gripR', cut], [T.grip.cutL, 'gripL', cut], [80.0, 'fingR', cut], [T.fing.cutL, 'fingL', cut],
      [T.end.cam, 'endR', cut], [T.end.pull[0], 'endR'], [T.end.pull[1], 'home'], [90, 'home'],
    ];
    // the shadow maps tightened round the subject of the close shots (crisp contact shadows)
    const lights = (t, name) => {
      if (name === 'home' || name === 'upper' || name === 'endR') return {};
      const c = CAM[name]; return { shadowCenter: c.target, shadowSize: name.startsWith('insp') || name === 'drift' ? 5.0 : 3.6 };
    };
    return { CAM, CAM_KEYS, lights };
  };
})(typeof window !== 'undefined' ? window : globalThis);
