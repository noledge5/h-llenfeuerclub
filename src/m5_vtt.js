
  /* ============================================================
     2.0: Spieltisch (VTT): Karte, Raster, Nebel, Figuren, Lineal, Ping
     ============================================================ */
  var VT = { key: null, ras: null, fogC: null, fogRev: 0, zoom: 1, tool: 'select', sel: null, tpl: null, ruler: null, drag: null, op: null, rect: null, loading: 0 };
  var vcv = $('#vttCv'), vg = vcv.getContext('2d'), drawQ = 0;
  function mapPx(M, ras) { return M.P > 0 ? M.P : (M.cols ? ras.w / M.cols : 0); }
  function loadVtt(key) {
    var tok = ++VT.loading;
    var M = getMap(key);
    var p;
    if (M.img) {
      p = getBlob(M.img).then(function (b) { if (!b) return null; return createImageBitmap(b).then(function (bm) { return { key: 'm:' + key + ':' + M.img, w: bm.width, h: bm.height, base: bm, dm: null }; }); });
    } else {
      p = builtinRaster(key).then(function (r) { if (!M.P && r.P) { M.P = r.P; M.ox = r.ox; M.oy = r.oy; M.cols = r.cols; M.rows = r.rows; } return { key: 'b:' + key, w: r.w, h: r.h, base: r.base, dm: r.dm }; });
    }
    return p.then(function (ras) {
      if (tok !== VT.loading) return;
      VT.key = key;
      if (!ras) { VT.ras = null; draw(); return; }
      ras.P = mapPx(M, ras); ras.ox = M.ox || 0; ras.oy = M.oy || 0;
      VT.ras = ras; VT.fogC = evBuildFog(M.fog, ras.w, ras.h); VT.fogRev = (VT.fogRev || 0) + 1; VT.sel = null;
      fitZoom(); $('#vttGrid').checked = M.grid !== false;
      renderVttUi(); draw(); schedulePush();
    });
  }
  function fitZoom() {
    if (!VT.ras) return; var st = $('#vttStage'), w = st.clientWidth || 900;
    VT.zoom = Math.max(0.1, Math.min(1.2, (w - 4) / VT.ras.w));
  }
  function modelFor(M, forPlayer) {
    var dead = {}; C.list.forEach(function (c) { dead[c.name] = c.hp <= 0; });
    return Object.assign({}, M, { w: VT.ras.w, h: VT.ras.h, P: VT.ras.P, ox: VT.ras.ox, oy: VT.ras.oy, tokens: M.tokens.filter(function (t) { return !(forPlayer && (t.hid || t.t === 'dm')); }).map(function (t) { var nm = t.num ? t.n + ' ' + t.num : t.n; return Object.assign({}, t, { dead: !!dead[nm] || (t.num && C.list.filter(function (c) { return c.name === t.n; }).length === 1 && dead[t.n]) }); }), pings: PB.pings });
  }
  function vttPlayerTokens(M) { return M.tokens.filter(function (t) { return !t.hid && t.t !== 'dm'; }).map(function (t) { var nm = t.num ? t.n + ' ' + t.num : t.n, c = C.list.find(function (x) { return x.name === nm || (t.num && x.name === t.n); }); return { t: t.t, n: t.n, num: t.num, ch: t.ch, x: t.x, y: t.y, s: t.s || 1, c: t.c || [], dead: !!(c && c.hp <= 0) }; }); }
  function draw() {
    if (drawQ) return; drawQ = requestAnimationFrame(function () {
      drawQ = 0;
      var hint = $('#vttHint');
      if (!VT.ras) { vcv.width = 10; vcv.height = 10; hint.hidden = false; return; }
      hint.hidden = true;
      var M = getMap(VT.key), z = VT.zoom, w = Math.round(VT.ras.w * z), h = Math.round(VT.ras.h * z);
      if (vcv.width !== w || vcv.height !== h) { vcv.width = w; vcv.height = h; }
      vg.clearRect(0, 0, w, h);
      var prev = $('#vttPreview').checked;
      var MM = modelFor(M, prev);
      evDrawMap(vg, MM, { base: VT.ras.base, fog: VT.fogC, dm: prev ? null : VT.ras.dm }, { dm: !prev, scale: z, tx: 0, ty: 0, fogAlpha: prev ? 1 : 0.55, now: Date.now(), ruler: VT.tool === 'ruler' ? VT.ruler : null });
      vg.save(); vg.setTransform(z, 0, 0, z, 0, 0);
      var t = VT.sel && M.tokens.find(function (x) { return x.id === VT.sel; });
      if (t && !prev) { var P = VT.ras.P || 60, s = t.s || 1; vg.strokeStyle = '#fff1bf'; vg.lineWidth = Math.max(3, P * 0.05); vg.setLineDash([P * 0.12, P * 0.08]); vg.strokeRect(VT.ras.ox + t.x * P, VT.ras.oy + t.y * P, s * P, s * P); }
      if (VT.rect) { var R = VT.rect; vg.strokeStyle = '#e8c76a'; vg.lineWidth = Math.max(3, (VT.ras.P || 60) * 0.05); vg.setLineDash([12, 8]); vg.strokeRect(R.x, R.y, R.w, R.h); }
      vg.restore();
      if ((PB.pings || []).some(function (p) { return Date.now() - p.t0 < 1700; })) draw();
    });
  }
  function toImg(e) { var r = vcv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * VT.ras.w, y: (e.clientY - r.top) / r.height * VT.ras.h }; }
  function cellOf(p) { var P = VT.ras.P || 60; return { x: Math.floor((p.x - VT.ras.ox) / P), y: Math.floor((p.y - VT.ras.oy) / P) }; }
  function tokAt(M, p) {
    var P = VT.ras.P || 60;
    for (var i = M.tokens.length - 1; i >= 0; i--) { var t = M.tokens[i], s = t.s || 1, x0 = VT.ras.ox + t.x * P, y0 = VT.ras.oy + t.y * P; if (p.x >= x0 && p.x <= x0 + s * P && p.y >= y0 && p.y <= y0 + s * P) return t; }
    return null;
  }
  function fogChanged(M) { VT.fogRev++; saveMaps(); draw(); schedulePush(); }
  vcv.addEventListener('pointerdown', function (e) {
    if (!VT.ras) return; var M = getMap(VT.key), p = toImg(e), P = VT.ras.P || 60; vcv.setPointerCapture(e.pointerId);
    var tool = VT.tool;
    if (tool === 'select') {
      var t = tokAt(M, p); VT.sel = t ? t.id : null;
      if (t) { VT.drag = { t: t, dx: p.x - (VT.ras.ox + t.x * P), dy: p.y - (VT.ras.oy + t.y * P), moved: false, ox: t.x, oy: t.y }; }
      renderTokSel(); draw();
    } else if (tool === 'reveal' || tool === 'hide') {
      var r = Math.max(8, (parseFloat($('#brushSz').value) || 2) * P / 2);
      VT.op = { k: 'b', v: tool === 'hide' ? 1 : 0, r: Math.round(r), p: [Math.round(p.x), Math.round(p.y)] }; M.fog.push(VT.op);
      evFogApply(VT.fogC.getContext('2d'), VT.op, VT.ras.w, VT.ras.h); draw();
    } else if (tool === 'rect') { VT.rect0 = p; VT.rect = { x: p.x, y: p.y, w: 0, h: 0 }; VT.shift = e.shiftKey; }
    else if (tool === 'ruler') { VT.ruler = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; rulerOut(); draw(); }
    else if (tool === 'ping') { PB.pings.push({ x: p.x, y: p.y, t0: Date.now() }); PB.pings = PB.pings.slice(-4); draw(); pushState(); }
    else if (tool === 'add') { var c = cellOf(p); if (VT.tpl) placeToken(VT.tpl, c.x, c.y); else toast('Erst eine Figur rechts wählen'); }
  });
  vcv.addEventListener('pointermove', function (e) {
    if (!VT.ras) return; var p = toImg(e), M = getMap(VT.key), P = VT.ras.P || 60;
    if (VT.drag) { var t = VT.drag.t; t.x = (p.x - VT.drag.dx - VT.ras.ox) / P; t.y = (p.y - VT.drag.dy - VT.ras.oy) / P; VT.drag.moved = true; draw(); }
    else if (VT.op) { var pts = VT.op.p, lx = pts[pts.length - 2], ly = pts[pts.length - 1]; if (Math.hypot(p.x - lx, p.y - ly) > VT.op.r / 4) { var seg = { k: 'b', v: VT.op.v, r: VT.op.r, p: [lx, ly, Math.round(p.x), Math.round(p.y)] }; pts.push(Math.round(p.x), Math.round(p.y)); evFogApply(VT.fogC.getContext('2d'), seg, VT.ras.w, VT.ras.h); draw(); } }
    else if (VT.rect) { VT.rect = { x: Math.min(VT.rect0.x, p.x), y: Math.min(VT.rect0.y, p.y), w: Math.abs(p.x - VT.rect0.x), h: Math.abs(p.y - VT.rect0.y) }; draw(); }
    else if (VT.tool === 'ruler' && VT.ruler && e.buttons) { VT.ruler.x2 = p.x; VT.ruler.y2 = p.y; rulerOut(); draw(); }
  });
  function endPointer() {
    if (!VT.ras) return; var M = getMap(VT.key), P = VT.ras.P || 60;
    if (VT.drag) { var t = VT.drag.t; if (VT.drag.moved) { var s = t.s || 1; t.x = Math.max(0, Math.round(t.x)); t.y = Math.max(0, Math.round(t.y)); saveMaps(); schedulePush(); } VT.drag = null; draw(); }
    if (VT.op) { VT.op = null; fogChanged(M); }
    if (VT.rect) {
      var R = VT.rect; VT.rect = null;
      if (R.w > 8 && R.h > 8) {
        if (P && M.cols) { var x0 = Math.round((R.x - VT.ras.ox) / P), y0 = Math.round((R.y - VT.ras.oy) / P), x1 = Math.round((R.x + R.w - VT.ras.ox) / P), y1 = Math.round((R.y + R.h - VT.ras.oy) / P); R = { x: VT.ras.ox + x0 * P, y: VT.ras.oy + y0 * P, w: Math.max(P, (x1 - x0) * P), h: Math.max(P, (y1 - y0) * P) }; }
        var op = { k: 'r', v: VT.shift ? 1 : 0, x: Math.round(R.x), y: Math.round(R.y), w: Math.round(R.w), h: Math.round(R.h) };
        M.fog.push(op); evFogApply(VT.fogC.getContext('2d'), op, VT.ras.w, VT.ras.h); fogChanged(M);
      } else draw();
    }
  }
  vcv.addEventListener('pointerup', endPointer); vcv.addEventListener('pointercancel', endPointer);
  vcv.addEventListener('wheel', function (e) { if (!e.ctrlKey && !e.altKey) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  function zoomBy(f) { VT.zoom = Math.max(0.1, Math.min(2.5, VT.zoom * f)); draw(); }

  /* Fog-Hilfen */
  $('#fogAllOn').addEventListener('click', function () { var M = getMap(VT.key); M.fog = [{ k: 'all', v: 1 }]; VT.fogC = evBuildFog(M.fog, VT.ras.w, VT.ras.h); fogChanged(M); toast('Alles verdeckt'); });
  $('#fogAllOff').addEventListener('click', function () { var M = getMap(VT.key); M.fog.push({ k: 'all', v: 0 }); VT.fogC = evBuildFog(M.fog, VT.ras.w, VT.ras.h); fogChanged(M); toast('Alles aufgedeckt'); });
  $('#fogUndo').addEventListener('click', function () {
    var M = getMap(VT.key); if (M.fog.length <= 1) return toast('Nichts zum Zurücknehmen'); M.fog.pop(); VT.fogC = evBuildFog(M.fog, VT.ras.w, VT.ras.h); fogChanged(M);
  });

  /* Werkzeuge */
  function setTool(t) {
    VT.tool = t; VT.rect = null;
    $$('#vttTools .tool').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tool === t)); });
    vcv.style.cursor = t === 'select' ? 'default' : t === 'add' ? 'copy' : 'crosshair'; draw();
  }
  $('#vttTools').addEventListener('click', function (e) { var b = e.target.closest('.tool'); if (b) setTool(b.dataset.tool); });
  (function () {
    var bar = $('#vttTools'), z = document.createElement('span');
    z.innerHTML = '<span class="sep"></span><button class="btn quiet sm" id="zOut" type="button" aria-label="Verkleinern">−</button> <button class="btn quiet sm" id="zFit" type="button">Einpassen</button> <button class="btn quiet sm" id="zIn" type="button" aria-label="Vergrößern">+</button>';
    bar.appendChild(z);
    $('#zOut').addEventListener('click', function () { zoomBy(1 / 1.2); }); $('#zIn').addEventListener('click', function () { zoomBy(1.2); }); $('#zFit').addEventListener('click', function () { fitZoom(); draw(); });
  })();
  $('#vttGrid').addEventListener('change', function () { var M = getMap(VT.key); M.grid = this.checked; saveMaps(); draw(); schedulePush(); });
  $('#vttPreview').addEventListener('change', draw);
  $('#vttSend').value = ST.send;
  $('#vttSend').addEventListener('change', function () { ST.send = this.value; saveST(); $('#vttPush').hidden = ST.send !== 'manual'; if (ST.send === 'auto') pushState(); });
  $('#vttPush').addEventListener('click', function () { pushState(true); toast('Gesendet'); });
  $('#vttOpen').addEventListener('click', openBeamer); $('#beamerBtn').addEventListener('click', openBeamer);
  $('#vttMapSel').addEventListener('change', function () { loadVtt(this.value); });
  $$('[data-stage]').forEach(function (b) { b.addEventListener('click', function () { setStage(b.dataset.stage); }); });
  window.addEventListener('resize', function () { if (!$('#v-tisch').hidden) { fitZoom(); draw(); } });

  /* Lineal */
  function rulerSquares(R) {
    var P = VT.ras.P || 60, dx = Math.abs(R.x2 - R.x1) / P, dy = Math.abs(R.y2 - R.y1) / P, mx = Math.max(dx, dy), mn = Math.min(dx, dy);
    var sq = $('#ruler510').checked ? mx + Math.floor(mn / 2) : mx; return Math.round(sq * 2) / 2;
  }
  function rulerOut() {
    var el = $('#rulerOut'), R = VT.ruler; if (!R || !VT.ras) { el.textContent = '–'; return; }
    var sq = rulerSquares(R), ft = sq * 5, ms = sq * 1.5, mv = parseInt($('#moveSel').value, 10), sqm = Math.floor(mv / 5);
    el.innerHTML = sq + ' Felder · ' + ms.toLocaleString('de-DE') + ' m · ' + ft + ' ft<br><span class="fine">' + (sq <= sqm ? 'Reicht mit ' + sqm + ' Feldern Bewegung' : 'Zu weit für ' + sqm + ' Felder (mit Spurt ' + sqm * 2 + ')') + '</span>';
  }
  $('#ruler510').addEventListener('change', rulerOut); $('#moveSel').addEventListener('change', function () { moveInfo(); rulerOut(); });
  function moveInfo() {
    var ft = parseInt($('#moveSel').value, 10), sq = Math.floor(ft / 5);
    $('#moveOut').innerHTML = '<table class="tbl2"><tr><td>Normal</td><td><b>' + sq + '</b> Felder</td></tr><tr><td>Schwieriges Gelände, Klettern, Schwimmen, Kriechen</td><td><b>' + Math.floor(sq / 2) + '</b></td></tr><tr><td>Spurt (Dash)</td><td><b>' + sq * 2 + '</b></td></tr><tr><td>Aufstehen aus Liegend</td><td>kostet <b>' + Math.floor(sq / 2) + '</b></td></tr></table>';
  }

  /* Figuren */
  var TPL = [];
  function buildTpl() {
    TPL = HEROES.map(function (h) { return { t: 'hero', n: h.n, ch: h.n.charAt(0), label: h.n }; });
    Object.keys(MON).forEach(function (k) { TPL.push({ t: 'foe', n: MON[k].name, ch: MON[k].name.charAt(0), label: MON[k].name, mon: k }); });
    TPL.push({ t: 'ally', n: 'Bror', ch: 'B', label: 'Bror' }, { t: 'ally', n: 'Verbündete', ch: 'V', label: 'NSC' });
    TPL.push({ t: 'dm', n: 'Falle', ch: 'F', label: 'Falle', hid: true }, { t: 'dm', n: 'Truhe', ch: 'T', label: 'Truhe', hid: true }, { t: 'dm', n: 'Geheimnis', ch: '!', label: 'Geheimnis', hid: true });
  }
  function renderTokPal() {
    $('#tokPal').innerHTML = TPL.map(function (t, i) { return '<button class="tokbtn ' + t.t + '" type="button" data-tpl="' + i + '" aria-pressed="' + (VT.tpl === t) + '"><i></i>' + esc(t.label) + '</button>'; }).join('') +
      '<div style="flex:1 1 100%;display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="btn sm quiet" type="button" id="plHeroes">Alle Heldinnen setzen</button><button class="btn sm quiet" type="button" id="plFoes">Kampf-Gegner setzen</button></div>';
  }
  $('#tokPal').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tpl]');
    if (b) { VT.tpl = TPL[parseInt(b.dataset.tpl, 10)]; setTool('add'); renderTokPal(); return; }
    if (e.target.id === 'plHeroes') { autoPlace('hero'); }
    if (e.target.id === 'plFoes') { autoPlace('foe'); }
  });
  function cellFree(M, x, y) { return !M.tokens.some(function (t) { var s = t.s || 1; return x >= t.x && x < t.x + s && y >= t.y && y < t.y + s; }); }
  function placeToken(tpl, cx, cy) {
    if (!VT.ras || !VT.ras.P) return toast('Für diese Karte ist kein Raster eingestellt'); var M = getMap(VT.key);
    var t = { id: newId('t-'), t: tpl.t, n: tpl.n, ch: tpl.ch, x: Math.max(0, cx), y: Math.max(0, cy), s: 1, hid: !!tpl.hid, c: [] };
    if (tpl.t === 'foe') { t.num = M.tokens.filter(function (x) { return x.t === 'foe' && x.n === tpl.n; }).length + 1; }
    if (tpl.t === 'hero') { var ex = M.tokens.find(function (x) { return x.t === 'hero' && x.n === tpl.n; }); if (ex) { ex.x = t.x; ex.y = t.y; VT.sel = ex.id; saveMaps(); draw(); schedulePush(); renderTokSel(); return; } }
    M.tokens.push(t); VT.sel = t.id; saveMaps(); draw(); schedulePush(); renderTokSel();
  }
  function autoPlace(kind) {
    if (!VT.ras || !VT.ras.P) return toast('Für diese Karte ist kein Raster eingestellt'); var M = getMap(VT.key), cols = M.cols, rows = M.rows;
    var list = kind === 'hero' ? HEROES.map(function (h) { return { t: 'hero', n: h.n, ch: h.n.charAt(0) }; }) : C.list.filter(function (c) { return !c.hero && c.hp > 0; }).map(function (c) { var m = c.mon && MON[c.mon], mt = /^(.*) (\d+)$/.exec(c.name); return { t: 'foe', n: mt ? mt[1] : c.name, num: mt ? parseInt(mt[2], 10) : 0, ch: c.name.charAt(0) }; });
    if (kind === 'foe' && !list.length) return toast('Kein Kampf mit Gegnern aktiv');
    var placed = 0;
    list.forEach(function (tp) {
      if (M.tokens.some(function (t) { return t.t === tp.t && t.n === tp.n && (t.num || 0) === (tp.num || 0); })) return;
      var ys = []; for (var y = 0; y < rows; y++) ys.push(kind === 'hero' ? rows - 1 - y : y);
      outer: for (var yi = 0; yi < ys.length; yi++) for (var d = 0; d < cols; d++) { var x = Math.floor(cols / 2) + (d % 2 ? -(d + 1) / 2 | 0 : d / 2 | 0); if (x < 0 || x >= cols) continue; if (cellFree(M, x, ys[yi])) { M.tokens.push({ id: newId('t-'), t: tp.t, n: tp.n, num: tp.num || undefined, ch: tp.ch, x: x, y: ys[yi], s: 1, hid: false, c: [] }); placed++; break outer; } }
    });
    saveMaps(); draw(); schedulePush(); toast(placed + ' Figuren gesetzt');
  }
  function renderTokSel() {
    var M = VT.key && getMap(VT.key), t = M && M.tokens.find(function (x) { return x.id === VT.sel; }), el = $('#tokSel');
    if (!t) { el.innerHTML = '<p class="fine">Figur anklicken, um sie zu ändern. Ziehen verschiebt sie auf das nächste Feld.</p>'; return; }
    el.innerHTML = '<div class="verdict"><b>' + esc(t.n) + (t.num ? ' ' + t.num : '') + '</b>' +
      '<div class="fieldrow mt"><label class="check" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="tkHid"' + (t.hid ? ' checked' : '') + '> <span>Versteckt (nur du siehst sie)</span></label></div>' +
      '<div class="fieldrow mt"><label class="field">Größe<select id="tkSize"><option value="1"' + (t.s === 1 || !t.s ? ' selected' : '') + '>Mittel (1 Feld)</option><option value="2"' + (t.s === 2 ? ' selected' : '') + '>Groß (2×2)</option><option value="3"' + (t.s === 3 ? ' selected' : '') + '>Riesig (3×3)</option></select></label></div>' +
      '<div class="chips mt">' + COND.map(function (k) { return '<button class="chip" type="button" data-tc="' + k + '" aria-pressed="' + ((t.c || []).indexOf(k) >= 0) + '">' + k + '</button>'; }).join('') + '</div>' +
      '<div class="row mt"><button class="btn sm danger" id="tkDel" type="button">Entfernen</button></div></div>';
  }
  $('#tokSel').addEventListener('click', function (e) {
    var M = getMap(VT.key), t = M.tokens.find(function (x) { return x.id === VT.sel; }); if (!t) return;
    var c = e.target.closest('[data-tc]');
    if (c) { var k = c.dataset.tc, i = (t.c = t.c || []).indexOf(k); if (i >= 0) t.c.splice(i, 1); else t.c.push(k); saveMaps(); renderTokSel(); draw(); schedulePush(); return; }
    if (e.target.id === 'tkDel') {
      var b = e.target; if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Wirklich? Nochmal tippen'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = '0'; b.textContent = 'Entfernen'; } }, 3000); return; }
      M.tokens = M.tokens.filter(function (x) { return x.id !== t.id; }); VT.sel = null; saveMaps(); renderTokSel(); draw(); schedulePush();
    }
  });
  $('#tokSel').addEventListener('change', function (e) {
    var M = getMap(VT.key), t = M.tokens.find(function (x) { return x.id === VT.sel; }); if (!t) return;
    if (e.target.id === 'tkHid') t.hid = e.target.checked; if (e.target.id === 'tkSize') t.s = parseInt(e.target.value, 10);
    saveMaps(); draw(); schedulePush();
  });

  /* Kopfzeile des Spieltischs */
  function vttInfo() {
    var el = $('#vttInfo'); if (!VT.ras) { el.textContent = ''; return; }
    var M = getMap(VT.key), r = VT.ras, s = Math.min(1920 / r.w, 1080 / r.h);
    el.textContent = (M.name || VT.key) + ' · Bild ' + r.w + ' × ' + r.h + ' px' + (r.P ? ' · ' + M.cols + ' × ' + M.rows + ' Felder · ' + Math.round(r.P) + ' px pro Feld · am Beamer ' + Math.round(r.P * s) + ' px pro Feld' : ' · ohne Raster') + '. Strg + Mausrad zoomt.';
    $('#vttEyebrow').textContent = '1 Feld = 1,5 m = 5 ft';
  }
  function renderVttUi() {
    var cf = sceneCfg(cur), sel = $('#vttMapSel');
    sel.innerHTML = cf.maps.map(function (k) { return '<option value="' + k + '"' + (k === VT.key ? ' selected' : '') + '>' + esc(getMap(k).name || k) + '</option>'; }).join('');
    $('#vttPush').hidden = ST.send !== 'manual';
    vttInfo(); renderTokPal(); renderTokSel(); moveInfo();
    $$('[data-stage]').forEach(function (b) { b.classList.toggle('quiet', b.dataset.stage !== PB.stage); });
  }
  // Kampf-Änderungen wirken auf tote Figuren und die Beamer-Leiste
  function vttCombatChanged() { if (VT.ras) draw(); schedulePush(); }
