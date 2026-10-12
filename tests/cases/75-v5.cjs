// A3: the v5 functions stay as they were: scene stepper, clues, combat (initiative, round, wave, lantern, death saves, undo),
// monster values, dice, ideas, hero inventory, knowledge search, checklist, session timer.
const { launch, view, check } = require('../helpers.cjs');

module.exports = async () => {
  const { browser, page, errors } = await launch();

  // stepper and persistence of scene and clues
  await page.click('#stepper [data-i="3"]');
  check('A3 stepper jumps to a scene', /Sitzung 2/.test(await page.textContent('#sceneEyebrow')), await page.textContent('#sceneEyebrow'));
  await page.click('#nextScene'); check('A3 "Weiter" goes on', /Sitzung 2/.test(await page.textContent('#sceneEyebrow')) && await page.getAttribute('#stepper [data-i="4"]', 'aria-current') === 'step');
  const withClue = await page.evaluate(() => Array.from(document.querySelectorAll('#scenes .scene')).findIndex(s => s.querySelector('[data-clue]')));
  check('A3 some scene has clues to tick', withClue >= 0, withClue);
  await page.click(`#stepper [data-i="${withClue}"]`);
  const clue = page.locator('.scene:not([hidden]) [data-clue]').first(); await clue.check(); const id = await clue.getAttribute('data-clue');
  await page.reload(); await page.waitForTimeout(900);
  check('A3 ticked clue and scene survive a reload', await page.isChecked(`[data-clue="${id}"]`) && await page.getAttribute(`#stepper [data-i="${withClue}"]`, 'aria-current') === 'step');

  // combat: finale has the lantern
  await page.click('.dock-tabs [data-dock="kampf"]');
  await page.click('#d-kampf [data-start="finale"]'); await page.waitForTimeout(300);
  check('A3 combat start asks for the initiative of the heroes', await page.isVisible('.banner.ember'));
  const inis = page.locator('#d-kampf input.ini'); const n = await inis.count();
  const values = [4, 18, 11, 7, 15]; let h = 0;
  for (let i = 0; i < n; i++) { if ((await inis.nth(i).inputValue()) === '') { await inis.nth(i).fill(String(values[h++ % 5])); await inis.nth(i).dispatchEvent('change'); } }
  await page.waitForTimeout(300);
  const order = await page.$$eval('#d-kampf input.ini', els => els.map(e => +e.value));
  check('A3 the order is sorted by initiative (high first)', order.every((v, i) => i === 0 || order[i - 1] >= v), order);
  check('A3 lantern shows 3 of 3 flames', /Laterne · 3\/3/.test(await page.textContent('.lantern .lbl')), await page.textContent('.lantern .lbl'));
  await page.click('[data-act="twin"]'); check('A3 twin lantern: 4 flames', /4\/4/.test(await page.textContent('.lantern .lbl')));
  // run through a round: at its end the lantern question appears, "Ja, flackern" puts out one flame
  for (let i = 0; i < 20 && !(await page.isVisible('[data-act="flicker"]')); i++) { await page.keyboard.press('n'); await page.waitForTimeout(40); }
  check('A3 end of round: lantern question', await page.isVisible('[data-act="flicker"]'));
  await page.click('[data-act="flicker"]'); check('A3 flicker: 3 of 4 flames', /3\/4/.test(await page.textContent('.lantern .lbl')), await page.textContent('.lantern .lbl'));
  await page.click('[data-act="relight"]'); check('A3 relight: 4 of 4', /4\/4/.test(await page.textContent('.lantern .lbl')));
  await page.click('.lantern [data-flame="0"]'); await page.waitForTimeout(100);
  check('A3 tapping a flame puts it out', /Laterne erloschen|0\/4|1\/4|2\/4|3\/4/.test(await page.textContent('.lantern .lbl')), await page.textContent('.lantern .lbl'));
  await page.click('[data-act="relight"]');

  // damage, death saves, undo
  const row = page.locator('.cmb', { hasText: 'Bardin' }).first();
  await row.locator('[data-act="toggle"]').click();
  const hpBefore = await row.locator('.hp').textContent();
  await row.locator('input[id^="amt-"]').fill('3'); await row.locator('[data-act="dmg"]').click(); await page.waitForTimeout(150);
  const hpAfter = await page.locator('.cmb', { hasText: 'Bardin' }).first().locator('.hp').textContent();
  check('A3 damage lowers hit points', hpAfter !== hpBefore, [hpBefore, hpAfter]);
  await page.click('[data-act="undo"]'); await page.waitForTimeout(150);
  check('A3 undo (↶) brings them back', (await page.locator('.cmb', { hasText: 'Bardin' }).first().locator('.hp').textContent()) === hpBefore);
  const row2 = page.locator('.cmb', { hasText: 'Bardin' }).first(); await row2.locator('input[id^="amt-"]').fill('50'); await row2.locator('[data-act="dmg"]').click(); await page.waitForTimeout(150);
  check('A3 hero at 0: death save pips appear', await page.locator('.cmb', { hasText: 'Bardin' }).first().locator('.dsave').isVisible());
  for (const k of [0, 1, 2]) await page.locator('.cmb', { hasText: 'Bardin' }).first().locator(`[data-ds="0:${k}"]`).click();
  check('A3 three successes: stable', /stabil/.test(await page.textContent('#toast')), await page.textContent('#toast'));

  // monster values and attacks
  await page.click('.dock-tabs [data-dock="gegner"]');
  const gtxt = await page.textContent('#d-gegner');
  check('A3 monster values are there (Zweigling RK 13, 4 TP; Rankenhirte 45 TP)', /Zweigling/.test(gtxt) && /Rankenhirte/.test(gtxt) && /13/.test(gtxt) && /45/.test(gtxt));
  const logBefore = await page.locator('#rollLog li').count();
  const atk = page.locator('#d-gegner [data-atk]').first(); if (await atk.count()) { await atk.click(); await page.waitForTimeout(200); }
  check('A3 an attack button rolls and is logged', (await page.locator('#rollLog li').count()) > logBefore || !(await atk.count()));

  // dice: several dice with modifier, advantage on the d20
  await page.click('.dock-tabs [data-dock="wuerfel"]');
  await page.fill('#dCnt', '3'); await page.fill('#dMod', '2'); await page.click('#dieGrid .die[data-d="6"]');
  check('A3 3W6+2 is rolled and shown', /3W6 \(.*\) \+ 2/.test(await page.textContent('#bigDet')) && +(await page.textContent('#bigRes')) >= 5, await page.textContent('#bigDet'));
  await page.fill('#dCnt', '1'); await page.fill('#dMod', '0'); await page.click('#d-wuerfel [data-adv="1"]'); await page.click('#dieGrid .die[data-d="20"]');
  check('A3 advantage on the W20', /Vorteil/.test(await page.textContent('#bigDet')), await page.textContent('#bigDet'));
  check('A3 the roll log keeps the rolls', (await page.locator('#rollLog li').count()) >= 2);
  await page.click('.dock-tabs [data-dock="ideen"]'); const g0 = await page.textContent('#gen1'); let changed = false;
  for (let i = 0; i < 12 && !changed; i++) { await page.click('[data-g="1"]'); changed = (await page.textContent('#gen1')) !== g0; }
  check('A3 idea generator gives new rumours', changed);

  // hero inventory
  await view(page, 'heldinnen');
  await page.fill('#item0', 'Testfackel'); await page.press('#item0', 'Enter'); await page.waitForTimeout(150);
  check('A3 inventory: item added', (await page.textContent('#heroList .inv[data-h="0"]')).includes('Testfackel'));
  await page.reload(); await page.waitForTimeout(900); await view(page, 'heldinnen');
  check('A3 inventory survives a reload', (await page.textContent('#heroList .inv[data-h="0"]')).includes('Testfackel'));
  await page.click('#heroList .inv[data-h="0"] [aria-label="Testfackel entfernen"]');
  check('A3 inventory: item removed', !(await page.textContent('#heroList .inv[data-h="0"]')).includes('Testfackel'));
  await page.click('#invReset'); check('A3 reset asks first', /Wirklich/.test(await page.textContent('#invReset'))); await page.click('#invReset');

  // knowledge search, checklist, timer
  await view(page, 'wissen'); const all = await page.locator('#kgrid .kcard:visible').count();
  await page.fill('#kSearch', 'Nebel'); await page.waitForTimeout(150);
  const some = await page.locator('#kgrid .kcard:visible').count();
  check('A3 knowledge search filters the cards', some > 0 && some < all, [some, all]);
  await page.fill('#kSearch', ''); await page.waitForTimeout(100);
  await view(page, 'vorbereitung'); await page.check('#chk2'); await page.reload(); await page.waitForTimeout(900); await view(page, 'vorbereitung');
  check('A3 checklist survives a reload', await page.isChecked('#chk2'));
  await page.click('#timerBtn'); await page.waitForTimeout(2300); await page.click('#timerBtn'); await page.reload(); await page.waitForTimeout(900);
  check('A3 session timer keeps its time after a reload', /^0:0[2-9]$/.test(await page.textContent('#timerTxt')), await page.textContent('#timerTxt'));
  check('A3 v5 functions: no console errors', errors.length === 0, errors);
  await browser.close();
};
