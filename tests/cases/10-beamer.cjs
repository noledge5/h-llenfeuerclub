// B1, B2, B3, B5, B7, B8: the beamer window as a second page, reload of either side, no DM layer.
const { launch, openBeamer, startScene, view, check, OUT } = require('../helpers.cjs');
const { png } = require('../fixtures.cjs');

const statusText = (page) => page.textContent('#beamerStat');
async function waitStatus(page, re, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (re.test(await statusText(page))) return true; await page.waitForTimeout(150); }
  return false;
}
// brightest red value in a block of the beamer canvas: fog is nearly black (red 10), the open map is parchment
async function brightest(pop) {
  return pop.evaluate(() => { const c = document.querySelector('#cv'); const d = c.getContext('2d').getImageData(900, 480, 120, 120).data; let m = 0; for (let i = 0; i < d.length; i += 4) m = Math.max(m, d[i]); return m; });
}
async function beamerHasMap(pop) {
  // the map canvas is drawn once state and picture arrived: #mapWait is hidden and the centre is not the empty background
  return pop.evaluate(() => { const w = document.querySelector('#mapWait'); return !!w && w.hidden; });
}

module.exports = async () => {
  const { browser, ctx, page, errors } = await launch();
  await startScene(page, 1);
  await view(page, 'tisch');
  const { pop, errors: popErrors } = await openBeamer(ctx, page);

  check('B1 beamer is a real page of the same file', /#beamer$/.test(pop.url()), pop.url());
  check('B1 DM shows the beamer as connected', await waitStatus(page, /verbunden/i), await statusText(page));
  check('B2 stage is 1920x1080', await pop.evaluate(() => { const s = document.querySelector('#stage'); return s.offsetWidth === 1920 && s.offsetHeight === 1080; }));
  check('B5 map arrives', await pop.waitForFunction(() => { const w = document.querySelector('#mapWait'); return w && w.hidden; }, null, { timeout: 5000 }).then(() => true, () => false));

  // second click finds the existing window
  const n = ctx.pages().length;
  await page.click('#beamerBtn'); await page.waitForTimeout(1200);
  check('B1 second click opens no second window', ctx.pages().length === n, ctx.pages().length);
  check('B1 still connected after second click', await waitStatus(page, /verbunden/i));

  // B5: DM reload, the beamer finds the DM again by itself
  await page.reload(); await page.waitForTimeout(1200);
  check('B5 DM reload: beamer reconnects without a click', await waitStatus(page, /verbunden/i, 7000), await statusText(page));
  await view(page, 'tisch');
  await page.click('#fogAllOff'); await page.waitForTimeout(800);
  const afterReveal = await brightest(pop);
  check('B5 DM reload: new changes reach the beamer (fog opened)', afterReveal > 100, afterReveal);
  check('B5 DM reload: no console errors', errors.filter(e => !/favicon/.test(e)).length === 0, errors);

  // B5: beamer reload
  await pop.reload(); await pop.waitForTimeout(1500);
  check('B5 beamer reload: page is the beamer again', await pop.evaluate(() => !!document.querySelector('#stage')));
  check('B5 beamer reload: map comes back by itself', await pop.waitForFunction(() => { const w = document.querySelector('#mapWait'); return w && w.hidden; }, null, { timeout: 6000 }).then(() => true, () => false));
  const px = await brightest(pop);
  check('B5 beamer reload: fog state kept (revealed)', px > 100, px);

  // B3: modes switch at once
  const modes = { title: '#vTitle', pause: '#vPause', mood: '#vMood', map: '#vMap' };
  for (const [m, sel] of Object.entries(modes)) {
    await view(page, 'tisch'); await page.click(`[data-stage="${m}"]`); await page.waitForTimeout(250);
    check('B3 mode ' + m, await pop.evaluate((s) => !document.querySelector(s).hidden, sel));
  }

  // B8: resize and move keep the stage fitted and centred
  await pop.setViewportSize({ width: 960, height: 540 }); await pop.waitForTimeout(300);
  const tf = await pop.evaluate(() => { const r = document.querySelector('#stage').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), Math.round(r.left), Math.round(r.top)]; });
  check('B8 half size: stage scaled to 960x540 and centred', tf[0] === 960 && tf[1] === 540 && tf[2] === 0 && tf[3] === 0, tf);
  await pop.setViewportSize({ width: 1000, height: 1000 }); await pop.waitForTimeout(300);
  const tf2 = await pop.evaluate(() => { const r = document.querySelector('#stage').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), Math.round(r.left), Math.round(r.top)]; });
  check('B8 square window: letterboxed', tf2[0] === 1000 && tf2[1] === 563 && tf2[3] === 219, tf2);

  // closing the beamer: status off, button opens a new one
  await pop.close(); await page.waitForTimeout(2200);
  check('B1 closed beamer shows "aus"', /aus/i.test(await statusText(page)), await statusText(page));
  const { pop: pop2 } = await openBeamer(ctx, page);
  check('B1 button reopens after closing', await waitStatus(page, /verbunden/i), await statusText(page));
  check('B1 no errors in beamer', popErrors.length === 0, popErrors);
  await pop2.close();

  // popup blocker: window.open returns null -> a clear hint
  await page.evaluate(() => { window.open = () => null; });
  await page.click('#beamerBtn'); await page.waitForTimeout(300);
  check('B1 blocked popup gives a hint', /Pop-ups|blockiert/i.test(await page.textContent('#toast')), await page.textContent('#toast'));
  await browser.close();
};
