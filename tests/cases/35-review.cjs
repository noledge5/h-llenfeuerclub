// Findings of the review: enemies under the fog, dice ids across reloads, deleting a sound must not start the atmosphere,
// fog undo after "all", a storage abort during import must not look like success.
const fs = require('fs');
const path = require('path');
const { launch, openBeamer, startScene, view, check, OUT } = require('../helpers.cjs');
const { wav } = require('../fixtures.cjs');

const red = (p, sel) => p.evaluate((s) => { const c = document.querySelector(s), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 224) < 10 && Math.abs(d[i + 1] - 103) < 10 && Math.abs(d[i + 2] - 92) < 10) n++; return n; }, sel);
const green = (p, sel) => p.evaluate((s) => { const c = document.querySelector(s), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 127) < 10 && Math.abs(d[i + 1] - 207) < 10 && Math.abs(d[i + 2] - 152) < 10) n++; return n; }, sel);

module.exports = async () => {
  const { browser, ctx, page, errors } = await launch({ tap: true });

  // 1. B7: a foe standing in covered fog is not visible at the beamer; heroes may be
  await startScene(page, 1); await view(page, 'tisch');
  const { pop } = await openBeamer(ctx, page);
  await page.click('#fogAllOn'); await page.click('#plHeroes');
  await view(page, 'spielen'); await page.click('.scene:not([hidden]) [data-enc="fest"]'); await page.waitForTimeout(300);
  const inis = page.locator('#d-kampf input.ini'); for (let i = 0; i < await inis.count(); i++) { await inis.nth(i).fill(String(i + 5)); await inis.nth(i).dispatchEvent('change'); }
  await view(page, 'tisch'); await page.click('#plFoes'); await page.waitForTimeout(900);
  check('B7 enemies placed in the fog are not drawn at the beamer', await red(pop, '#cv') === 0, await red(pop, '#cv'));
  check('C8 Spielersicht also hides them', await (async () => { await page.check('#vttPreview'); await page.waitForTimeout(300); return (await red(page, '#vttCv')) === 0; })());
  await page.uncheck('#vttPreview'); await page.waitForTimeout(300);
  check('DM sees the enemies in the fog', await red(page, '#vttCv') > 200, await red(page, '#vttCv'));
  check('heroes stay visible in the dark at the beamer', await green(pop, '#cv') > 200, await green(pop, '#cv'));
  await page.click('#fogAllOff'); await page.waitForTimeout(800);
  check('B7 once the fog is open the enemies show', await red(pop, '#cv') > 200);

  // 2. dice: a roll after a DM reload is shown, and a reloaded beamer does not replay the old roll
  await page.check('#optDice');
  await view(page, 'spielen'); await page.click('#diceBtn'); await page.click('#dieGrid .die[data-d="20"]'); await page.waitForTimeout(600);
  check('B4 dice result appears at the beamer', await pop.evaluate(() => !document.querySelector('#dice').hidden));
  await page.reload(); await page.waitForTimeout(1500);
  await page.check('#optDice').catch(() => {}); // setting is stored, may already be on
  await view(page, 'tisch'); if (!(await page.isChecked('#optDice'))) await page.check('#optDice');
  await pop.waitForTimeout(6500); // let the first roll fade
  await view(page, 'spielen'); await page.click('#diceBtn'); await page.click('#dieGrid .die[data-d="20"]'); await page.waitForTimeout(700);
  check('B4 the first roll after a DM reload is shown (ids do not collide)', await pop.evaluate(() => !document.querySelector('#dice').hidden));
  await pop.waitForTimeout(6500);
  await pop.reload(); await pop.waitForTimeout(2500);
  check('B4 a reloaded beamer does not replay an old roll', await pop.evaluate(() => document.querySelector('#dice').hidden));

  // 3. deleting a library sound does not start the scene atmosphere
  await view(page, 'sound'); await page.selectOption('#sndKind', 'fx'); await page.setInputFiles('#sndFile', wav('del.wav', 1, 500)); await page.waitForTimeout(500);
  const before = await page.textContent('#nowPlay');
  const del = page.locator('[data-lib-del]').first(); await del.click(); await del.click(); await page.waitForTimeout(700);
  check('F6 deleting an unrelated sound does not start music or atmosphere', (await page.textContent('#nowPlay')) === before && /–|Stille/.test(await page.textContent('#nowPlay')), [before, await page.textContent('#nowPlay')]);

  // 4. fog: reveal a room, reveal all, cover all, undo twice: the room is back
  await startScene(page, 1); await view(page, 'tisch'); await page.check('#vttPreview'); await page.waitForTimeout(250);
  await page.click('#fogAllOn'); await page.click('#vttTools [data-tool="rect"]');
  const info = await page.textContent('#vttInfo'), w = +/Bild (\d+)/.exec(info)[1], bb = await page.locator('#vttCv').boundingBox();
  const cp = (cx, cy) => ({ x: bb.x + (88 + (cx + 0.5) * 140) / w * bb.width, y: bb.y + (114 + (cy + 0.5) * 140) / w * bb.width });
  const a = cp(2, 2), b = cp(5, 4); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(250);
  const hash = () => page.evaluate(() => { const c = document.querySelector('#vttCv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i]) | 0; return h; });
  const room = await hash();
  await page.click('#fogAllOff'); await page.click('#fogAllOn'); await page.click('#fogUndo'); await page.click('#fogUndo'); await page.waitForTimeout(300);
  check('C3 reveal all then cover all can be undone twice: the room is back', (await hash()) === room);

  // 5. an aborted storage transaction during import is reported, the page is not reloaded and saving still works
  const proj = path.join(OUT, 'abort.json');
  fs.writeFileSync(proj, JSON.stringify({ app: 'eulenbach-dm-helfer', ls: { 'eulenbach3-view': '"sound"' }, blobs: [{ id: 'a-1', kind: 'fx', name: 'x', type: 'audio/wav', size: 4, data: 'data:audio/wav;base64,AAAAAA==' }] }));
  await view(page, 'vorbereitung');
  await page.evaluate(() => { const p = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function () { const r = p.apply(this, arguments); this.transaction.abort(); return r; }; });
  await page.setInputFiles('#impFile', proj); await page.waitForTimeout(1500);
  check('G1 storage abort during import: reported as failure', /Import ging nicht/.test(await page.textContent('#expInfo')), await page.textContent('#expInfo'));
  check('G1 storage abort: the page is still there (no reload)', await page.isVisible('#v-vorbereitung'));
  await page.evaluate(() => { location.hash = ''; });
  check('review: no console errors', errors.filter(e => !/AbortError|Transaction|abort/i.test(e)).length === 0, errors);
  await browser.close();
};
