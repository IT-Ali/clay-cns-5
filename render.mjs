// render.mjs: renders CNS part 5 (the motor system of the arms) to MP4 on a PC with a graphics card.
//
//   npm start             the full part and every beat, both versions, with sound, at the series quality
//                         (SET.RENDER: 64 samples, 1920x1080, 30 fps):
//                           out/cns5_captions.mp4, out/cns5_clean.mp4
//                           out/beats/cns5_beatNN_<name>_captions.mp4 / _clean.mp4
//   npm run preview       the preview on the GPU: 960x540, 30 fps, 8 samples, captions on, the full part as one MP4
//                           out/preview/cns5_preview.mp4 (frames in out/preview/frames, separate from the final render)
//                           out/preview/check.json (first vs last frame pixel difference, mean loudness, duration)
//                           out/preview/sheet.jpg (a frame every 2 s with its time stamp)
//   npm run preview -- --beats 5,10    only those beats (out/preview/beats/cns5_preview_beatNN.mp4)
//
// Both LOAD solved.json (made once with node tools/solve.mjs) and never solve; they stop with a clear message if it is
// missing or out of date. Frames already on disk are skipped, so if a render stops, running it again carries on.
// Other options: --samples N  --w W --h H  --frames a-b  --remake (remake the MP4s from the frames on disk)
//                --software (no GPU: SwiftShader, very slow)   CHROME_PATH=... to use a particular Chrome
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { launch, openPage } from './tools/pw.mjs';
import { checkSolved } from './tools/hash.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; }, flag = (k) => argv.includes('--' + k);
const PREVIEW = flag('preview');
const W = +opt('w', PREVIEW ? 960 : 1920), H = +opt('h', PREVIEW ? 540 : 1080), FPS = 30;
const SAMPLES = +opt('samples', PREVIEW ? 8 : 0);           // 0 = the style's own (SET.RENDER: 64)
const VERSIONS = PREVIEW ? ['captions'] : ['captions', 'clean'];
const OUT = path.join(ROOT, 'out', PREVIEW ? 'preview' : '');
const FR = { clean: path.join(OUT, 'frames', 'clean'), captions: path.join(OUT, 'frames', 'captions') };
for (const v of VERSIONS) fs.mkdirSync(FR[v], { recursive: true });
fs.mkdirSync(path.join(OUT, 'beats'), { recursive: true });
let FFMPEG = 'ffmpeg'; try { FFMPEG = require('ffmpeg-static') || 'ffmpeg'; } catch (e) { /* system ffmpeg */ }
const ff = (args, quiet = true) => { const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', quiet ? 'error' : 'info', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }); if (r.status !== 0) throw new Error('ffmpeg failed: ' + args.join(' ') + '\n' + (r.stderr || '')); return r.stderr || ''; };
const pad = (i) => String(i).padStart(6, '0');
const T0 = Date.now(), el = () => ((Date.now() - T0) / 60000).toFixed(1) + ' min';
const solved = checkSolved();
console.log(`solved.json ${solved.hash} (solved ${solved.solvedAt}) - loaded, not solved again`);

const browser = await launch({ gpu: !flag('software') });
const page = await openPage(browser, `/index.html?render=1&solved=1&captions=0&w=${W}&h=${H}${SAMPLES ? '&samples=' + SAMPLES : ''}`, { width: W, height: H });
await page.waitForFunction(() => window.READY || window.FAIL, null, { timeout: 0 });
const fail = await page.evaluate(() => window.FAIL); if (fail) { console.error('build failed:', fail); process.exit(1); }
const info = await page.evaluate(() => ({ D: window.DURATION, beats: window.CNS5.content.BEATS, samples: window.S.samples, gl: (() => { const g = window.S.renderer.getContext(), e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; })() }));
console.log(`built in ${el()} | ${W}x${H}, ${info.samples} samples | GPU: ${info.gl}`);
if (!flag('software') && /swiftshader|llvmpipe|software/i.test(info.gl)) console.log('WARNING: Chrome is not using the graphics card (this will be very slow). Check that Chrome has hardware acceleration on.');
const NF = Math.round(info.D * FPS);
const beatFrames = (b) => [Math.round(b.t0 * FPS), Math.round(b.t1 * FPS) - 1];
// which frames: all, a range, or some beats
let ranges = [[0, NF - 1]];
if (opt('frames', '')) ranges = [opt('frames').split('-').map(Number)];
const beatsSel = (opt('beats', '') || opt('beat', '')).split(',').filter(Boolean).map(Number);
if (beatsSel.length) ranges = beatsSel.map((n) => beatFrames(info.beats.find((b) => b.n === n)));

// 1. the frames (skipping those already rendered); the captioned frame is the clean picture with the caption plaque on top
const todo = [];
for (const [a, b] of ranges) for (let i = a; i <= Math.min(b, NF - 1); i++) if (VERSIONS.some((v) => !fs.existsSync(path.join(FR[v], pad(i) + '.png')))) todo.push(i);
console.log(`${todo.length} frames to render (${VERSIONS.join(' + ')})`);
const write = (file, dataUrl) => { const tmp = file + '.part'; fs.writeFileSync(tmp, Buffer.from(dataUrl.split(',')[1], 'base64')); fs.renameSync(tmp, file); };
let done = 0; const t1 = Date.now();
for (const i of todo) {
  const r = await page.evaluate(async ({ t, versions }) => {
    window.CAPTIONS = false; window.seek(t);
    const c = document.getElementById('c'), clean = c.toDataURL('image/png'), out = {};
    if (versions.includes('clean')) out.clean = clean;
    if (versions.includes('captions')) {
      const cv = window._cap || (window._cap = document.createElement('canvas')); cv.width = c.width; cv.height = c.height;
      const ctx = cv.getContext('2d'), img = new Image(); img.src = clean; await img.decode();
      ctx.drawImage(img, 0, 0); window.CAPTION.at(ctx, window.CNS5.seekTime ? window.CNS5.seekTime(t) : t, window.CNS5.content.CAPTIONS, c.width, c.height);
      out.captions = cv.toDataURL('image/png');
    }
    return out;
  }, { t: i / FPS, versions: VERSIONS });
  for (const v of VERSIONS) write(path.join(FR[v], pad(i) + '.png'), r[v]);
  done++;
  if (done % 10 === 0 || done === todo.length) { const per = (Date.now() - t1) / done / 1000; console.log(`frame ${i + 1}/${NF}  ${per.toFixed(2)} s/frame  about ${((todo.length - done) * per / 60).toFixed(0)} min left`); }
}

// 2. the sound, from the same score as the player, normalised to about -15 LUFS
const wav = path.join(OUT, 'sound.wav');
if (!fs.existsSync(wav)) {
  const wavRaw = path.join(OUT, 'sound_raw.f32');
  const b64 = await page.evaluate(async () => {
    const r = await window.SOUND.renderOffline((k) => window.CNS5.sound(k), window.DURATION, 48000, { voiceover: false });
    const u8 = new Uint8Array(r.inter.buffer); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s);
  });
  fs.writeFileSync(wavRaw, Buffer.from(b64, 'base64'));
  ff(['-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', wavRaw, '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo', '-c:a', 'pcm_s16le', wav]);
  fs.unlinkSync(wavRaw);
}

// 3. the MP4s
const enc = PREVIEW ? ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart']
  : ['-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart'];
const have = (v, a, n) => { for (let i = a; i < a + n; i++) if (!fs.existsSync(path.join(FR[v], pad(i) + '.png'))) return false; return true; };
const clip = (v, s, n, file, fade) => ff(['-framerate', String(FPS), '-start_number', String(s), '-i', path.join(FR[v], '%06d.png'), '-ss', (s / FPS).toFixed(4), '-t', (n / FPS).toFixed(4), '-i', wav,
  '-map', '0:v', '-map', '1:a', '-frames:v', String(n), ...enc, ...(fade ? ['-af', 'afade=t=in:d=0.04,afade=t=out:st=' + (n / FPS - 0.04).toFixed(3) + ':d=0.04'] : []), file]);
let made = 0;
for (const v of VERSIONS) {
  for (const b of info.beats) {
    if (beatsSel.length && !beatsSel.includes(b.n)) continue;
    const [s, e] = beatFrames(b), n = e - s + 1, name = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const file = PREVIEW ? path.join(OUT, 'beats', `cns5_preview_beat${String(b.n).padStart(2, '0')}_${name}.mp4`) : path.join(OUT, 'beats', `cns5_beat${String(b.n).padStart(2, '0')}_${name}_${v}.mp4`);
    if (PREVIEW && !beatsSel.length) continue;              // the preview of the whole part is one MP4
    if (!have(v, s, n) || (fs.existsSync(file) && !flag('remake'))) continue;
    clip(v, s, n, file, true); made++;
  }
  const full = path.join(OUT, PREVIEW ? 'cns5_preview.mp4' : `cns5_${v}.mp4`);
  if (have(v, 0, NF) && (!fs.existsSync(full) || flag('remake'))) { ff(['-framerate', String(FPS), '-i', path.join(FR[v], '%06d.png'), '-i', wav, '-map', '0:v', '-map', '1:a', ...enc, '-shortest', full]); made++; }
}

// 4. the preview checks: check.json and sheet.jpg
if (PREVIEW) {
  const v = 'captions', check = { frames: NF, rendered: fs.readdirSync(FR[v]).filter((f) => f.endsWith('.png')).length, size: [W, H], samples: info.samples, gpu: info.gl };
  const f0 = path.join(FR[v], pad(0) + '.png'), fl = path.join(FR[v], pad(NF - 1) + '.png');
  if (fs.existsSync(f0) && fs.existsSync(fl)) {
    const raw = (f) => { const tmp = path.join(OUT, 'tmp.rgb'); ff(['-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgb24', tmp]); const b = fs.readFileSync(tmp); fs.unlinkSync(tmp); return b; };
    const A = raw(f0), Bb = raw(fl); let diff = 0, sum = 0; for (let i = 0; i < A.length; i++) { const d = Math.abs(A[i] - Bb[i]); sum += d; if (d) diff++; }
    check.firstVsLast = { differingValues: diff, meanAbsDiff: +(sum / A.length).toFixed(5), identical: diff === 0 };
  }
  const full = path.join(OUT, 'cns5_preview.mp4');
  const probe = fs.existsSync(full) ? full : (fs.readdirSync(path.join(OUT, 'beats')).map((f) => path.join(OUT, 'beats', f)).find((f) => f.endsWith('.mp4')));
  if (probe) {
    const log = ff(['-i', probe, '-af', 'ebur128', '-f', 'null', '-'], false);
    const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(log), I = /Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+) LUFS/.exec(log);
    check.file = path.basename(probe); check.durationS = dur ? +dur[1] * 3600 + +dur[2] * 60 + +dur[3] : null; check.loudnessLUFS = I ? +I[1] : null;
  }
  fs.writeFileSync(path.join(OUT, 'check.json'), JSON.stringify(check, null, 1));
  // the sheet: a frame every 2 s with its time stamp
  const picks = []; for (let t = 0; t < info.D; t += 2) { const i = Math.min(NF - 1, Math.round(t * FPS)); if (fs.existsSync(path.join(FR[v], pad(i) + '.png'))) picks.push([i, t]); }
  if (picks.length) {
    const jpg = await page.evaluate(async (picks) => {
      const cols = 6, w = 320, h = 180, rows = Math.ceil(picks.length / cols), c = document.createElement('canvas'); c.width = cols * w; c.height = rows * h; const x = c.getContext('2d');
      x.fillStyle = '#0d3a3d'; x.fillRect(0, 0, c.width, c.height);
      for (const [k, [i, t]] of picks.entries()) {
        const img = new Image(); img.src = '/out/preview/frames/captions/' + String(i).padStart(6, '0') + '.png'; await img.decode();
        const cx = (k % cols) * w, cy = Math.floor(k / cols) * h; x.drawImage(img, cx, cy, w, h);
        x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(cx + 4, cy + 4, 58, 22); x.fillStyle = '#f8eedb'; x.font = '600 15px "Fredoka", sans-serif'; x.fillText(t.toFixed(1) + ' s', cx + 9, cy + 20);
      }
      return c.toDataURL('image/jpeg', 0.85);
    }, picks);
    fs.writeFileSync(path.join(OUT, 'sheet.jpg'), Buffer.from(jpg.split(',')[1], 'base64'));
  }
  console.log('check.json:', JSON.stringify(check));
}
await browser.close();
if (!VERSIONS.every((v) => have(v, 0, NF))) console.log(`not every frame is rendered yet: run again to carry on (${made} MP4s made this time)`);
console.log(`done in ${el()}: ${OUT}`);
