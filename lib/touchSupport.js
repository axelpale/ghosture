/**
 * Adapted from https://github.com/hammerjs/touchemulator
 */

/**
 * Simple trick to fake touch event support
 * this is enough for most libraries like Modernizr and Hammer
 */
exports.fakeTouchSupport = function () {
  var objs = [window, document.documentElement];
  var props = ['ontouchstart', 'ontouchmove', 'ontouchcancel', 'ontouchend'];

  for (var o = 0; o < objs.length; o += 1) {
    for (var p = 0; p < props.length; p += 1) {
      if (objs[o] && typeof objs[o][props[p]] === 'undefined') {
        objs[o][props[p]] = null;
      }
    }
  }
};

/**
 * we don't have to emulate on a touch device
 * @returns {boolean}
 */
exports.hasTouchSupport = function () {
  return ("ontouchstart" in window) || // touch events
         (window.Modernizr && window.Modernizr.touch) || // modernizr
         (navigator.msMaxTouchPoints || navigator.maxTouchPoints) > 2; // pointer events
};
