# CONTINUE: CNS part 5 (motor system of the arms)

## Status
- Round 1 (STEP 0 + storyboard): the kit from `series-shared-v5.zip` (shared/, series/, ref/: unchanged, all files
  present, README has "v5: neuro mode"); `lib/` (STAGE, TEXT3D, SOUND) and the render tooling taken from part 4
  (IT-Ali/clay-cns-4, whose shared/ is byte-identical to the zip) because the zip has no lib/stage.js.
- Round 2: elbow cup re-solved (hand turn searched, every pose frame, every finger pad on the skin, joints capped); every
  finger/thumb contact also measured at its pad; handshake, elbow-flexion thumb and grip-thumb pads on the skin.
- Round 3 (storyboard APPROVED with 2 fixes; no more storyboard rounds):
  - pronator drift: arms straight forward and parallel, hands exactly shoulder-width apart (`DRIFT_ARM`), palms up, the
    same height (108.2 cm both); the foot-end camera far back on a long lens (70 units, 7 deg) so the arms read parallel.
  - his fist (abduction, elbow flexion/extension, wrist extension; both sides): fingertips on the palm, the thumb across
    the middle bones of the index and middle fingers, no ring from the thumb side (`FIST`, `tools/fist-search.js`);
    the wrist test re-solved on it; fist contacts added (`fist-*`). All 124 contacts pass (0-1.5 mm).
  - BUILD: the film is rendered by `render.mjs` from the same page, poses and cameras as the storyboard.
    `story_vs_anim.png` (beats 3, 5, 6, 7, 10: mean pixel difference 1.6-1.9 / 255), `home-check.json` (first = last =
    the README's CNS home shot: 0 differing pixels), transitions scan in `checks/transitions/` (beat 10 now opens wider
    and the camera follows the arm in and out, so no frame of empty teal), `npm run preview` tested in software
    (`checks/preview-test/`: beats 5 and 10, one frame each, sound at -14.9 LUFS, test MP4s, check.json).
  - Zipped for the PC (without node_modules and frames). STOPPED: the user renders the preview and the final on the PC.

## Commands (this cloud machine has no GPU: software WebGL, slow)
- solve once: `node tools/solve.mjs`; one block again: `node tools/solve.mjs --only wrist`
  (blocks: shake, cup, cupF, cupFix, abd, elbF, elbE, wrist, grip, fing). Every render checks solved.json's hash against the code.
- the elbow cup at every pose frame (cupF, about 1 h): `--only cup` (its place on the elbow, about 40 min) first, then four
  quarters side by side with `node tools/solve.mjs --only cupF0 --out a.json` (cupF1..cupF3 likewise), then
  `node tools/merge-solved.mjs a.json b.json c.json d.json`; `--only cupFix` solves again only frames with a part outside
  0.03-1.5 mm. After any change in shared/, cns5/ or lib/, re-solve (or, if the change cannot affect the solve, e.g. a
  camera, re-stamp the hash with `node tools/merge-solved.mjs`).
- storyboard: `node tools/storyboard.mjs 16 960 540 [--only=id,id] [--force] [--report]`, then `node tools/storyboard-html.mjs`
- checks: `node tools/story-vs-anim.mjs`, `node tools/home-check.mjs`, `node tools/transitions.mjs`
- a dev page that stays built: `node tools/probe-server.mjs <dir> 960 540 2 "&solved=1"`, then drop jobs with
  `tools/job.sh <dir> <name> <job.js>` (kill old servers with `pkill -9 -f probe-server.mjs`)
- on the PC (README has the Windows steps): `npm run preview` (beats 5 and 10 + first/last frame; `-- --beats all`),
  final: `npm start`; here: `npm run preview -- --software --test 1`

## Notes
- Contacts: every contact is listed once in `CONTACT_SPECS` (cns5-style.js) and measured on the meshes at the moments it
  holds (`storyboard/contacts.json`), at its nearest point and (fingers, thumbs) at its pad; the rule is 0-1.5 mm, solved to
  0.5 mm. The solver's pad step (padTo) bends a finger's joints until its pad rests on the skin.
- The elbow cup is stored per pose frame (solved.json cupFrames, keyed by the arm angles); runtime looks the frame up exactly.
- The left side is the exact mirror of the right (kin.js), measured again on the left meshes.
- The home holds use the README's own calls (`SET.shoot(S, SET.HOME_CNS)`, `L.set(0, {})`, the lamp at full power); the
  end hold plays the start hold backwards (style.seekTime), so the last frame is the first frame exactly.
- `check/homeref-style.js` (index.html?scene=homeref) is the README's CNS home recipe alone, for home-check.json.
