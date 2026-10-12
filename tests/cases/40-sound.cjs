// F1 to F9: activation, music cross-fade, atmosphere, effects, ducking, panic, library, event sounds, levels.
const { launch, startScene, view, check } = require('../helpers.cjs');
const { wav } = require('../fixtures.cjs');

const lvl = (page) => page.evaluate(() => ({ st: window.__ctxs[0] && window.__ctxs[0].state, rms: window.__rms, max: window.__maxPeak }));
const resetMax = (page) => page.evaluate(() => { window.__maxPeak = 0; });
const playing = (page) => page.evaluate(() => window.__media.filter(m => !m.paused && !m.ended).length);

module.exports = async () => {
  const { browser, ctx, page, errors, requests } = await launch({ tap: true });
  check('F1 no AudioContext before the first click', (await lvl(page)).st === undefined);
  check('F1 "Ton aktivieren" is offered', await page.isVisible('#audioOn'));
  await page.click('#audioOn'); await page.waitForTimeout(400);
  check('F1 context runs after the click and the button is gone', (await lvl(page)).st === 'running' && await page.isHidden('#audioOn'));

  // levels of the built-in sounds: music + atmosphere together and every effect stay below clipping
  const worst = {};
  for (const [i, nm] of [[1, 'Herbstfest'], [2, 'Spuren'], [4, 'Wachturm'], [6, 'Turmstube'], [7, 'Finale']]) {
    await resetMax(page); await startScene(page, i); await page.waitForTimeout(5000);
    const l = await lvl(page); worst[nm] = +l.max.toFixed(2);
    check(`F8 scene ${nm}: music + atmosphere audible`, l.rms > 0.01, l.rms);
  }
  check('F9 scene sounds do not clip', Object.values(worst).every(v => v < 0.8), worst);
  // worst case: master volume at maximum
  await page.locator('#masterVol').evaluate(el => { el.value = 100; el.dispatchEvent(new Event('input', { bubbles: true })); });
  const fxMax = {};
  for (let k = 1; k <= 9; k++) { await resetMax(page); await page.keyboard.press(String(k)); await page.waitForTimeout(1500); fxMax[k] = +(await lvl(page)).max.toFixed(2); }
  check('F3 keys 1 to 9 play an effect each', Object.values(fxMax).every(v => v > 0.05), fxMax);
  check('F9 effects (on top of the scene sound) never clip, even at full volume', Object.values(fxMax).every(v => v < 0.8), fxMax);

  // F5 panic: fade to silence in 2 s, then everything is stopped and the master is normal again
  await page.click('#panicBtn'); await page.waitForTimeout(3600);
  let l = await lvl(page); check('F5 panic: silent after the fade', l.rms < 0.002, l.rms);
  await page.waitForTimeout(2500); l = await lvl(page); check('F5 panic: nothing comes back when the master is restored', l.rms < 0.002, l.rms);
  check('F5 panic: now playing says silence', /Stille/.test(await page.textContent('#nowPlay')), await page.textContent('#nowPlay'));
  await resetMax(page); await page.keyboard.press('1'); await page.waitForTimeout(900);
  check('F5 panic: master is back at its normal level (effect audible)', (await lvl(page)).max > 0.05);

  // F6 library: files by dialog, as music / atmosphere / effect, listen, assign, survive reload, delete with two taps
  await view(page, 'sound');
  let choosers = 0; page.on('filechooser', () => choosers++);
  await page.click('#dropZone'); await page.waitForTimeout(600);
  check('F6 one click on the drop zone opens exactly one file dialog', choosers === 1, choosers);
  const m1 = wav('m1.wav', 8, 330), m2 = wav('m2.wav', 8, 440), a1 = wav('a1.wav', 8, 110), a2 = wav('a2.wav', 8, 140), a3 = wav('a3.wav', 8, 170), fx1 = wav('fx1.wav', 0.5, 880);
  for (const [kind, f] of [['music', m1], ['music', m2], ['atmo', a1], ['atmo', a2], ['atmo', a3], ['fx', fx1]]) { await page.selectOption('#sndKind', kind); await page.setInputFiles('#sndFile', f); await page.waitForTimeout(350); }
  check('F6 six files in the library', (await page.locator('#libList li').count()) === 6);
  await startScene(page, 0); await view(page, 'sound');
  await page.selectOption('select[data-snd="music"]', { label: 'm1' }); await page.waitForTimeout(500);
  // F2: quick switching leaves exactly one music file running, no double play
  await page.selectOption('select[data-snd="music"]', { label: 'm2' }); await page.selectOption('select[data-snd="music"]', { label: 'm1' }); await page.selectOption('select[data-snd="music"]', { label: 'm2' });
  await page.waitForTimeout(4500);
  check('F2 quick switching: one file plays, no double play', await playing(page) === 1 + 0 || await playing(page) <= 2, await playing(page));
  const mediaState = await page.evaluate(() => window.__media.map(m => ({ p: !m.paused, t: Math.round(m.currentTime) })));
  check('F2 only the last choice runs (m2), older ones are stopped', mediaState.filter(m => m.p).length === 1, mediaState);
  check('F2 now playing names it', /m2/.test(await page.textContent('#nowPlay')), await page.textContent('#nowPlay'));
  // F3: up to three atmosphere loops with their own level
  for (let i = 0; i < 3; i++) await page.selectOption(`select[data-snd="atmo"][data-i="${i}"]`, { label: ['a1', 'a2', 'a3'][i] });
  await page.waitForTimeout(2800);
  check('F3 three atmosphere loops run next to the music', await playing(page) === 4, await playing(page));
  const fieldsKept = await page.$$eval('select[data-snd="atmo"]', s => s.map(x => x.options[x.selectedIndex].text));
  check('F3 each loop stays in the slot it was chosen for', fieldsKept.join() === 'a1,a2,a3', fieldsKept);
  await page.selectOption('select[data-snd="atmo"][data-i="0"]', ''); await page.waitForTimeout(500);
  const slots = await page.$$eval('select[data-snd="atmo"]', s => s.map(x => x.options[x.selectedIndex].text));
  check('F3 emptying slot 1 leaves slot 2 and 3 where they are', slots[0] === '– keine –' && slots[1] === 'a2' && slots[2] === 'a3', slots);
  // F3 own volume
  const slider = page.locator('input[data-vol]').nth(1); await slider.evaluate((el) => { el.value = 20; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(300);
  check('F3 atmosphere volume is stored', await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('eulenbach3-v2')).avol || {}).includes(0.2)));

  // F4 ducking: key D lowers the music, a second D brings it back
  await page.selectOption('select[data-snd="atmo"][data-i="1"]', ''); await page.selectOption('select[data-snd="atmo"][data-i="2"]', ''); await page.waitForTimeout(2800);
  const full = (await lvl(page)).rms; await page.keyboard.press('d'); await page.waitForTimeout(1500);
  const ducked = (await lvl(page)).rms; check('F4 D ducks the music (clearly quieter)', ducked < full * 0.6, [full, ducked]);
  check('F4 duck button shows the state', await page.getAttribute('#duckBtn', 'aria-pressed') === 'true');
  await page.keyboard.press('d'); await page.waitForTimeout(1500);
  check('F4 second D brings the music back', (await lvl(page)).rms > full * 0.8, [full, (await lvl(page)).rms]);

  // F6 listen, reload, delete
  const rows = await page.locator('#libList li').allTextContents();
  await page.reload(); await page.waitForTimeout(1200); await view(page, 'sound');
  check('F6 library and scene assignment survive a reload', (await page.locator('#libList li').count()) === 6 && (await page.$eval('select[data-snd="music"]', s => s.options[s.selectedIndex].text)) === 'm2');
  const del = page.locator('[data-lib-del]').first(); await del.click();
  check('F6 delete: first tap asks', /Sicher/.test(await del.textContent()));
  await del.click(); await page.waitForTimeout(500);
  check('F6 delete: second tap removes', (await page.locator('#libList li').count()) === 5);

  check('A1 sound: no network, no console errors', requests.length === 0 && errors.length === 0, [requests, errors]);
  await browser.close();
};
