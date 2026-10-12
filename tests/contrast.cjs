// WCAG contrast measured on the real picture. axe cannot decide on gradients and textures, so:
// scroll through the page; at each position list the visible text (colour, size), take a screenshot with all text made
// invisible, read the background under every text from it and compute the ratio. Large text needs 3, other text 4.5.
// Covered, clipped and disabled text is skipped; the worst 8 % of pixels in a text box are ignored (borders, ornaments).
async function measure(page) {
  const vh = await page.evaluate(() => innerHeight);
  const maxY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  const seen = new Set(), failures = []; let count = 0;
  for (let y = 0; ; y += vh - 120) {
    const sy = Math.min(y, maxY);
    await page.evaluate((yy) => window.scrollTo(0, yy), sy); await page.waitForTimeout(120);
    const items = await page.evaluate(() => {
      const out = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const tn = walker.currentNode; if (!tn.nodeValue.trim()) continue;
        const el = tn.parentElement; if (!el || el.closest('svg, script, style, [hidden], [disabled], [aria-disabled="true"]')) continue;
        const cs = getComputedStyle(el); if (cs.visibility !== 'visible' || cs.display === 'none') continue;
        const er = el.getBoundingClientRect(); if (er.width <= 2 || er.height <= 2) continue;
        let op = 1, p = el; while (p) { op *= parseFloat(getComputedStyle(p).opacity); p = p.parentElement; }
        if (op < 0.05) continue;
        const range = document.createRange(); range.selectNodeContents(tn); const r = range.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) continue;
        // the shadow above a fixed bottom bar darkens the picture there: such text is measured at another scroll position
        const bars = Array.from(document.querySelectorAll('.sndbar, .nav')).filter(b => getComputedStyle(b).position === 'fixed').map(b => b.getBoundingClientRect().top);
        if (bars.length && r.bottom > Math.min(...bars) - 26 && !el.closest('.sndbar, .nav')) continue;
        const pts = [[0.5, 0.5], [0.05, 0.2], [0.95, 0.2], [0.05, 0.8], [0.95, 0.8]]; // covered or clipped away in any of five points: skip
        if (!pts.every(([fx, fy]) => { const top = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); return top && (top === el || el.contains(top) || top.contains(el)); })) continue;
        const m = /rgba?\(([^)]+)\)/.exec(cs.color)[1].split(',').map(Number);
        out.push({ key: el.tagName + '|' + tn.nodeValue.trim().slice(0, 30) + '|' + Math.round(r.left) + '|' + Math.round(r.top + scrollY), t: tn.nodeValue.trim().slice(0, 40), x: r.left, y: r.top, w: r.width, h: r.height, c: [m[0], m[1], m[2], m.length > 3 ? m[3] : 1], op, size: parseFloat(cs.fontSize), bold: parseInt(cs.fontWeight, 10) >= 700, tag: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '') });
      }
      return out;
    });
    const fresh = items.filter(i => { if (seen.has(i.key)) return false; seen.add(i.key); return true; });
    if (fresh.length) {
      count += fresh.length;
      const st = await page.addStyleTag({ content: '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}::placeholder{color:transparent!important}' });
      await page.waitForTimeout(120);
      const shot = await page.screenshot();
      await st.evaluate(n => n.remove());
      failures.push(...await page.evaluate(async ([b64, list]) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const lum = ([r, gg, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b); };
        const res = [];
        for (const it of list) {
          // only the middle of the text box: its edges often touch borders and ornaments
          const x0 = Math.max(0, Math.floor(it.x + it.w * 0.05)), y0 = Math.max(0, Math.floor(it.y + it.h * 0.25)), w = Math.max(1, Math.min(Math.floor(it.w * 0.9), c.width - x0)), h = Math.max(1, Math.min(Math.floor(it.h * 0.5), c.height - y0));
          const d = g.getImageData(x0, y0, w, h).data, step = Math.max(1, Math.floor(d.length / 4 / 500)), ratios = [];
          for (let i = 0; i < d.length; i += 4 * step) {
            const p = [d[i], d[i + 1], d[i + 2]], a = it.c[3] * it.op, fg = [0, 1, 2].map(k => it.c[k] * a + p[k] * (1 - a)), l1 = lum(fg), l2 = lum(p);
            ratios.push([(Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), p]);
          }
          ratios.sort((a, b) => a[0] - b[0]); const cut = ratios[Math.floor(ratios.length * 0.08)] || ratios[0];
          const large = it.size >= 24 || (it.size >= 18.66 && it.bold), need = large ? 3 : 4.5;
          if (cut[0] < need) res.push({ y: Math.round(it.y), x: Math.round(it.x), t: it.t, tag: it.tag, ratio: +cut[0].toFixed(2), need, size: it.size, fg: it.c.slice(0, 3).join(','), bg: cut[1].join(',') });
        }
        return res;
      }, [shot.toString('base64'), fresh]));
    }
    if (sy >= maxY) break;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return { count, failures };
}
module.exports = { measure };
