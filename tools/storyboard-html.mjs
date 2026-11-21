// node tools/storyboard-html.mjs : builds storyboard/storyboard.html from storyboard/img, panels.json, contacts.json
// (the stills come from tools/storyboard.mjs; every image is embedded so the page is one file)
import { ROOT } from './pw.mjs';
import fs from 'node:fs'; import path from 'node:path';
const SB = path.join(ROOT, 'storyboard');
const { BEATS, REVIEW, samples, size } = JSON.parse(fs.readFileSync(path.join(SB, 'panels.json'), 'utf8'));
const contacts = JSON.parse(fs.readFileSync(path.join(SB, 'contacts.json'), 'utf8'));
const notes = fs.existsSync(path.join(SB, 'notes.json')) ? JSON.parse(fs.readFileSync(path.join(SB, 'notes.json'), 'utf8')) : { checks: [], assumptions: [], open: [] };
const img = (id) => { const f = path.join(SB, 'img', id + '.jpg'); return fs.existsSync(f) ? 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64') : ''; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LIMIT = 1.5;
const rng = (a, b) => (Math.abs(b - a) < 0.005 ? a.toFixed(2) : a.toFixed(2) + ' – ' + b.toFixed(2)) + ' mm';
const row = (c) => {
  const hasPad = c.padMinMM != null;
  const ok = c.minMM >= 0 && c.maxMM <= LIMIT && (!hasPad || (c.padMinMM >= 0 && c.padMaxMM <= LIMIT));
  return `<tr class="${ok ? 'ok' : 'bad'}"><td>${esc(c.name)}</td><td class="num">${rng(c.minMM, c.maxMM)}</td><td class="num">${hasPad ? rng(c.padMinMM, c.padMaxMM) : '–'}</td><td class="num">${c.times.length > 1 ? c.times.length + ' pose frames' : c.times[0].toFixed(2) + ' s'}</td><td><span class="pill">${ok ? 'pass' : 'check'}</span></td></tr>`;
};
const groups = [...new Set(REVIEW.map((r) => r.group))];
const html = `<title>CNS Part 5 Storyboard</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Inter:wght@400;500;600&display=swap">
<style>
/* layout: a production board. A header strip, then the beats as a two-column grid of stills with their notes, then the review panels and the contact table. */
:root { --bg: #f2efe7; --paper: #fffdf8; --ink: #1f2a4d; --muted: #5b6478; --teal: #12808a; --accent: #d9622b; --ok: #2e7d4f; --bad: #b3261e; --line: #dcd6c8;
  --display: "Fredoka", "Trebuchet MS", sans-serif; --body: "Inter", system-ui, sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0f2427; --paper: #16312f; --ink: #f1ead9; --muted: #a7b6b4; --teal: #5cc2c9; --accent: #f08b55; --ok: #7bd39d; --bad: #ff8a80; --line: #2b4a4a; color-scheme: dark; } }
:root[data-theme="dark"] { --bg: #0f2427; --paper: #16312f; --ink: #f1ead9; --muted: #a7b6b4; --teal: #5cc2c9; --accent: #f08b55; --ok: #7bd39d; --bad: #ff8a80; --line: #2b4a4a; color-scheme: dark; }
body { background: var(--bg); color: var(--ink); font: 400 15px/1.55 var(--body); padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 24px 48px; }
main { max-width: 1240px; margin: 0 auto; display: grid; gap: 40px; }
h1, h2, h3 { font-family: var(--display); font-weight: 600; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(26px, 4vw, 38px); } h2 { font-size: 24px; } h3 { font-size: 17px; }
.eyebrow { font: 600 12px/1 var(--body); letter-spacing: .08em; text-transform: uppercase; color: var(--teal); }
header { display: grid; gap: 10px; border-bottom: 2px solid var(--line); padding-bottom: 20px; }
header p { margin: 0; max-width: 72ch; color: var(--muted); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 520px), 1fr)); gap: 22px; }
.panel { background: var(--paper); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; display: grid; grid-template-rows: auto 1fr; min-width: 0; }
.panel img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: #0d3a3d; }
.meta { padding: 14px 16px 16px; display: grid; gap: 8px; min-width: 0; }
.meta .top { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.num { font-variant-numeric: tabular-nums; }
.badge { font: 600 13px/1 var(--display); background: var(--teal); color: var(--paper); border-radius: 99px; padding: 5px 10px; }
.time { font: 500 13px/1 var(--body); color: var(--muted); font-variant-numeric: tabular-nums; }
.cap { font: 500 14px/1.4 var(--display); background: #f8eedb; color: #26336b; border-radius: 8px; padding: 6px 10px; }
dl { margin: 0; display: grid; grid-template-columns: 76px 1fr; gap: 4px 10px; font-size: 13.5px; }
dt { color: var(--muted); font-weight: 600; } dd { margin: 0; min-width: 0; }
.key { outline: 3px solid var(--accent); }
section { display: grid; gap: 16px; }
.rv { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); gap: 16px; }
.rv .meta { font-size: 13.5px; color: var(--muted); }
.tablewrap { overflow-x: auto; background: var(--paper); border: 1px solid var(--line); border-radius: 10px; }
table { border-collapse: collapse; width: 100%; font-size: 13.5px; min-width: 640px; }
th, td { text-align: left; padding: 7px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-weight: 600; color: var(--muted); }
td.num { white-space: nowrap; text-align: right; }
.pill { font: 600 12px/1 var(--body); border-radius: 99px; padding: 3px 9px; }
tr.ok .pill { background: color-mix(in srgb, var(--ok) 18%, transparent); color: var(--ok); }
tr.bad .pill { background: color-mix(in srgb, var(--bad) 18%, transparent); color: var(--bad); }
ul { margin: 0; padding-left: 20px; display: grid; gap: 6px; max-width: 90ch; }
</style>
<main>
<header>
  <span class="eyebrow">Soft Clay · neurological examination · part 5 of 11</span>
  <h1>Motor system of the arms: storyboard</h1>
  <p>Twelve beats, 90 s. Every still is rendered with the STAGE kit from the real scene (shared v5 patient, set and hands, the same cameras and the same solved contact poses the animation uses), at ${samples} samples, ${size[0]}×${size[1]}, the captioned version. Holds (still, no caption, for the speech added later) are listed under each beat.</p>
</header>
${notes.step0 && notes.step0.length ? `<section><h2>Step 0: the attachments</h2><ul>${notes.step0.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></section>` : ''}
${notes.changes && notes.changes.length ? `<section><h2>Changed in this round</h2><ul>${notes.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></section>` : ''}
<section>
  <h2>The beats</h2>
  <div class="grid">
${BEATS.map((b) => `    <article class="panel${b.n === 5 ? ' key' : ''}"><img src="${img(b.id)}" alt="Beat ${b.n} key frame">
      <div class="meta"><div class="top"><span class="badge">Beat ${b.n}${b.n === 5 ? ' · key beat' : ''} · ${esc(b.name || '')}</span><span class="time">${esc(b.span)} · still at ${b.t.toFixed(1)} s</span></div>
      <div class="cap">${esc(b.text)}</div>
      <dl><dt>Changes</dt><dd>${esc(b.change)}</dd><dt>Camera</dt><dd>${esc(b.camera)}</dd><dt>Sound</dt><dd>${esc(b.sound)}</dd></dl></div></article>`).join('\n')}
  </div>
</section>
${fs.existsSync(path.join(SB, 'img', 'story_vs_anim.jpg')) ? `<section><h2>Storyboard vs animation</h2><p style="margin:0;color:var(--muted);max-width:80ch">Beats 3, 5, 6, 7 and 10: the storyboard panel, the animation at the same moment rendered again from the same cameras and poses (the mean pixel difference is only grain and JPEG), and the animation at the middle of the beat's hold.</p><div class="panel"><img style="aspect-ratio:auto" src="${img('story_vs_anim')}" alt="Storyboard panels next to animation frames"></div></section>` : ''}
<section>
  <h2>Review panels (not in the video)</h2>
${groups.map((g) => `  <h3>${esc(g)}</h3>
  <div class="rv">
${REVIEW.filter((r) => r.group === g).map((r) => `    <article class="panel"><img src="${img(r.id)}" alt="${esc(r.note)}"><div class="meta">${esc(r.note)}</div></article>`).join('\n')}
  </div>`).join('\n')}
</section>
<section>
  <h2>Every solved contact</h2>
  <p style="margin:0;color:var(--muted);max-width:80ch">Smallest signed distance from the touching part's vertices to the triangles of the surface it touches, measured on the meshes of the rendered frames (negative would mean sinking in). The tone contacts are measured at several moments through the moves (smallest – largest). Each contact is solved to 0.5 mm; the rule is 0 to ${LIMIT} mm.</p>
  <div class="tablewrap"><table><thead><tr><th>Contact</th><th>Nearest point</th><th>Pad (end bone)</th><th>When</th><th>Result</th></tr></thead><tbody>
${contacts.map(row).join('\n')}
  </tbody></table></div>
</section>
<section>
  <h2>What I checked in every panel</h2>
  <ul>${notes.checks.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
</section>
<section>
  <h2>Facts and choices I had to assume</h2>
  <ul>${notes.assumptions.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
</section>
${notes.open.length ? `<section><h2>Open points for your review</h2><ul>${notes.open.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></section>` : ''}
</main>
`;
fs.writeFileSync(path.join(SB, 'storyboard.html'), html);
console.log('storyboard.html', (html.length / 1e6).toFixed(2), 'MB');
