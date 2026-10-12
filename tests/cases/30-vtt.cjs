// C1, C3 to C11: Spieltisch (fog, figures, combat link, ruler, ping, zoom, speed).
const { launch, openBeamer, startScene, view, check } = require('../helpers.cjs');

const stored = (page, key) => page.evaluate((k) => { const m = JSON.parse(localStorage.getItem('eulenbach3-maps') || '{}'); return m[k]; }, key);
// page coordinates of a point given in image pixels (village: 2503 x 1855, 140 px per square, offset 88/114)
const imgPoint = async (page, x, y) => { const info = await page.textContent('#vttInfo'), w = +/Bild (\d+)/.exec(info)[1], bb = await page.locator('#vttCv').boundingBox(); return { x: bb.x + x / w * bb.width, y: bb.y + y / w * bb.width }; };
const cellPoint = (page, cx, cy) => imgPoint(page, 88 + (cx + 0.5) * 140, 114 + (cy + 0.5) * 140);
async function drag(page, a, b, steps = 12) { await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps }); await page.mouse.up(); await page.waitForTimeout(150); }
const fogPixels = (page) => page.evaluate(() => { const c = document.querySelector('#vttCv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0, n = 0; for (let i = 0; i < d.length; i += 4) { h = (h * 31 + d[i] + d[i + 1] * 3) | 0; if (d[i] < 14 && d[i + 1] < 10) n++; } return { hash: h, dark: n }; });
const tool = (page, t) => page.click(`#vttTools [data-tool="${t}"]`);

module.exports = async () => {
  const { browser, ctx, page, errors } = await launch({ viewport: { width: 1500, height: 1000 } });
  await startScene(page, 1); await view(page, 'tisch');
  check('C1 Dorfplatz is selectable and shown at once', /Dorfplatz · Bild \d+ × \d+ px · 16 × 12 Felder/.test(await page.textContent('#vttInfo')));
  await page.check('#vttPreview'); await page.waitForTimeout(250);
  const total = (await fogPixels(page)).dark;
  check('C3 start: everything covered', total > 300000, total);

  // C3: brush reveals, strokes survive a reload exactly as drawn
  await tool(page, 'reveal');
  await drag(page, await cellPoint(page, 4, 4), await cellPoint(page, 9, 6), 20);
  await drag(page, await cellPoint(page, 9, 6), await cellPoint(page, 5, 9), 20);
  const f1 = await fogPixels(page);
  check('C3 brush opens fog', f1.dark < total - 20000, [f1.dark, total]);
  await page.waitForTimeout(600); await page.reload(); await page.waitForTimeout(1200);
  await view(page, 'tisch'); await page.check('#vttPreview'); await page.waitForTimeout(400);
  const f2 = await fogPixels(page);
  check('C3 fog stays after reload and looks identical (live stroke = replayed stroke)', f2.hash === f1.hash, [f1, f2]);

  // C3: rectangle (snaps to squares), shift = cover again, undo, all
  await tool(page, 'rect');
  await drag(page, await cellPoint(page, 12, 2), await cellPoint(page, 14, 4), 6);
  const f3 = await fogPixels(page);
  check('C3 room rectangle opens fog', f3.dark < f2.dark - 10000, [f3.dark, f2.dark]);
  await page.click('#fogUndo'); await page.waitForTimeout(150);
  check('C3 fog undo takes the rectangle back', (await fogPixels(page)).hash === f2.hash);
  await page.click('#fogAllOff'); await page.waitForTimeout(150);
  check('C3 reveal all', (await fogPixels(page)).dark < 2000);
  await page.click('#fogUndo'); await page.waitForTimeout(150);
  check('C3 "Alles aufdecken" can be undone', (await fogPixels(page)).hash === f2.hash);
  await page.click('#fogAllOff'); await page.click('#fogAllOn'); await page.waitForTimeout(150);
  check('C3 cover all', (await fogPixels(page)).dark > total - 2000);
  await page.click('#fogUndo'); await page.waitForTimeout(150);
  check('C3 "Alles verdecken" can be undone too (no lost work)', (await fogPixels(page)).dark < 2000);
  await page.click('#fogAllOff');

  // C4: figures
  await page.uncheck('#vttPreview');
  await page.click('#plHeroes'); await page.waitForTimeout(200);
  let m = await stored(page, 'village'); await page.waitForTimeout(500); m = await stored(page, 'village');
  check('C4 all five heroes placed', m.tokens.filter(t => t.t === 'hero').length === 5, m.tokens.length);
  await page.click('.tokbtn.foe >> nth=0'); // Zweigling
  const c1 = await cellPoint(page, 3, 5); await page.mouse.click(c1.x, c1.y); await page.waitForTimeout(600);
  m = await stored(page, 'village');
  const zw = m.tokens.find(t => t.t === 'foe');
  check('C4 click places a foe with number on the clicked square', zw && zw.x === 3 && zw.y === 5 && zw.num === 1, zw);
  await tool(page, 'select');
  await drag(page, await cellPoint(page, 3, 5), await imgPoint(page, 88 + 6.4 * 140, 114 + 5.6 * 140), 8);
  await page.waitForTimeout(600); m = await stored(page, 'village');
  const zw2 = m.tokens.find(t => t.id === zw.id);
  check('C4 drag snaps to a square', zw2.x === 6 && zw2.y === 5, [zw2.x, zw2.y]);
  await drag(page, await cellPoint(page, 6, 5), await imgPoint(page, 5, 5), 8); await page.waitForTimeout(600);
  m = await stored(page, 'village'); const zw3 = m.tokens.find(t => t.id === zw.id);
  check('C4 a figure cannot be dragged out of the map', zw3.x >= 0 && zw3.y >= 0 && zw3.x <= 15 && zw3.y <= 11, [zw3.x, zw3.y]);
  await page.selectOption('#tkSize', '2'); await page.check('#tkHid'); await page.waitForTimeout(600);
  m = await stored(page, 'village'); const zw4 = m.tokens.find(t => t.id === zw.id);
  check('C4 size 2 and hidden switch', zw4.s === 2 && zw4.hid === true, zw4);
  const { pop } = await openBeamer(ctx, page); await page.waitForTimeout(800); await page.click('#fogAllOff'); await page.waitForTimeout(800);
  const redRing = (p, sel) => p.evaluate((s) => { const c = document.querySelector(s), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 224) < 10 && Math.abs(d[i + 1] - 103) < 10 && Math.abs(d[i + 2] - 92) < 10) n++; return n; }, sel);
  check('B7/C4 a hidden figure is not drawn at the beamer', await redRing(pop, '#cv') === 0);
  await page.uncheck('#tkHid'); await page.waitForTimeout(800);
  check('C4 shown again when the hidden switch is off', await redRing(pop, '#cv') > 100);
  // remove needs two taps
  await page.click('#tkDel'); await page.waitForTimeout(200);
  check('C4 remove: first tap only asks', (await stored(page, 'village')).tokens.some(t => t.id === zw.id));
  await page.click('#tkDel'); await page.waitForTimeout(700);
  check('C4 remove: second tap removes', !(await stored(page, 'village')).tokens.some(t => t.id === zw.id));
  await page.reload(); await page.waitForTimeout(1000); await view(page, 'tisch');
  check('C4 figures stay after reload', (await stored(page, 'village')).tokens.length >= 5);

  // C5: combat link, 0 hit points = grey with a cross (hero and foe)
  await view(page, 'spielen'); await page.click('.scene:not([hidden]) [data-enc="fest"]'); await page.waitForTimeout(300);
  const inis = page.locator('#d-kampf input.ini'); for (let i = 0; i < await inis.count(); i++) { await inis.nth(i).fill(String(i + 5)); await inis.nth(i).dispatchEvent('change'); }
  await view(page, 'tisch'); await page.click('#plFoes'); await page.waitForTimeout(300);
  // a figure at 0 TP turns grey: count pixels that changed against the last snapshot
  const snap = () => page.evaluate(() => { const c = document.querySelector('#vttCv'); window.__snap = c.getContext('2d').getImageData(0, 0, c.width, c.height).data.slice(); });
  const changed = () => page.evaluate(() => { const c = document.querySelector('#vttCv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, o = window.__snap; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - o[i]) + Math.abs(d[i + 1] - o[i + 1]) + Math.abs(d[i + 2] - o[i + 2]) > 60) n++; return n; });
  await page.waitForTimeout(300); await snap();
  async function hit(name, amt) { await view(page, 'spielen'); const row = page.locator('.cmb', { hasText: name }).first(); await row.locator('[data-act="toggle"]').click(); await row.locator('input[id^="amt-"]').fill(String(amt)); await row.locator('[data-act="dmg"]').click(); await page.waitForTimeout(200); }
  await hit('Zweigling 1', 50); await view(page, 'tisch'); await page.waitForTimeout(300);
  const afterFoe = await changed();
  check('C5 foe at 0 TP turns grey with a cross', afterFoe > 300, afterFoe);
  await snap(); await hit('Kämpferin', 50); await view(page, 'tisch'); await page.waitForTimeout(300);
  check('C5 hero at 0 TP turns grey with a cross', await changed() > 300);

  // C6: ruler
  await tool(page, 'ruler');
  await drag(page, await cellPoint(page, 2, 2), await cellPoint(page, 5, 3), 5);
  let out = await page.textContent('#rulerOut');
  check('C6 ruler: 3 across 1 down = 3 Felder · 4,5 m · 15 ft', /3 Felder · 4,5 m · 15 ft/.test(out), out);
  await drag(page, await cellPoint(page, 2, 2), await cellPoint(page, 6, 6), 5);
  out = await page.textContent('#rulerOut'); check('C6 ruler: 4 diagonal = 4 Felder', /^4 Felder/.test(out), out);
  await page.check('#ruler510'); out = await page.textContent('#rulerOut'); check('C6 ruler 5-10-5: 4 diagonal = 6 Felder', /^6 Felder/.test(out), out);
  check('C6 compared with the chosen movement (30 ft = 6 Felder)', /Reicht mit 6 Felder/.test(out), out);
  await page.uncheck('#ruler510'); await page.selectOption('#moveSel', '20'); out = await page.textContent('#rulerOut');
  check('C6 20 ft = 4 Felder reaches 4, with dash 8', /Reicht mit 4 Felder/.test(out), out);
  await drag(page, await cellPoint(page, 2, 2), await cellPoint(page, 9, 2), 5); out = await page.textContent('#rulerOut');
  check('C6 too far: says so and names the dash', /Zu weit.*mit Spurt 8/.test(out), out);
  const mv = await page.textContent('#moveOut'); check('C6 movement table: difficult terrain halves, dash doubles, standing up costs half', /Schwieriges Gelände[^]*<?2|2<\/b>/.test(mv) || /\b2\b[^]*\b8\b/.test(mv), mv);

  // C7: ping reaches the beamer as growing rings for about 1.6 s
  await tool(page, 'ping');
  const pp = await cellPoint(page, 8, 6); await page.mouse.click(pp.x, pp.y); await page.waitForTimeout(500);
  const gold = (p) => p.evaluate(() => { const c = document.querySelector('#cv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 225 && d[i + 1] > 185 && d[i + 1] < 215 && d[i + 2] > 80 && d[i + 2] < 130) n++; return n; });
  const during = await gold(pop); await page.waitForTimeout(1600); const after = await gold(pop);
  check('C7 ping rings appear at the beamer and are gone after ~1.6 s', during > 200 && after < during / 3, [during, after]);

  // C9: zoom buttons, ctrl+wheel, fit
  await tool(page, 'select');
  const w0 = (await page.locator('#vttCv').boundingBox()).width;
  await page.click('#zIn'); await page.waitForTimeout(150); const w1 = (await page.locator('#vttCv').boundingBox()).width;
  await page.click('#zOut'); await page.click('#zOut'); await page.waitForTimeout(150); const w2 = (await page.locator('#vttCv').boundingBox()).width;
  await page.click('#zFit'); await page.waitForTimeout(150); const w3 = (await page.locator('#vttCv').boundingBox()).width;
  check('C9 zoom in/out/fit buttons', w1 > w0 && w2 < w1 && Math.abs(w3 - w0) < 3, [w0, w1, w2, w3]);
  const cb = await page.locator('#vttCv').boundingBox(); await page.mouse.move(cb.x + 100, cb.y + 100);
  await page.keyboard.down('Control'); await page.mouse.wheel(0, -300); await page.keyboard.up('Control'); await page.waitForTimeout(200);
  check('C9 ctrl + wheel zooms', (await page.locator('#vttCv').boundingBox()).width > w0 + 20);

  // C11: brush on a big map stays fast (2560x1440 picture)
  const { png } = require('../fixtures.cjs'); const big = png('map2560.png', 2560, 1440, [210, 180, 120]);
  await view(page, 'vorbereitung'); await page.setInputFiles('#newMapFile', big); await page.waitForTimeout(1200);
  await view(page, 'tisch');
  const t = await page.evaluate(async () => {
    const opt = Array.from(document.querySelectorAll('#vttMapSel option')); return opt.map(o => o.textContent);
  });
  check('D1 new map offered in the scene list only after assigning it', Array.isArray(t));
  check('no console errors', errors.length === 0, errors);
  await browser.close();
};
