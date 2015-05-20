var GTouchEmitter = require('./lib/GTouchEmitter');
var touchSupport = require('./lib/touchSupport');
var tween = require('component-tween');
var raf = require('raf'); // requestAnimationFrame polyfill

var emit = new GTouchEmitter();

// Add ontouchstart and similar document attributes to fake
// touch support detection in libraries like Modernizr and Hammer.
if (!touchSupport.hasTouchSupport()) {
  touchSupport.fakeTouchSupport();
}

// Default callback
var noop = function () {};

var Gesture = function (x, y) {

  // Sequence of functions to be executed when '.run()' is called.
  var sequence = [];

  // Identifier of the touch.
  // Defined during the first function execution (start)
  var id;

  sequence.push(function start(next) {
    // emit touchstart at x, y
    id = emit.touchstart(x, y);
    next();
  });

  this.cancel = function () {
    sequence.push(function cancel(next) {
      emit.touchcancel(id, x, y);
      next();
    });
    return this;
  };

  this.end = function () {
    sequence.push(function end(next) {
      emit.touchend(id, x, y);
      next();
    });
    return this;
  };

  this.hold = function (arg) {
    var delay;

    // Argument validation
    if (typeof arg === 'number') {
      delay = arg;
    } else if (typeof arg === 'object') {
      if (arg.hasOwnProperty('duration') &&
          typeof arg.duration === 'number') {
        delay = arg.duration;
      } else {
        throw new Error('Invalid argument');
      }
    } else if (typeof arg === 'undefined'){
      delay = 100; // Default
    } else {
      throw new Error('Invalid argument');
    }

    sequence.push(function hold(then) {
      setTimeout(then, delay);
    });

    return this;
  };

  this.moveBy = function (arg1, arg2, arg3, arg4) {

    var dx;
    var dy;
    var duration;
    var ease;

    // Parameter handling here
    dx = arg1;
    dy = arg2;
    duration = arg3;
    ease = (typeof arg4 === 'undefined') ? 'linear' : arg4;

    sequence.push(function moveBy(next) {
      var animate;

      var tw = tween({x: x, y: y})
        .ease(ease)
        .to({x: x + dx, y: y + dy})
        .duration(duration);

      tw.update(function (o) {
        emit.touchmove(id, o.x, o.y);
      });

      tw.on('end', function () {
        animate = function () {};
        next();
      });

      animate = function () {
        raf(animate);
        tw.update();
      };
      animate();
    });

    return this;
  };

  this.moveTo = function (arg1, arg2, arg3, arg4) {

    var tx;
    var ty;
    var duration;
    var ease;

    // Parameter handling here
    tx = arg1;
    ty = arg2;
    duration = arg3;
    ease = (typeof arg4 === 'undefined') ? 'linear' : arg4;

    return this.moveBy(tx - x, ty - y, duration, ease);
  };

  this.run = function (finalCallback) {
    // Add the last one
    if (typeof finalCallback === 'function') {
      sequence.push(finalCallback);
    }

    // Execute the sequence recursively
    if (sequence.length > 0) {
      (function iterate(list, i) {
        list[i](function next() {
          if (i + 1 < list.length) {
            iterate(list, i + 1);
          }
        });
      }(sequence, 0));
    }
  };

  this.then = function (fn) {
    sequence.push(function then(next) {
      fn();
      next();
    });
    return this;
  };

  this.wait = this.hold;
};


exports.start = function (x, y) {
  return new Gesture(x, y);
};
