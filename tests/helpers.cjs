// Small helpers for the Playwright suite. The app is a single file opened from file://.
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const FILE = 'file://' + path.resolve(__dirname, '..', 'Eulenbach_DM-Helfer_2.0.html');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const results = { pass: 0, fail: [] };
function check(name, cond, detail) {
  if (cond) { results.pass++; console.log('  ok   ' + name); }
  else { results.fail.push(name + (detail !== undefined ? ' -> ' + JSON.stringify(detail) : '')); console.log('  FAIL ' + name + (detail !== undefined ? ' -> ' + JSON.stringify(detail) : '')); }
}
const AUDIO_TAP = fs.readFileSync(path.join(__dirname, 'audiotap.js'), 'utf8');
// opts: { viewport, tap (audio level meter), hash }
async function launch(opts = {}) {
  const browser = await pw.chromium.launch({ channel: 'chromium', args: ['--autoplay-policy=document-user-activation-required'] });
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1400, height: 1000 }, acceptDownloads: true, hasTouch: !!opts.touch });
  if (opts.tap) await ctx.addInitScript({ content: AUDIO_TAP });
  const requests = [];
  ctx.on('request', r => { const u = r.url(); if (!/^(data|blob|about):/.test(u) && !u.startsWith('file://')) requests.push(u); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(FILE);
  await page.waitForFunction(() => document.querySelector('#vttInfo') && document.querySelector('#vttInfo').textContent !== '', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
  return { browser, ctx, page, errors, requests };
}
// Click the beamer button and wait for the popup page.
async function openBeamer(ctx, page) {
  const [pop] = await Promise.all([ctx.waitForEvent('page'), page.click('#beamerBtn')]);
  const errors = [];
  pop.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  pop.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await pop.setViewportSize({ width: 1920, height: 1080 });
  await pop.waitForFunction(() => document.querySelector('#stage'), null, { timeout: 8000 }).catch(() => {});
  await pop.waitForTimeout(500);
  return { pop, errors };
}
async function startScene(page, i) {
  await page.click('nav [data-view="spielen"]');
  await page.click(`#stepper [data-i="${i}"]`);
  await page.click(`.scene:not([hidden]) [data-start="${i}"]`);
  await page.waitForTimeout(400);
}
async function view(page, v) { await page.click(`nav [data-view="${v}"]`); await page.waitForTimeout(250); }
// Mean colour of a rectangle of a canvas/page screenshot is awkward; read pixels from the canvas instead.
async function pixel(page, sel, fx, fy) {
  return page.evaluate(([s, x, y]) => { const c = document.querySelector(s); const g = c.getContext('2d'); const d = g.getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data; return [d[0], d[1], d[2], d[3]]; }, [sel, fx, fy]);
}
module.exports = { pw, FILE, OUT, launch, openBeamer, startScene, view, pixel, check, results };
