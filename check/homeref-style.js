// check/homeref-style.js: the CNS home shot built EXACTLY as shared/README.md says ("The CNS home shot (start and end of
// every CNS part)"), with nothing of part 5. tools/home-check.mjs renders it (index.html?scene=homeref) and compares the
// first and last frames of the animation with it, pixel by pixel (home-check.json).
(function (root) {
  root.HOMEREF = {
    id: 'cns-home-ref', name: 'CNS home shot (shared/README.md)', duration: 1,
    fonts: ['600 56px "Fredoka"'],
    render: Object.assign({}, root.SET.RENDER),
    captions: false,
    build(S) {
      const SET = root.SET, BED = root.BED, PATIENT = root.PATIENT, SHEET = root.SHEET, HANDS = root.HANDS, CLAY = root.CLAY, HOME = root.HOME;
      const L = SET.build(S); const bed = BED.build(S); BED.table(S);
      const P = PATIENT.build(S, { neuro: true });
      const SH = SHEET.build(S, P, { from: 'foot' });          // the sheet folded at the foot of the bed
      bed.placePillow(P.headBack(), 7.15);
      // the examiner's materials, copied from series/cvs1-style.js (line 70)
      const exM = { glove: CLAY.mat('#5a8fd8', '#3e73c3', { rough: 0.42, sheen: 0.25, streak: 0.5, freq: 2, tile: 0.8, bump: 0.45, lump: 0.006, lumpSize: 0.6 }), sleeve: CLAY.mat('#24636a', '#1d5359', { rough: 0.82, streak: 0.4, scale: 1.6, side: THREE.DoubleSide }) };
      const EX = { R: HANDS.examinerArm(S, exM, 'R'), L: HANDS.examinerArm(S, exM, 'L') };
      HOME.apply(P, EX, SH, 'cns');                             // trousers rolled, oedema 0, legs/head straight, arms and hands at rest
      P.setFace({}); P.breathe(0);
      SET.shoot(S, SET.HOME_CNS);
      L.set(0, {}); L.lamp.intensity = SET.LAMP.power;          // no flicker on the home shot
      return { update() { SET.shoot(S, SET.HOME_CNS); L.set(0, {}); L.lamp.intensity = SET.LAMP.power; } };
    },
  };
})(window);
