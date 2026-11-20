// tools/pw.mjs: opens the project's pages in headless Chrome with no web server and no network.
// Every request to http://cns5.local/ is answered from the project folder; the three.js CDN URL in the import map is
// answered from node_modules/three, and the Google Fonts URLs from vendor/fonts (so a render never depends on the
// network and is identical on every machine). Folder paths come from fileURLToPath(import.meta.url) (Windows-safe).
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ORIGIN = 'http://cns5.local';
const require = createRequire(import.meta.url);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain', '.md': 'text/plain' };
const file = (p) => ({ status: 200, contentType: TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(p) });

async function loadPlaywright() {
  // this cloud machine has a global `playwright` with its own Chromium; a PC uses playwright-core with its installed Chrome
  try { const m = await import('playwright'); return { pw: m.default || m, own: true }; } catch (e) { /* not there */ }
  const m = require('playwright-core'); return { pw: m, own: false };
}

// gpu: true on a machine with a graphics card (the PC), false = software WebGL (SwiftShader, cloud)
export async function launch({ gpu = true } = {}) {
  const { pw, own } = await loadPlaywright();
  const args = gpu
    ? ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=default', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--autoplay-policy=no-user-gesture-required']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-background-timer-throttling', '--autoplay-policy=no-user-gesture-required'];
  const opts = { headless: true, args };
  if (!own) opts.channel = process.env.CHROME_CHANNEL || 'chrome';
  if (process.env.CHROME_PATH) { opts.executablePath = process.env.CHROME_PATH; delete opts.channel; }
  return pw.chromium.launch(opts);
}

export async function openPage(browser, url, { width = 1920, height = 1080, log = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: Math.min(width, 1920), height: Math.min(height, 1080) }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const threeDir = path.join(ROOT, 'node_modules', 'three');
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.origin === ORIGIN) {
      const p = path.join(ROOT, decodeURIComponent(u.pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return route.fulfill({ status: 404, body: 'not found: ' + u.pathname });
      return route.fulfill(file(p));
    }
    if (u.hostname === 'cdn.jsdelivr.net' && u.pathname.startsWith('/npm/three@0.187.0/')) {
      const p = path.join(threeDir, u.pathname.replace('/npm/three@0.187.0/', ''));
      if (fs.existsSync(p)) return route.fulfill(file(p));
    }
    if (u.hostname === 'fonts.googleapis.com') {
      const css = fs.readFileSync(path.join(ROOT, 'vendor/fonts/fredoka.css'), 'utf8').replace(/https:\/\/fonts\.gstatic\.com\/s\/fredoka\/v\d+\//g, ORIGIN + '/vendor/fonts/');
      return route.fulfill({ status: 200, contentType: 'text/css', body: css });
    }
    if (u.hostname === 'fonts.gstatic.com') { const p = path.join(ROOT, 'vendor/fonts', path.basename(u.pathname)); if (fs.existsSync(p)) return route.fulfill(file(p)); }
    return route.abort();
  });
  if (log) {
    page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || m.type() === 'warning' || t.startsWith('[cns5]')) console.log('  page:', t.slice(0, 400)); });
    page.on('pageerror', (e) => console.log('  page error:', e.message));
  }
  await page.goto(ORIGIN + url, { waitUntil: 'commit', timeout: 0 });
  return page;
}
