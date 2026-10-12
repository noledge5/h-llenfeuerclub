
  /* ============================================================
     2.0: Speicher, Medien, Karten-Modelle
     ============================================================ */
  var SK = { st: 'ev2-state', maps: 'ev2-maps' };
  var ST = load('v2', null) || {};
  ST.vol = ST.vol == null ? 80 : ST.vol; ST.mute = !!ST.mute; ST.theme = ST.theme || 'tome';
  ST.scenes = ST.scenes || {}; ST.send = ST.send || 'auto'; ST.stage = ST.stage || 'map'; ST.diceShow = !!ST.diceShow;
  ST.avol = ST.avol || {}; ST.evsnd = ST.evsnd || {}; ST.initShow = ST.initShow !== false;
  var NOSAVE = false;
  function saveST() { if (!NOSAVE) save('v2', ST); }

  /* ---------- IndexedDB (Bilder und Töne als Blobs) ---------- */
  var DB = null, LIB = [], blobCache = {}, urlCache = {};
  function dbOpen() {
    return new Promise(function (res) {
      if (!window.indexedDB) return res(null);
      var rq; try { rq = indexedDB.open('eulenbach-v2', 1); } catch (e) { return res(null); }
      rq.onupgradeneeded = function () { rq.result.createObjectStore('blobs', { keyPath: 'id' }); };
      rq.onsuccess = function () { DB = rq.result; res(DB); };
      rq.onerror = function () { res(null); };
    });
  }
  function dbTx(mode) { return DB.transaction('blobs', mode).objectStore('blobs'); }
  function dbPut(rec) { return new Promise(function (res, rej) { if (!DB) return rej(new Error('Kein Speicher')); var r = dbTx('readwrite').put(rec); r.onsuccess = function () { res(rec.id); }; r.onerror = function () { rej(r.error); }; }); }
  function dbGet(id) { return new Promise(function (res) { if (!DB) return res(null); var r = dbTx('readonly').get(id); r.onsuccess = function () { res(r.result || null); }; r.onerror = function () { res(null); }; }); }
  function dbDel(id) { return new Promise(function (res) { if (!DB) return res(); var r = dbTx('readwrite').delete(id); r.onsuccess = r.onerror = function () { res(); }; }); }
  function dbAll() { return new Promise(function (res) { if (!DB) return res([]); var r = dbTx('readonly').getAll(); r.onsuccess = function () { res(r.result || []); }; r.onerror = function () { res([]); }; }); }
  function newId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function libMeta(id) { return LIB.find(function (x) { return x.id === id; }); }
  function getBlob(id) {
    if (blobCache[id]) return Promise.resolve(blobCache[id]);
    return dbGet(id).then(function (r) { if (r) blobCache[id] = r.blob; return r ? r.blob : null; });
  }
  function getUrl(id) { return getBlob(id).then(function (b) { if (!b) return null; return urlCache[id] || (urlCache[id] = URL.createObjectURL(b)); }); }
  function imgDims(blob) {
    return new Promise(function (res) {
      var u = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { res({ w: im.naturalWidth, h: im.naturalHeight }); URL.revokeObjectURL(u); };
      im.onerror = function () { res(null); URL.revokeObjectURL(u); };
      im.src = u;
    });
  }
  function addMedia(kind, file) {
    var id = newId(kind[0] + '-');
    var rec = { id: id, kind: kind, name: file.name.replace(/\.[^.]+$/, ''), blob: file, type: file.type, size: file.size, t: Date.now() };
    var p = (kind === 'map' || kind === 'mood') ? imgDims(file).then(function (d) { if (!d) throw new Error('Kein Bild'); rec.w = d.w; rec.h = d.h; }) : Promise.resolve();
    return p.then(function () { return dbPut(rec); }).then(function () {
      blobCache[id] = file; LIB.push({ id: id, kind: kind, name: rec.name, size: rec.size, w: rec.w, h: rec.h });
      return id;
    });
  }
  function removeMedia(id) {
    return dbDel(id).then(function () {
      delete blobCache[id]; if (urlCache[id]) { URL.revokeObjectURL(urlCache[id]); delete urlCache[id]; }
      LIB = LIB.filter(function (x) { return x.id !== id; });
    });
  }

  /* ---------- Karten: eingebaute Skizzen + eigene Bilder ---------- */
  var P_IDEAL = 140;
  // Eingebaute Karten: SVG-Ausschnitt (viewBox), Raster in SVG-Einheiten, wird auf 140 px pro Feld hochgerechnet.
  var BUILTIN = {
    village: { name: 'Dorfplatz', src: 'mapVillage', crop: [0, 0, 572, 424], cols: 16, rows: 12, ox: 20, oy: 26, cs: 32 },
    hall:    { name: 'Halle', src: 'mapHall', crop: [0, 0, 360, 370], cols: 10, rows: 10, ox: 20, oy: 26, cs: 32 },
    cellar:  { name: 'Keller', src: 'mapCellar', crop: [0, 0, 232, 248], cols: 6, rows: 6, ox: 20, oy: 26, cs: 32 },
    tower:   { name: 'Turmstube', src: 'mapCellar', crop: [242, 0, 232, 248], cols: 6, rows: 6, ox: 20, oy: 26, cs: 32 },
    region:  { name: 'Die Gegend', src: 'mapRegion', crop: [0, 0, 400, 505], cols: 0, rows: 0, ox: 0, oy: 0, cs: 32 }
  };
  var SVG_CSS = '.m-grid{stroke:#7a5a2c55;stroke-width:1}.m-frame{fill:none;stroke:#6b4f2a;stroke-width:1.5}.m-bld{fill:#cdb682;stroke:#3b2a16;stroke-width:1.5}.m-wall{fill:none;stroke:#3b2a16;stroke-width:5}.m-thin{fill:none;stroke:#3b2a16;stroke-width:1.5}.m-path{fill:#cdb682;opacity:.55}.m-fog{fill:url(#fog)}.m-water{fill:url(#water);stroke:#6b4f2a;stroke-width:1}.m-fire{fill:#d9822b}.m-fireo{fill:none;stroke:#d9822b;stroke-width:2}.m-wood{fill:#d2b87a;stroke:#9a5a1c;stroke-width:1.5}.m-txt{fill:#2a1d12;font-family:Georgia,serif;font-size:12px}.m-txt.s{font-size:10.5px;fill:#5c4630}.m-txt.b{font-weight:700}.m-txt.dmt{fill:#7b1f1f;font-weight:700}.mk-z{fill:#e9d9b5;stroke:#7b1f1f;stroke-width:2.5}.mk-g{fill:#e9d9b5;stroke:#2d5a3d;stroke-width:2.5}.mk-p{fill:#e9d9b5;stroke:#b4641c;stroke-width:2.5}.mk-r{fill:#7b1f1f}.mk-t{font-family:Georgia,serif;font-size:11px;font-weight:700;text-anchor:middle;dominant-baseline:central;fill:#2a1d12}.mk-t.light{fill:#e9d9b5}.m-hatch{stroke:#8a6d4b;stroke-width:1.2}.m-water-l{stroke:#6b4f2a;stroke-width:1}.m-stream{fill:none;stroke:#6b4f2a;stroke-width:3}.m-stream.dry{stroke-dasharray:3 5}.m-dash{fill:none;stroke:#3b2a16;stroke-width:2;stroke-dasharray:6 5}.m-tree{fill:#3b2a16}';
  var builtinCache = {};
  // liefert { base: Canvas, dm: Canvas|null, w, h, cols, rows, ox, oy }
  function builtinRaster(key) {
    if (builtinCache[key]) return builtinCache[key];
    var B = BUILTIN[key], src = document.querySelector('#' + B.src + ' svg');
    var k = B.cols ? P_IDEAL / B.cs : 2.4, W = Math.round(B.crop[2] * k), H = Math.round(B.crop[3] * k);
    function mk(onlyDm) {
      return new Promise(function (res) {
        var clone = src.cloneNode(true);
        clone.setAttribute('viewBox', B.crop.join(' ')); clone.setAttribute('width', W); clone.setAttribute('height', H);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        Array.prototype.forEach.call(clone.querySelectorAll('.dm'), function (n) { if (!onlyDm) n.remove(); });
        if (onlyDm) {
          // alles außer den DM-Gruppen entfernen (Defs behalten)
          Array.prototype.slice.call(clone.children).forEach(function (n) { if (n.tagName !== 'defs' && !(n.getAttribute('class') || '').match(/\bdm\b/)) n.remove(); });
        }
        var st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = SVG_CSS; clone.insertBefore(st, clone.firstChild);
        var d = new XMLSerializer().serializeToString(clone);
        var im = new Image();
        im.onload = function () {
          var c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
          if (!onlyDm) { g.fillStyle = '#e9d9b5'; g.fillRect(0, 0, W, H); }
          g.drawImage(im, 0, 0, W, H); res(c);
        };
        im.onerror = function () { res(null); };
        im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(d);
      });
    }
    var hasDm = !!src.querySelector('.dm');
    builtinCache[key] = Promise.all([mk(false), hasDm ? mk(true) : Promise.resolve(null)]).then(function (r) {
      return { base: r[0], dm: r[1], w: W, h: H, cols: B.cols, rows: B.rows, ox: Math.round((B.ox - 0) * k), oy: Math.round(B.oy * k), P: B.cols ? P_IDEAL : 0 };
    });
    return builtinCache[key];
  }
  function canvasBlob(c) { return new Promise(function (res) { c.toBlob(function (b) { res(b); }, 'image/png'); }); }

  /* Modelle: pro Karte Raster, Nebel, Figuren */
  var MAPS = load('maps', null) || {};
  function defMap(key) {
    var B = BUILTIN[key];
    return { key: key, name: B ? B.name : key, img: null, cols: B ? B.cols : 0, rows: B ? B.rows : 0, ox: 0, oy: 0, grid: true, fog: [{ k: 'all', v: 1 }], tokens: [], fogOn: true, builtin: !!B, calibrated: !!B };
  }
  function getMap(key) {
    if (!MAPS[key]) MAPS[key] = defMap(key);
    return MAPS[key];
  }
  var saveMapsT;
  function saveMaps() { clearTimeout(saveMapsT); saveMapsT = setTimeout(function () { if (!NOSAVE) save('maps', MAPS); }, 400); }

  var DEF_SCENES = [
    { maps: ['region'], atmo: ['syn:wind'], music: 'syn:pad-day' },
    { maps: ['village'], atmo: ['syn:fire'], music: 'syn:pad-day', comb: 'syn:pad-fight' },
    { maps: ['region'], atmo: ['syn:wind', 'syn:fire'], music: 'syn:pad-night' },
    { maps: ['region'], atmo: ['syn:drops', 'syn:wind'], music: 'syn:pad-day' },
    { maps: ['hall', 'cellar'], atmo: ['syn:hum', 'syn:wind'], music: 'syn:pad-night', comb: 'syn:pad-fight' },
    { maps: ['hall'], atmo: ['syn:fire', 'syn:drops'], music: 'syn:pad-day', comb: 'syn:pad-fight' },
    { maps: ['tower'], atmo: ['syn:wind', 'syn:hum'], music: 'syn:pad-wonder' },
    { maps: ['hall'], atmo: ['syn:rain', 'syn:hum'], music: 'syn:pad-fight', comb: 'syn:pad-fight' },
    { maps: ['village'], atmo: ['syn:fire'], music: 'syn:pad-day' }
  ];
  var DEF_FX = ['syn:hit', 'syn:door', 'syn:bell', 'syn:thunder', 'syn:sparkle', 'syn:crack', 'syn:hiss', 'syn:thud', 'syn:fanfare'];
  function sceneCfg(i) {
    var d = DEF_SCENES[i] || { maps: [], atmo: [] }, o = ST.scenes[i] || {};
    return {
      maps: o.maps || d.maps.slice(), mood: o.mood || null, stage: o.stage || null,
      music: o.music !== undefined ? o.music : (d.music || null), comb: o.comb !== undefined ? o.comb : (d.comb || null),
      atmo: o.atmo || (d.atmo || []).slice(), fx: o.fx || DEF_FX.slice(), title: o.title
    };
  }
  function setSceneCfg(i, patch) { ST.scenes[i] = Object.assign({}, ST.scenes[i] || {}, patch); saveST(); }
  var SYN_NAMES = {
    'syn:pad-day': 'Abend im Dorf (Klangteppich)', 'syn:pad-night': 'Dunkle Nacht (Klangteppich)', 'syn:pad-fight': 'Spannung (Klangteppich)', 'syn:pad-wonder': 'Staunen (Klangteppich)',
    'syn:wind': 'Wind', 'syn:fire': 'Feuerknistern', 'syn:rain': 'Regen und Sturm', 'syn:hum': 'Nebelsummen', 'syn:drops': 'Tropfen',
    'syn:hit': 'Treffer', 'syn:door': 'Tür knarrt', 'syn:bell': 'Glocke', 'syn:thunder': 'Donner', 'syn:sparkle': 'Funkeln', 'syn:crack': 'Knacken', 'syn:hiss': 'Zischen', 'syn:thud': 'Dumpfer Schlag', 'syn:fanfare': 'Fanfare'
  };
  function soundName(id) { if (!id) return '–'; if (id.indexOf('syn:') === 0) return SYN_NAMES[id] || id; var m = libMeta(id); return m ? m.name : 'fehlt'; }
