// C1, C2, C8, C10, B7: built-in sketches render cleanly, the grid switches off, the DM layer never reaches the beamer.
const { launch, openBeamer, startScene, view, check } = require('../helpers.cjs');

// counts pixels of a canvas that are (nearly) pure black / that match a colour within a tolerance
const countPixels = (page, sel, test) => page.evaluate(([s, src]) => {
  const c = document.querySelector(s), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, f = new Function('r', 'g', 'b', 'a', 'return ' + src);
  let n = 0; for (let i = 0; i < d.length; i += 4) if (f(d[i], d[i + 1], d[i + 2], d[i + 3])) n++; return n;
}, [sel, test]);

module.exports = async () => {
  const { browser, ctx, page, errors } = await launch({ viewport: { width: 1500, height: 1000 } });
  await startScene(page, 4); // Wachturm: Halle + Keller
  await view(page, 'tisch');
  await page.selectOption('#vttMapSel', { label: 'Keller' }); await page.waitForTimeout(700);
  await page.check('#vttPreview'); await page.click('#fogAllOff'); await page.waitForTimeout(300);
  check('C1 Keller: no black patches (door gaps use the paper colour)', await countPixels(page, '#vttCv', 'r<12&&g<12&&b<12&&a>200') === 0);
  const info = await page.textContent('#vttInfo');
  check('C10 info line shows size, fields, px per field, beamer px', /Bild \d+ × \d+ px · 6 × 6 Felder · 140 px pro Feld · am Beamer \d+ px pro Feld/.test(info), info);

  // C2: grid off removes every grid line (the old sketch had its own grid baked into the picture)
  await startScene(page, 1); await view(page, 'tisch');
  await page.check('#vttPreview'); await page.click('#fogAllOff'); await page.waitForTimeout(400);
  const gridDark = () => page.evaluate(() => {
    const c = document.querySelector('#vttCv'), z = c.width / 2503, g = c.getContext('2d');
    // a free strip of ground (squares x 8..11, y 10.4..11.6), crossed by grid lines when the grid is on
    const x0 = Math.round((88 + 8.2 * 140) * z), x1 = Math.round((88 + 11.8 * 140) * z), y = Math.round((114 + 11.0 * 140) * z);
    const row = g.getImageData(x0, y - 20, x1 - x0, 40).data; const vals = new Set();
    for (let i = 0; i < row.length; i += 4) vals.add(row[i] + ',' + row[i + 1] + ',' + row[i + 2]);
    return vals.size;
  });
  const withGrid = await gridDark();
  await page.uncheck('#vttGrid'); await page.waitForTimeout(300);
  const noGrid = await gridDark();
  check('C2 grid on: lines visible', withGrid > 1, withGrid);
  check('C2 grid off: ground is one flat colour', noGrid === 1, noGrid);
  await page.check('#vttGrid');

  // B7: the DM layer (red labels, markers) shows for the DM and never at the beamer
  await page.uncheck('#vttPreview'); await page.waitForTimeout(300);
  const wine = 'Math.abs(r-123)<14&&Math.abs(g-31)<14&&Math.abs(b-31)<14';
  const dmSees = await countPixels(page, '#vttCv', wine);
  const { pop } = await openBeamer(ctx, page);
  await page.waitForTimeout(500); await page.click('#fogAllOff'); await page.waitForTimeout(800);
  const beamerSees = await countPixels(pop, '#cv', wine);
  check('B7 DM sees its layer (wine-red labels and markers)', dmSees > 200, dmSees);
  check('B7 beamer shows none of it', beamerSees === 0, beamerSees);
  check('C8 Spielersicht equals what the beamer draws (no DM layer)', await (async () => { await page.check('#vttPreview'); await page.waitForTimeout(300); return (await countPixels(page, '#vttCv', wine)) === 0; })());
  check('maps: no console errors', errors.length === 0, errors);
  await browser.close();
};
