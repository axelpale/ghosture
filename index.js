var ghosture;

var Gesture = function (x, y, onGestureEnd) {

  // Sequence of functions
  var sequence = [];

  // To be executed at the very last
  var onEnd = onGestureEnd;

  sequence.push(function touchStart(next) {
    // emit touchstart at x, y
    next();
  });

  this.cancel = function () { return this; };

  this.during = function () { return this; };

  this.end = function () {
    // Add the last one
    sequence.push(onEnd);

    // Execute the sequence recursively
    if (sequence.length > 0) {
      (function iterate(list, i) {
        list[i](function () {
          if (i + 1 < list.length) {
            iterate(list, i + 1);
          }
        });
      }(sequence, 0));
    }
  };

  this.moveBy = function () { return this; };

  this.moveTo = function () { return this; };

  this.then = function (fn) {
    sequence.push(function execFn(next) {
      fn();
      next();
    });
    return this;
  };

  this.wait = function () { return this; };
};



module.exports = function ghosture(gesturefn, done) {
  var numGestures = 0; // number of running gestures

  var onGestureEnd = function () {
    numGestures -= 1;
    if (numGestures === 0) {
      done(); // all gestures finished
    }
  };

  gesturefn(function start(x, y) {
    numGestures += 1;
    return new Gesture(x, y, onGestureEnd);
  });
};
