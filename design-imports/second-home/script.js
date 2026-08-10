/*
  Adelier Dual Slider Hero — ported from the original .dc.html component's
  Component class (state.leftActive/rightActive/*Incoming/*Start): each side
  loops independently on its own delay/cadence. Default (wipeDirections:
  "opposite") wipes the left side vertically and the right side
  horizontally; each incoming image also eases in from a slight scale-up.
  Reduced motion drops the wipe for a plain crossfade, matching the source.
*/
(function () {
  var TRANSITION_SPEED = 1100; // ms — matches the component's transitionSpeed prop default
  var WIPE_SAME = false; // matches wipeDirections prop default: "opposite"

  var LEFT_POS = [
    { desktop: 'center 40%', mobile: 'center 30%' },
    { desktop: 'center 55%', mobile: 'center 45%' },
    { desktop: 'center 35%', mobile: 'center 40%' },
    { desktop: 'center 45%', mobile: 'center 35%' }
  ];
  var RIGHT_POS = [
    { desktop: 'center 45%', mobile: 'center 40%' },
    { desktop: 'center 50%', mobile: 'center 45%' },
    { desktop: 'center 40%', mobile: 'center 35%' },
    { desktop: 'center 55%', mobile: 'center 50%' }
  ];

  var mqMobile = window.matchMedia('(max-width: 860px)');
  var mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var sides = ['left', 'right'].map(function (name) {
    return {
      name: name,
      positions: name === 'left' ? LEFT_POS : RIGHT_POS,
      layers: Array.prototype.slice.call(document.querySelectorAll('.dsh-layer[data-side="' + name + '"]')),
      active: 0,
      timer: null
    };
  });

  function applyPositions() {
    var isMobile = mqMobile.matches;
    sides.forEach(function (side) {
      side.layers.forEach(function (layer, i) {
        layer.style.objectPosition = isMobile ? side.positions[i].mobile : side.positions[i].desktop;
      });
    });
  }

  function resetLayerStyles(side) {
    var reduced = mqReduced.matches;
    side.layers.forEach(function (layer, i) {
      var isActive = i === side.active;
      layer.style.transition = 'none';
      layer.style.clipPath = 'inset(0px)';
      layer.style.transform = 'scale(1)';
      layer.style.opacity = reduced ? (isActive ? '1' : '0') : '1';
      layer.style.zIndex = isActive ? '2' : '1';
    });
  }

  function crossfadeStep(side) {
    var next = (side.active + 1) % side.layers.length;
    side.layers.forEach(function (layer, i) {
      layer.style.transition = 'opacity 900ms ease';
      layer.style.opacity = i === next ? '1' : '0';
      layer.style.zIndex = i === next ? '2' : '1';
    });
    side.active = next;
    side.timer = setTimeout(function () { crossfadeStep(side); }, 3800 + Math.random() * 800);
  }

  function wipeStep(side) {
    var count = side.layers.length;
    var current = side.active;
    var next = (current + 1) % count;
    var outgoing = side.layers[current];
    var incoming = side.layers[next];
    var vertical = side.name === 'left' || WIPE_SAME;
    var hiddenClip = vertical ? 'inset(100% 0px 0px 0px)' : 'inset(0px 100% 0px 0px)';

    incoming.style.transition = 'none';
    incoming.style.clipPath = hiddenClip;
    incoming.style.transform = 'scale(1.045)';
    incoming.style.zIndex = '3';

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        incoming.style.transition =
          'clip-path ' + TRANSITION_SPEED + 'ms cubic-bezier(.65,0,.35,1), ' +
          'transform ' + TRANSITION_SPEED + 'ms cubic-bezier(.65,0,.35,1)';
        incoming.style.clipPath = 'inset(0px)';
        incoming.style.transform = 'scale(1)';
      });
    });

    side.timer = setTimeout(function () {
      outgoing.style.zIndex = '1';
      incoming.style.zIndex = '2';
      side.active = next;
      var base = side.name === 'left' ? 5200 : 4400;
      side.timer = setTimeout(function () { wipeStep(side); }, base + Math.random() * 900);
    }, TRANSITION_SPEED + 40);
  }

  function start() {
    sides.forEach(function (side) { clearTimeout(side.timer); });

    var reduced = mqReduced.matches;
    sides.forEach(resetLayerStyles);
    applyPositions();

    var stepFn = reduced ? crossfadeStep : wipeStep;
    var leftDelay = reduced ? 4200 : 2600;
    var rightDelay = reduced ? 3400 : 1400;
    sides.forEach(function (side) {
      var delay = side.name === 'left' ? leftDelay : rightDelay;
      side.timer = setTimeout(function () { stepFn(side); }, delay);
    });
  }

  mqMobile.addEventListener('change', applyPositions);
  mqReduced.addEventListener('change', start);

  start();

  window.addEventListener('beforeunload', function () {
    sides.forEach(function (side) { clearTimeout(side.timer); });
  });
})();
