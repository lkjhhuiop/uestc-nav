/*
 * asciify-engine 3.0.1 — wave background browser build
 * Upstream: https://github.com/ayangabryl/asciify-engine
 * Commit: bb0bbdc314350678d06b98d4b6d85ef271c68bbc
 * License: MIT (see LICENSE). The renderer below preserves the upstream
 * algorithm; TypeScript types/imports were removed for classic-script use.
 */
(function (global) {
  'use strict';

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash2(ix, iy) {
    var n = ix * 127 + iy * 311;
    n = ((n >> 13) ^ n);
    return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff;
  }
  function vnoise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = x - ix, fy = y - iy;
    var ux = fade(fx), uy = fade(fy);
    var v00 = hash2(ix, iy), v10 = hash2(ix + 1, iy);
    var v01 = hash2(ix, iy + 1), v11 = hash2(ix + 1, iy + 1);
    return lerp(lerp(v00, v10, ux), lerp(v01, v11, ux), uy);
  }
  function fbm(x, y) {
    return (vnoise(x, y) * .5 + vnoise(x * 2.1, y * 2.1) * .25 +
      vnoise(x * 4.3, y * 4.3) * .125) / .875;
  }

  function renderWaveBackground(ctx, width, height, time, mousePos, options) {
    mousePos = mousePos || { x: .5, y: .5 };
    options = options || {};
    var fontSize = options.fontSize === undefined ? 13 : options.fontSize;
    var charAspect = options.charAspect === undefined ? .62 : options.charAspect;
    var lineHeightRatio = options.lineHeightRatio === undefined ? 1.4 : options.lineHeightRatio;
    var chars = options.chars || ' .:-=+*#%@';
    var baseColor = options.baseColor || null;
    var accentColor = options.accentColor || (options.lightMode ? '#006fd6' : '#35f4f0');
    var accentThreshold = options.accentThreshold === undefined ? .52 : options.accentThreshold;
    var mouseInfluence = options.mouseInfluence === undefined ? .55 : options.mouseInfluence;
    var mouseFalloff = options.mouseFalloff === undefined ? 2.8 : options.mouseFalloff;
    var speed = options.speed === undefined ? 1 : options.speed;
    var vortex = options.vortex !== false;
    var sparkles = options.sparkles !== false;
    var breathe = options.breathe !== false;
    var lightMode = !!options.lightMode;
    var charW = fontSize * charAspect;
    var lineH = fontSize * lineHeightRatio;
    var cols = Math.ceil(width / charW), rows = Math.ceil(height / lineH);
    var mx = mousePos.x, my = mousePos.y;
    var acR = 53, acG = 244, acB = 240;
    var hex = accentColor.replace('#', '');
    if (hex.length === 6) {
      acR = parseInt(hex.slice(0, 2), 16);
      acG = parseInt(hex.slice(2, 4), 16);
      acB = parseInt(hex.slice(4, 6), 16);
    }
    ctx.clearRect(0, 0, width, height);
    ctx.font = fontSize + 'px "SFMono-Regular", "Cascadia Mono", monospace';
    ctx.textBaseline = 'top';
    var t = time * speed;
    var breatheAmp = breathe ? (Math.sin(t * .22) * .5 + .5) * .12 : 0;
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var nx = col / cols, ny = row / rows;
        var w1 = Math.sin(col * .08 + row * .05 + t * .60) * .5 + .5;
        var w2 = Math.sin(col * .03 - row * .07 + t * .40) * .5 + .5;
        var w3 = Math.sin(col * .05 + row * .03 + t * .80) * .5 + .5;
        var sinePart = (w1 + w2 + w3) / 3;
        var noiseShift = t * .08;
        var noisePart = fbm(col * .045 + noiseShift, row * .063 - noiseShift * .7) * .5 + .5;
        var driftPart = Math.sin((col + row * .65) * .06 + t * 1.1) * .5 + .5;
        var wavePart = sinePart * .45 + noisePart * .35 + driftPart * .20 + breatheAmp;
        var dxRaw = nx - mx, dyRaw = ny - my;
        var distRaw = Math.sqrt(dxRaw * dxRaw + dyRaw * dyRaw);
        var vortexBump = 0;
        if (vortex && distRaw < .35) {
          var angle = Math.atan2(dyRaw, dxRaw);
          var swirl = Math.sin(angle * 4 + t * 2.2 - distRaw * 14);
          var falloff = Math.max(0, 1 - distRaw / .35);
          vortexBump = swirl * falloff * falloff * .22;
        }
        var proximity = Math.max(0, 1 - distRaw * mouseFalloff);
        var intensity = wavePart * (1 - mouseInfluence) +
          (proximity + vortexBump * .5) * mouseInfluence + vortexBump * .15;
        var clamped = Math.min(1, Math.max(0, intensity));
        var finalIntensity = clamped;
        if (sparkles && clamped > .72) {
          var bucket = Math.floor(t * 8);
          var sparkleSeed = hash2(col * 7 + bucket * 3, row * 11 + bucket);
          if (sparkleSeed > .88) finalIntensity = Math.min(1, clamped + (sparkleSeed - .88) * 4);
        }
        var char = chars[Math.floor(finalIntensity * (chars.length - 1))];
        if (char === ' ') continue;
        var alpha = .015 + finalIntensity * .07;
        if (finalIntensity > accentThreshold) {
          var accentAlpha = Math.min(lightMode ? .90 : .28, alpha * (lightMode ? 14 : 2.8));
          ctx.fillStyle = 'rgba(' + acR + ',' + acG + ',' + acB + ',' + accentAlpha + ')';
        } else if (baseColor) {
          ctx.fillStyle = baseColor.replace('{a}', String(alpha));
        } else if (lightMode) {
          ctx.fillStyle = 'rgba(0,47,167,' + (alpha * 7) + ')';
        } else {
          ctx.fillStyle = 'rgba(184,241,255,' + alpha + ')';
        }
        ctx.fillText(char, col * charW, row * lineH);
      }
    }
  }

  function asciiWaveBackground(target, options) {
    options = options || {};
    var container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) return { destroy: function () {} };
    var canvas = document.createElement('canvas');
    canvas.className = options.className || 'asciify-wave-canvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    container.prepend(canvas);
    var ctx = canvas.getContext('2d');
    var mouse = { x: .5, y: .5 }, smoothMouse = { x: .5, y: .5 };
    var raf = 0, time = 0, stopped = false;
    function isLight() { return document.documentElement.getAttribute('data-theme') !== 'dark'; }
    function resize() {
      var r = container.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function onMouseMove(event) {
      var r = container.getBoundingClientRect();
      mouse.x = (event.clientX - r.left) / r.width;
      mouse.y = (event.clientY - r.top) / r.height;
    }
    function tick() {
      if (stopped) return;
      smoothMouse.x += (mouse.x - smoothMouse.x) * .07;
      smoothMouse.y += (mouse.y - smoothMouse.y) * .07;
      var r = container.getBoundingClientRect();
      var renderOptions = Object.assign({}, options, {
        lightMode: isLight(),
        baseColor: isLight() ? 'rgba(0,47,167,{a})' : 'rgba(122,222,255,{a})'
      });
      renderWaveBackground(ctx, r.width, r.height, time, smoothMouse, renderOptions);
      time += .016;
      raf = requestAnimationFrame(tick);
    }
    var observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (observer) observer.observe(container);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMouseMove, { passive: true });
    resize();
    raf = requestAnimationFrame(tick);
    return { destroy: function () {
      stopped = true;
      cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMouseMove);
      canvas.remove();
    }};
  }

  global.AsciifyWave = { renderWaveBackground: renderWaveBackground, asciiWaveBackground: asciiWaveBackground };
})(window);
