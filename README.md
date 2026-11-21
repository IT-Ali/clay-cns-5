# CNS examination, part 5 of 11: the motor system of the arms (Soft Clay)

A 90-second three.js motion graphic in the series' Soft Clay style: inspection, tone (both arms), pronator drift and
power (shoulder abduction C5, elbow flexion C5-C6, elbow extension C7, wrist extension C6-C7, finger flexion C8,
finger abduction T1), each test on his right and then, after a hard cut, on his left. It starts and ends on the CNS
home shot. Nothing in `shared/` is changed.

## Render on your PC (Windows, Node + Chrome, a graphics card)

You need Node.js 20 or newer and Google Chrome. Unzip the folder, open a Command Prompt (or PowerShell) in it, then run
these, in this order:

1. Install the packages (three.js, Playwright, ffmpeg):

```bash
npm install
```

2. Allow ffmpeg-static's install script, which downloads ffmpeg.exe (newer npm versions block install scripts until
   they are approved):

```bash
npm approve-scripts ffmpeg-static
```

3. Run that install script now:

```bash
npm rebuild ffmpeg-static
```

4. The preview: Chrome on the graphics card, 960x540, 30 fps, 8 samples, captions on. By default it renders beats 3 and 4
   (tone, right and left), 5 (pronator drift) and 10 (finger flexion), one MP4 each, plus the first and last frames:

```bash
npm run preview
```

   It writes `out\preview\beats\cns5_preview_beat03_*.mp4`, `..._beat04_*`, `..._beat05_*` and `..._beat10_*.mp4`, `out\preview\check.json` (first vs
   last frame pixel difference, mean loudness, duration) and `out\preview\sheet.jpg` (a frame every 2 s that was
   rendered, with its time stamp). The frames are kept in `out\preview\frames`, so it can be stopped and run again.
   Other beats: `npm run preview -- --beats 3,7`; the whole part as one MP4: `npm run preview -- --beats all`. To send the
   preview back, zip `out\preview` without the `frames` folder.

5. The final render (the series quality, `SET.RENDER`: 64 samples, 1920x1080, 30 fps, with sound):

```bash
npm start
```

   It writes `out\cns5_captions.mp4` and `out\cns5_clean.mp4` (the whole part) and every beat on its own in
   `out\beats\cns5_beatNN_<name>_captions.mp4` / `_clean.mp4`. Frames are saved in `out\frames\` as they are made; if
   the render stops, run `npm start` again and it carries on from the frames already on disk. Each frame is rendered
   once; the captioned frame is the same picture with the caption plaque drawn on top (the CAPTIONS switch).

If `npm approve-scripts` is not a command in your npm version, skip step 2: older npm runs install scripts on its own, and
step 3 makes sure ffmpeg.exe is there. If the render says Chrome is not using the graphics card, turn on "Use graphics
acceleration when available" in Chrome's settings.

Options: `--samples 32` (faster), `--frames 900-1200[,1500-1600]`, `--beats 3,4,5,10|all`, `--test N` (only the first N frames
of each chosen beat, encoded to short test MP4s), `--remake` (remake the MP4s from the frames on disk), `--software` (no
graphics card, very slow); set `CHROME_PATH` to use a particular Chrome.

**Nothing is solved on your PC.** Every contact pose (the handshake, the elbow cup, the hands on the named points, the
grip, his hand on the thigh) was solved once on the build machine (`node tools/solve.mjs`) and saved in `solved.json`;
both commands load it and stop with a clear message if it is missing or does not match the code.

## Checks made on the build machine

- `storyboard/storyboard.html`: the storyboard (every panel rendered from the same page, poses and cameras as the film)
  and every contact measured on the meshes (0-1.5 mm, at the nearest point and at each finger pad).
- `story_vs_anim.png` (`node tools/story-vs-anim.mjs`): beats 3, 5, 6, 7 and 10, the storyboard panel next to the
  animation frame at the same moment, rendered by `render.mjs`, with the mean pixel difference (`checks/story_vs_anim.json`).
- `checks/transitions/` (`node tools/transitions.mjs`): a strip of frames across every cut and camera move.
- `home-check.json` (`node tools/home-check.mjs`): the first and last frames of the film against each other and against the
  CNS home shot built exactly as `shared/README.md` says (`check/homeref-style.js`).

## Files

- `index.html`: the player and render page (`?render=1&solved=1&w=&h=&samples=&captions=0|1`)
- `cns5/cns5-style.js`: this part (content and timing table first, then `build(S)`: the solver, the timelines, the frame)
- `cns5/cams.js`: every camera, one object per shot (used by the storyboard and the animation)
- `cns5/kin.js`: his arms from joint angles (built on his right, mirrored for his left)
- `cns5/contact5.js`: the contact solver (gaps measured on the real meshes; from part 4)
- `solved.json`: the solved contact poses (loaded by every render)
- `lib/`: the STAGE, TEXT3D and SOUND kits (unchanged, from the series)
- `shared/`, `series/`, `ref/`: the series kit v5, unchanged
- `styles/soft-clay.js`: the reference style source
- `storyboard/`: the storyboard page, its stills and the measured contacts (`node tools/storyboard.mjs`, then
  `node tools/storyboard-html.mjs`)
- `check/homeref-style.js`: the README's CNS home shot alone (`index.html?scene=homeref`), for home-check.json
- `render.mjs`, `tools/`: the renderers (Chrome is driven by Playwright with no network: the page, three.js and the
  font are served from this folder)
