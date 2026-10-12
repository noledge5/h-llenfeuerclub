
  /* ============================================================
     2.0: Szenenleiste, Sound-Ansicht, Vorbereiten, Export, Tasten
     ============================================================ */
  var DEF_EV = { flicker: 'syn:hiss', out: 'syn:thud', wave: 'syn:crack', down: 'syn:thud', nat20: 'syn:fanfare' };
  var EV_LABEL = { fight: 'Kampf beginnt', end: 'Kampf endet', flicker: 'Laterne flackert', out: 'Laterne erlischt', wave: 'Welle 2 kommt', down: 'Heldin fällt auf 0 TP', nat20: 'Natürliche 20' };
  function fireEv(name) { var id = ST.evsnd[name] !== undefined ? ST.evsnd[name] : DEF_EV[name]; if (id && AU.ctx && AU.ctx.state === 'running') playFx(id); }
  var prevC = null;
  EV.combatChanged = function () {
    var down = C.list.filter(function (c) { return c.hero && c.hp <= 0; }).length;
    var s = { active: C.active, out: C.lantern ? C.lantern.out : 0, max: C.lantern ? C.lantern.max : 0, down: down, waveDone: C.waveDone, enc: C.enc };
    if (prevC && BOOTED) {
      if (!prevC.active && s.active) fireEv('fight');
      if (prevC.active && !s.active) fireEv('end');
      if (C.lantern && prevC.enc === s.enc && s.out > prevC.out) fireEv(s.out >= s.max ? 'out' : 'flicker');
      if (s.down > prevC.down) fireEv('down');
      if (prevC.active && s.active && !prevC.waveDone && s.waveDone && prevC.enc === s.enc) fireEv('wave');
      if (prevC.active !== s.active && AU.ctx) applyScenePlan(cur, s.active);
    }
    prevC = s;
    if (BOOTED) vttCombatChanged();
  };
  EV.dice = function (total, det, cls) {
    curDice = { id: ++diceSeq, total: total, det: det, cls: cls || '' };
    if (cls === 'crit') fireEv('nat20');
    if (ST.diceShow && BOOTED) pushState();
  };

  /* ----- Szenenleiste ----- */
  function mapNames(cf) { return cf.maps.map(function (k) { return getMap(k).name || k; }).join(', ') || '–'; }
  function renderSceneBars() {
    scenes.forEach(function (sc, i) {
      var bar = sc.querySelector('.scenebar'); if (!bar) { bar = document.createElement('div'); bar.className = 'scenebar'; var hd = sc.querySelector('.scene-head'); hd.parentNode.insertBefore(bar, hd.nextSibling); }
      var cf = sceneCfg(i);
      bar.innerHTML = '<button class="btn" type="button" data-start="' + i + '">Szene starten</button><div class="meta"><span><b>Karte</b>' + esc(mapNames(cf)) + '</span><span><b>Bild</b>' + (cf.mood ? esc((libMeta(cf.mood) || {}).name || '?') : 'keins') + '</span><span><b>Ton</b>' + esc(soundName(cf.music)) + '</span></div>' +
        '<button class="btn quiet sm" type="button" data-show="map">Karte zeigen</button><button class="btn quiet sm" type="button" data-show="mood">Bild zeigen</button>';
    });
  }
  $('#scenes').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.start != null && b.closest('.scenebar')) { auResume(); startScene(parseInt(b.dataset.start, 10)); }
    else if (b.dataset.show && b.closest('.scenebar')) { if (!pwAlive()) openBeamer(); loadSceneMap(cur).then(function () { setStage(b.dataset.show); }); }
    else if (b.classList.contains('ho-btn')) {
      var ho = b.closest('.handout'), on = PB.stage === 'handout' && PB.handout && PB.handout.src === ho.dataset.ho;
      if (on) { PB.handout = null; setStage(ST.stage === 'handout' ? 'map' : ST.stage); b.textContent = 'Auf Beamer zeigen'; return; }
      if (!pwAlive()) openBeamer();
      var p = ho.querySelector('p');
      PB.handout = { src: ho.dataset.ho, title: ho.querySelector('.eyebrow').textContent.replace(/^Handout\s*·\s*/, ''), html: p ? p.innerHTML : '', text: p ? p.textContent : '' };
      setStage('handout'); b.textContent = 'Zurück zur Karte';
    }
  });
  $$('#scenes .handout').forEach(function (h, i) { h.dataset.ho = 'h' + i; var b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm ho-btn'; b.textContent = 'Auf Beamer zeigen'; h.appendChild(b); });
  // first: the scene starts with its first map; otherwise any map of the scene that is already shown stays
  function loadSceneMap(i, first) { var cf = sceneCfg(i); if (!cf.maps.length) return Promise.resolve(); if (VT.ras && (first ? VT.key === cf.maps[0] : cf.maps.indexOf(VT.key) >= 0)) return Promise.resolve(); return loadVtt(cf.maps[0]); }
  function startScene(i) {
    showScene(i, true);
    var cf = sceneCfg(i);
    applyScenePlan(i, C.active);
    loadSceneMap(i, true).then(function () {
      var st = cf.stage || (cf.mood ? 'mood' : (cf.maps.length ? 'map' : 'title'));
      if (!pwAlive()) toast('Szene gestartet. Der Beamer ist noch nicht verbunden (Knopf oben).'); else toast('Szene gestartet: Ton und Beamer sind umgestellt');
      PB.handout = null; $$('.ho-btn').forEach(function (b) { b.textContent = 'Auf Beamer zeigen'; });
      setStage(st); renderVttUi(); renderFxBar();
    });
  }

  /* ----- Effekt-Leiste ----- */
  function fxIds() { return sceneCfg(cur).fx; }
  function renderFxBar() {
    var ids = fxIds();
    $('#fxBar').innerHTML = ids.slice(0, 9).map(function (id, i) { return '<button class="slot' + (id ? '' : ' empty') + '" type="button" data-fx="' + i + '" title="' + esc(soundName(id)) + '"><kbd>' + (i + 1) + '</kbd>' + esc(soundName(id)) + '</button>'; }).join('');
  }
  $('#fxBar').addEventListener('click', function (e) { var b = e.target.closest('[data-fx]'); if (b) playFx(fxIds()[parseInt(b.dataset.fx, 10)], b); });
  $('#audioOn').addEventListener('click', auResume);
  $('#fxToggle').addEventListener('click', function () { var o = $('#sndbar').classList.toggle('open'); this.setAttribute('aria-expanded', String(o)); });
  $('#panicBtn').addEventListener('click', panic); $('#panicBtn2').addEventListener('click', panic);
  var duckT; $('#duckBtn').addEventListener('click', function () { auResume(); var on = !AU.ducked; duck(on); clearTimeout(duckT); if (on) duckT = setTimeout(function () { duck(false); }, 180000); });
  function setVolUi() { $('#masterVol').value = ST.vol; $('#muteBtn').setAttribute('aria-pressed', String(ST.mute)); $('#muteBtn').style.opacity = ST.mute ? .55 : 1; }
  $('#masterVol').addEventListener('input', function () { ST.vol = parseInt(this.value, 10); ST.mute = false; saveST(); setVolUi(); auResume(); setMaster(); });
  $('#muteBtn').addEventListener('click', function () { ST.mute = !ST.mute; saveST(); setVolUi(); setMaster(); });
  document.addEventListener('pointerdown', function () { if (AU.ctx && AU.ctx.state !== 'running') auResume(); }, { once: false });

  /* ----- Sound-Ansicht ----- */
  function optsFor(kind, sel) {
    var syn = Object.keys(SYN_NAMES).filter(function (k) { return kind === 'music' ? k.indexOf('syn:pad') === 0 : kind === 'atmo' ? ['syn:wind', 'syn:fire', 'syn:rain', 'syn:hum', 'syn:drops'].indexOf(k) >= 0 : ['syn:hit', 'syn:door', 'syn:bell', 'syn:thunder', 'syn:sparkle', 'syn:crack', 'syn:hiss', 'syn:thud', 'syn:fanfare'].indexOf(k) >= 0; });
    var lib = LIB.filter(function (x) { return x.kind === kind; }).map(function (x) { return x.id; });
    var ids = [''].concat(lib, syn);
    return ids.map(function (id) { return '<option value="' + esc(id) + '"' + (id === (sel || '') ? ' selected' : '') + '>' + esc(id ? (id.indexOf('syn:') === 0 ? '✦ ' : '') + soundName(id) : '– keine –') + '</option>'; }).join('');
  }
  function renderSoundView() {
    if ($('#v-sound').hidden) return;
    var cf = sceneCfg(cur), nm = scenes[cur].dataset.short;
    $('#chMusic').innerHTML = '<p class="fine">Für die Szene <b>' + esc(nm) + '</b>. Änderungen gelten sofort und werden für die Szene gemerkt.</p>' +
      '<label class="field">Musik (Überblendung 3 s)<select data-snd="music">' + optsFor('music', cf.music) + '</select></label>' +
      '<label class="field">Kampfmusik (läuft während eines Kampfes)<select data-snd="comb">' + optsFor('music', cf.comb) + '</select></label>';
    var h = ''; for (var i = 0; i < 3; i++) { var id = cf.atmo[i] || ''; h += '<div class="chrow"><label class="field">Spur ' + (i + 1) + '<select data-snd="atmo" data-i="' + i + '">' + optsFor('atmo', id) + '</select></label><label class="field">Lautstärke<input type="range" data-vol="' + esc(id) + '" min="0" max="100" value="' + Math.round((ST.avol[id] == null ? 0.6 : ST.avol[id]) * 100) + '"' + (id ? '' : ' disabled') + '></label></div>'; }
    $('#chAtmo').innerHTML = h;
    $('#fxGrid').innerHTML = cf.fx.slice(0, 9).map(function (id, i) { return '<div style="display:grid;gap:4px;width:150px"><button class="slot" style="width:100%" type="button" data-fx="' + i + '"><kbd>' + (i + 1) + '</kbd>' + esc(soundName(id)) + '</button><select data-snd="fx" data-i="' + i + '" aria-label="Taste ' + (i + 1) + '">' + optsFor('fx', id) + '</select></div>'; }).join('');
    $('#libList').innerHTML = LIB.filter(function (x) { return x.kind === 'music' || x.kind === 'atmo' || x.kind === 'fx'; }).map(function (x) { return '<li><span class="nm">' + esc(x.name) + '<small>' + ({ music: 'Musik', atmo: 'Atmosphäre', fx: 'Effekt' }[x.kind]) + ' · ' + (x.size / 1048576).toFixed(1) + ' MB</small></span><span class="row"><button class="btn quiet sm" type="button" data-lib-play="' + x.id + '" data-kind="' + x.kind + '">Probehören</button><button class="btn danger sm" type="button" data-lib-del="' + x.id + '">Löschen</button></span></li>'; }).join('') || '<li class="fine">Noch keine eigenen Töne. Die mit ✦ markierten Klänge sind eingebaut.</li>';
    var fxOpts = function (sel) { return '<option value="">– kein Ton –</option>' + optsFor('fx', sel).replace('<option value="">– keine –</option>', ''); };
    $('#evSounds').innerHTML = Object.keys(EV_LABEL).map(function (k) { var cur2 = ST.evsnd[k] !== undefined ? ST.evsnd[k] : (DEF_EV[k] || ''); return '<label class="field">' + EV_LABEL[k] + '<select data-ev="' + k + '">' + optsFor('fx', cur2) + '</select></label>'; }).join('');
  }
  var probe = null;
  $('#v-sound').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.fx != null) { auResume(); return playFx(fxIds()[parseInt(b.dataset.fx, 10)], b); }
    if (b.dataset.libPlay) {
      auResume(); if (b.dataset.kind === 'fx') return playFx(b.dataset.libPlay);
      if (probe) { probe.pause(); probe = null; if (b.dataset.on) { b.dataset.on = ''; b.textContent = 'Probehören'; return; } }
      getUrl(b.dataset.libPlay).then(function (u) { if (!u) return; probe = new Audio(u); probe.volume = 0.7; probe.play(); b.dataset.on = '1'; b.textContent = 'Stopp'; });
    }
    if (b.dataset.libDel) {
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Sicher?'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = '0'; b.textContent = 'Löschen'; } }, 3000); return; }
      var id = b.dataset.libDel; removeMedia(id).then(function () { Object.keys(ST.scenes).forEach(function (k) { var o = ST.scenes[k]; if (o.music === id) o.music = null; if (o.comb === id) o.comb = null; if (o.atmo) o.atmo = o.atmo.filter(function (x) { return x !== id; }); if (o.fx) o.fx = o.fx.map(function (x) { return x === id ? '' : x; }); }); saveST(); renderSoundView(); renderFxBar(); renderSceneBars(); });
    }
  });
  $('#v-sound').addEventListener('change', function (e) {
    var t = e.target, cf = sceneCfg(cur);
    if (t.dataset.vol != null && t.dataset.vol !== '') return setAtmoVol(t.dataset.vol, t.value / 100);
    if (t.dataset.ev) { ST.evsnd[t.dataset.ev] = t.value; saveST(); return; }
    var k = t.dataset.snd; if (!k) return; auResume();
    if (k === 'music') { setSceneCfg(cur, { music: t.value || null }); if (!C.active) playMusic(t.value || null, 3); }
    else if (k === 'comb') { setSceneCfg(cur, { comb: t.value || null }); if (C.active) playMusic(t.value || null, 3); }
    else if (k === 'atmo') { var a = cf.atmo.slice(); while (a.length < 3) a.push(''); a[parseInt(t.dataset.i, 10)] = t.value; a = a.filter(Boolean); setSceneCfg(cur, { atmo: a }); setAtmo(a); }
    else if (k === 'fx') { var f = cf.fx.slice(); f[parseInt(t.dataset.i, 10)] = t.value; setSceneCfg(cur, { fx: f }); renderFxBar(); }
    renderSoundView(); renderSceneBars();
  });
  function takeFiles(files, kind) {
    var list = Array.prototype.slice.call(files).filter(function (f) { return /^audio\//.test(f.type) || /\.(mp3|ogg|wav|m4a|flac|opus)$/i.test(f.name); });
    if (!list.length) return toast('Das waren keine Tondateien');
    Promise.all(list.map(function (f) { return addMedia(kind, f); })).then(function () { toast(list.length + ' Datei(en) hinzugefügt'); renderSoundView(); }).catch(function (er) { toast('Speichern ging nicht: ' + er.message); });
  }
  $('#sndFile').addEventListener('change', function () { takeFiles(this.files, $('#sndKind').value); this.value = ''; });
  $('#dropZone').addEventListener('click', function (e) { if (e.target.tagName !== 'INPUT') $('#sndFile').click(); });
  $('#dropZone').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#sndFile').click(); } });
  ['dragover', 'dragenter'].forEach(function (n) { $('#dropZone').addEventListener(n, function (e) { e.preventDefault(); this.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (n) { $('#dropZone').addEventListener(n, function (e) { e.preventDefault(); this.classList.remove('over'); if (n === 'drop') takeFiles(e.dataTransfer.files, $('#sndKind').value); }); });

  /* ----- Vorbereiten: Karten, Bilder, Maße ----- */
  function mapKeys() { return Object.keys(BUILTIN).concat(ST.custom || []); }
  function dimsOf(key) {
    var M = getMap(key); if (M.img) { var m = libMeta(M.img); return m ? { w: m.w, h: m.h } : null; }
    var B = BUILTIN[key]; if (!B) return null; var k = B.cols ? P_IDEAL / B.cs : 2.4; return { w: Math.round(B.crop[2] * k), h: Math.round(B.crop[3] * k) };
  }
  function verdict(w, h, cols, rows, Pfix) {
    if (!cols) return { cls: '', msg: 'Ohne Raster. Ideal 2560 × 1440 px (16:9). Am Beamer wird das Bild eingepasst.', P: 0 };
    var P = Pfix || w / cols, rr = Math.max(1, Math.round(h / P)), rows2 = rows || rr, rec = Math.max(P_IDEAL, Math.ceil(1080 / rows2)), s = Math.min(1920 / w, 1080 / h), bpx = Math.round(P * s);
    var cls = P >= 140 ? 'ok' : P >= 100 ? '' : 'warn', q = P >= 140 ? 'sehr scharf' : P >= 100 ? 'gut genug' : 'zu klein, wird unscharf';
    return { cls: cls, P: P, msg: Math.round(P) + ' px pro Feld (' + q + '). Am Beamer ' + bpx + ' px pro Feld. Ideal für ' + cols + ' × ' + rows2 + ' Felder: ' + cols * rec + ' × ' + rows2 * rec + ' px (mindestens ' + cols * P_MIN + ' × ' + rows2 * P_MIN + ').' };
  }
  var P_MIN = 100;
  function mapCard(key) {
    var M = getMap(key), d = dimsOf(key) || { w: 0, h: 0 }, v = verdict(d.w, d.h, M.cols, M.rows, (!M.img && BUILTIN[key] && BUILTIN[key].cols) ? P_IDEAL : (M.P || 0)), custom = !BUILTIN[key], hasImg = !!M.img;
    return '<div class="prepscene" data-map="' + key + '"><div class="row"><img class="thumb" data-thumb="' + key + '" alt=""><div style="flex:1 1 220px;min-width:0"><h4>' + esc(M.name || key) + '</h4><div class="fine">' + (d.w ? d.w + ' × ' + d.h + ' px' : '') + (hasImg ? ' · eigenes Bild' : ' · mitgelieferte Skizze') + '</div></div>' +
      '<label class="btn sm quiet" style="cursor:pointer">' + (hasImg ? 'Bild ersetzen' : 'Eigene Karte laden') + '<input type="file" accept="image/png,image/jpeg,image/webp" data-up-map="' + key + '" hidden></label>' +
      (hasImg && !custom ? '<button class="btn sm quiet" type="button" data-map-reset="' + key + '">Zurück zur Skizze</button>' : '') + (custom ? '<button class="btn sm danger" type="button" data-map-del="' + key + '">Löschen</button>' : '') + '</div>' +
      '<div class="calgrid" style="grid-template-columns:repeat(5,minmax(0,1fr))">' +
      [['cols', 'Spalten', M.cols], ['rows', 'Reihen', M.rows], ['P', 'px pro Feld', Math.round(M.P || (!M.img && BUILTIN[key] && BUILTIN[key].cols ? P_IDEAL : (M.cols ? d.w / M.cols : 0)))], ['ox', 'Versatz x', Math.round(M.ox || 0)], ['oy', 'Versatz y', Math.round(M.oy || 0)]].map(function (f) { return '<label class="field">' + f[1] + '<input type="number" min="0" step="1" data-cal="' + f[0] + '" value="' + f[2] + '"' + (!hasImg && !custom ? ' disabled' : '') + '></label>'; }).join('') + '</div>' +
      '<div class="verdict ' + v.cls + '">' + esc(v.msg) + '</div></div>';
  }
  function sceneCard(i) {
    var cf = sceneCfg(i), sc = scenes[i];
    return '<div class="prepscene" data-scene="' + i + '"><h4>' + esc(sc.dataset.short) + ' <span class="fine">· Sitzung ' + sc.dataset.s + '</span></h4>' +
      '<div class="fieldrow"><div class="field" style="flex:1 1 260px">Karten dieser Szene (die erste startet)<div class="chips" style="margin-top:4px">' + mapKeys().map(function (k) { return '<button class="chip" type="button" data-sc-map="' + k + '" aria-pressed="' + (cf.maps.indexOf(k) >= 0) + '">' + esc(getMap(k).name || k) + '</button>'; }).join('') + '</div></div></div>' +
      '<div class="fieldrow"><img class="thumb" data-mood-thumb="' + i + '" alt="" ' + (cf.mood ? '' : 'hidden') + '><label class="btn sm quiet" style="cursor:pointer">' + (cf.mood ? 'Stimmungsbild ersetzen' : 'Stimmungsbild laden') + '<input type="file" accept="image/png,image/jpeg,image/webp" data-up-mood="' + i + '" hidden></label>' + (cf.mood ? '<button class="btn sm quiet" type="button" data-mood-del="' + i + '">Entfernen</button>' : '') +
      '<label class="field">Beamer startet mit<select data-sc-stage="' + i + '"><option value="">automatisch</option><option value="map"' + (cf.stage === 'map' ? ' selected' : '') + '>Karte</option><option value="mood"' + (cf.stage === 'mood' ? ' selected' : '') + '>Stimmungsbild</option><option value="title"' + (cf.stage === 'title' ? ' selected' : '') + '>Titel</option></select></label></div>' +
      '<div class="fine">Ton: Musik ' + esc(soundName(cf.music)) + ' · Atmosphäre ' + esc(cf.atmo.map(soundName).join(', ') || '–') + '. Ändern im Reiter Sound.</div></div>';
  }
  function renderPrep() {
    if ($('#v-vorbereitung').hidden) return;
    $('#prepScenes').innerHTML = '<h4 style="margin:6px 0">Kartenbibliothek</h4>' + mapKeys().map(mapCard).join('') +
      '<div class="row mt"><label class="btn sm" style="cursor:pointer">Neue Karte hinzufügen<input type="file" accept="image/png,image/jpeg,image/webp" id="newMapFile" hidden></label><span class="fine">PNG, JPG oder WebP. Danach Spalten und Reihen eintragen.</span></div>' +
      '<h4 style="margin:22px 0 6px">Szenen</h4>' + scenes.map(function (s, i) { return sceneCard(i); }).join('');
    mapKeys().forEach(function (k) {
      var im = $('[data-thumb="' + k + '"]'); if (!im) return; var M = getMap(k);
      if (M.img) getUrl(M.img).then(function (u) { if (u) im.src = u; }); else builtinRaster(k).then(function (r) { try { im.src = r.base.toDataURL('image/jpeg', 0.6); } catch (e) {} });
    });
    scenes.forEach(function (s, i) { var cf = sceneCfg(i); if (cf.mood) getUrl(cf.mood).then(function (u) { var im = $('[data-mood-thumb="' + i + '"]'); if (im && u) im.src = u; }); });
    renderMath();
  }
  function renderMath() {
    var rows = [['Dorfplatz', 16, 12], ['Halle', 10, 10], ['Keller', 6, 6], ['Turmstube', 6, 6]].map(function (r) {
      var P = Math.max(140, Math.ceil(1080 / r[2])), w = r[1] * P, h = r[2] * P, s = Math.min(1920 / w, 1080 / h);
      return '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + ' × ' + r[2] + '</td><td>' + P + ' px</td><td>' + w + ' × ' + h + '</td><td>' + Math.round(w * s) + ' × ' + Math.round(h * s) + '</td><td>' + Math.round(P * s) + ' px</td></tr>';
    }).join('') + '<tr><td><b>Die Gegend</b></td><td>ohne Raster</td><td>–</td><td>2560 × 1440</td><td>1920 × 1080</td><td>–</td></tr><tr><td><b>Stimmungsbild</b></td><td>–</td><td>–</td><td>1920 × 1080</td><td>1920 × 1080</td><td>–</td></tr>';
    function f(str) { var m = /([\d,]+)\s*m/.exec(str || ''); return m ? Math.round(parseFloat(m[1].replace(',', '.')) / 1.5) : null; }
    var mv = HEROES.map(function (h) { return [h.n, f(h.speed)]; }).concat(Object.keys(MON).map(function (k) { return [MON[k].name, f(MON[k].speed)]; }));
    $('#prepMath').innerHTML = '<p class="muted"><b>1 Feld = 5 ft = 1,5 m.</b> Pixel pro Feld = Bildbreite geteilt durch Spalten. Ziel 140 px, mindestens 100 px. Regel für die Bildgröße: <b>px pro Feld = größer von 140 und (1080 geteilt durch Reihen)</b>, damit das Bild am Beamer nicht hochgezogen wird. Der Beamer zeigt das Bild mit dem Faktor <b>kleiner von (1920 geteilt durch Breite) und (1080 geteilt durch Höhe)</b>.</p>' +
      '<div class="tblwrap"><table class="tbl2"><tr><th>Karte</th><th>Felder</th><th>px pro Feld</th><th>Bildgröße</th><th>am Beamer</th><th>Feld am Beamer</th></tr>' + rows + '</table></div>' +
      '<h4 style="margin:16px 0 6px">Bewegung (Felder pro Zug)</h4><div class="tblwrap"><table class="tbl2"><tr><th>Figur</th><th>Normal</th><th>Schwieriges Gelände, Klettern, Schwimmen, Kriechen</th><th>Spurt (Dash)</th></tr>' + mv.map(function (m) { return '<tr><td>' + esc(m[0]) + '</td><td><b>' + m[1] + '</b></td><td>' + Math.floor(m[1] / 2) + '</td><td>' + m[1] * 2 + '</td></tr>'; }).join('') + '</table></div>' +
      '<p class="muted mt">Aufstehen aus Liegend kostet die halbe Bewegung. Das Lineal zählt jedes Feld einschließlich Diagonale als 1 Feld (Standard). Variante 5-10-5: jede zweite Diagonale zählt doppelt. Reichweiten: 1,5 m = 1 Feld, 3 m = 2 Felder, 9/36 m (Wurfspeer) = 6/24 Felder, 24/96 m (Kurzbogen) = 16/64 Felder. Meter geteilt durch 1,5 ergibt Felder.</p>';
  }
  $('#v-vorbereitung').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.scMap) { var i = parseInt(b.closest('[data-scene]').dataset.scene, 10), cf = sceneCfg(i), a = cf.maps.slice(), p = a.indexOf(b.dataset.scMap); if (p >= 0) a.splice(p, 1); else a.push(b.dataset.scMap); setSceneCfg(i, { maps: a }); renderPrep(); renderSceneBars(); if (i === cur) renderVttUi(); }
    else if (b.dataset.moodDel) { var j = parseInt(b.dataset.moodDel, 10), id = sceneCfg(j).mood; setSceneCfg(j, { mood: null }); if (id) removeMedia(id); renderPrep(); renderSceneBars(); }
    else if (b.dataset.mapReset) { var k = b.dataset.mapReset, M = getMap(k), old = M.img; M.img = null; M.P = 0; M.ox = 0; M.oy = 0; saveMaps(); if (old) removeMedia(old); sentMedia = {}; if (VT.key === k) loadVtt(k); renderPrep(); }
    else if (b.dataset.mapDel) {
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Sicher?'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = '0'; b.textContent = 'Löschen'; } }, 3000); return; }
      var k2 = b.dataset.mapDel, M2 = getMap(k2); if (M2.img) removeMedia(M2.img); delete MAPS[k2]; ST.custom = (ST.custom || []).filter(function (x) { return x !== k2; }); Object.keys(ST.scenes).forEach(function (s) { if (ST.scenes[s].maps) ST.scenes[s].maps = ST.scenes[s].maps.filter(function (x) { return x !== k2; }); }); saveST(); saveMaps(); renderPrep(); renderSceneBars();
    }
  });
  $('#v-vorbereitung').addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'newMapFile' && t.files[0]) {
      var file = t.files[0]; addMedia('map', file).then(function (id) {
        var m = libMeta(id), key = newId('u'), M = defMap(key); M.name = file.name.replace(/\.[^.]+$/, ''); M.img = id; M.calibrated = false; M.cols = Math.max(1, Math.min(60, Math.round(m.w / P_IDEAL))); M.P = 0; M.rows = Math.max(1, Math.round(m.h / (m.w / M.cols)));
        MAPS[key] = M; ST.custom = (ST.custom || []).concat(key); saveST(); saveMaps(); renderPrep(); toast('Karte hinzugefügt. Prüfe Spalten und Reihen.');
      }).catch(function (er) { toast('Bild konnte nicht gelesen werden: ' + er.message); }); t.value = ''; return;
    }
    if (t.dataset.upMap) {
      var k = t.dataset.upMap, f = t.files[0]; if (!f) return;
      addMedia('map', f).then(function (id) { var M = getMap(k), old = M.img; M.img = id; M.P = 0; M.ox = 0; M.oy = 0; var m = libMeta(id); if (M.cols) M.rows = Math.max(1, Math.round(m.h / (m.w / M.cols))); M.calibrated = true; saveMaps(); if (old) removeMedia(old); sentMedia = {}; if (VT.key === k) loadVtt(k); renderPrep(); toast('Karte ersetzt. Prüfe Spalten und Reihen.'); }).catch(function (er) { toast('Bild konnte nicht gelesen werden: ' + er.message); });
      t.value = ''; return;
    }
    if (t.dataset.upMood) {
      var si = parseInt(t.dataset.upMood, 10), f2 = t.files[0]; if (!f2) return;
      addMedia('mood', f2).then(function (id) { var old = sceneCfg(si).mood; setSceneCfg(si, { mood: id }); if (old) removeMedia(old); var m = libMeta(id), ar = m.w / m.h; renderPrep(); renderSceneBars(); toast(Math.abs(ar - 16 / 9) > 0.05 ? 'Hinweis: Das Bild ist nicht 16:9, am Beamer wird es zugeschnitten (ideal 1920 × 1080).' : 'Stimmungsbild gespeichert'); }).catch(function (er) { toast('Bild konnte nicht gelesen werden: ' + er.message); });
      t.value = ''; return;
    }
    if (t.dataset.scStage != null) { setSceneCfg(parseInt(t.dataset.scStage, 10), { stage: t.value || null }); return; }
    if (t.dataset.cal) {
      var key = t.closest('[data-map]').dataset.map, M3 = getMap(key), d = dimsOf(key), v = Math.max(0, parseFloat(t.value) || 0);
      if (t.dataset.cal === 'cols') { M3.cols = Math.round(v); M3.P = 0; M3.rows = M3.cols ? Math.max(1, Math.round(d.h / (d.w / M3.cols))) : 0; }
      else if (t.dataset.cal === 'rows') M3.rows = Math.round(v);
      else if (t.dataset.cal === 'P') { M3.P = v; M3.cols = v ? Math.max(1, Math.round(d.w / v)) : 0; M3.rows = v ? Math.max(1, Math.round(d.h / v)) : 0; }
      else M3[t.dataset.cal] = v;
      saveMaps(); if (VT.key === key) loadVtt(key); renderPrep();
    }
  });

  /* ----- Export / Import ----- */
  function blobToDataUrl(b) { return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(b); }); }
  $('#expBtn').addEventListener('click', function () {
    $('#expInfo').textContent = 'Wird gepackt …'; saveST(); if (!NOSAVE) save('maps', MAPS);
    var ls = {}; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(KEY) === 0) ls[k] = localStorage.getItem(k); } } catch (e) {}
    dbAll().then(function (all) { return Promise.all(all.map(function (r) { return blobToDataUrl(r.blob).then(function (d) { return { id: r.id, kind: r.kind, name: r.name, type: r.type, size: r.size, w: r.w, h: r.h, data: d }; }); })); }).then(function (blobs) {
      var out = JSON.stringify({ app: 'eulenbach-dm-helfer', v: 2, saved: new Date().toISOString(), ls: ls, blobs: blobs });
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type: 'application/json' })); a.download = 'eulenbach-projekt-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove();
      $('#expInfo').textContent = 'Fertig: ' + (out.length / 1048576).toFixed(1) + ' MB, ' + blobs.length + ' Medien.';
    });
  });
  $('#impFile').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return; var r = new FileReader();
    r.onload = function () {
      var j; try { j = JSON.parse(r.result); } catch (e) { return toast('Das ist keine Projektdatei'); }
      if (j.app !== 'eulenbach-dm-helfer') return toast('Das ist keine Projektdatei');
      NOSAVE = true;
      Object.keys(j.ls || {}).forEach(function (k) { try { localStorage.setItem(k, j.ls[k]); } catch (e) {} });
      Promise.all((j.blobs || []).map(function (b) { return fetch(b.data).then(function (x) { return x.blob(); }).then(function (bl) { return dbPut({ id: b.id, kind: b.kind, name: b.name, type: b.type, size: b.size, w: b.w, h: b.h, blob: bl, t: Date.now() }); }); })).then(function () { toast('Projekt geladen. Neu starten …'); setTimeout(function () { location.reload(); }, 900); });
    };
    r.readAsText(f); this.value = '';
  });

  /* ----- Thema, Tasten, Start ----- */
  function applyTheme() { document.documentElement.dataset.theme = ST.theme; $('#themeBtn').setAttribute('aria-pressed', String(ST.theme === 'candle')); }
  $('#themeBtn').addEventListener('click', function () { ST.theme = ST.theme === 'candle' ? 'tome' : 'candle'; saveST(); applyTheme(); });
  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key >= '1' && e.key <= '9') { var id = fxIds()[parseInt(e.key, 10) - 1]; if (id) { auResume(); playFx(id, $('#fxBar [data-fx="' + (parseInt(e.key, 10) - 1) + '"]')); } }
    else if (e.key === 'm' || e.key === 'M') { auResume(); if (AU.music.id) playMusic(null, 1.5); else { var cf = sceneCfg(cur); playMusic(C.active && cf.comb ? cf.comb : cf.music, 3); } }
    else if (e.key === 'f' || e.key === 'F') { if (!pwAlive()) return; setStage(PB.stage === 'map' ? 'mood' : 'map'); }
    else if (e.key === 'd' || e.key === 'D') { $('#duckBtn').click(); }
    else if (e.key === 'Escape') { setTool('select'); VT.tpl = null; }
  });
  var BOOTED = false;
  function onView(id) {
    if (!BOOTED) return;
    if (id === 'tisch') { fitZoom(); renderVttUi(); draw(); }
    if (id === 'sound') { renderSoundView(); auUi(); }
    if (id === 'vorbereitung') renderPrep();
  }
  function injectToggles() {
    $('.vtt-side').insertAdjacentHTML('beforeend', '<h3>Am Beamer einblenden</h3><label class="row"><input type="checkbox" id="optInit"' + (ST.initShow ? ' checked' : '') + '> <span>Reihenfolge im Kampf</span></label><label class="row"><input type="checkbox" id="optDice"' + (ST.diceShow ? ' checked' : '') + '> <span>Würfelergebnisse</span></label>');
    $('#optInit').addEventListener('change', function () { ST.initShow = this.checked; saveST(); pushState(); });
    $('#optDice').addEventListener('change', function () { ST.diceShow = this.checked; saveST(); if (!this.checked) curDice = null; pushState(); });
  }
  applyTheme(); setVolUi();
  dbOpen().then(dbAll).then(function (all) {
    LIB = all.map(function (r) { return { id: r.id, kind: r.kind, name: r.name, size: r.size, w: r.w, h: r.h }; });
    buildTpl(); injectToggles(); renderSceneBars(); renderFxBar(); beamerStatus(); auUi();
    BOOTED = true; prevC = null; EV.combatChanged();
    var cf = sceneCfg(cur); return loadVtt(cf.maps.indexOf(ST.vtMap) >= 0 ? ST.vtMap : (cf.maps[0] || 'village'));
  }).then(function () { setStage(PB.stage); renderVttUi(); var v = load('view', 'spielen'); onView(v); }).catch(function (er) { try { console.error(er); } catch (e) {} });
  window.addEventListener('beforeunload', function () { if (NOSAVE) return; saveST(); save('maps', MAPS); });
