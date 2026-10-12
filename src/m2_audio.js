
  /* ============================================================
     2.0: Ton (Web Audio): Musik mit Überblendung, Atmosphäre, Effekte
     ============================================================ */
  var AU = { ctx: null, master: null, bus: {}, music: { cur: null, nodes: [] }, atmo: {}, ducked: false, panic: false };
  function auInit() {
    if (AU.ctx) return AU.ctx;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    var c = AU.ctx = new AC();
    AU.master = c.createGain(); AU.master.gain.value = ST.mute ? 0 : ST.vol / 100; AU.master.connect(c.destination);
    ['music', 'atmo', 'fx'].forEach(function (k) { var g = c.createGain(); g.gain.value = 1; g.connect(AU.master); AU.bus[k] = g; });
    var n = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), d = n.getChannelData(0), b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < d.length; i++) { var w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18; }
    AU.noise = n;
    return c;
  }
  function auResume() {
    var c = auInit(); if (!c) return;
    if (c.state !== 'running') c.resume().then(auUi, auUi); else auUi();
  }
  function auUi() { var on = AU.ctx && AU.ctx.state === 'running'; $('#audioOn').hidden = !!on; var h = $('#audioHint'); if (h) h.textContent = on ? 'Ton ist aktiv. Die Lautstärke regelst du oben rechts.' : 'Browser spielen erst nach einem Klick Ton ab. Tippe auf „Ton aktivieren“.'; }
  function setMaster() { if (!AU.master) return; AU.master.gain.setTargetAtTime(ST.mute ? 0 : Math.pow(ST.vol / 100, 1.6), AU.ctx.currentTime, 0.05); }
  function noiseSrc(rate) { var s = AU.ctx.createBufferSource(); s.buffer = AU.noise; s.loop = true; s.playbackRate.value = rate || 1; s.start(0, Math.random() * 2); return s; }

  /* ----- Klangerzeugung (kein Download nötig) ----- */
  var SYN_LOOPS = {
    'syn:wind': function (out) {
      var c = AU.ctx, s = noiseSrc(0.7), f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.8;
      var l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 0.11; lg.gain.value = 260; l.connect(lg); lg.connect(f.frequency); l.start();
      var g = c.createGain(); g.gain.value = 0.9; s.connect(f); f.connect(g); g.connect(out);
      return function () { try { s.stop(); l.stop(); } catch (e) {} };
    },
    'syn:rain': function (out) {
      var c = AU.ctx, s = noiseSrc(1.6), f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1400; var g = c.createGain(); g.gain.value = 0.55;
      var s2 = noiseSrc(0.5), f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 260; var g2 = c.createGain(); g2.gain.value = 1.1;
      s.connect(f); f.connect(g); g.connect(out); s2.connect(f2); f2.connect(g2); g2.connect(out);
      return function () { try { s.stop(); s2.stop(); } catch (e) {} };
    },
    'syn:fire': function (out) {
      var c = AU.ctx, s = noiseSrc(0.9), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; var g = c.createGain(); g.gain.value = 0.7;
      s.connect(f); f.connect(g); g.connect(out); var alive = true;
      (function crack() {
        if (!alive) return;
        var t = c.currentTime, o = noiseSrc(2 + Math.random() * 3), bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 1500 + Math.random() * 2500; bf.Q.value = 4;
        var eg = c.createGain(); eg.gain.setValueAtTime(0.0001, t); eg.gain.exponentialRampToValueAtTime(0.5 * Math.random() + 0.15, t + 0.004); eg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.06);
        o.connect(bf); bf.connect(eg); eg.connect(out); setTimeout(function () { try { o.stop(); } catch (e) {} }, 200);
        setTimeout(crack, 80 + Math.random() * 700);
      })();
      return function () { alive = false; try { s.stop(); } catch (e) {} };
    },
    'syn:hum': function (out) {
      var c = AU.ctx, a = c.createOscillator(), b = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      a.type = 'sawtooth'; b.type = 'sawtooth'; a.frequency.value = 55; b.frequency.value = 55.7; f.type = 'lowpass'; f.frequency.value = 180; g.gain.value = 0.22;
      var l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 0.07; lg.gain.value = 70; l.connect(lg); lg.connect(f.frequency);
      a.connect(f); b.connect(f); f.connect(g); g.connect(out); a.start(); b.start(); l.start();
      return function () { try { a.stop(); b.stop(); l.stop(); } catch (e) {} };
    },
    'syn:drops': function (out) {
      var c = AU.ctx, alive = true;
      (function drop() {
        if (!alive) return; var t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
        var f0 = 900 + Math.random() * 900; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.45, t + 0.12);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.25); setTimeout(drop, 900 + Math.random() * 3200);
      })();
      return function () { alive = false; };
    }
  };
  var PADS = { 'syn:pad-day': [196, 247, 294, 392], 'syn:pad-night': [110, 131, 165, 196], 'syn:pad-fight': [98, 117, 147, 185], 'syn:pad-wonder': [220, 277, 330, 440] };
  function synPad(id, out) {
    var c = AU.ctx, notes = PADS[id], oscs = [], lfo = c.createOscillator(), lg = c.createGain(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = id === 'syn:pad-fight' ? 520 : 900; g.gain.value = 0.2; f.connect(g); g.connect(out);
    lfo.frequency.value = 0.09; lg.gain.value = 220; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    notes.forEach(function (n, i) { [0, 1].forEach(function (d) { var o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sawtooth'; o.frequency.value = n * (d ? 1.004 : 1); var og = c.createGain(); og.gain.value = 0.13; o.connect(og); og.connect(f); o.start(); oscs.push(o); }); });
    if (id === 'syn:pad-fight') { var pu = c.createOscillator(), pg = c.createGain(); pu.type = 'square'; pu.frequency.value = 49; pg.gain.value = 0; var pl = c.createOscillator(), plg = c.createGain(); pl.frequency.value = 1.6; plg.gain.value = 0.06; pl.connect(plg); plg.connect(pg.gain); pu.connect(pg); pg.connect(f); pu.start(); pl.start(); oscs.push(pu, pl); }
    return function () { try { oscs.forEach(function (o) { o.stop(); }); lfo.stop(); } catch (e) {} };
  }
  function synFx(id) {
    var c = AU.ctx, t = c.currentTime, out = AU.bus.fx;
    function env(g, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak || 0.6, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
    function osc(type, f1, f2, a, d, peak) { var o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d); env(g, a, d, peak); o.connect(g); g.connect(out); o.start(t); o.stop(t + a + d + 0.05); }
    function nz(ftype, freq, a, d, peak, rate) { var s = c.createBufferSource(); s.buffer = AU.noise; s.playbackRate.value = rate || 1; var f = c.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; var g = c.createGain(); env(g, a, d, peak); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 2); s.stop(t + a + d + 0.05); }
    switch (id) {
      case 'syn:hit': nz('lowpass', 900, 0.003, 0.18, 0.9); osc('sine', 180, 50, 0.003, 0.2, 0.8); break;
      case 'syn:door': osc('sawtooth', 90, 140, 0.05, 0.6, 0.25); nz('bandpass', 400, 0.05, 0.7, 0.35, 0.4); break;
      case 'syn:bell': [1, 2.76, 5.4].forEach(function (m, i) { osc('sine', 392 * m, 0, 0.004, 2.8 / (i + 1), 0.4 / (i + 1)); }); break;
      case 'syn:thunder': nz('lowpass', 220, 0.2, 3.2, 1.0, 0.35); osc('sine', 60, 30, 0.1, 2.5, 0.6); break;
      case 'syn:sparkle': [0, 1, 2, 3, 4, 5].forEach(function (k) { setTimeout(function () { var tt = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 1200 + Math.random() * 2200; g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.25, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.35); o.connect(g); g.connect(out); o.start(tt); o.stop(tt + 0.4); }, k * 70); }); break;
      case 'syn:crack': nz('highpass', 2000, 0.002, 0.12, 1.0, 2); osc('square', 220, 70, 0.002, 0.1, 0.3); break;
      case 'syn:hiss': nz('highpass', 3500, 0.05, 0.5, 0.5, 1.5); break;
      case 'syn:thud': osc('sine', 90, 35, 0.004, 0.3, 1.0); break;
      case 'syn:fanfare': [[392, 0], [523, 0.14], [659, 0.28], [784, 0.46]].forEach(function (n) { setTimeout(function () { var tt = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = n[0]; var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.3, tt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.5); o.connect(f); f.connect(g); g.connect(out); o.start(tt); o.stop(tt + 0.55); }, n[1] * 1000); }); break;
    }
  }

  /* ----- Kanäle ----- */
  function mkSource(id, bus) {
    // liefert Promise<{stop(), el?}> ; Schleife
    if (id.indexOf('syn:pad') === 0) { var g0 = AU.ctx.createGain(); g0.connect(bus); var st = synPad(id, g0); return Promise.resolve({ gain: g0, stop: st }); }
    if (SYN_LOOPS[id]) { var g1 = AU.ctx.createGain(); g1.connect(bus); var st1 = SYN_LOOPS[id](g1); return Promise.resolve({ gain: g1, stop: st1 }); }
    return getUrl(id).then(function (u) {
      if (!u) return null;
      var el = new Audio(); el.src = u; el.loop = true; el.crossOrigin = 'anonymous'; el.preload = 'auto';
      var src = AU.ctx.createMediaElementSource(el), g = AU.ctx.createGain(); src.connect(g); g.connect(bus);
      el.play().catch(function () {});
      return { gain: g, el: el, stop: function () { try { el.pause(); src.disconnect(); } catch (e) {} } };
    });
  }
  function fadeIn(node, to, sec) { var t = AU.ctx.currentTime; node.gain.cancelScheduledValues(t); node.gain.setValueAtTime(0.0001, t); node.gain.linearRampToValueAtTime(to, t + sec); }
  function fadeOut(h, sec) { if (!h) return; var t = AU.ctx.currentTime; h.gain.gain.cancelScheduledValues(t); h.gain.gain.setValueAtTime(h.gain.gain.value, t); h.gain.gain.linearRampToValueAtTime(0.0001, t + sec); setTimeout(function () { try { h.stop(); h.gain.disconnect(); } catch (e) {} }, sec * 1000 + 120); }
  var musicToken = 0;
  function playMusic(id, sec) {
    if (!auInit()) return; sec = sec == null ? 3 : sec;
    if (AU.music.id === id) return;
    var tok = ++musicToken, old = AU.music.h; AU.music.id = id; AU.music.h = null;
    if (old) fadeOut(old, sec);
    renderNow();
    if (!id) return;
    mkSource(id, AU.bus.music).then(function (h) { if (!h) { toast('Musik nicht gefunden'); return; } if (tok !== musicToken) { h.stop(); return; } AU.music.h = h; fadeIn(h.gain, 1, sec); });
  }
  function setAtmo(ids) {
    if (!auInit()) return; ids = (ids || []).slice(0, 3);
    Object.keys(AU.atmo).forEach(function (k) { if (ids.indexOf(k) < 0) { fadeOut(AU.atmo[k].h, 2); delete AU.atmo[k]; } });
    ids.forEach(function (id) {
      if (AU.atmo[id]) return; var ent = AU.atmo[id] = { h: null };
      mkSource(id, AU.bus.atmo).then(function (h) { if (!h) { delete AU.atmo[id]; return; } if (AU.atmo[id] !== ent) { h.stop(); return; } ent.h = h; fadeIn(h.gain, ST.avol[id] == null ? 0.6 : ST.avol[id], 2); });
    });
    renderNow();
  }
  function setAtmoVol(id, v) { ST.avol[id] = v; saveST(); var e = AU.atmo[id]; if (e && e.h) e.h.gain.gain.setTargetAtTime(v, AU.ctx.currentTime, 0.05); }
  var fxBuf = {}, fxOn = {};
  function playFx(id, slotEl) {
    if (!id) return; auResume(); if (!AU.ctx) return;
    if (slotEl) { slotEl.classList.add('is-on'); setTimeout(function () { slotEl.classList.remove('is-on'); }, 450); }
    if (id.indexOf('syn:') === 0) return synFx(id);
    var go = function (buf) { var s = AU.ctx.createBufferSource(); s.buffer = buf; s.connect(AU.bus.fx); s.start(); };
    if (fxBuf[id]) return go(fxBuf[id]);
    getBlob(id).then(function (b) { return b && b.arrayBuffer(); }).then(function (ab) { if (!ab) return; return new Promise(function (r, j) { AU.ctx.decodeAudioData(ab, r, j); }); }).then(function (buf) { if (buf) { fxBuf[id] = buf; go(buf); } }).catch(function () { toast('Effekt konnte nicht gelesen werden'); });
  }
  function duck(on) {
    AU.ducked = on; $('#duckBtn').setAttribute('aria-pressed', String(on));
    if (AU.ctx) { AU.bus.music.gain.setTargetAtTime(on ? 0.3 : 1, AU.ctx.currentTime, 0.25); AU.bus.atmo.gain.setTargetAtTime(on ? 0.5 : 1, AU.ctx.currentTime, 0.25); }
  }
  function panic() {
    if (!AU.ctx) return; var t = AU.ctx.currentTime, m = AU.master.gain;
    m.cancelScheduledValues(t); m.setValueAtTime(m.value, t); m.linearRampToValueAtTime(0.0001, t + 2);
    setTimeout(function () {
      playMusic(null, 0.01); setAtmo([]);
      setTimeout(function () { setMaster(); }, 300);
    }, 2100);
    toast('Alles wird ausgeblendet …');
  }
  function renderNow() {
    var nm = AU.music.id ? soundName(AU.music.id) : 'Stille', at = Object.keys(AU.atmo).map(soundName);
    $('#nowPlay').innerHTML = '<b>Musik</b><span>' + esc(nm) + '</span>' + (at.length ? ' · <b>Atmosphäre</b><span>' + esc(at.join(', ')) + '</span>' : '');
    if (typeof renderSoundView === 'function') renderSoundView();
  }
  function applyScenePlan(i, combat) {
    var cf = sceneCfg(i);
    playMusic(combat && cf.comb ? cf.comb : cf.music, 3);
    setAtmo(cf.atmo);
  }
