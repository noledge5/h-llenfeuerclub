// C1, C4, C11, D3: maps per scene, figures without a grid, last map kept, speed on big maps.
const { launch, startScene, view, check } = require('../helpers.cjs');
const { png } = require('../fixtures.cjs');

const stored = (page, key) => page.evaluate((k) => { const m = JSON.parse(localStorage.getItem('eulenbach3-maps') || '{}'); return m[k]; }, key);
const shown = async (page) => (await page.textContent('#vttInfo')).split(' · ')[0];
const selected = (page) => page.$eval('#vttMapSel', s => s.options[s.selectedIndex].text);

async function brushMs(page, n = 120) {
  const bb = await page.locator('#vttCv').boundingBox();
  await page.click('#vttTools [data-tool="reveal"]');
  await page.mouse.move(bb.x + 30, bb.y + 30); await page.mouse.down();
  const t0 = Date.now();
  for (let i = 0; i < n; i++) await page.mouse.move(bb.x + 30 + (i * 6) % (bb.width - 60), bb.y + 30 + ((i * 3) % (bb.height - 60)));
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const dt = (Date.now() - t0) / n;
  await page.mouse.up(); await page.waitForTimeout(300);
  return dt;
}

module.exports = async () => {
  const { browser, page, errors } = await launch({ viewport: { width: 1500, height: 1000 } });

  // scene 0 uses "Die Gegend", a map without a grid: figures can still be placed (virtual squares)
  await startScene(page, 0); await view(page, 'tisch');
  check('C1 Gegend is shown without a grid', /Die Gegend .*ohne Raster/.test(await page.textContent('#vttInfo')));
  await page.click('#plHeroes'); await page.waitForTimeout(700);
  const heroes = (await stored(page, 'region')).tokens.filter(t => t.t === 'hero').length;
  check('C4 five heroes can be placed on a map without a grid', heroes === 5, heroes);
  await page.click('.tokbtn.foe >> nth=0'); const bb = await page.locator('#vttCv').boundingBox(); await page.mouse.click(bb.x + bb.width * 0.4, bb.y + bb.height * 0.3); await page.waitForTimeout(700);
  check('C4 a click places a foe on the gridless map', (await stored(page, 'region')).tokens.some(t => t.t === 'foe'));
  await page.click('#vttTools [data-tool="ruler"]'); await page.mouse.move(bb.x + 50, bb.y + 50); await page.mouse.down(); await page.mouse.move(bb.x + 200, bb.y + 90, { steps: 4 }); await page.mouse.up();
  check('C6 ruler says clearly that there is no scale without a grid', /kein Raster/.test(await page.textContent('#rulerOut')), await page.textContent('#rulerOut'));

  // D3: a scene with two maps starts with the first, stepping alone does not change the picture but the list tells the truth
  await startScene(page, 4); await view(page, 'tisch');
  check('D3 scene 4 starts with its first map (Halle)', (await shown(page)) === 'Halle', await shown(page));
  await page.selectOption('#vttMapSel', { label: 'Keller' }); await page.waitForTimeout(600);
  check('D3 second map can be chosen', (await shown(page)) === 'Keller');
  await view(page, 'spielen'); await page.click('#stepper [data-i="1"]'); await view(page, 'tisch');
  check('D3 stepping to another scene keeps the picture; the map list names it', (await shown(page)) === (await selected(page)), [await shown(page), await selected(page)]);
  await startScene(page, 4); await view(page, 'tisch');
  check('D3 "Szene starten" returns to the first map even if the second was shown', (await shown(page)) === 'Halle', await shown(page));
  await page.selectOption('#vttMapSel', { label: 'Keller' }); await page.waitForTimeout(600);
  await page.reload(); await page.waitForTimeout(1200); await view(page, 'tisch');
  check('A2 the map shown last stays after reload', (await shown(page)) === 'Keller', await shown(page));

  // C11: big pictures stay fluid while painting (software rendering in the test, so the limit is generous)
  await startScene(page, 1); await view(page, 'tisch');
  const msVillage = await brushMs(page);
  check('C11 Dorfplatz (2503 x 1855): brush under 25 ms per move', msVillage < 25, Math.round(msVillage));
  const big = png('map2560.png', 2560, 1440, [210, 180, 120]);
  await view(page, 'vorbereitung'); await page.setInputFiles('#newMapFile', big); await page.waitForTimeout(1200);
  // put the new map on scene 1 and show it
  await page.click('[data-scene="1"] [data-sc-map]:last-child'); await page.waitForTimeout(300);
  await view(page, 'tisch');
  await page.selectOption('#vttMapSel', { index: (await page.$$eval('#vttMapSel option', o => o.length)) - 1 }); await page.waitForTimeout(1200);
  check('C11 test map 2560 x 1440 is loaded', /Bild 2560 × 1440/.test(await page.textContent('#vttInfo')), await page.textContent('#vttInfo'));
  const ms2560 = await brushMs(page);
  check('C11 map 2560 x 1440: brush under 25 ms per move', ms2560 < 25, Math.round(ms2560));
  check('scenes: no console errors', errors.length === 0, errors);
  await browser.close();
};
