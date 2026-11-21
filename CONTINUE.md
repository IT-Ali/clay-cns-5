# CONTINUE: CNS part 5 (motor system of the arms)

## Status
- Round 1 (STEP 0 + storyboard): the kit from `series-shared-v5.zip` (shared/, series/, ref/: unchanged, all files
  present, README has "v5: neuro mode"); `lib/` (STAGE, TEXT3D, SOUND) and the render tooling taken from part 4
  (IT-Ali/clay-cns-4, whose shared/ is byte-identical to the zip) because the zip has no lib/stage.js.
- The whole part is built (timing, poses, contacts, cameras, sound) because the storyboard renders from the same data.
- Round 2 (the user's fixes): elbow cup re-solved (hand turn searched, every pose frame, every finger pad on the skin, joints capped);
  every finger/thumb contact also measured at its pad; handshake, elbow-flexion thumb and grip-thumb pads on the skin; all 114
  contacts pass (nearest points 0.00-1.20 mm, pads 0.05-1.09 mm).
- Storyboard: `storyboard/storyboard.html` (published: https://claude.ai/artifact/D9STZVowSwsMJjB4XJpfzx). STOPPED for the user's review of the storyboard.

## Left to do (after the storyboard is approved)
- story_vs_anim.png (beats 3, 5, 6, 7, 10), the transitions scan (`node tools/transitions.mjs`, strips in
  checks/transitions/), home-check.json (first/last frame vs the CNS home shot), test `npm run preview` in software on
  2-3 frames, zip the folder for the PC, stop for the preview review (the user renders on the PC).

## Commands (this cloud machine has no GPU: software WebGL, slow)
- solve once (about 15 min): `node tools/solve.mjs`; one block again: `node tools/solve.mjs --only cup`
  (blocks: shake, cup, cupF, abd, elbF, elbE, wrist, grip, fing). Every render checks solved.json's hash against the code.
- the elbow cup at every pose frame (cupF, about 1 h): four quarters side by side with
  `node tools/solve.mjs --only cupF0 --out a.json` (cupF1..cupF3 likewise), then `node tools/merge-solved.mjs a.json b.json c.json d.json`;
  `--only cup` (the cup's place on the elbow, about 40 min) must run before cupF; `--only cupFix` solves again only frames with a part
  outside 0.03-1.5 mm. After any change in shared/, cns5/ or lib/, re-solve
  (or, if the change cannot affect the solve, re-stamp the hash with `node tools/merge-solved.mjs`).
- storyboard: `node tools/storyboard.mjs 16 960 540 [--only=id,id] [--force]`, then `node tools/storyboard-html.mjs`
- a dev page that stays built: `node tools/probe-server.mjs <dir> 960 540 2 "&solved=1"`, then drop jobs with
  `tools/job.sh <dir> <name> <job.js>` (kill old servers with `pkill -9 -f probe-server.mjs`)
- transitions scan: `node tools/transitions.mjs`
- previews on the PC: `npm run preview` (`-- --beats 5,10`), final: `npm start`

## Notes
- Contacts: every contact is listed once in `CONTACT_SPECS` (cns5-style.js) and measured on the meshes at the moments it
  holds (`storyboard/contacts.json`), at its nearest point and (fingers, thumbs) at its pad; the rule is 0-1.5 mm, solved to 0.5 mm.
  The solver's pad step (padTo) bends a finger's joints until its pad rests on the skin.
- The elbow cup is stored per pose frame (solved.json cupFrames, keyed by the arm angles); runtime looks the frame up exactly.
- The left side is the exact mirror of the right (kin.js), measured again on the left meshes; his hand on the thigh
  (finger abduction) is solved on each side.
- The end hold plays the start hold backwards (style.seekTime), so the last frame is the first frame exactly.
