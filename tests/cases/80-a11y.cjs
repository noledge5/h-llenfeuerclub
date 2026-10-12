// A4: layouts at phone, tablet and desktop width; WCAG AA contrast in both themes; focus ring; reduced motion; touch and pen.
const { launch, openBeamer, startScene, view, check } = require('../helpers.cjs');
const { measure } = require('../contrast.cjs');
const VIEWS = ['spielen', 'tisch', 'sound', 'karten', 'heldinnen', 'wissen', 'vorbereitung'];

module.exports = async () => {
  // widths: nothing may be wider than the screen; the Spieltisch is two columns from 1100 px
  for (const [w, h] of [[390, 844], [820, 1180], [1100, 800], [1400, 1000]]) {
    const { browser, page, errors } = await launch({ viewport: { width: w, height: h }, touch: w < 1100 });
    const bad = [];
    for (const v of VIEWS) { await view(page, v); await page.waitForTimeout(150); if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) bad.push(v); }
    check(`A4 ${w} px: no horizontal scrolling in any tab`, bad.length === 0, bad);
    await view(page, 'tisch');
    const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.vtt')).gridTemplateColumns.split(' ').length);
    check(`A4 ${w} px: Spieltisch has ${w >= 1100 ? 'two columns' : 'one column'}`, cols === (w >= 1100 ? 2 : 1), cols);
    const bar = await page.evaluate(() => { const b = document.querySelector('#sndbar').getBoundingClientRect(); return b.height; });
    if (w === 390) check('A4 phone: sound bar needs one row only (under 90 px)', bar < 90, bar);
    check(`A4 ${w} px: no console errors`, errors.length === 0, errors);
    await browser.close();
  }

  // AA contrast measured on the real picture (see contrast.cjs): both themes, desktop; phone in the default theme
  for (const [theme, w, h] of [['tome', 1400, 1000], ['candle', 1400, 1000], ['tome', 390, 844], ['candle', 390, 844]]) {
    const { browser, page } = await launch({ viewport: { width: w, height: h } });
    if (theme === 'candle') await page.click('#themeBtn');
    let total = 0; const fails = [];
    for (const v of VIEWS) { await view(page, v); await page.waitForTimeout(200); const r = await measure(page); total += r.count; fails.push(...r.failures.map(f => `${v}: ${f.ratio} ${f.tag} "${f.t}"`)); }
    check(`A4 AA contrast, theme ${theme}, ${w} px (${total} texts measured)`, fails.length === 0, fails.slice(0, 6));
    await browser.close();
  }

  // focus ring is visible on keyboard focus (buttons, inputs, tabs)
  {
    const { browser, page } = await launch();
    const seen = new Set(), weak = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || (cs.boxShadow !== 'none' && /\d/.test(cs.boxShadow)); return { t: e.tagName + '.' + (e.className || '').toString().split(' ')[0] + ':' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 20), ring, hidden: e.getBoundingClientRect().width === 0 }; });
      if (r && !r.hidden && !seen.has(r.t)) { seen.add(r.t); if (!r.ring) weak.push(r.t); }
    }
    check('A4 focus ring visible on ' + seen.size + ' keyboard-focused controls', seen.size > 15 && weak.length === 0, weak);
    await browser.close();
  }

  // prefers-reduced-motion: the beamer flames and the DM page stop animating
  {
    const { browser, ctx, page } = await launch({ reducedMotion: 'reduce' });
    await startScene(page, 1); await view(page, 'tisch'); const { pop } = await openBeamer(ctx, page);
    await page.click('[data-stage="title"]'); await pop.waitForTimeout(300);
    const anim = await pop.evaluate(() => getComputedStyle(document.querySelector('#vTitle .flicker')).animationName);
    check('A4 reduced motion: beamer flame does not flicker', anim === 'none', anim);
    const dmAnim = await page.evaluate(() => Array.from(document.querySelectorAll('*')).filter(e => getComputedStyle(e).animationName !== 'none' && !e.closest('svg')).length);
    check('A4 reduced motion: DM page has no running animations', dmAnim === 0, dmAnim);
    await browser.close();
  }

  // touch and pen: pointer events paint fog without scrolling the page; a tap places a figure
  {
    const { browser, ctx, page } = await launch({ viewport: { width: 820, height: 1180 }, touch: true });
    await startScene(page, 1); await view(page, 'tisch'); await page.check('#vttPreview'); await page.waitForTimeout(250);
    const dark = () => page.evaluate(() => { const c = document.querySelector('#vttCv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 14 && d[i + 1] < 10) n++; return n; });
    const d0 = await dark(); await page.tap('#vttTools [data-tool="reveal"]');
    const bb = await page.locator('#vttCv').boundingBox(); const cdp = await ctx.newCDPSession(page);
    const pt = (x, y) => [{ x: bb.x + x, y: bb.y + y, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(100, 100) });
    for (let i = 1; i <= 15; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(100 + i * 25, 100 + i * 12) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(300);
    check('A4/C9 finger drag paints fog (pointer events)', (await dark()) < d0 - 5000, [d0, await dark()]);
    check('A4/C9 the page did not scroll while painting', (await page.evaluate(() => scrollY)) === 0);
    await page.tap('#vttTools [data-tool="add"]'); await page.tap('.tokbtn.hero >> nth=0'); await page.tap('#vttCv', { position: { x: 300, y: 250 } }); await page.waitForTimeout(600);
    check('C4 tap with the finger places a figure', await page.evaluate(() => JSON.parse(localStorage.getItem('eulenbach3-maps')).village.tokens.length >= 1));
    // pen: the same pointer events, pointerType "pen" (Apple Pencil, Surface pen); cover the fog again with it
    await page.tap('#fogAllOff'); await page.waitForTimeout(300); await page.tap('#vttTools [data-tool="hide"]'); const open0 = await dark();
    const pen = (type, x, y) => cdp.send('Input.dispatchMouseEvent', { type, x: bb.x + x, y: bb.y + y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'pen' });
    await pen('mousePressed', 120, 200); for (let i = 1; i <= 15; i++) await pen('mouseMoved', 120 + i * 25, 200 + i * 6); await pen('mouseReleased', 495, 290); await page.waitForTimeout(300);
    check('A4/C9 pen drag covers fog again (pointerType pen)', (await dark()) > open0 + 5000, [open0, await dark()]);
    await browser.close();
  }
};
