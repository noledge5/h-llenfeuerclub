
  /* ============================================================
     2.0: Ton (Web Audio): Musik mit Überblendung, Atmosphäre, Effekte
     ============================================================ */
  var AU = { ctx: null, master: null, bus: {}, music: { cur: null, nodes: [] }, atmo: {}, ducked: false, panic: false };
  function auInit() {
    if (AU.ctx) return AU.ctx;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    var c = AU.ctx = new AC();
    AU.master = c.createGain(); AU.master.gain.value = ST.mute ? 0 : Math.pow(ST.vol / 100, 1.6);
    // soft limiter: quiet sounds pass unchanged, peaks bend towards 0.73 and can never clip
    var lim = c.createWaveShaper(), curve = new Float32Array(2049); for (var q = 0; q < 2049; q++) { var x = q / 1024 - 1; curve[q] = Math.tanh(1.1 * x) / 1.1; }
    lim.curve = curve; lim.oversample = '2x'; AU.master.connect(lim); lim.connect(c.destination);
    ['music', 'atmo', 'fx'].forEach(function (k) { var g = c.createGain(); g.gain.value = k === 'fx' ? 0.75 : 1; g.connect(AU.master); AU.bus[k] = g; });
    var rl = c.sampleRate * 3, ir = c.createBuffer(2, rl, c.sampleRate); for (var ch = 0; ch < 2; ch++) { var dd = ir.getChannelData(ch); for (var i2 = 0; i2 < rl; i2++) dd[i2] = (Math.random() * 2 - 1) * Math.pow(1 - i2 / rl, 2.6); }
    AU.ir = ir;
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
  /* Music beds: a chord progression with slowly crossfading voices, a few plucked notes, an echo and a reverb.
     "Spannung" has a low heartbeat instead of plucks. Semitones are counted from the root note of the mood. */
  var MOODS = {
    'syn:pad-day': { root: 146.83, prog: [[0, 7, 12, 16], [-5, 2, 7, 11], [-3, 4, 9, 12], [-7, 0, 5, 9]], len: 9, wave: ['triangle', 'sawtooth'], cut: 1300, vol: 0.55, pluck: { scale: [0, 2, 4, 7, 9], oct: [12, 24], every: [1.8, 4.5], type: 'triangle', dec: 1.6, vol: 0.5 } },
    'syn:pad-night': { root: 110, prog: [[0, 7, 12, 15], [-4, 3, 8, 12], [-2, 5, 10, 14], [-5, 2, 7, 10]], len: 11, wave: ['sawtooth', 'sine'], cut: 700, vol: 0.5, pluck: { scale: [0, 3, 5, 7, 10], oct: [24], every: [4, 9], type: 'sine', dec: 3, vol: 0.4 } },
    'syn:pad-wonder': { root: 130.81, prog: [[0, 7, 11, 16], [-3, 4, 7, 12], [-7, 0, 4, 9], [-5, 2, 7, 12]], len: 8, wave: ['triangle', 'sine'], cut: 2600, vol: 0.5, pluck: { scale: [0, 2, 4, 7, 9], oct: [12, 24, 36], every: [0.5, 1.5], type: 'sine', dec: 1.2, vol: 0.4 } },
    'syn:pad-fight': { root: 73.42, prog: [[0, 6, 12, 15], [1, 7, 13, 18], [-2, 4, 10, 15], [3, 9, 15, 18]], len: 7, wave: ['sawtooth', 'square'], cut: 900, vol: 0.45, pulse: 112 }
  };
  function musicBed(id, out) {
    var c = AU.ctx, cfg = MOODS[id], nodes = [], alive = true, step = 0, beat = 0;
    var bus = c.createGain(); bus.gain.value = cfg.vol; bus.connect(out);
    var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cfg.cut; f.Q.value = 0.7; f.connect(bus);
    var rv = c.createConvolver(); rv.buffer = AU.ir; var rg = c.createGain(); rg.gain.value = 0.45; rv.connect(rg); rg.connect(bus);
    var echo = c.createDelay(1.5), eg = c.createGain(); echo.delayTime.value = 0.42; eg.gain.value = 0.33; echo.connect(eg); eg.connect(echo); eg.connect(bus);
    var pl = c.createGain(); pl.connect(bus); pl.connect(echo); pl.connect(rv); f.connect(rv);
    var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = cfg.cut * 0.35; lfo.connect(lg); lg.connect(f.frequency); lfo.start(); nodes.push(lfo);
    function hz(semi) { return cfg.root * Math.pow(2, semi / 12); }
    function voice(type, f0, t, att, hold, rel, peak, dest) {
      var o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f0; o.detune.value = (Math.random() - 0.5) * 12;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.setValueAtTime(peak, t + att + hold); g.gain.linearRampToValueAtTime(0.0001, t + att + hold + rel);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + att + hold + rel + 0.05); nodes.push(o);
      o.onended = function () { var i = nodes.indexOf(o); if (i >= 0) nodes.splice(i, 1); try { g.disconnect(); } catch (e) {} };
    }
    function chord(t) { var ch = cfg.prog[step++ % cfg.prog.length]; ch.forEach(function (sm) { cfg.wave.forEach(function (w, j) { voice(w, hz(sm) * (j ? 1.003 : 1), t, cfg.len * 0.4, cfg.len * 0.45, cfg.len * 0.4, 0.34 / ch.length, f); }); }); }
    function pluck(t) { var p = cfg.pluck, sm = p.scale[Math.floor(Math.random() * p.scale.length)] + p.oct[Math.floor(Math.random() * p.oct.length)]; voice(p.type, hz(sm), t, 0.008, 0, p.dec, p.vol * 0.5, pl); }
    function pulse(t, n) { // heartbeat: a thump on every beat, stronger on the first of four
      var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(n % 4 === 0 ? 0.9 : 0.6, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.35); nodes.push(o); o.onended = function () { var i = nodes.indexOf(o); if (i >= 0) nodes.splice(i, 1); };
      if (n % 8 === 6) voice('sawtooth', hz(30 + (n % 3)), t, 1.4, 0.2, 1.4, 0.05, f); // a rising sting now and then
    }
    var nextChord = c.currentTime + 0.05, nextPluck = c.currentTime + cfg.len * 0.45, nextBeat = c.currentTime + 0.2;
    function tick() {
      if (!alive) return; var now = c.currentTime;
      while (nextChord < now + 1) { chord(nextChord); nextChord += cfg.len; }
      if (cfg.pluck) while (nextPluck < now + 1) { pluck(nextPluck); nextPluck += cfg.pluck.every[0] + Math.random() * (cfg.pluck.every[1] - cfg.pluck.every[0]); }
      if (cfg.pulse) while (nextBeat < now + 1) { pulse(nextBeat, beat++); nextBeat += 60 / cfg.pulse; }
    }
    tick(); var timer = setInterval(tick, 250);
    return function () { alive = false; clearInterval(timer); nodes.slice().forEach(function (o) { try { o.stop(); } catch (e) {} }); };
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
    if (MOODS[id]) { var g0 = AU.ctx.createGain(); g0.connect(bus); var st = musicBed(id, g0); return Promise.resolve({ gain: g0, stop: st }); }
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
  function setAtmo(ids, sec) {
    if (!auInit()) return; ids = (ids || []).filter(Boolean).slice(0, 3); // empty slots stay empty
    Object.keys(AU.atmo).forEach(function (k) { if (ids.indexOf(k) < 0) { fadeOut(AU.atmo[k].h, sec == null ? 2 : sec); delete AU.atmo[k]; } });
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
      playMusic(null, 0.01); setAtmo([], 0.01);
      setTimeout(function () { setMaster(); }, 600); // after the sources are stopped (fadeOut stops them 120 ms later)
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
