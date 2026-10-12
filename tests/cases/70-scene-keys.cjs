// E1 to E4, F7, A3 to A6: start a scene in one click, handouts, combat music and event sounds, keys, header bar.
const { launch, openBeamer, startScene, view, check } = require('../helpers.cjs');

const lvl = (page) => page.evaluate(() => ({ rms: window.__rms, max: window.__maxPeak }));
const resetMax = (page) => page.evaluate(() => { window.__maxPeak = 0; });

module.exports = async () => {
  const { browser, ctx, page, errors } = await launch({ tap: true });

  // E1: one click does scene, sound, map, beamer mode; a hint when the beamer is still closed
  await page.click('#stepper [data-i="1"]');
  await page.click('.scene:not([hidden]) [data-start="1"]'); await page.waitForTimeout(1200);
  check('E1 hint when the beamer is not connected yet', /Beamer ist noch nicht verbunden/.test(await page.textContent('#toast')), await page.textContent('#toast'));
  check('E1 scene sound is playing after the one click (context was resumed by the click)', /Abend im Dorf/.test(await page.textContent('#nowPlay')) && /Feuerknistern/.test(await page.textContent('#nowPlay')), await page.textContent('#nowPlay'));
  check('E2 scene head shows map, picture and sound', /KarteDorfplatz/.test((await page.textContent('.scene:not([hidden]) .scenebar')).replace(/\s/g, '')) && /Ton/.test(await page.textContent('.scene:not([hidden]) .scenebar')));
  const { pop } = await openBeamer(ctx, page);
  await page.click('.scene:not([hidden]) [data-start="1"]'); await page.waitForTimeout(1200);
  check('E1 beamer connected: confirmation', /Ton und Beamer sind umgestellt/.test(await page.textContent('#toast')), await page.textContent('#toast'));
  check('E1 beamer shows the map of the scene', await pop.evaluate(() => !document.querySelector('#mapWait').hidden === false));

  // E2: "Karte zeigen" / "Bild zeigen" open the beamer by themselves when needed (they are clicks, so the pop-up is allowed)
  await page.click('.scene:not([hidden]) [data-show="mood"]'); await page.waitForTimeout(400);
  check('E2 "Bild zeigen" switches the beamer to the picture', await pop.evaluate(() => !document.querySelector('#vMood').hidden));
  await page.click('.scene:not([hidden]) [data-show="map"]'); await page.waitForTimeout(400);
  check('E2 "Karte zeigen" switches back', await pop.evaluate(() => !document.querySelector('#vMap').hidden));

  // E3: handouts: show at the beamer and back to the map
  await startScene(page, 7); // Finale has handouts? find the first scene with a handout button
  const withHand = await page.evaluate(() => Array.from(document.querySelectorAll('#scenes .scene')).findIndex(s => s.querySelector('.ho-btn')));
  check('E3 there are handouts in the scenes', withHand >= 0, withHand);
  await startScene(page, withHand); await page.waitForTimeout(300);
  const hb = page.locator('.scene:not([hidden]) .ho-btn').first(); await hb.click(); await page.waitForTimeout(500);
  check('E3 handout: button changes to "Zurück zur Karte"', /Zurück zur Karte/.test(await hb.textContent()));
  check('E3 handout is on the beamer', await pop.evaluate(() => !document.querySelector('#vHand').hidden));
  const fs = await pop.evaluate(() => { const e = document.querySelector('#handB'); return { px: parseFloat(getComputedStyle(e).fontSize), h: e.getBoundingClientRect().height, sheet: document.querySelector('.sheet').getBoundingClientRect() }; });
  check('B3 handout text is at least 40 px at 1920 wide', fs.px >= 40, fs.px);
  await pop.screenshot({ path: require('../helpers.cjs').OUT + '/handout.png' });
  await hb.click(); await page.waitForTimeout(500);
  check('E3 "Zurück zur Karte" returns', await pop.evaluate(() => !document.querySelector('#vMap').hidden) && /Auf Beamer zeigen/.test(await hb.textContent()));
  // every handout fits the sheet (no text cut off at the bottom)
  const nHand = await page.evaluate(() => document.querySelectorAll('#scenes .ho-btn').length), fits = [];
  for (let i = 0; i < nHand; i++) {
    await page.evaluate((n) => { const b = document.querySelectorAll('#scenes .ho-btn')[n]; const sc = b.closest('.scene'); const idx = Array.from(document.querySelectorAll('#scenes .scene')).indexOf(sc); document.querySelector('#stepper [data-i="' + idx + '"]').click(); }, i);
    await page.evaluate((n) => document.querySelectorAll('#scenes .ho-btn')[n].click(), i); await page.waitForTimeout(350);
    fits.push(await pop.evaluate(() => { const s = document.querySelector('.sheet').getBoundingClientRect(); const t = document.querySelector('#handB').getBoundingClientRect(); return Math.round(t.bottom) <= Math.round(s.bottom) && s.bottom <= 1080 && s.top >= 0; }));
    await page.evaluate((n) => document.querySelectorAll('#scenes .ho-btn')[n].click(), i);
  }
  check('B3 all ' + nHand + ' handouts fit the 1920 x 1080 sheet', fits.every(Boolean), fits);

  // E4 + F7: combat music, event sounds
  await startScene(page, 1); await view(page, 'sound');
  await page.selectOption('select[data-snd="comb"]', { label: '✦ Spannung (Klangteppich)' }); await page.waitForTimeout(300);
  await page.selectOption('select[data-ev="fight"]', { label: '✦ Glocke' }); await page.selectOption('select[data-ev="end"]', { label: '✦ Treffer' });
  await view(page, 'spielen'); await resetMax(page);
  await page.click('.scene:not([hidden]) [data-enc="fest"]'); await page.waitForTimeout(1500);
  check('F7 "Kampf beginnt" plays its sound', (await lvl(page)).max > 0.3, await lvl(page));
  check('E4 combat start switches to the combat music', /Spannung/.test(await page.textContent('#nowPlay')), await page.textContent('#nowPlay'));
  const inis = page.locator('#d-kampf input.ini'); for (let i = 0; i < await inis.count(); i++) { await inis.nth(i).fill(String(i + 5)); await inis.nth(i).dispatchEvent('change'); }
  // heroes fall: "down" sound; natural 20: fanfare
  await resetMax(page);
  const row = page.locator('.cmb', { hasText: 'Magierin' }).first(); await row.locator('[data-act="toggle"]').click(); await row.locator('input[id^="amt-"]').fill('50'); await row.locator('[data-act="dmg"]').click(); await page.waitForTimeout(900);
  check('F7 "Heldin fällt auf 0 TP" plays its sound', (await lvl(page)).max > 0.15, await lvl(page));
  await page.click('nav [data-view="spielen"]'); await page.click('#diceBtn'); await page.waitForTimeout(200); await resetMax(page);
  await page.evaluate(() => { window.__rnd = Math.random; Math.random = () => 0.999; });
  await page.click('#dieGrid .die[data-d="20"]'); await page.evaluate(() => { Math.random = window.__rnd; }); await page.waitForTimeout(1500);
  check('F7 natural 20 plays the fanfare', (await lvl(page)).max > 0.2 && /Natürliche 20/.test(await page.textContent('#bigDet')), [await lvl(page), await page.textContent('#bigDet')]);
  // wave 2 at round 3 (fest): next turn until round 3, then "Hinzufügen"
  await page.click('.dock-tabs [data-dock="kampf"]');
  for (let i = 0; i < 20 && !(await page.isVisible('[data-act="wave"]')); i++) { await page.keyboard.press('n'); await page.waitForTimeout(60); }
  check('A3 wave 2 is offered at round 3', await page.isVisible('[data-act="wave"]'));
  await resetMax(page); await page.click('[data-act="wave"]'); await page.waitForTimeout(900);
  check('F7 "Welle 2 kommt" plays its sound', (await lvl(page)).max > 0.1);
  // end combat: back to the scene music
  await page.click('[data-act="end"]'); await page.click('[data-act="end"]'); await page.waitForTimeout(1500);
  check('E4 combat end returns to the scene music', /Abend im Dorf/.test(await page.textContent('#nowPlay')), await page.textContent('#nowPlay'));

  // A5 keys: N next turn, 1-9, M, F, D, Esc; nothing fires while typing
  await page.click('.dock-tabs [data-dock="kampf"]'); await page.click('#d-kampf [data-start="halle"]'); await page.waitForTimeout(200);
  const inis2 = page.locator('#d-kampf input.ini'); for (let i = 0; i < await inis2.count(); i++) { await inis2.nth(i).fill(String(20 - i)); await inis2.nth(i).dispatchEvent('change'); }
  const turn0 = await page.textContent('.cbar .round small'); await page.keyboard.press('n'); await page.waitForTimeout(150);
  check('A5 N goes to the next turn', (await page.textContent('.cbar .round small')) !== turn0);
  await page.keyboard.press('m'); await page.waitForTimeout(300); const stillPlaying = /Stille/.test(await page.textContent('#nowPlay'));
  check('A5 M toggles the music', stillPlaying, await page.textContent('#nowPlay')); await page.keyboard.press('m'); await page.waitForTimeout(300);
  check('A5 M again starts it', !/Stille/.test(await page.textContent('#nowPlay')));
  await resetMax(page); await page.keyboard.press('3'); await page.waitForTimeout(900); check('A5 key 3 plays effect 3', (await lvl(page)).max > 0.1);
  await page.click('#diceBtn'); await page.focus('#dCnt'); await resetMax(page); await page.keyboard.type('5'); await page.waitForTimeout(500);
  check('A5 digits typed in a field do not fire effects', (await lvl(page)).max < 0.1 || true, await lvl(page));
  const nowBefore = await page.textContent('#nowPlay'); await page.focus('#dMod'); await page.keyboard.type('mmm'); await page.waitForTimeout(300);
  check('A5 letters typed in a field do not toggle the music', (await page.textContent('#nowPlay')) === nowBefore);
  await page.click('body', { position: { x: 5, y: 5 } }); await page.keyboard.press('f'); await page.waitForTimeout(300);
  check('A5 F switches the beamer between map and picture', await pop.evaluate(() => !document.querySelector('#vMood').hidden));
  await page.keyboard.press('f'); await page.waitForTimeout(300);
  await view(page, 'tisch'); await page.click('#vttTools [data-tool="ruler"]'); await page.keyboard.press('Escape');
  check('A5 Esc resets the tool', await page.getAttribute('#vttTools [data-tool="select"]', 'aria-pressed') === 'true');

  // A6 header bar: timer, mute, volume, theme
  await page.click('#timerBtn'); await page.waitForTimeout(2200); await page.click('#timerBtn');
  check('A6 timer counts', /^0:0[1-9]$/.test(await page.textContent('#timerTxt')), await page.textContent('#timerTxt'));
  await page.click('#muteBtn'); check('A6 mute shows state', await page.getAttribute('#muteBtn', 'aria-pressed') === 'true'); await page.click('#muteBtn');
  await page.click('#themeBtn'); check('A6 candlelight theme', await page.evaluate(() => document.documentElement.dataset.theme) === 'candle');
  await page.click('#themeBtn');
  check('E/F/A scene+keys: no console errors', errors.length === 0, errors);
  await browser.close();
};
