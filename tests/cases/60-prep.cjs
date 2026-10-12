// D1 to D5: own maps, calibration, several maps per scene, mood picture, start mode, measures table.
const { launch, startScene, view, check } = require('../helpers.cjs');
const { png } = require('../fixtures.cjs');

module.exports = async () => {
  const { browser, ctx, page, errors } = await launch({ viewport: { width: 1500, height: 1000 } });
  await view(page, 'vorbereitung');

  // D5: measures table (ideal picture sizes and what the beamer shows)
  const math = (await page.textContent('#prepMath')).replace(/\s/g, '');
  check('D5 Dorfplatz 2240 x 1680 -> 90 px per square at the beamer', /Dorfplatz16×12140px2240×16801440×108090px/.test(math), math.slice(300, 520));
  check('D5 Halle 1400 x 1400 -> 108 px', /Halle10×10140px1400×14001080×1080108px/.test(math));
  check('D5 Keller 1080 x 1080 -> 180 px', /Keller6×6180px1080×10801080×1080180px/.test(math));
  check('D5 Turmstube 1080 x 1080 -> 180 px', /Turmstube6×6180px1080×10801080×1080180px/.test(math));
  check('D5 movement table from the hero and monster speeds (9 m = 6 squares, 3 difficult, 12 dash)', /Kämpferin6312/.test(math), math.slice(-600));

  // D1/D2: own map for the Halle, calibration live verdict
  const big = png('own-1400.png', 1400, 1400, [200, 170, 110]);
  await page.setInputFiles('[data-up-map="hall"]', big); await page.waitForTimeout(900);
  let card = await page.textContent('[data-map="hall"]');
  check('D1 own picture replaces the sketch and says so', /eigenes Bild/.test(card) && /1400 × 1400 px/.test(card), card.slice(0, 200));
  check('D2 live verdict for 10 x 10 at 1400 px: sharp, size at the beamer', /140 px pro Feld \(sehr scharf\)\. Am Beamer 108 px pro Feld/.test(card), card.slice(-300));
  await page.fill('[data-map="hall"] [data-cal="cols"]', '14'); await page.dispatchEvent('[data-map="hall"] [data-cal="cols"]', 'change'); await page.waitForTimeout(300);
  card = await page.textContent('[data-map="hall"]');
  check('D2 fewer pixels per square -> verdict follows (100 px = good enough)', /100 px pro Feld \(gut genug\)/.test(card), card.slice(-300));
  await page.fill('[data-map="hall"] [data-cal="cols"]', '20'); await page.dispatchEvent('[data-map="hall"] [data-cal="cols"]', 'change'); await page.waitForTimeout(300);
  card = await page.textContent('[data-map="hall"]');
  check('D2 70 px per square = too small, with the recommended picture size', /70 px pro Feld \(zu klein, wird unscharf\)/.test(card) && /Ideal für 20 × 20 Felder: 2800 × 2800/.test(card), card.slice(-300));
  await page.fill('[data-map="hall"] [data-cal="cols"]', '10'); await page.dispatchEvent('[data-map="hall"] [data-cal="cols"]', 'change');
  await page.fill('[data-map="hall"] [data-cal="ox"]', '35'); await page.dispatchEvent('[data-map="hall"] [data-cal="ox"]', 'change'); await page.waitForTimeout(300);
  // the grid follows the offset on the Spieltisch
  await startScene(page, 5); await view(page, 'tisch'); await page.check('#vttPreview'); await page.click('#fogAllOff'); await page.waitForTimeout(500);
  const info = await page.textContent('#vttInfo');
  check('D2 own map on the Spieltisch with the calibrated grid', /Halle · Bild 1400 × 1400 px · 10 × 10 Felder · 140 px pro Feld · am Beamer 108 px/.test(info), info);
  const lineX = await page.evaluate(() => { const c = document.querySelector('#vttCv'), z = c.width / 1400, g = c.getContext('2d'); const y = Math.round(700 * z); const row = g.getImageData(0, y, c.width, 1).data; const dark = []; for (let x = 0; x < c.width; x++) if (row[x * 4] < 140) dark.push(Math.round(x / z)); return dark; });
  check('D2 the first vertical grid line sits at the offset (x = 35)', lineX.some(x => Math.abs(x - 35) <= 2), lineX.slice(0, 6));
  await page.reload(); await page.waitForTimeout(1000); await view(page, 'tisch');
  check('D4 own picture survives the reload (stored in IndexedDB)', /Bild 1400 × 1400/.test(await page.textContent('#vttInfo')));

  // D3: second map for a scene, first one starts; mood picture warning if not 16:9; start mode per scene
  await view(page, 'vorbereitung');
  await page.click('[data-scene="5"] [data-sc-map="cellar"]'); await page.waitForTimeout(200);
  check('D3 several maps per scene: the chips show both', await page.getAttribute('[data-scene="5"] [data-sc-map="cellar"]', 'aria-pressed') === 'true' && await page.getAttribute('[data-scene="5"] [data-sc-map="hall"]', 'aria-pressed') === 'true');
  await page.locator('[data-up-mood="5"]').setInputFiles(png('mood43.png', 1200, 900, [90, 120, 200])); await page.waitForTimeout(700);
  check('D3 mood picture that is not 16:9 gets a warning', /nicht 16:9/.test(await page.textContent('#toast')), await page.textContent('#toast'));
  await page.selectOption('[data-sc-stage="5"]', 'map'); await page.waitForTimeout(200);
  await startScene(page, 5); await page.waitForTimeout(500);
  check('D3 beamer start "Karte" is kept although a mood picture exists', await page.evaluate(() => document.querySelector('[data-stage="map"]').classList.contains('quiet') === false));
  await view(page, 'vorbereitung'); await page.selectOption('[data-sc-stage="5"]', ''); await page.waitForTimeout(200);
  await startScene(page, 5); await page.waitForTimeout(500);
  check('D3 start "automatisch": mood picture first', await page.evaluate(() => document.querySelector('[data-stage="mood"]').classList.contains('quiet') === false));

  // D1: reset to the sketch and delete a custom map (two taps)
  await view(page, 'vorbereitung');
  await page.click('[data-map-reset="hall"]'); await page.waitForTimeout(500);
  check('D1 back to the sketch', /mitgelieferte Skizze/.test(await page.textContent('[data-map="hall"]')));
  await page.setInputFiles('#newMapFile', png('extra.png', 1600, 1200, [120, 160, 90])); await page.waitForTimeout(900);
  const nMaps = await page.locator('[data-map]').count();
  check('D1 a new map can be added (6th card), columns guessed from the width', nMaps === 6 && /1600 × 1200 px/.test(await page.locator('[data-map]').last().textContent()), nMaps);
  const del = page.locator('[data-map-del]'); await del.click(); check('D1 deleting a map asks first', /Sicher/.test(await del.textContent())); await del.click(); await page.waitForTimeout(400);
  check('D1 deleting a map removes it', (await page.locator('[data-map]').count()) === 5);
  check('prep: no console errors', errors.length === 0, errors);
  await browser.close();
};
