
  /* ============================================================
     2.0: Beamer-Fenster (zweites Fenster, wird vom DM-Fenster gesteuert)
     ============================================================ */
  function playerMain() {
    var $ = function (s) { return document.querySelector(s); };
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var stage = $('#stage'), cv = $('#cv'), g = cv.getContext('2d');
    var S = null, assets = {}, fogC = null, fogKey = '', diceId = 0, diceTimer = 0, anim = 0, sid = null, born = Date.now();
    function fit() { var s = Math.min(innerWidth / 1920, innerHeight / 1080); stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')'; }
    addEventListener('resize', fit); fit();
    // Only messages travel between the two windows (after a reload the pages are different origins).
    function post(m) { m.app = 'eulenbach-beamer'; try { window.opener.postMessage(m, '*'); } catch (e) {} }
    addEventListener('message', function (e) {
      var m = e.data; if (!m || m.app !== 'eulenbach-dm' || e.source !== window.opener) return;
      if (m.ev === 'ping') { post({ ev: 'alive', sid: sid }); return; }
      sid = m.sid;
      if (m.ev === 'media') { createImageBitmap(m.blob).then(function (b) { assets[m.key] = b; apply(); }); }
      else if (m.ev === 'state') { S = m.s; apply(); }
    });
    // Heartbeat: the DM window (also after its reload) learns that we are here and resends everything when it does not know us.
    function beat() {
      post({ ev: 'alive', sid: sid });
      var nl = $('#noLink'); if (!nl) return;
      nl.hidden = !!S || Date.now() - born < 3000;
      nl.textContent = window.opener ? 'Warte auf den DM-Helfer …' : 'Dieses Fenster gehört zu keinem DM-Helfer. Schließe es und öffne es über den Knopf „Beamer“.';
    }
    setInterval(beat, 2000); beat();
    function show(id) { ['vMap', 'vMood', 'vHand', 'vTitle', 'vPause'].forEach(function (v) { $('#' + v).hidden = v !== id; }); }
    var lastMoodHtml = '', lastHand = '';
    function apply() {
      if (!S) return;
      document.body.dataset.theme = 'beamer';
      var m = S.stage;
      show(m === 'map' ? 'vMap' : m === 'mood' ? 'vMood' : m === 'handout' ? 'vHand' : m === 'pause' ? 'vPause' : 'vTitle');
      if (m === 'mood') {
        var md = S.mood || {}, html = md.key && assets[md.key] ? '' : (md.key ? 'wait' : 'gen'), t = (md.title || '') + '|' + (md.sub || '') + '|' + md.key;
        if (t !== lastMoodHtml) {
          lastMoodHtml = t;
          $('#moodCap').innerHTML = '<h2>' + esc(md.title) + '</h2>' + (md.sub ? '<p>' + esc(md.sub) + '</p>' : '');
        }
        var im = $('#moodImg');
        if (md.key && assets[md.key]) { var c2 = im; if (c2.dataset.k !== md.key) { c2.dataset.k = md.key; c2.width = 1920; c2.height = 1080; var gg = c2.getContext('2d'), b = assets[md.key], sc = Math.max(1920 / b.width, 1080 / b.height); gg.drawImage(b, (1920 - b.width * sc) / 2, (1080 - b.height * sc) / 2, b.width * sc, b.height * sc); } im.style.display = 'block'; $('#moodGen').style.display = 'none'; }
        else { im.style.display = 'none'; $('#moodGen').style.display = 'block'; }
      }
      if (m === 'handout') {
        $('#vHand').classList.toggle('withbar', !!S.init);
        var h = S.handout || {}, hh = (h.title || '') + '|' + (h.text || '');
        if (hh !== lastHand) { lastHand = hh; $('#handT').textContent = h.title || 'Handout'; $('#handB').innerHTML = h.html || esc(h.text); }
      }
      renderInit(); renderDice(); draw();
    }
    function renderInit() {
      var el = $('#init'), I = S.init;
      if (!I || !S.stage || S.stage === 'title' || S.stage === 'pause') { el.hidden = true; return; }
      el.hidden = false;
      var h = '<div class="rd"><span>Runde</span><b>' + I.round + '</b></div><div class="row">';
      I.items.forEach(function (it) {
        h += '<div class="med ' + it.side + (it.active ? ' act' : '') + (it.dead ? ' dead' : '') + '"><div class="ring"><div class="face">' + esc((it.n || '?').charAt(0).toUpperCase()) + '</div></div>' +
          '<div class="pl" style="font-size:' + (it.n.length > 10 ? 20 : it.n.length > 8 ? 23 : 27) + 'px">' + esc(it.n) + '</div>' + (it.side === 'hero' ? '<div class="hp"><i style="width:' + Math.round(it.hp * 100) + '%"></i></div>' : '<div class="wd">' + esc(it.word) + '</div>') + (it.active ? '<div class="am">am Zug</div>' : '') + '</div>';
      });
      h += '</div>';
      if (I.lantern) { h += '<div class="lan"><span>Laterne</span>'; for (var i = 0; i < I.lantern.max; i++) h += '<i class="fl' + (i >= I.lantern.max - I.lantern.out ? ' out' : '') + '"></i>'; h += '</div>'; }
      el.innerHTML = h;
    }
    function renderDice() {
      var D = S.dice, el = $('#dice');
      if (!D) { el.hidden = true; return; }
      if (D.id !== diceId) {
        diceId = D.id; clearTimeout(diceTimer);
        el.className = 'dice ' + (D.cls || ''); el.innerHTML = '<b>' + esc(D.total) + '</b><span>' + esc(D.det) + '</span>'; el.hidden = false;
        diceTimer = setTimeout(function () { el.hidden = true; }, 5500);
      }
    }
    function draw() {
      if (!S || S.stage !== 'map') return;
      var M = S.map; g.clearRect(0, 0, 1920, 1080); g.fillStyle = '#060403'; g.fillRect(0, 0, 1920, 1080);
      var A = M && assets[M.key];
      $('#mapWait').hidden = !!A;
      if (!A) return;
      var fk = M.key + '|' + M.w + '|' + M.fogRev;
      if (fk !== fogKey) { fogKey = fk; fogC = evBuildFog(M.fogOps, M.w, M.h); }
      var top = (S.init && S.stage === 'map') ? 224 : 0, s = Math.min(1920 / M.w, (1080 - top) / M.h), tx = (1920 - M.w * s) / 2, ty = top + (1080 - top - M.h * s) / 2, now = Date.now();
      evDrawMap(g, M, { base: A, fog: fogC, dm: null }, { dm: false, scale: s, tx: tx, ty: ty, fogAlpha: 1, now: now });
      var live = (M.pings || []).some(function (p) { return now - p.t0 < 1700; });
      if (live && !anim) { anim = requestAnimationFrame(function () { anim = 0; draw(); }); }
    }
    document.addEventListener('dblclick', function () { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () {}); });
    document.addEventListener('keydown', function (e) { if (e.key === 'f' || e.key === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () {}); } });
    var idle = setTimeout(function () { document.body.style.cursor = 'none'; }, 2500);
    document.addEventListener('mousemove', function () { document.body.style.cursor = 'default'; clearTimeout(idle); idle = setTimeout(function () { document.body.style.cursor = 'none'; }, 2500); });
    // Canvas text needs the fonts loaded before the first draw (they are only fetched when something uses them).
    Promise.all(['700 40px Cinzel', '700 40px "Cinzel Decorative"', 'italic 40px "IM Fell English"', '40px "EB Garamond"'].map(function (f) { return document.fonts && document.fonts.load ? document.fonts.load(f).catch(function () {}) : Promise.resolve(); })).then(function () { draw(); });
  }
  function playerCss() { return '*{box-sizing:border-box}html,body{margin:0;height:100%;background:#000;overflow:hidden}body{font-family:"EB Garamond",Georgia,serif;color:#f8efd9}' +
    '#stage{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform-origin:50% 50%;overflow:hidden;background:#060403}[hidden]{display:none!important}' +
    '#stage>.layer,#stage>canvas{position:absolute;inset:0}#cv{width:1920px;height:1080px}' +
    '#noLink{position:absolute;left:0;right:0;bottom:70px;text-align:center;font:italic 44px "IM Fell English",serif;color:#c4b391;z-index:5;padding:0 120px}#mapWait{display:grid;place-items:center;font:700 48px Cinzel,serif;letter-spacing:.1em;color:#c4b391}' +
    '#vMood{background:#060403}#moodImg,#moodGen{position:absolute;inset:0;width:1920px;height:1080px}' +
    '#moodGen{background:radial-gradient(ellipse at 50% 55%,rgba(224,138,46,.28),transparent 45%),radial-gradient(ellipse at 50% 50%,#1d2c22 0,#0c130e 70%,#060403 100%)}' +
    '#moodCap{position:absolute;left:0;right:0;bottom:0;padding:120px 120px 70px;background:linear-gradient(180deg,transparent,rgba(6,4,3,.88) 60%);text-align:center}' +
    '#moodCap h2{margin:0;font:700 88px/1.1 "Cinzel Decorative",Cinzel,serif;letter-spacing:.04em;color:#f3d27c;text-shadow:0 3px 10px #000}#moodCap p{margin:12px 0 0;font:italic 48px/1.3 "IM Fell English",serif;color:#f8efd9;text-shadow:0 2px 8px #000}' +
    '#vHand.withbar{padding-top:224px}#vHand.withbar .sheet{max-height:800px}#vHand{display:grid;place-items:center;background:radial-gradient(ellipse at 50% 50%,#1b140f,#060403)}' +
    '.sheet{position:relative;width:1560px;min-height:700px;max-height:960px;padding:70px 110px;color:#1c130b;border-radius:4px;border:3px double #5f4410;background:radial-gradient(ellipse at 50% 42%,#efe0bd 58%,#e0cc9c 100%);box-shadow:inset 0 0 90px rgba(120,80,30,.45),0 20px 60px #000}' +
    '.sheet h3{margin:0 0 30px;font:700 40px Cinzel,serif;letter-spacing:.2em;text-transform:uppercase;color:#5f4410;text-align:center}#handB{font:italic 54px/1.4 "IM Fell English",serif;text-align:center}#handB p{margin:0 0 .3em}' +
    '#vTitle,#vPause{display:grid;place-items:center;text-align:center;background:radial-gradient(ellipse at 50% 45%,rgba(224,138,46,.22),transparent 45%),radial-gradient(ellipse at 50% 50%,#1d2c22,#0a100c 70%,#060403)}' +
    '#vTitle h1{margin:20px 0 0;font:700 128px/1.05 "Cinzel Decorative",Cinzel,serif;color:#f3d27c;text-shadow:0 4px 18px #000;letter-spacing:.03em}#vTitle p,#vPause p{margin:24px 0 0;font:italic 52px "IM Fell English",serif;color:#f8efd9}' +
    '#vPause h1{margin:30px 0 0;font:700 120px Cinzel,serif;color:#f3d27c;letter-spacing:.08em;text-transform:uppercase}' +
    '.lamp{width:150px;height:200px;margin:0 auto;display:block;filter:drop-shadow(0 0 40px rgba(224,138,46,.7))}.flicker{animation:fl 1.7s ease-in-out infinite alternate;transform-origin:50% 80%}@keyframes fl{from{transform:scale(1) rotate(-1deg);opacity:.9}to{transform:scale(1.07,1.1) rotate(1.5deg);opacity:1}}' +
    '#init{position:absolute;left:0;right:0;top:0;height:224px;padding:18px 40px 0;display:flex;align-items:flex-start;gap:30px;background:linear-gradient(180deg,rgba(16,11,8,.96),rgba(16,11,8,.78) 80%,transparent);border-bottom:2px solid #8a6d2b}' +
    '#init .rd{flex:none;text-align:center;font:700 26px Cinzel,serif;letter-spacing:.16em;color:#d8c9a6;text-transform:uppercase;padding-top:14px}#init .rd b{display:block;font:700 84px/1 "Cinzel Decorative",Cinzel,serif;color:#f3d27c;letter-spacing:0}' +
    '#init .row{flex:1;display:flex;gap:26px;justify-content:center;flex-wrap:nowrap}.med{width:178px;text-align:center;transition:transform .3s}.med.act{transform:scale(1.08);transform-origin:50% 0}.med.dead{opacity:.45;filter:grayscale(1)}' +
    '.ring{width:92px;height:92px;margin:0 auto;border-radius:50%;padding:6px;background:radial-gradient(circle at 35% 30%,#e8c76a,#c9a24b 50%,#8a6d2b)}.med.act .ring{box-shadow:0 0 30px rgba(243,210,124,.8),0 0 50px rgba(224,138,46,.5)}' +
    '.face{width:100%;height:100%;border-radius:50%;display:grid;place-items:center;font:700 52px "Cinzel Decorative",Cinzel,serif;color:#f6efd9;background:radial-gradient(circle at 35% 30%,#4c8a5f,#1c3a28)}.med.foe .face{background:radial-gradient(circle at 35% 30%,#a63a34,#3a1010)}' +
    '.pl{margin-top:6px;font:700 28px Cinzel,serif;color:#f8efd9;letter-spacing:.02em;padding:0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.med.act .pl{color:#1c130b;background:linear-gradient(180deg,#f3d27c,#c9a24b);border-radius:3px}' +
    '.hp{height:12px;margin:6px 14px 0;border:1px solid #8a6d2b;background:#0f0a07;border-radius:6px;overflow:hidden}.hp i{display:block;height:100%;background:#7fcf98}.wd{margin-top:4px;font:italic 28px "IM Fell English",serif;color:#e0a59c}' +
    '.am{font:700 22px Cinzel,serif;letter-spacing:.14em;text-transform:uppercase;color:#f3d27c;margin-top:2px}' +
    '.lan{flex:none;text-align:center;padding-top:12px;font:700 22px Cinzel,serif;letter-spacing:.14em;text-transform:uppercase;color:#d8c9a6}.lan .fl{display:inline-block;width:34px;height:50px;margin:8px 5px 0;border-radius:50% 50% 50% 50%/68% 68% 32% 32%;background:radial-gradient(ellipse at 50% 75%,#f3d27c,#e08a2e 70%);box-shadow:0 0 26px rgba(224,138,46,.7);animation:fl 1.7s ease-in-out infinite alternate}.lan .fl.out{background:transparent;border:3px dashed #8a6d2b;box-shadow:none;animation:none}' +
    '.dice{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);min-width:520px;padding:40px 70px;text-align:center;border:3px double #c9a24b;border-radius:10px;background:rgba(16,11,8,.92);box-shadow:0 0 90px rgba(0,0,0,.9),0 0 60px rgba(243,210,124,.35)}.dice b{display:block;font:700 260px/1 "Cinzel Decorative",Cinzel,serif;color:#f3d27c}.dice span{display:block;font:italic 52px "IM Fell English",serif;color:#f8efd9}.dice.fail b{color:#e0675c}.dice.crit b{color:#8fe0a8}' +
    '@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}'; }
  function lampSvg() { return '<svg class="lamp" viewBox="0 0 150 200"><rect x="48" y="8" width="54" height="16" rx="4" fill="#c9a24b"/><path d="M40 28h70l-8 140H48z" fill="rgba(30,20,10,.5)" stroke="#c9a24b" stroke-width="5"/><path class="flicker" d="M75 55c22 26 24 52 0 78-24-26-22-52 0-78z" fill="#e08a2e"/><path class="flicker" d="M75 80c10 14 10 28 0 42-10-14-10-28 0-42z" fill="#f3d27c"/><rect x="34" y="168" width="82" height="14" rx="4" fill="#c9a24b"/></svg>'; }
  function playerDoc() {
    var fonts = (document.getElementById('fontfaces') || {}).textContent || '';
    return '<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Eulenbach · Beamer</title><style>' + fonts + playerCss() + '</style></head><body data-theme="beamer"><div id="stage">' +
      '<canvas id="cv" width="1920" height="1080"></canvas><div id="mapWait" class="layer" hidden>Die Karte wird geladen …</div>' +
      '<div id="vMap" class="layer"></div>' +
      '<div id="vMood" class="layer" hidden><canvas id="moodImg" width="1920" height="1080"></canvas><div id="moodGen"><div style="position:absolute;left:0;right:0;top:230px">' + lampSvg() + '</div></div><div id="moodCap"></div></div>' +
      '<div id="vHand" class="layer" hidden><div class="sheet"><h3 id="handT"></h3><div id="handB"></div></div></div>' +
      '<div id="vTitle" class="layer" hidden><div>' + lampSvg() + '<h1>Die Laterne<br>von Eulenbach</h1><p>Ein Abenteuer für fünf Heldinnen</p></div></div>' +
      '<div id="vPause" class="layer" hidden><div>' + lampSvg() + '<h1>Kurze Pause</h1><p>Gleich geht es weiter</p></div></div>' +
      '<div id="init" hidden></div><div id="dice" class="dice" hidden></div><div id="noLink" hidden></div></div>' +
      '<script>' + evFogApply.toString() + evBuildFog.toString() + evDrawMap.toString() + '(' + playerMain.toString() + ')();<' + '/script></body></html>';
  }

  /* ----- Verbindung -----
     The beamer is this same file opened with #beamer. The two windows only exchange messages: after a reload of either
     page their origins differ, so any access to window properties would throw. The beamer sends a heartbeat ("alive",
     with the id of the DM page it last heard from); a DM page that does not match resends everything. */
  var PW = null, sentMedia = {}, pushT = 0, pingSeq = 0, diceSeq = 0, curDice = null, lastAlive = 0;
  var SID = Math.random().toString(36).slice(2) + Date.now().toString(36);
  var PB = { stage: ST.stage, handout: null, pings: [], key: null };
  function pwAlive() { return !!(PW && !PW.closed); }
  function toPlayer(m) { m.app = 'eulenbach-dm'; m.sid = SID; try { PW.postMessage(m, '*'); } catch (e) {} }
  function beamerStatus() {
    var st = !pwAlive() ? 'off' : Date.now() - lastAlive < 7000 ? 'on' : 'wait';
    ['#beamerStat', '#beamerStat2'].forEach(function (s) { var el = $(s); if (el) { el.classList.toggle('on', st === 'on'); el.lastChild.textContent = st === 'on' ? 'Beamer verbunden' : st === 'wait' ? 'Beamer verbindet …' : 'Beamer aus'; } });
  }
  function beamerUrl() { return location.href.split('#')[0] + '#beamer'; }
  function openBeamer() {
    var w = null;
    try { w = window.open('', 'eulenbach-beamer', 'width=1280,height=720,menubar=no,toolbar=no'); } catch (e) {}
    if (!w) { toast('Das Fenster wurde blockiert. Erlaube Pop-ups für diese Seite und tippe nochmal.'); return; }
    PW = w;
    var fresh = false; try { fresh = w.location.href === 'about:blank'; } catch (e) {}
    function load() { try { w.location.href = beamerUrl(); } catch (e) { toast('Beamer-Fenster ließ sich nicht aufbauen'); } }
    if (fresh) load();
    else { // a window of that name exists: ask it, and rebuild it only when nobody answers
      var t0 = lastAlive; toPlayer({ ev: 'ping' });
      setTimeout(function () { if (lastAlive <= t0 && pwAlive()) load(); else { sentMedia = {}; pushState(true); } }, 700);
    }
    try { w.focus(); } catch (e) {}
    beamerStatus();
    toast('Beamer-Fenster offen. Auf den Beamer ziehen und mit F oder Doppelklick Vollbild.');
  }
  window.addEventListener('message', function (e) {
    var m = e.data; if (!m || m.app !== 'eulenbach-beamer' || m.ev !== 'alive' || !e.source) return;
    if (e.source !== PW) PW = e.source; // also finds a beamer again after this page was reloaded
    lastAlive = Date.now(); beamerStatus();
    if (m.sid !== SID) { sentMedia = {}; pushState(true); }
  });
  setInterval(beamerStatus, 1500);
  function mapBlob(key) {
    // Promise<{key, blob}> Basisbild der Karte
    var M = getMap(key);
    if (M.img) return getBlob(M.img).then(function (b) { return b ? { key: 'm:' + key + ':' + M.img, blob: b } : null; });
    return builtinRaster(key).then(function (r) { return canvasBlob(r.base).then(function (b) { return { key: 'b:' + key, blob: b }; }); });
  }
  function ensureMedia(key, blobP) {
    if (sentMedia[key]) return Promise.resolve();
    return blobP().then(function (b) { if (b && pwAlive()) { sentMedia[key] = 1; toPlayer({ ev: 'media', key: key, blob: b }); } });
  }
  function currentModelKey() { return VT && VT.key; }
  function initState() {
    if (!ST.initShow || !C.active || !C.list.length || needIni()) return null;
    return {
      round: C.round,
      items: C.list.map(function (c, i) {
        var f = c.hp / c.max;
        return { n: c.name, side: c.hero ? 'hero' : 'foe', hp: c.hero ? f : null, dead: c.hp <= 0, active: i === C.turn, word: c.hp <= 0 ? 'besiegt' : f <= 0.25 ? 'schwer verletzt' : f < 1 ? 'verletzt' : 'unverletzt' };
      }),
      lantern: C.lantern ? { max: C.lantern.max, out: C.lantern.out } : null
    };
  }
  function buildState() {
    var key = VT && VT.key, M = key ? getMap(key) : null, R = VT && VT.ras, cf = sceneCfg(cur);
    var st = {
      stage: PB.stage, scene: { title: scenes[cur].querySelector('.scene-head h3').textContent },
      mood: { key: cf.mood ? 'mood:' + cf.mood : null, title: scenes[cur].querySelector('.scene-head h3').textContent, sub: 'Sitzung ' + scenes[cur].dataset.s },
      handout: PB.handout, init: initState(), dice: ST.diceShow ? curDice : null, map: null
    };
    if (M && R) {
      st.map = { key: R.key, w: R.w, h: R.h, cols: M.cols, rows: M.rows, ox: R.ox, oy: R.oy, P: R.P, cell: R.cell, grid: M.grid, fogOn: M.fogOn, fogOps: M.fog, fogRev: VT.fogRev,
        tokens: vttPlayerTokens(M), pings: PB.pings.filter(function (p) { return Date.now() - p.t0 < 3000; }) };
    }
    return st;
  }
  function pushState(force) {
    if (!pwAlive()) return;
    var st = buildState(), jobs = [];
    if (st.map && VT && VT.ras && !sentMedia[VT.ras.key]) jobs.push(ensureMedia(VT.ras.key, function () { return mapBlob(VT.key).then(function (r) { return r && r.blob; }); }));
    var cf = sceneCfg(cur);
    if (cf.mood && !sentMedia['mood:' + cf.mood]) jobs.push(ensureMedia('mood:' + cf.mood, function () { return getBlob(cf.mood); }));
    Promise.all(jobs).then(function () { if (pwAlive()) toPlayer({ ev: 'state', s: buildState() }); });
  }
  function schedulePush() { if (ST.send === 'manual' && !arguments[0]) { $('#vttPush').hidden = false; return; } clearTimeout(pushT); pushT = setTimeout(pushState, 60); }
  function setStage(m) {
    PB.stage = m; ST.stage = m === 'handout' ? ST.stage : m; saveST();
    $$('[data-stage]').forEach(function (b) { b.classList.toggle('quiet', b.dataset.stage !== m); });
    pushState();
  }
