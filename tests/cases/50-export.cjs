// G1, G2: one project file out and in again on a fresh profile; big projects; broken files do not freeze saving.
const fs = require('fs');
const path = require('path');
const { pw, FILE, OUT, launch, startScene, view, check } = require('../helpers.cjs');
const { png, wav } = require('../fixtures.cjs');

async function fresh(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(FILE); await page.waitForTimeout(900); return { ctx, page, errors };
}
async function exportTo(page, file, wait = 60000) {
  await view(page, 'vorbereitung');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: wait }), page.click('#expBtn')]);
  await dl.saveAs(file); return fs.statSync(file).size;
}
async function waitInfo(page, re, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (re.test(await page.textContent('#expInfo'))) return true; await page.waitForTimeout(200); } return false; }

module.exports = async () => {
  const { browser, page: A, errors: errA } = await launch();
  // content in profile A
  await view(A, 'sound'); await A.selectOption('#sndKind', 'music'); await A.setInputFiles('#sndFile', wav('proj-music.wav', 5, 330)); await A.waitForTimeout(400);
  await view(A, 'vorbereitung'); await A.locator('[data-up-mood="1"]').setInputFiles(png('proj-mood.png', 1920, 1080, [200, 120, 60])); await A.waitForTimeout(700);
  await startScene(A, 1); await view(A, 'tisch'); await A.click('#fogAllOff'); await A.click('#plHeroes'); await A.waitForTimeout(800);
  await A.click('#themeBtn');
  const file = path.join(OUT, 'project.json'); const size = await exportTo(A, file);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  check('G1 one JSON with settings, maps and all media', j.app === 'eulenbach-dm-helfer' && j.ls['eulenbach3-maps'] && j.ls['eulenbach3-v2'] && j.blobs.length === 2, [Object.keys(j.ls), j.blobs.length]);
  check('G1 info line reports size and count', /Fertig: .* MB, 2 Medien/.test(await A.textContent('#expInfo')), await A.textContent('#expInfo'));

  // profile B: has its own running combat that the import must replace; import restores everything
  const B = await fresh(browser);
  await view(B.page, 'spielen'); await B.page.click('#d-kampf [data-start="tor"]'); await B.page.waitForTimeout(300);
  await view(B.page, 'vorbereitung'); await B.page.setInputFiles('#impFile', file); await B.page.waitForTimeout(3500);
  await view(B.page, 'sound');
  check('G1 import: sounds are back', (await B.page.locator('#libList li').allTextContents()).some(t => /proj-music/.test(t)));
  check('G1 import: scene, theme and table are back, old combat is replaced', await B.page.evaluate(() => { const v = JSON.parse(localStorage.getItem('eulenbach3-v2')), m = JSON.parse(localStorage.getItem('eulenbach3-maps')); return v.theme === 'candle' && m.village.tokens.length === 5 && localStorage.getItem('eulenbach3-combat') === null; }));
  await view(B.page, 'vorbereitung'); await B.page.waitForTimeout(400);
  check('G1 import: picture is back (thumbnail loads)', (await B.page.locator('[data-mood-thumb="1"]').getAttribute('src') || '').startsWith('blob:'));
  await view(B.page, 'tisch'); await B.page.waitForTimeout(500);
  check('G1 import: fog and figures are drawn again', /Dorfplatz/.test(await B.page.textContent('#vttInfo')));
  check('G1 import: no console errors', B.errors.length === 0, B.errors);

  // a broken file is refused with a message and saving keeps working afterwards (the page is not frozen)
  fs.writeFileSync(path.join(OUT, 'broken.json'), '{"app":"something else"}');
  await view(B.page, 'vorbereitung'); await B.page.setInputFiles('#impFile', path.join(OUT, 'broken.json')); await B.page.waitForTimeout(500);
  check('G1 foreign file: clear message', /keine Projektdatei/.test(await B.page.textContent('#expInfo')), await B.page.textContent('#expInfo'));
  await B.page.click('#themeBtn'); await B.page.waitForTimeout(300);
  check('G1 after a refused import saving still works', await B.page.evaluate(() => JSON.parse(localStorage.getItem('eulenbach3-v2')).theme === 'tome'));
  fs.writeFileSync(path.join(OUT, 'broken2.json'), '{"app":"eulenbach-dm-helfer","ls":{},"blobs":[{"id":"x","kind":"fx","name":"x","data":"data:audio/wav;base64,@@@"}]}');
  await B.page.setInputFiles('#impFile', path.join(OUT, 'broken2.json')); await B.page.waitForTimeout(800);
  await B.page.click('#themeBtn'); await B.page.waitForTimeout(300);
  check('G1 a file that breaks halfway leaves saving alive', await B.page.evaluate(() => JSON.parse(localStorage.getItem('eulenbach3-v2')).theme === 'candle'));

  // G2: a project of more than 100 MB
  await view(A, 'sound'); await A.selectOption('#sndKind', 'atmo');
  for (let i = 0; i < 3; i++) { await A.setInputFiles('#sndFile', wav(`big${i}.wav`, 800, 100 + i * 30)); await A.waitForTimeout(1500); }
  const t0 = Date.now(); const bigFile = path.join(OUT, 'big-project.json'); const bigSize = await exportTo(A, bigFile, 180000);
  check('G2 export of more than 100 MB works', bigSize > 100 * 1048576, Math.round(bigSize / 1048576));
  const C = await fresh(browser); await view(C.page, 'vorbereitung'); await C.page.setInputFiles('#impFile', bigFile);
  await C.page.waitForTimeout(500);
  const ok = await C.page.waitForFunction(() => document.querySelector('#toast') && /Projekt geladen/.test(document.querySelector('#expInfo').textContent), null, { timeout: 180000 }).then(() => true, () => false);
  await C.page.waitForTimeout(2500); await view(C.page, 'sound');
  check('G2 import of more than 100 MB works and brings all sounds', ok && (await C.page.locator('#libList li').count()) === 4, [ok, await C.page.locator('#libList li').count()]);
  console.log('  (big project round trip took ' + Math.round((Date.now() - t0) / 1000) + ' s, ' + Math.round(bigSize / 1048576) + ' MB)');
  fs.unlinkSync(bigFile); for (let i = 0; i < 3; i++) fs.unlinkSync(path.join(OUT, `big${i}.wav`));

  // G2: a file that is far too large gets an understandable refusal (sparse file, nothing is read)
  const huge = path.join(OUT, 'huge.json'); const fd = fs.openSync(huge, 'w'); fs.ftruncateSync(fd, 520 * 1048576); fs.closeSync(fd);
  await view(C.page, 'vorbereitung'); await C.page.setInputFiles('#impFile', huge); await C.page.waitForTimeout(800);
  check('G2 oversized file: understandable message', /zu groß/.test(await C.page.textContent('#expInfo')), await C.page.textContent('#expInfo'));
  fs.unlinkSync(huge);
  check('G errors: none in the export profile', errA.length === 0, errA);
  await browser.close();
};
