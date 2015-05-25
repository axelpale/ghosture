var GTouchEmitter = require('./lib/GTouchEmitter');
var touchSupport = require('./lib/touchSupport');
var version = require('./lib/version');
var tween = require('component-tween');
var cssTime = require('css-time');
var raf = require('raf'); // requestAnimationFrame polyfill

var ChainingError = function (throwerFnName) {
  this.name = 'ChainingError';
  this.message = throwerFnName + ' is probably wrongly chained.';
};
ChainingError.prototype = new Error();

var ParameterError = function (paramName, value) {
  this.name = 'ParameterError';
  this.message = 'Invalid ' + paramName + ' value: ' + value;
};
ParameterError.prototype = new Error();

var emit = new GTouchEmitter();

// Add ontouchstart and similar document attributes to fake
// touch support detection in libraries like Modernizr and Hammer.
if (!touchSupport.hasTouchSupport()) {
  touchSupport.fakeTouchSupport();
}

// Default callback
var noop = function () {};
var DEFAULT_DURATION = 50;

var Gesture = function (x, y) {

  // Sequence of functions to be executed when '.run()' is called.
  var sequence = [];

  // Identifier of the touch.
  // Defined during the first function execution (start)
  var id;

  // A gesture can only ended or cancelled once.
  var finished = false;

  sequence.push(function start(next) {
    // emit touchstart at x, y
    id = emit.touchstart(x, y);
    if (id === null) {
      throw new Error('Point (' + x + ', ' + y + ') is outside the document');
    }
    next();
  });

  this.cancel = function () {
    if (finished) {
      throw new ChainingError('cancel');
    } // else
    finished = true;

    sequence.push(function cancel(next) {
      emit.touchcancel(id, x, y);
      next();
    });
    return this;
  };

  this.end = function () {
    if (finished) {
      throw new ChainingError('end');
    } // else
    finished = true;

    sequence.push(function end(next) {
      emit.touchend(id, x, y);
      next();
    });
    return this;
  };

  /**
   * @param {number|string} duration
   */
  this.hold = function (duration) {
    if (finished) {
      throw new ChainingError('hold');
    } // else

    var delay;

    // Argument validation
    if (typeof duration === 'number') {
      delay = duration;
    } else if (typeof duration === 'string') {
      try {
        delay = cssTime.from(duration);
      } catch (err) {
        throw new ParameterError('duration', duration);
      }
    } else if (typeof duration === 'undefined'){
      delay = DEFAULT_DURATION;
    } else {
      throw new ParameterError('duration', duration);
    }

    sequence.push(function hold(then) {
      setTimeout(then, delay);
    });

    return this;
  };

  /**
   * @param {number} dx
   * @param {number} dy
   * @param {string} [duration='50ms'] - Duration in millisecs or CSS time string.
   * @param {string} [easing='linear']
   * @throws ChainingError
   */
  this.moveBy = function (dx, dy, duration, easing) {
    if (finished) {
      throw new ChainingError('moveBy');
    } // else

    // Parameter handling here
    if (typeof duration === 'undefined') { duration = DEFAULT_DURATION; }
    if (typeof easing === 'undefined') { easing = 'linear'; }
    if (typeof duration === 'string') {
      try {
        duration = cssTime.from(duration);
      } catch (err) {
        throw new ParameterError('duration', duration);
      }
    }

    sequence.push(function moveBy(next) {
      var animate;

      var tw = tween({x: x, y: y})
        .ease(easing)
        .to({x: x + dx, y: y + dy})
        .duration(duration);

      tw.update(function (o) {
        x = o.x; // Update the knowledge where the pointer is.
        y = o.y;
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

  /**
   * @param {number} dx
   * @param {number} dy
   * @param {string} [duration='50ms'] - Duration in millisecs or CSS time string.
   * @param {string} [easing='linear']
   * @throws ChainingError
   */
  this.moveTo = function (tx, ty, duration, easing) {
    return this.moveBy(tx - x, ty - y, duration, easing);
  };

  this.run = function (finalCallback) {
    // Add the last one
    if (typeof finalCallback === 'function') {
      sequence.push(finalCallback);
    }

    // Execute the function sequence recursively.
    // Remove the function to be executed from the sequence before
    // its execution. This is a precaution for the situation where
    // a fn in the sequence would add new fns to the sequence.
    (function consume(list) {
      if (list.length > 0) {
        list.shift()(function next() {
          consume(list);
        });
      }
    }(sequence));

    return this;
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

exports.numTouches = function () {
  return emit.numTouches();
};

exports.endTouches = function () {
  return emit.endTouches();
};

exports.version = version;
