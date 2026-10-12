// A1, A2: offline start, no console errors, all tabs reachable.
const { launch, view, check } = require('../helpers.cjs');
module.exports = async () => {
  const { browser, page, errors, requests } = await launch();
  for (const v of ['spielen', 'tisch', 'sound', 'karten', 'heldinnen', 'wissen', 'vorbereitung']) {
    await view(page, v);
    check('A2 tab ' + v + ' visible', await page.isVisible('#v-' + v));
  }
  check('A1 no network requests', requests.length === 0, requests);
  check('A1 no console errors', errors.length === 0, errors);
  await view(page, 'sound'); await page.reload(); await page.waitForTimeout(800);
  check('A2 last tab survives reload', await page.isVisible('#v-sound'));
  await browser.close();
};
