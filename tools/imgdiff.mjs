// tools/imgdiff.mjs: image helpers for the checks, run in a browser page (no image packages needed on the PC or here):
// diff(a, b) -> { meanDiff (0-255, RGB), maxDiff, differingPixels, pixels }, and side-by-side sheets.
import fs from 'node:fs';
export const dataUrl = (file) => `data:image/${file.endsWith('.png') ? 'png' : 'jpeg'};base64,` + fs.readFileSync(file).toString('base64');
export const diff = (page, a, b) => page.evaluate(async ({ a, b }) => {
  const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
  const [A, B] = [await load(a), await load(b)], w = A.width, h = A.height;
  if (B.width !== w || B.height !== h) return { error: `sizes differ: ${w}x${h} vs ${B.width}x${B.height}` };
  const px = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
  const pa = px(A), pb = px(B); let sum = 0, max = 0, n = 0;
  for (let i = 0; i < pa.length; i += 4) { let d = 0; for (let k = 0; k < 3; k++) { const e = Math.abs(pa[i + k] - pb[i + k]); sum += e; if (e > max) max = e; d = Math.max(d, e); } if (d > 0) n++; }
  return { meanDiff: +(sum / (w * h * 3)).toFixed(4), maxDiff: max, differingPixels: n, pixels: w * h };
}, { a, b });
