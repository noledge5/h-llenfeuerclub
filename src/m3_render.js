
  /* ============================================================
     2.0: Gemeinsamer Zeichencode (DM-Fenster und Beamer-Fenster).
     Diese Funktionen dürfen nichts aus dem Umfeld benutzen: sie werden
     als Text in das Beamer-Fenster kopiert.
     ============================================================ */
  function evFogApply(g, op, w, h) {
    g.save();
    if (op.k === 'all') {
      if (op.v) { g.globalCompositeOperation = 'source-over'; g.fillStyle = '#0a0705'; g.fillRect(0, 0, w, h); } else { g.clearRect(0, 0, w, h); }
    } else if (op.k === 'r') {
      if (op.v) { g.fillStyle = '#0a0705'; g.fillRect(op.x, op.y, op.w, op.h); } else { g.clearRect(op.x, op.y, op.w, op.h); }
    } else if (op.k === 'b') {
      g.lineCap = 'round'; g.lineJoin = 'round';
      var passes = [[1.34, 0.22], [1.16, 0.4], [1, 1]];
      if (!op.v) g.globalCompositeOperation = 'destination-out'; else g.strokeStyle = '#0a0705';
      var p = op.p;
      passes.forEach(function (ps) {
        g.globalAlpha = ps[1]; g.lineWidth = op.r * 2 * ps[0]; g.strokeStyle = op.v ? '#0a0705' : '#000';
        g.beginPath(); g.moveTo(p[0], p[1]);
        if (p.length === 2) g.lineTo(p[0] + 0.01, p[1]);
        for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
        g.stroke();
      });
    }
    g.restore();
  }
  function evBuildFog(ops, w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); (ops || []).forEach(function (op) { evFogApply(g, op, w, h); });
    return c;
  }
  // g: 2D-Kontext; M: Kartenmodell; A: {base, dm, fog}; o: {dm, scale, tx, ty, fogAlpha, now, ruler, hide}
  function evDrawMap(g, M, A, o) {
    var P = M.P, ox = M.ox, oy = M.oy;
    g.save(); g.setTransform(o.scale, 0, 0, o.scale, o.tx, o.ty);
    if (A.base) g.drawImage(A.base, 0, 0, M.w, M.h);
    if (M.grid && P > 0) {
      var cols = M.cols, rows = M.rows, lw = Math.max(1, P / 90), x, y;
      g.lineWidth = lw; g.strokeStyle = 'rgba(30,18,8,0.5)'; g.beginPath();
      for (x = 0; x <= cols; x++) { g.moveTo(ox + x * P, oy); g.lineTo(ox + x * P, oy + rows * P); }
      for (y = 0; y <= rows; y++) { g.moveTo(ox, oy + y * P); g.lineTo(ox + cols * P, oy + y * P); }
      g.stroke(); g.lineWidth = lw * 0.5; g.strokeStyle = 'rgba(255,240,200,0.28)'; g.stroke();
    }
    if (M.fogOn !== false && A.fog) { g.globalAlpha = o.fogAlpha; g.drawImage(A.fog, 0, 0, M.w, M.h); g.globalAlpha = 1; }
    if (o.dm && A.dm) g.drawImage(A.dm, 0, 0, M.w, M.h);
    var toks = M.tokens || [];
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (!o.dm && (t.hid || t.t === 'dm')) continue;
      var s = t.s || 1, r = (P || 60) * 0.44 * s, cx = ox + (t.x + s / 2) * (P || 60), cy = oy + (t.y + s / 2) * (P || 60);
      g.save();
      if (t.hid && o.dm) g.globalAlpha = 0.5;
      if (t.t === 'dm') {
        g.translate(cx, cy); g.rotate(Math.PI / 4); g.fillStyle = 'rgba(123,31,31,0.85)'; g.strokeStyle = '#e8c76a'; g.lineWidth = Math.max(2, r * 0.1); g.setLineDash([r * 0.3, r * 0.2]);
        g.beginPath(); g.rect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4); g.fill(); g.stroke(); g.rotate(-Math.PI / 4); g.setLineDash([]);
        g.fillStyle = '#f6efd9'; g.font = '700 ' + r * 0.9 + 'px Cinzel, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.ch || '!', 0, r * 0.05);
        g.restore(); continue;
      }
      var ring = t.t === 'foe' ? '#e0675c' : t.t === 'ally' ? '#e08a2e' : '#7fcf98', disc = t.t === 'foe' ? '#4a1614' : '#2a1f17';
      if (t.dead) { ring = '#8a8378'; disc = '#33302b'; g.globalAlpha *= 0.8; }
      g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = r * 0.25; g.shadowOffsetY = r * 0.08;
      g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fillStyle = disc; g.fill(); g.shadowColor = 'transparent';
      g.lineWidth = Math.max(3, r * 0.17); g.strokeStyle = ring; if (t.hid) g.setLineDash([r * 0.35, r * 0.2]); g.stroke(); g.setLineDash([]);
      g.lineWidth = Math.max(1, r * 0.05); g.strokeStyle = '#c9a24b'; g.beginPath(); g.arc(cx, cy, r + Math.max(3, r * 0.17) / 2 + g.lineWidth, 0, 6.2832); g.stroke();
      g.fillStyle = t.dead ? '#a8a296' : '#f1e6cc'; g.font = '700 ' + r * 0.95 + 'px Cinzel, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText((t.ch || (t.n || '?').charAt(0)).toUpperCase(), cx, cy + r * 0.06);
      if (t.dead) { g.strokeStyle = '#d8d0c0'; g.lineWidth = Math.max(3, r * 0.14); g.beginPath(); g.moveTo(cx - r * 0.6, cy - r * 0.6); g.lineTo(cx + r * 0.6, cy + r * 0.6); g.moveTo(cx + r * 0.6, cy - r * 0.6); g.lineTo(cx - r * 0.6, cy + r * 0.6); g.stroke(); }
      if (t.num) { var br = r * 0.36; g.beginPath(); g.arc(cx + r * 0.78, cy + r * 0.78, br, 0, 6.2832); g.fillStyle = '#7b1f1f'; g.fill(); g.lineWidth = Math.max(1.5, r * 0.06); g.strokeStyle = '#e8c76a'; g.stroke(); g.fillStyle = '#f6efd9'; g.font = '700 ' + br * 1.15 + 'px Cinzel, serif'; g.fillText(String(t.num), cx + r * 0.78, cy + r * 0.8); }
      var cs = t.c || [];
      for (var k = 0; k < cs.length && k < 5; k++) { g.beginPath(); g.arc(cx - r * 0.7 + k * r * 0.35, cy - r * 1.02, r * 0.13, 0, 6.2832); g.fillStyle = '#e08a2e'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#1c130b'; g.stroke(); }
      g.restore();
    }
    var pg = M.pings || [];
    for (var j = 0; j < pg.length; j++) {
      var a = (o.now - pg[j].t0) / 1600; if (a < 0 || a > 1) continue;
      for (var q = 0; q < 3; q++) { var aa = a - q * 0.18; if (aa < 0) continue; g.beginPath(); g.arc(pg[j].x, pg[j].y, (P || 60) * (0.3 + aa * 2.2), 0, 6.2832); g.lineWidth = Math.max(3, (P || 60) * 0.07); g.strokeStyle = 'rgba(232,199,106,' + (1 - aa) + ')'; g.stroke(); }
    }
    if (o.ruler) {
      var R = o.ruler; g.strokeStyle = '#e8c76a'; g.lineWidth = Math.max(3, (P || 60) * 0.06); g.setLineDash([(P || 60) * 0.2, (P || 60) * 0.12]);
      g.beginPath(); g.moveTo(R.x1, R.y1); g.lineTo(R.x2, R.y2); g.stroke(); g.setLineDash([]);
      [[R.x1, R.y1], [R.x2, R.y2]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], (P || 60) * 0.12, 0, 6.2832); g.fillStyle = '#e8c76a'; g.fill(); g.strokeStyle = '#1c130b'; g.lineWidth = 2; g.stroke(); });
    }
    g.restore();
  }
