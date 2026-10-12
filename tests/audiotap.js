(() => {
  const oc = AudioNode.prototype.connect;
  window.__ctxs = [];
  window.__peak = 0; window.__rms = 0; window.__maxPeak = 0;
  AudioNode.prototype.connect = function (d, ...r) {
    const ctx = this.context;
    if (d && d === ctx.destination && !(this.__isTap)) {
      if (!ctx.__tap) { const a = ctx.createAnalyser(); a.fftSize = 2048; a.__isTap = true; oc.call(a, d); ctx.__tap = a; window.__ctxs.push(ctx);
        const buf = new Float32Array(2048);
        setInterval(() => { a.getFloatTimeDomainData(buf); let p = 0, s = 0; for (const v of buf) { p = Math.max(p, Math.abs(v)); s += v * v; } window.__peak = p; window.__rms = Math.sqrt(s / buf.length); window.__maxPeak = Math.max(window.__maxPeak, p); }, 50);
      }
      return oc.call(this, ctx.__tap, ...r);
    }
    return oc.call(this, d, ...r);
  };
})();
