/*
  Adelier Split Hero — crossfade logic ported from the original .dc.html
  component's Component class (leftIdx/rightIdx/turn state machine): the two
  panels take turns advancing to the next image, then the trailing panel
  "catches up" to match before the next turn starts.
*/
(function () {
  var reducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var holdComplete = reducedMotion ? 4400 : 3400;
  var holdHybrid = reducedMotion ? 3200 : 2600;
  var transitionMs = reducedMotion ? 350 : 900;

  document.documentElement.style.setProperty("--adl-transition", transitionMs + "ms");

  var leftLayers = Array.prototype.slice.call(document.querySelectorAll(".adl-panel-a .adl-layer"));
  var rightLayers = Array.prototype.slice.call(document.querySelectorAll(".adl-panel-b .adl-layer"));
  var layerCount = leftLayers.length;

  var state = { leftIdx: 0, rightIdx: 0, turn: "left" };
  var timer = null;

  function applyActive(layers, activeIdx) {
    layers.forEach(function (img, i) {
      var active = i === activeIdx;
      img.style.opacity = active ? "1" : "0";
      img.style.transform = active ? "scale(1)" : "scale(1.045)";
    });
  }

  function render() {
    applyActive(leftLayers, state.leftIdx);
    applyActive(rightLayers, state.rightIdx);
  }

  function step() {
    if (state.leftIdx === state.rightIdx) {
      if (state.turn === "left") {
        state.leftIdx = (state.leftIdx + 1) % layerCount;
      } else {
        state.rightIdx = (state.rightIdx + 1) % layerCount;
      }
      render();
      timer = setTimeout(step, holdHybrid);
    } else {
      if (state.turn === "left") {
        state.rightIdx = state.leftIdx;
        state.turn = "right";
      } else {
        state.leftIdx = state.rightIdx;
        state.turn = "left";
      }
      render();
      timer = setTimeout(step, holdComplete);
    }
  }

  render();
  timer = setTimeout(step, holdComplete);

  window.addEventListener("beforeunload", function () {
    clearTimeout(timer);
  });
})();
