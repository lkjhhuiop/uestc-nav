(function () {
  'use strict';
  var host = document.getElementById('asciiBackdrop');
  var engine = window.AsciifyWave;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var instance = null;

  function stop() {
    if (instance) instance.destroy();
    instance = null;
  }

  function start() {
    stop();
    if (!host || !engine || reduceMotion.matches || document.hidden) return;
    instance = engine.asciiWaveBackground(host, {
      fontSize: 15,
      charAspect: .64,
      lineHeightRatio: 1.42,
      chars: '  ·∙:;=+*#%@',
      speed: .54,
      mouseInfluence: .74,
      mouseFalloff: 2.55,
      accentColor: '#00cbd7',
      accentThreshold: .5,
      vortex: true,
      sparkles: true,
      breathe: true
    });
  }

  function onVisibilityChange() { document.hidden ? stop() : start(); }
  document.addEventListener('visibilitychange', onVisibilityChange);
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', start);
  else reduceMotion.addListener(start);
  start();
})();
