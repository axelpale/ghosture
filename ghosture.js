(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ghosture = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// See docs
//   https://developer.mozilla.org/en-US/docs/Web/API/Touch


module.exports = function GTouch(id, target, x, y) {

  this.identifier = id;
  this.clientX = x;
  this.clientY = y;
  this.force = 1.0; // default
  this.pageX = x + document.body.scrollLeft;
  this.pageY = y + document.body.scrollTop;
  this.radiusX = 1; // default
  this.radiusY = 1; // default
  this.rotationAngle = 0; // probably default

  // It seems that there is no right way to get screen position.
  // http://stackoverflow.com/a/21274679/638546
  // http://stackoverflow.com/q/2337795/638546
  var windowLeftBorderWidth = (window.outerWidth - window.innerWidth) / 2;
  var windowTopBorderHeight = (window.outerHeight - window.innerHeight) / 2;
  var documentScreenX = window.screenX + windowLeftBorderWidth;
  var documentScreenY = window.screenY + windowTopBorderHeight;
  this.screenX = documentScreenX + x; // only approximation
  this.screenY = documentScreenY + y; // only approximation

  this.target = target; // original element
};

},{}],2:[function(require,module,exports){
// Finds elements and generates finger IDs.

var GTouchManager = require('./GTouchManager');

var UnknownTouchIdError = function (id) {
  this.name = 'UnknownTouchIdError';
  this.message = 'Unknown touch ID: ' + id;
};
UnknownTouchIdError.prototype = new Error();

// Unique ID generator.
// Usage: seqid.next()
// Return: int
var seqid = require('seqid')(0);

module.exports = function GTouchEmitter() {

  var man = new GTouchManager();

  // Target of a touch should not change even though the target moves
  // away.
  var idToTarget = {};

  /**
   * @param {number} x
   * @param {number} y
   * @return id - null if point outside the document.
   */
  this.touchstart = function (x, y) {
    var id = seqid.next();
    var target = document.elementFromPoint(x, y);
    if (target === null) {
      // point out of element
      return null;
    }
    idToTarget[id] = target;
    var startev = man.touchstart(id, target, x, y);
    var cancelled = !target.dispatchEvent(startev);
    // cancelled true if a handler has called ev.preventDefault()
    if (cancelled) {
      // Do nothing. The app under test should have freedom
      // to preventDefault anytime.
    }
    // Should return id even when cancelled???
    return id;
  };

  /**
   * @param {number} id
   * @param {number} [x]
   * @param {number} [y]
   */
  this.touchmove = function (id, x, y) {
    if (!idToTarget.hasOwnProperty(id)) {
      throw new UnknownTouchIdError(id);
    }

    var target = idToTarget[id];
    var moveev = man.touchmove(id, target, x, y);

    var cancelled = !target.dispatchEvent(moveev);
    // cancelled true if a handler has called ev.preventDefault()
    if (cancelled) {
      // Do nothing. The app under test should have freedom
      // to preventDefault anytime.
    }
  };

  /**
   * @param {number} id
   * @param {number} [x]
   * @param {number} [y]
   */
  this.touchend = function (id, x, y) {
    if (!idToTarget.hasOwnProperty(id)) {
      throw new UnknownTouchIdError(id);
    }

    var target = idToTarget[id];
    var endev = man.touchend(id, target, x, y);

    // Touch leaves the target
    delete idToTarget[id];

    var cancelled = !target.dispatchEvent(endev);
    // cancelled true if a handler has called ev.preventDefault()
    if (cancelled) {
      // Do nothing. The app under test should have freedom
      // to preventDefault anytime.
    }
  };

  /**
   * @param {number} id
   * @param {number} [x]
   * @param {number} [y]
   */
  this.touchcancel = function (id, x, y) {
    if (!idToTarget.hasOwnProperty(id)) {
      throw new UnknownTouchIdError(id);
    }

    var target = idToTarget[id];
    var cancelev = man.touchcancel(id, target, x, y);

    // Touch leaves the target
    delete idToTarget[id];

    var cancelled = !target.dispatchEvent(cancelev);
    // cancelled true if a handler has called ev.preventDefault()
    if (cancelled) {
      // Do nothing. The app under test should have freedom
      // to preventDefault anytime.
    }
  };

  /**
   * Number of ongoing touches
   */
  this.numTouches = function () {
    return Object.keys(idToTarget).length;
  };

  /**
   * End all ongoing touches
   */
  this.endTouches = function () {
    var that = this;
    Object.keys(idToTarget).forEach(function (id) {
      that.touchend(id);
    });
  };
};

},{"./GTouchManager":5,"seqid":18}],3:[function(require,module,exports){
module.exports = function GTouchEvent(type, target, x, y, changedTouches, targetTouches, touches) {
  // See docs for
  //   https://developer.mozilla.org/en-US/docs/Web/API/Event
  //   https://developer.mozilla.org/en-US/docs/Web/API/UIEvent
  //   https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent
  var validTypes = [
    'touchstart',
    'touchmove',
    'touchend',
    'touchcancel'
  ];
  if (validTypes.indexOf(type) < 0) {
    throw new Error('Invalid touch event type: ' + type);
  }

  var ev;
  var bubbles = true;
  var canceable = true;
  // Phantom <2.0 did not support UIEvent constructors.
  // https://github.com/ariya/phantomjs/issues/11289
  try {
    ev = new UIEvent(type, {
      bubbles: bubbles,
      cancelable: canceable
    });
  } catch (e) {
    // Deprecated construction, see
    // https://developer.mozilla.org/en-US/docs/Web/API/UIEvent
    ev = document.createEvent('UIEvent');
    ev.initUIEvent(type, bubbles, canceable);
  }

  ev.altKey = false;
  // ev.bubbles = true; // already set in the constructor
  // ev.cancelBubble = false; // deprecated, see UIEvent
  // cancelable = true // already set in the constructor
  ev.changedTouches = changedTouches;
  // charCode = 0
  ev.ctrlKey = false;
  ev.currentTarget = null;
  ev.defaultPrevented = false;
  // ev.detail = 0 // probably already set in the constructor
  ev.eventPhase = 0;
  // keyCode = 0 // Not in the specs
  ev.layerX = 0;
  ev.layerY = 0;
  ev.metaKey = false;
  ev.pageX = 0;
  ev.pageY = 0;
  // ev.path = Array[5] // Not in the specs
  // ev.returnValue = true // Not in the specs
  ev.shiftKey = false;
  // ev.srcElement = target // Not in the specs
  ev.target = target; // Element to which event was originally emitted
  ev.targetTouches = targetTouches;
  ev.timeStamp = Date.now();
  ev.touches = touches;
  ev.type = type;
  ev.view = window;
  ev.which = 0; // keyCode of the key pressed

  return ev;
};

},{}],4:[function(require,module,exports){
// See docs
//   https://developer.mozilla.org/en-US/docs/Web/API/TouchList

var GTouchList = function () {
  this.length = 0;

  // Touches stored also as this[index]
  this.touches = [];
};

GTouchList.prototype.identifiedTouch = function (id) {
  var i;
  for (i = 0; i < this.touches.length; i += 1) {
    if (this.touches[i].identifier === id) {
      return this.touches[i];
    }
  }
  return null; // Specs do not specify what should be returned
};

GTouchList.prototype.item = function (index) {
  return this.touches[index];
};

// Additional; not in specs
GTouchList.prototype.addTouch = function (touch) {
  this[this.touches.length] = touch;
  this.touches.push(touch);
  this.length += 1;
};

module.exports = GTouchList;

},{}],5:[function(require,module,exports){
// Maintains a list of ongoing touches to be attached to
// touch events.

var GTouch = require('./GTouch');
var GTouchList = require('./GTouchList');
var GTouchEvent = require('./GTouchEvent');
var ObjectMap = require('./ObjectMap');

var valuesToArray = function (obj) {
  var key, val, arr;
  arr = [];
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      arr.push(obj[key]);
    }
  }
  return arr;
};

var arrayToTouchList = function (touches) {
  var list = new GTouchList();
  touches.forEach(function (touch) {
    list.addTouch(touch);
  });
  return list;
};

module.exports = function GTouchManager() {

  // target -> (id -> touch)
  // Usage
  //   var id2touch = targetToTouch.get(target)
  //   var touch = id2touch[id]
  var targetToTouch = new ObjectMap();

  // All touches.
  // id -> touch
  var idToTouch = {};

  this.touchstart = function (id, target, x, y) {
    if (idToTouch.hasOwnProperty(id)) {
      throw new Error('Cannot start already started touch.');
    }

    var t = new GTouch(id, target, x, y);

    // Add
    idToTouch[id] = t;

    // Changed touches (only one)
    var changedTouches = new GTouchList();
    changedTouches.addTouch(t);

    // Touches that originated from the target
    var o, arr;
    if (targetToTouch.has(target)) {
      o = targetToTouch.get(target);
      // Assert
      if (o.hasOwnProperty(id)) {
        throw new Error('Ghosture bug.');
      }
      o[id] = t;
    } else {
      o = {};
      o[id] = t;
      targetToTouch.set(target, o);
    }
    arr = valuesToArray(targetToTouch.get(target));
    var targetTouches = arrayToTouchList(arr);

    // All touches
    var allTouches = arrayToTouchList(valuesToArray(idToTouch));

    return new GTouchEvent('touchstart', target, x, y,
      changedTouches, targetTouches, allTouches);
  };

  /**
   * @param {number} id
   * @param {element} target
   * @param {number} [x=current]
   * @param {number} [y=current]
   */
  this.touchmove = function (id, target, x, y) {
    if (!idToTouch.hasOwnProperty(id)) {
      throw new Error('Cannot move non-existing touch');
    }

    // Use current coordinates if not given
    if (typeof x === 'undefined' || typeof y === 'undefined') {
      x = idToTouch[id].clientX;
      y = idToTouch[id].clientY;
    }

    // Do not modify old, but create new and replace.
    var t = new GTouch(id, target, x, y);

    // Replace
    idToTouch[id] = t;

    // Changed touches (only one)
    var changedTouches = new GTouchList();
    changedTouches.addTouch(t);

    // Touches that originated from the target
    // Assert
    if (!targetToTouch.has(target)) {
      throw new Error('Ghosture bug');
    }
    // Replace
    targetToTouch.get(target)[id] = t;
    var arr = valuesToArray(targetToTouch.get(target));
    var targetTouches = arrayToTouchList(arr);

    // All touches
    var allTouches = arrayToTouchList(valuesToArray(idToTouch));

    return new GTouchEvent('touchmove', target, x, y,
      changedTouches, targetTouches, allTouches);
  };

  /**
   * @param {number} id
   * @param {element} target
   * @param {number} [x=current]
   * @param {number} [y=current]
   */
  this.touchend = function (id, target, x, y) {
    if (!idToTouch.hasOwnProperty(id)) {
      throw new Error('Cannot end non-existing touch.');
    }

    // Use current coordinates if not given
    if (typeof x === 'undefined' || typeof y === 'undefined') {
      x = idToTouch[id].clientX;
      y = idToTouch[id].clientY;
    }

    // Do not modify old, but create new.
    var t = new GTouch(id, target, x, y);

    // Remove the touch
    delete idToTouch[id];

    // Changed touches (only one);
    // "For the touchend and touchcancel events this must be
    // a list of the touch points that have just been removed
    // from the surface." -MDN/touchcancel
    var changedTouches = new GTouchList();
    changedTouches.addTouch(t);

    // Current touches that originated from the target.
    // Touch that ended is not anymore part of those touches.
    delete targetToTouch.get(target)[id];
    var arr = valuesToArray(targetToTouch.get(target));
    var targetTouches = arrayToTouchList(arr);

    // All touches
    var allTouches = arrayToTouchList(valuesToArray(idToTouch));

    return new GTouchEvent('touchend', target, x, y,
      changedTouches, targetTouches, allTouches);
  };

  /**
   * @param {number} id
   * @param {element} target
   * @param {number} [x=current]
   * @param {number} [y=current]
   */
  this.touchcancel = function (id, target, x, y) {
    if (!idToTouch.hasOwnProperty(id)) {
      throw new Error('Cannot cancel non-existing touch.');
    }

    // Use current coordinates if not given
    if (typeof x === 'undefined' || typeof y === 'undefined') {
      x = idToTouch[id].clientX;
      y = idToTouch[id].clientY;
    }

    // Do not modify old, but create new.
    var t = new GTouch(id, target, x, y);

    // Remove the touch
    delete idToTouch[id];

    // Changed touches (only one);
    // "For the touchend and touchcancel events this must be
    // a list of the touch points that have just been removed
    // from the surface." -MDN/touchcancel
    var changedTouches = new GTouchList();
    changedTouches.addTouch(t);

    // Current touches that originated from the target.
    // Touch that cancelled is not anymore part of those touches.
    delete targetToTouch.get(target)[id];
    var arr = valuesToArray(targetToTouch.get(target));
    var targetTouches = arrayToTouchList(arr);

    // All touches
    var allTouches = arrayToTouchList(valuesToArray(idToTouch));

    return new GTouchEvent('touchcancel', target, x, y,
      changedTouches, targetTouches, allTouches);
  };

  /**
   * Number of ongoing touches
   */
  this.numTouches = function () {
    return Object.keys(idToTouch).length;
  };

  /**
   * Number of ongoing touches on an element
   * @param {element} target
   */
  this.numTouchesOnElement = function (target) {
    var id2touch;
    if (targetToTouch.has(target)) {
      id2touch = targetToTouch.get(target);
      return Object.keys(id2touch).length;
    } // else
    return 0;
  };
};

},{"./GTouch":1,"./GTouchEvent":3,"./GTouchList":4,"./ObjectMap":6}],6:[function(require,module,exports){
module.exports = function ObjectMap() {
  // See MDN WeakMap

  var objects = [];
  var values = [];

  this.get = function (obj) {
    return values[objects.indexOf(obj)];
  };

  this.set = function (obj, value) {
    var index = objects.indexOf(obj);
    if (index < 0) {
      // Not found. Create.
      objects.push(obj);
      values.push(value);
    } else {
      // Found. Replace.
      values[index] = value;
    }
  };

  this.has = function (obj) {
    return (objects.indexOf(obj) !== -1);
  };

  this.remove = function (obj) {
    var index = objects.indexOf(obj);
    if (index < 0) {
      // Does not exist. Do nothing.
    } else {
      // Found. Remove.
      objects.splice(index, 1);
      values.splice(index, 1);
    }
  };
};

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
module.exports = '0.2.0';

},{}],9:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],10:[function(require,module,exports){

/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var clone = require('clone');
var type = require('type');
var ease = require('ease');

/**
 * Expose `Tween`.
 */

module.exports = Tween;

/**
 * Initialize a new `Tween` with `obj`.
 *
 * @param {Object|Array} obj
 * @api public
 */

function Tween(obj) {
  if (!(this instanceof Tween)) return new Tween(obj);
  this._from = obj;
  this.ease('linear');
  this.duration(500);
}

/**
 * Mixin emitter.
 */

Emitter(Tween.prototype);

/**
 * Reset the tween.
 *
 * @api public
 */

Tween.prototype.reset = function(){
  this.isArray = 'array' === type(this._from);
  this._curr = clone(this._from);
  this._done = false;
  this._start = Date.now();
  return this;
};

/**
 * Tween to `obj` and reset internal state.
 *
 *    tween.to({ x: 50, y: 100 })
 *
 * @param {Object|Array} obj
 * @return {Tween} self
 * @api public
 */

Tween.prototype.to = function(obj){
  this.reset();
  this._to = obj;
  return this;
};

/**
 * Set duration to `ms` [500].
 *
 * @param {Number} ms
 * @return {Tween} self
 * @api public
 */

Tween.prototype.duration = function(ms){
  this._duration = ms;
  return this;
};

/**
 * Set easing function to `fn`.
 *
 *    tween.ease('in-out-sine')
 *
 * @param {String|Function} fn
 * @return {Tween}
 * @api public
 */

Tween.prototype.ease = function(fn){
  fn = 'function' == typeof fn ? fn : ease[fn];
  if (!fn) throw new TypeError('invalid easing function');
  this._ease = fn;
  return this;
};

/**
 * Stop the tween and immediately emit "stop" and "end".
 *
 * @return {Tween}
 * @api public
 */

Tween.prototype.stop = function(){
  this.stopped = true;
  this._done = true;
  this.emit('stop');
  this.emit('end');
  return this;
};

/**
 * Perform a step.
 *
 * @return {Tween} self
 * @api private
 */

Tween.prototype.step = function(){
  if (this._done) return;

  // duration
  var duration = this._duration;
  var now = Date.now();
  var delta = now - this._start;
  var done = delta >= duration;

  // complete
  if (done) {
    this._from = this._to;
    this._update(this._to);
    this._done = true;
    this.emit('end');
    return this;
  }

  // tween
  var from = this._from;
  var to = this._to;
  var curr = this._curr;
  var fn = this._ease;
  var p = (now - this._start) / duration;
  var n = fn(p);

  // array
  if (this.isArray) {
    for (var i = 0; i < from.length; ++i) {
      curr[i] = from[i] + (to[i] - from[i]) * n;
    }

    this._update(curr);
    return this;
  }

  // objech
  for (var k in from) {
    curr[k] = from[k] + (to[k] - from[k]) * n;
  }

  this._update(curr);
  return this;
};

/**
 * Set update function to `fn` or
 * when no argument is given this performs
 * a "step".
 *
 * @param {Function} fn
 * @return {Tween} self
 * @api public
 */

Tween.prototype.update = function(fn){
  if (0 == arguments.length) return this.step();
  this._update = fn;
  return this;
};
},{"clone":11,"ease":14,"emitter":12,"type":13}],11:[function(require,module,exports){
/**
 * Module dependencies.
 */

var type;
try {
  type = require('component-type');
} catch (_) {
  type = require('type');
}

/**
 * Module exports.
 */

module.exports = clone;

/**
 * Clones objects.
 *
 * @param {Mixed} any object
 * @api public
 */

function clone(obj){
  switch (type(obj)) {
    case 'object':
      var copy = {};
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          copy[key] = clone(obj[key]);
        }
      }
      return copy;

    case 'array':
      var copy = new Array(obj.length);
      for (var i = 0, l = obj.length; i < l; i++) {
        copy[i] = clone(obj[i]);
      }
      return copy;

    case 'regexp':
      // from millermedeiros/amd-utils - MIT
      var flags = '';
      flags += obj.multiline ? 'm' : '';
      flags += obj.global ? 'g' : '';
      flags += obj.ignoreCase ? 'i' : '';
      return new RegExp(obj.source, flags);

    case 'date':
      return new Date(obj.getTime());

    default: // string, number, boolean, …
      return obj;
  }
}

},{"component-type":13,"type":13}],12:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],13:[function(require,module,exports){
/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object Error]': return 'error';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val !== val) return 'nan';
  if (val && val.nodeType === 1) return 'element';

  val = val.valueOf
    ? val.valueOf()
    : Object.prototype.valueOf.apply(val)

  return typeof val;
};

},{}],14:[function(require,module,exports){

// easing functions from "Tween.js"

exports.linear = function(n){
  return n;
};

exports.inQuad = function(n){
  return n * n;
};

exports.outQuad = function(n){
  return n * (2 - n);
};

exports.inOutQuad = function(n){
  n *= 2;
  if (n < 1) return 0.5 * n * n;
  return - 0.5 * (--n * (n - 2) - 1);
};

exports.inCube = function(n){
  return n * n * n;
};

exports.outCube = function(n){
  return --n * n * n + 1;
};

exports.inOutCube = function(n){
  n *= 2;
  if (n < 1) return 0.5 * n * n * n;
  return 0.5 * ((n -= 2 ) * n * n + 2);
};

exports.inQuart = function(n){
  return n * n * n * n;
};

exports.outQuart = function(n){
  return 1 - (--n * n * n * n);
};

exports.inOutQuart = function(n){
  n *= 2;
  if (n < 1) return 0.5 * n * n * n * n;
  return -0.5 * ((n -= 2) * n * n * n - 2);
};

exports.inQuint = function(n){
  return n * n * n * n * n;
}

exports.outQuint = function(n){
  return --n * n * n * n * n + 1;
}

exports.inOutQuint = function(n){
  n *= 2;
  if (n < 1) return 0.5 * n * n * n * n * n;
  return 0.5 * ((n -= 2) * n * n * n * n + 2);
};

exports.inSine = function(n){
  return 1 - Math.cos(n * Math.PI / 2 );
};

exports.outSine = function(n){
  return Math.sin(n * Math.PI / 2);
};

exports.inOutSine = function(n){
  return .5 * (1 - Math.cos(Math.PI * n));
};

exports.inExpo = function(n){
  return 0 == n ? 0 : Math.pow(1024, n - 1);
};

exports.outExpo = function(n){
  return 1 == n ? n : 1 - Math.pow(2, -10 * n);
};

exports.inOutExpo = function(n){
  if (0 == n) return 0;
  if (1 == n) return 1;
  if ((n *= 2) < 1) return .5 * Math.pow(1024, n - 1);
  return .5 * (-Math.pow(2, -10 * (n - 1)) + 2);
};

exports.inCirc = function(n){
  return 1 - Math.sqrt(1 - n * n);
};

exports.outCirc = function(n){
  return Math.sqrt(1 - (--n * n));
};

exports.inOutCirc = function(n){
  n *= 2
  if (n < 1) return -0.5 * (Math.sqrt(1 - n * n) - 1);
  return 0.5 * (Math.sqrt(1 - (n -= 2) * n) + 1);
};

exports.inBack = function(n){
  var s = 1.70158;
  return n * n * (( s + 1 ) * n - s);
};

exports.outBack = function(n){
  var s = 1.70158;
  return --n * n * ((s + 1) * n + s) + 1;
};

exports.inOutBack = function(n){
  var s = 1.70158 * 1.525;
  if ( ( n *= 2 ) < 1 ) return 0.5 * ( n * n * ( ( s + 1 ) * n - s ) );
  return 0.5 * ( ( n -= 2 ) * n * ( ( s + 1 ) * n + s ) + 2 );
};

exports.inBounce = function(n){
  return 1 - exports.outBounce(1 - n);
};

exports.outBounce = function(n){
  if ( n < ( 1 / 2.75 ) ) {
    return 7.5625 * n * n;
  } else if ( n < ( 2 / 2.75 ) ) {
    return 7.5625 * ( n -= ( 1.5 / 2.75 ) ) * n + 0.75;
  } else if ( n < ( 2.5 / 2.75 ) ) {
    return 7.5625 * ( n -= ( 2.25 / 2.75 ) ) * n + 0.9375;
  } else {
    return 7.5625 * ( n -= ( 2.625 / 2.75 ) ) * n + 0.984375;
  }
};

exports.inOutBounce = function(n){
  if (n < .5) return exports.inBounce(n * 2) * .5;
  return exports.outBounce(n * 2 - 1) * .5 + .5;
};

// aliases

exports['in-quad'] = exports.inQuad;
exports['out-quad'] = exports.outQuad;
exports['in-out-quad'] = exports.inOutQuad;
exports['in-cube'] = exports.inCube;
exports['out-cube'] = exports.outCube;
exports['in-out-cube'] = exports.inOutCube;
exports['in-quart'] = exports.inQuart;
exports['out-quart'] = exports.outQuart;
exports['in-out-quart'] = exports.inOutQuart;
exports['in-quint'] = exports.inQuint;
exports['out-quint'] = exports.outQuint;
exports['in-out-quint'] = exports.inOutQuint;
exports['in-sine'] = exports.inSine;
exports['out-sine'] = exports.outSine;
exports['in-out-sine'] = exports.inOutSine;
exports['in-expo'] = exports.inExpo;
exports['out-expo'] = exports.outExpo;
exports['in-out-expo'] = exports.inOutExpo;
exports['in-circ'] = exports.inCirc;
exports['out-circ'] = exports.outCirc;
exports['in-out-circ'] = exports.inOutCirc;
exports['in-back'] = exports.inBack;
exports['out-back'] = exports.outBack;
exports['in-out-back'] = exports.inOutBack;
exports['in-bounce'] = exports.inBounce;
exports['out-bounce'] = exports.outBounce;
exports['in-out-bounce'] = exports.inOutBounce;

},{}],15:[function(require,module,exports){
/*globals define, module */

// This module contains functions for converting milliseconds
// to and from CSS time strings.

(function (globals) {
    'use strict';

    var regex = /^([\-\+]?[0-9]+(\.[0-9]+)?)(m?s)$/,

    functions = {
        from: from,
        to: to
    };

    exportFunctions();

    // Public function `from`.
    //
    // Returns the number of milliseconds represented by a
    // CSS time string.
    function from (cssTime) {
        var matches = regex.exec(cssTime);

        if (matches === null) {
            throw new Error('Invalid CSS time');
        }

        return parseFloat(matches[1]) * (matches[3] === 's' ? 1000 : 1);
    }

    // Public function `to`.
    //
    // Returns a CSS time string representing the number
    // of milliseconds passed in the arguments.
    function to (milliseconds) {
        if (typeof milliseconds !== 'number' || isNaN(milliseconds)) {
            throw new Error('Invalid milliseconds');
        }

        return milliseconds + 'ms';
    }

    function exportFunctions () {
        if (typeof define === 'function' && define.amd) {
            define(function () {
                return functions;
            });
        } else if (typeof module !== 'undefined' && module !== null) {
            module.exports = functions;
        } else {
            globals.cssTime = functions;
        }
    }
}(this));


},{}],16:[function(require,module,exports){
var now = require('performance-now')
  , global = typeof window === 'undefined' ? {} : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = global['request' + suffix]
  , caf = global['cancel' + suffix] || global['cancelRequest' + suffix]
  , isNative = true

for(var i = 0; i < vendors.length && !raf; i++) {
  raf = global[vendors[i] + 'Request' + suffix]
  caf = global[vendors[i] + 'Cancel' + suffix]
      || global[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  isNative = false

  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  if(!isNative) {
    return raf.call(global, fn)
  }
  return raf.call(global, function() {
    try{
      fn.apply(this, arguments)
    } catch(e) {
      setTimeout(function() { throw e }, 0)
    }
  })
}
module.exports.cancel = function() {
  caf.apply(global, arguments)
}

},{"performance-now":17}],17:[function(require,module,exports){
(function (process){
// Generated by CoffeeScript 1.6.3
(function() {
  var getNanoSeconds, hrtime, loadTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

/*

*/

}).call(this,require('_process'))

},{"_process":9}],18:[function(require,module,exports){
"use strict";

module.exports = SeqId

function SeqId(initial) {
  if (!(this instanceof SeqId)) {
    return new SeqId(initial)
  }
  if (initial == null) {
    initial = (Math.random() - 0.5) * Math.pow(2, 32)
  }
  this._id = initial | 0
}
SeqId.prototype.next = function () {
  this._id = (this._id + 1) | 0
  return this._id
}

},{}],19:[function(require,module,exports){
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
   * @param {number|object} duration
   */
  this.hold = function (arg) {
    if (finished) {
      throw new ChainingError('hold');
    } // else

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
    if (typeof duration === 'undefined') { duration = '50ms'; }
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

},{"./lib/GTouchEmitter":2,"./lib/touchSupport":7,"./lib/version":8,"component-tween":10,"css-time":15,"raf":16}]},{},[19])(19)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvR1RvdWNoLmpzIiwibGliL0dUb3VjaEVtaXR0ZXIuanMiLCJsaWIvR1RvdWNoRXZlbnQuanMiLCJsaWIvR1RvdWNoTGlzdC5qcyIsImxpYi9HVG91Y2hNYW5hZ2VyLmpzIiwibGliL09iamVjdE1hcC5qcyIsImxpYi90b3VjaFN1cHBvcnQuanMiLCJsaWIvdmVyc2lvbi5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvY29tcG9uZW50LXR3ZWVuL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NvbXBvbmVudC10d2Vlbi9ub2RlX21vZHVsZXMvY29tcG9uZW50LWNsb25lL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NvbXBvbmVudC10d2Vlbi9ub2RlX21vZHVsZXMvY29tcG9uZW50LWVtaXR0ZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY29tcG9uZW50LXR3ZWVuL25vZGVfbW9kdWxlcy9jb21wb25lbnQtdHlwZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jb21wb25lbnQtdHdlZW4vbm9kZV9tb2R1bGVzL2Vhc2UtY29tcG9uZW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Nzcy10aW1lL3NyYy9jc3MtdGltZS5qcyIsIm5vZGVfbW9kdWxlcy9yYWYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmFmL25vZGVfbW9kdWxlcy9wZXJmb3JtYW5jZS1ub3cvbGliL3BlcmZvcm1hbmNlLW5vdy5qcyIsIm5vZGVfbW9kdWxlcy9zZXFpZC9zZXFpZC5qcyIsImluZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25PQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIFNlZSBkb2NzXG4vLyAgIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9Ub3VjaFxuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gR1RvdWNoKGlkLCB0YXJnZXQsIHgsIHkpIHtcblxuICB0aGlzLmlkZW50aWZpZXIgPSBpZDtcbiAgdGhpcy5jbGllbnRYID0geDtcbiAgdGhpcy5jbGllbnRZID0geTtcbiAgdGhpcy5mb3JjZSA9IDEuMDsgLy8gZGVmYXVsdFxuICB0aGlzLnBhZ2VYID0geCArIGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdDtcbiAgdGhpcy5wYWdlWSA9IHkgKyBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcDtcbiAgdGhpcy5yYWRpdXNYID0gMTsgLy8gZGVmYXVsdFxuICB0aGlzLnJhZGl1c1kgPSAxOyAvLyBkZWZhdWx0XG4gIHRoaXMucm90YXRpb25BbmdsZSA9IDA7IC8vIHByb2JhYmx5IGRlZmF1bHRcblxuICAvLyBJdCBzZWVtcyB0aGF0IHRoZXJlIGlzIG5vIHJpZ2h0IHdheSB0byBnZXQgc2NyZWVuIHBvc2l0aW9uLlxuICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMTI3NDY3OS82Mzg1NDZcbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3EvMjMzNzc5NS82Mzg1NDZcbiAgdmFyIHdpbmRvd0xlZnRCb3JkZXJXaWR0aCA9ICh3aW5kb3cub3V0ZXJXaWR0aCAtIHdpbmRvdy5pbm5lcldpZHRoKSAvIDI7XG4gIHZhciB3aW5kb3dUb3BCb3JkZXJIZWlnaHQgPSAod2luZG93Lm91dGVySGVpZ2h0IC0gd2luZG93LmlubmVySGVpZ2h0KSAvIDI7XG4gIHZhciBkb2N1bWVudFNjcmVlblggPSB3aW5kb3cuc2NyZWVuWCArIHdpbmRvd0xlZnRCb3JkZXJXaWR0aDtcbiAgdmFyIGRvY3VtZW50U2NyZWVuWSA9IHdpbmRvdy5zY3JlZW5ZICsgd2luZG93VG9wQm9yZGVySGVpZ2h0O1xuICB0aGlzLnNjcmVlblggPSBkb2N1bWVudFNjcmVlblggKyB4OyAvLyBvbmx5IGFwcHJveGltYXRpb25cbiAgdGhpcy5zY3JlZW5ZID0gZG9jdW1lbnRTY3JlZW5ZICsgeTsgLy8gb25seSBhcHByb3hpbWF0aW9uXG5cbiAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7IC8vIG9yaWdpbmFsIGVsZW1lbnRcbn07XG4iLCIvLyBGaW5kcyBlbGVtZW50cyBhbmQgZ2VuZXJhdGVzIGZpbmdlciBJRHMuXG5cbnZhciBHVG91Y2hNYW5hZ2VyID0gcmVxdWlyZSgnLi9HVG91Y2hNYW5hZ2VyJyk7XG5cbnZhciBVbmtub3duVG91Y2hJZEVycm9yID0gZnVuY3Rpb24gKGlkKSB7XG4gIHRoaXMubmFtZSA9ICdVbmtub3duVG91Y2hJZEVycm9yJztcbiAgdGhpcy5tZXNzYWdlID0gJ1Vua25vd24gdG91Y2ggSUQ6ICcgKyBpZDtcbn07XG5Vbmtub3duVG91Y2hJZEVycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG4vLyBVbmlxdWUgSUQgZ2VuZXJhdG9yLlxuLy8gVXNhZ2U6IHNlcWlkLm5leHQoKVxuLy8gUmV0dXJuOiBpbnRcbnZhciBzZXFpZCA9IHJlcXVpcmUoJ3NlcWlkJykoMCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gR1RvdWNoRW1pdHRlcigpIHtcblxuICB2YXIgbWFuID0gbmV3IEdUb3VjaE1hbmFnZXIoKTtcblxuICAvLyBUYXJnZXQgb2YgYSB0b3VjaCBzaG91bGQgbm90IGNoYW5nZSBldmVuIHRob3VnaCB0aGUgdGFyZ2V0IG1vdmVzXG4gIC8vIGF3YXkuXG4gIHZhciBpZFRvVGFyZ2V0ID0ge307XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSB4XG4gICAqIEBwYXJhbSB7bnVtYmVyfSB5XG4gICAqIEByZXR1cm4gaWQgLSBudWxsIGlmIHBvaW50IG91dHNpZGUgdGhlIGRvY3VtZW50LlxuICAgKi9cbiAgdGhpcy50b3VjaHN0YXJ0ID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICB2YXIgaWQgPSBzZXFpZC5uZXh0KCk7XG4gICAgdmFyIHRhcmdldCA9IGRvY3VtZW50LmVsZW1lbnRGcm9tUG9pbnQoeCwgeSk7XG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgLy8gcG9pbnQgb3V0IG9mIGVsZW1lbnRcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZFRvVGFyZ2V0W2lkXSA9IHRhcmdldDtcbiAgICB2YXIgc3RhcnRldiA9IG1hbi50b3VjaHN0YXJ0KGlkLCB0YXJnZXQsIHgsIHkpO1xuICAgIHZhciBjYW5jZWxsZWQgPSAhdGFyZ2V0LmRpc3BhdGNoRXZlbnQoc3RhcnRldik7XG4gICAgLy8gY2FuY2VsbGVkIHRydWUgaWYgYSBoYW5kbGVyIGhhcyBjYWxsZWQgZXYucHJldmVudERlZmF1bHQoKVxuICAgIGlmIChjYW5jZWxsZWQpIHtcbiAgICAgIC8vIERvIG5vdGhpbmcuIFRoZSBhcHAgdW5kZXIgdGVzdCBzaG91bGQgaGF2ZSBmcmVlZG9tXG4gICAgICAvLyB0byBwcmV2ZW50RGVmYXVsdCBhbnl0aW1lLlxuICAgIH1cbiAgICAvLyBTaG91bGQgcmV0dXJuIGlkIGV2ZW4gd2hlbiBjYW5jZWxsZWQ/Pz9cbiAgICByZXR1cm4gaWQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBpZFxuICAgKiBAcGFyYW0ge251bWJlcn0gW3hdXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbeV1cbiAgICovXG4gIHRoaXMudG91Y2htb3ZlID0gZnVuY3Rpb24gKGlkLCB4LCB5KSB7XG4gICAgaWYgKCFpZFRvVGFyZ2V0Lmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgdGhyb3cgbmV3IFVua25vd25Ub3VjaElkRXJyb3IoaWQpO1xuICAgIH1cblxuICAgIHZhciB0YXJnZXQgPSBpZFRvVGFyZ2V0W2lkXTtcbiAgICB2YXIgbW92ZWV2ID0gbWFuLnRvdWNobW92ZShpZCwgdGFyZ2V0LCB4LCB5KTtcblxuICAgIHZhciBjYW5jZWxsZWQgPSAhdGFyZ2V0LmRpc3BhdGNoRXZlbnQobW92ZWV2KTtcbiAgICAvLyBjYW5jZWxsZWQgdHJ1ZSBpZiBhIGhhbmRsZXIgaGFzIGNhbGxlZCBldi5wcmV2ZW50RGVmYXVsdCgpXG4gICAgaWYgKGNhbmNlbGxlZCkge1xuICAgICAgLy8gRG8gbm90aGluZy4gVGhlIGFwcCB1bmRlciB0ZXN0IHNob3VsZCBoYXZlIGZyZWVkb21cbiAgICAgIC8vIHRvIHByZXZlbnREZWZhdWx0IGFueXRpbWUuXG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBAcGFyYW0ge251bWJlcn0gaWRcbiAgICogQHBhcmFtIHtudW1iZXJ9IFt4XVxuICAgKiBAcGFyYW0ge251bWJlcn0gW3ldXG4gICAqL1xuICB0aGlzLnRvdWNoZW5kID0gZnVuY3Rpb24gKGlkLCB4LCB5KSB7XG4gICAgaWYgKCFpZFRvVGFyZ2V0Lmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgdGhyb3cgbmV3IFVua25vd25Ub3VjaElkRXJyb3IoaWQpO1xuICAgIH1cblxuICAgIHZhciB0YXJnZXQgPSBpZFRvVGFyZ2V0W2lkXTtcbiAgICB2YXIgZW5kZXYgPSBtYW4udG91Y2hlbmQoaWQsIHRhcmdldCwgeCwgeSk7XG5cbiAgICAvLyBUb3VjaCBsZWF2ZXMgdGhlIHRhcmdldFxuICAgIGRlbGV0ZSBpZFRvVGFyZ2V0W2lkXTtcblxuICAgIHZhciBjYW5jZWxsZWQgPSAhdGFyZ2V0LmRpc3BhdGNoRXZlbnQoZW5kZXYpO1xuICAgIC8vIGNhbmNlbGxlZCB0cnVlIGlmIGEgaGFuZGxlciBoYXMgY2FsbGVkIGV2LnByZXZlbnREZWZhdWx0KClcbiAgICBpZiAoY2FuY2VsbGVkKSB7XG4gICAgICAvLyBEbyBub3RoaW5nLiBUaGUgYXBwIHVuZGVyIHRlc3Qgc2hvdWxkIGhhdmUgZnJlZWRvbVxuICAgICAgLy8gdG8gcHJldmVudERlZmF1bHQgYW55dGltZS5cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBpZFxuICAgKiBAcGFyYW0ge251bWJlcn0gW3hdXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbeV1cbiAgICovXG4gIHRoaXMudG91Y2hjYW5jZWwgPSBmdW5jdGlvbiAoaWQsIHgsIHkpIHtcbiAgICBpZiAoIWlkVG9UYXJnZXQuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgVW5rbm93blRvdWNoSWRFcnJvcihpZCk7XG4gICAgfVxuXG4gICAgdmFyIHRhcmdldCA9IGlkVG9UYXJnZXRbaWRdO1xuICAgIHZhciBjYW5jZWxldiA9IG1hbi50b3VjaGNhbmNlbChpZCwgdGFyZ2V0LCB4LCB5KTtcblxuICAgIC8vIFRvdWNoIGxlYXZlcyB0aGUgdGFyZ2V0XG4gICAgZGVsZXRlIGlkVG9UYXJnZXRbaWRdO1xuXG4gICAgdmFyIGNhbmNlbGxlZCA9ICF0YXJnZXQuZGlzcGF0Y2hFdmVudChjYW5jZWxldik7XG4gICAgLy8gY2FuY2VsbGVkIHRydWUgaWYgYSBoYW5kbGVyIGhhcyBjYWxsZWQgZXYucHJldmVudERlZmF1bHQoKVxuICAgIGlmIChjYW5jZWxsZWQpIHtcbiAgICAgIC8vIERvIG5vdGhpbmcuIFRoZSBhcHAgdW5kZXIgdGVzdCBzaG91bGQgaGF2ZSBmcmVlZG9tXG4gICAgICAvLyB0byBwcmV2ZW50RGVmYXVsdCBhbnl0aW1lLlxuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogTnVtYmVyIG9mIG9uZ29pbmcgdG91Y2hlc1xuICAgKi9cbiAgdGhpcy5udW1Ub3VjaGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhpZFRvVGFyZ2V0KS5sZW5ndGg7XG4gIH07XG5cbiAgLyoqXG4gICAqIEVuZCBhbGwgb25nb2luZyB0b3VjaGVzXG4gICAqL1xuICB0aGlzLmVuZFRvdWNoZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIE9iamVjdC5rZXlzKGlkVG9UYXJnZXQpLmZvckVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICB0aGF0LnRvdWNoZW5kKGlkKTtcbiAgICB9KTtcbiAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIEdUb3VjaEV2ZW50KHR5cGUsIHRhcmdldCwgeCwgeSwgY2hhbmdlZFRvdWNoZXMsIHRhcmdldFRvdWNoZXMsIHRvdWNoZXMpIHtcbiAgLy8gU2VlIGRvY3MgZm9yXG4gIC8vICAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0V2ZW50XG4gIC8vICAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1VJRXZlbnRcbiAgLy8gICBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvVG91Y2hFdmVudFxuICB2YXIgdmFsaWRUeXBlcyA9IFtcbiAgICAndG91Y2hzdGFydCcsXG4gICAgJ3RvdWNobW92ZScsXG4gICAgJ3RvdWNoZW5kJyxcbiAgICAndG91Y2hjYW5jZWwnXG4gIF07XG4gIGlmICh2YWxpZFR5cGVzLmluZGV4T2YodHlwZSkgPCAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHRvdWNoIGV2ZW50IHR5cGU6ICcgKyB0eXBlKTtcbiAgfVxuXG4gIHZhciBldjtcbiAgdmFyIGJ1YmJsZXMgPSB0cnVlO1xuICB2YXIgY2FuY2VhYmxlID0gdHJ1ZTtcbiAgLy8gUGhhbnRvbSA8Mi4wIGRpZCBub3Qgc3VwcG9ydCBVSUV2ZW50IGNvbnN0cnVjdG9ycy5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FyaXlhL3BoYW50b21qcy9pc3N1ZXMvMTEyODlcbiAgdHJ5IHtcbiAgICBldiA9IG5ldyBVSUV2ZW50KHR5cGUsIHtcbiAgICAgIGJ1YmJsZXM6IGJ1YmJsZXMsXG4gICAgICBjYW5jZWxhYmxlOiBjYW5jZWFibGVcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIERlcHJlY2F0ZWQgY29uc3RydWN0aW9uLCBzZWVcbiAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvVUlFdmVudFxuICAgIGV2ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ1VJRXZlbnQnKTtcbiAgICBldi5pbml0VUlFdmVudCh0eXBlLCBidWJibGVzLCBjYW5jZWFibGUpO1xuICB9XG5cbiAgZXYuYWx0S2V5ID0gZmFsc2U7XG4gIC8vIGV2LmJ1YmJsZXMgPSB0cnVlOyAvLyBhbHJlYWR5IHNldCBpbiB0aGUgY29uc3RydWN0b3JcbiAgLy8gZXYuY2FuY2VsQnViYmxlID0gZmFsc2U7IC8vIGRlcHJlY2F0ZWQsIHNlZSBVSUV2ZW50XG4gIC8vIGNhbmNlbGFibGUgPSB0cnVlIC8vIGFscmVhZHkgc2V0IGluIHRoZSBjb25zdHJ1Y3RvclxuICBldi5jaGFuZ2VkVG91Y2hlcyA9IGNoYW5nZWRUb3VjaGVzO1xuICAvLyBjaGFyQ29kZSA9IDBcbiAgZXYuY3RybEtleSA9IGZhbHNlO1xuICBldi5jdXJyZW50VGFyZ2V0ID0gbnVsbDtcbiAgZXYuZGVmYXVsdFByZXZlbnRlZCA9IGZhbHNlO1xuICAvLyBldi5kZXRhaWwgPSAwIC8vIHByb2JhYmx5IGFscmVhZHkgc2V0IGluIHRoZSBjb25zdHJ1Y3RvclxuICBldi5ldmVudFBoYXNlID0gMDtcbiAgLy8ga2V5Q29kZSA9IDAgLy8gTm90IGluIHRoZSBzcGVjc1xuICBldi5sYXllclggPSAwO1xuICBldi5sYXllclkgPSAwO1xuICBldi5tZXRhS2V5ID0gZmFsc2U7XG4gIGV2LnBhZ2VYID0gMDtcbiAgZXYucGFnZVkgPSAwO1xuICAvLyBldi5wYXRoID0gQXJyYXlbNV0gLy8gTm90IGluIHRoZSBzcGVjc1xuICAvLyBldi5yZXR1cm5WYWx1ZSA9IHRydWUgLy8gTm90IGluIHRoZSBzcGVjc1xuICBldi5zaGlmdEtleSA9IGZhbHNlO1xuICAvLyBldi5zcmNFbGVtZW50ID0gdGFyZ2V0IC8vIE5vdCBpbiB0aGUgc3BlY3NcbiAgZXYudGFyZ2V0ID0gdGFyZ2V0OyAvLyBFbGVtZW50IHRvIHdoaWNoIGV2ZW50IHdhcyBvcmlnaW5hbGx5IGVtaXR0ZWRcbiAgZXYudGFyZ2V0VG91Y2hlcyA9IHRhcmdldFRvdWNoZXM7XG4gIGV2LnRpbWVTdGFtcCA9IERhdGUubm93KCk7XG4gIGV2LnRvdWNoZXMgPSB0b3VjaGVzO1xuICBldi50eXBlID0gdHlwZTtcbiAgZXYudmlldyA9IHdpbmRvdztcbiAgZXYud2hpY2ggPSAwOyAvLyBrZXlDb2RlIG9mIHRoZSBrZXkgcHJlc3NlZFxuXG4gIHJldHVybiBldjtcbn07XG4iLCIvLyBTZWUgZG9jc1xuLy8gICBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvVG91Y2hMaXN0XG5cbnZhciBHVG91Y2hMaXN0ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmxlbmd0aCA9IDA7XG5cbiAgLy8gVG91Y2hlcyBzdG9yZWQgYWxzbyBhcyB0aGlzW2luZGV4XVxuICB0aGlzLnRvdWNoZXMgPSBbXTtcbn07XG5cbkdUb3VjaExpc3QucHJvdG90eXBlLmlkZW50aWZpZWRUb3VjaCA9IGZ1bmN0aW9uIChpZCkge1xuICB2YXIgaTtcbiAgZm9yIChpID0gMDsgaSA8IHRoaXMudG91Y2hlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGlmICh0aGlzLnRvdWNoZXNbaV0uaWRlbnRpZmllciA9PT0gaWQpIHtcbiAgICAgIHJldHVybiB0aGlzLnRvdWNoZXNbaV07XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsOyAvLyBTcGVjcyBkbyBub3Qgc3BlY2lmeSB3aGF0IHNob3VsZCBiZSByZXR1cm5lZFxufTtcblxuR1RvdWNoTGlzdC5wcm90b3R5cGUuaXRlbSA9IGZ1bmN0aW9uIChpbmRleCkge1xuICByZXR1cm4gdGhpcy50b3VjaGVzW2luZGV4XTtcbn07XG5cbi8vIEFkZGl0aW9uYWw7IG5vdCBpbiBzcGVjc1xuR1RvdWNoTGlzdC5wcm90b3R5cGUuYWRkVG91Y2ggPSBmdW5jdGlvbiAodG91Y2gpIHtcbiAgdGhpc1t0aGlzLnRvdWNoZXMubGVuZ3RoXSA9IHRvdWNoO1xuICB0aGlzLnRvdWNoZXMucHVzaCh0b3VjaCk7XG4gIHRoaXMubGVuZ3RoICs9IDE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdUb3VjaExpc3Q7XG4iLCIvLyBNYWludGFpbnMgYSBsaXN0IG9mIG9uZ29pbmcgdG91Y2hlcyB0byBiZSBhdHRhY2hlZCB0b1xuLy8gdG91Y2ggZXZlbnRzLlxuXG52YXIgR1RvdWNoID0gcmVxdWlyZSgnLi9HVG91Y2gnKTtcbnZhciBHVG91Y2hMaXN0ID0gcmVxdWlyZSgnLi9HVG91Y2hMaXN0Jyk7XG52YXIgR1RvdWNoRXZlbnQgPSByZXF1aXJlKCcuL0dUb3VjaEV2ZW50Jyk7XG52YXIgT2JqZWN0TWFwID0gcmVxdWlyZSgnLi9PYmplY3RNYXAnKTtcblxudmFyIHZhbHVlc1RvQXJyYXkgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBrZXksIHZhbCwgYXJyO1xuICBhcnIgPSBbXTtcbiAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICBhcnIucHVzaChvYmpba2V5XSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBhcnI7XG59O1xuXG52YXIgYXJyYXlUb1RvdWNoTGlzdCA9IGZ1bmN0aW9uICh0b3VjaGVzKSB7XG4gIHZhciBsaXN0ID0gbmV3IEdUb3VjaExpc3QoKTtcbiAgdG91Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uICh0b3VjaCkge1xuICAgIGxpc3QuYWRkVG91Y2godG91Y2gpO1xuICB9KTtcbiAgcmV0dXJuIGxpc3Q7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIEdUb3VjaE1hbmFnZXIoKSB7XG5cbiAgLy8gdGFyZ2V0IC0+IChpZCAtPiB0b3VjaClcbiAgLy8gVXNhZ2VcbiAgLy8gICB2YXIgaWQydG91Y2ggPSB0YXJnZXRUb1RvdWNoLmdldCh0YXJnZXQpXG4gIC8vICAgdmFyIHRvdWNoID0gaWQydG91Y2hbaWRdXG4gIHZhciB0YXJnZXRUb1RvdWNoID0gbmV3IE9iamVjdE1hcCgpO1xuXG4gIC8vIEFsbCB0b3VjaGVzLlxuICAvLyBpZCAtPiB0b3VjaFxuICB2YXIgaWRUb1RvdWNoID0ge307XG5cbiAgdGhpcy50b3VjaHN0YXJ0ID0gZnVuY3Rpb24gKGlkLCB0YXJnZXQsIHgsIHkpIHtcbiAgICBpZiAoaWRUb1RvdWNoLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3Qgc3RhcnQgYWxyZWFkeSBzdGFydGVkIHRvdWNoLicpO1xuICAgIH1cblxuICAgIHZhciB0ID0gbmV3IEdUb3VjaChpZCwgdGFyZ2V0LCB4LCB5KTtcblxuICAgIC8vIEFkZFxuICAgIGlkVG9Ub3VjaFtpZF0gPSB0O1xuXG4gICAgLy8gQ2hhbmdlZCB0b3VjaGVzIChvbmx5IG9uZSlcbiAgICB2YXIgY2hhbmdlZFRvdWNoZXMgPSBuZXcgR1RvdWNoTGlzdCgpO1xuICAgIGNoYW5nZWRUb3VjaGVzLmFkZFRvdWNoKHQpO1xuXG4gICAgLy8gVG91Y2hlcyB0aGF0IG9yaWdpbmF0ZWQgZnJvbSB0aGUgdGFyZ2V0XG4gICAgdmFyIG8sIGFycjtcbiAgICBpZiAodGFyZ2V0VG9Ub3VjaC5oYXModGFyZ2V0KSkge1xuICAgICAgbyA9IHRhcmdldFRvVG91Y2guZ2V0KHRhcmdldCk7XG4gICAgICAvLyBBc3NlcnRcbiAgICAgIGlmIChvLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0dob3N0dXJlIGJ1Zy4nKTtcbiAgICAgIH1cbiAgICAgIG9baWRdID0gdDtcbiAgICB9IGVsc2Uge1xuICAgICAgbyA9IHt9O1xuICAgICAgb1tpZF0gPSB0O1xuICAgICAgdGFyZ2V0VG9Ub3VjaC5zZXQodGFyZ2V0LCBvKTtcbiAgICB9XG4gICAgYXJyID0gdmFsdWVzVG9BcnJheSh0YXJnZXRUb1RvdWNoLmdldCh0YXJnZXQpKTtcbiAgICB2YXIgdGFyZ2V0VG91Y2hlcyA9IGFycmF5VG9Ub3VjaExpc3QoYXJyKTtcblxuICAgIC8vIEFsbCB0b3VjaGVzXG4gICAgdmFyIGFsbFRvdWNoZXMgPSBhcnJheVRvVG91Y2hMaXN0KHZhbHVlc1RvQXJyYXkoaWRUb1RvdWNoKSk7XG5cbiAgICByZXR1cm4gbmV3IEdUb3VjaEV2ZW50KCd0b3VjaHN0YXJ0JywgdGFyZ2V0LCB4LCB5LFxuICAgICAgY2hhbmdlZFRvdWNoZXMsIHRhcmdldFRvdWNoZXMsIGFsbFRvdWNoZXMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAcGFyYW0ge251bWJlcn0gaWRcbiAgICogQHBhcmFtIHtlbGVtZW50fSB0YXJnZXRcbiAgICogQHBhcmFtIHtudW1iZXJ9IFt4PWN1cnJlbnRdXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbeT1jdXJyZW50XVxuICAgKi9cbiAgdGhpcy50b3VjaG1vdmUgPSBmdW5jdGlvbiAoaWQsIHRhcmdldCwgeCwgeSkge1xuICAgIGlmICghaWRUb1RvdWNoLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgbW92ZSBub24tZXhpc3RpbmcgdG91Y2gnKTtcbiAgICB9XG5cbiAgICAvLyBVc2UgY3VycmVudCBjb29yZGluYXRlcyBpZiBub3QgZ2l2ZW5cbiAgICBpZiAodHlwZW9mIHggPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiB5ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgeCA9IGlkVG9Ub3VjaFtpZF0uY2xpZW50WDtcbiAgICAgIHkgPSBpZFRvVG91Y2hbaWRdLmNsaWVudFk7XG4gICAgfVxuXG4gICAgLy8gRG8gbm90IG1vZGlmeSBvbGQsIGJ1dCBjcmVhdGUgbmV3IGFuZCByZXBsYWNlLlxuICAgIHZhciB0ID0gbmV3IEdUb3VjaChpZCwgdGFyZ2V0LCB4LCB5KTtcblxuICAgIC8vIFJlcGxhY2VcbiAgICBpZFRvVG91Y2hbaWRdID0gdDtcblxuICAgIC8vIENoYW5nZWQgdG91Y2hlcyAob25seSBvbmUpXG4gICAgdmFyIGNoYW5nZWRUb3VjaGVzID0gbmV3IEdUb3VjaExpc3QoKTtcbiAgICBjaGFuZ2VkVG91Y2hlcy5hZGRUb3VjaCh0KTtcblxuICAgIC8vIFRvdWNoZXMgdGhhdCBvcmlnaW5hdGVkIGZyb20gdGhlIHRhcmdldFxuICAgIC8vIEFzc2VydFxuICAgIGlmICghdGFyZ2V0VG9Ub3VjaC5oYXModGFyZ2V0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdHaG9zdHVyZSBidWcnKTtcbiAgICB9XG4gICAgLy8gUmVwbGFjZVxuICAgIHRhcmdldFRvVG91Y2guZ2V0KHRhcmdldClbaWRdID0gdDtcbiAgICB2YXIgYXJyID0gdmFsdWVzVG9BcnJheSh0YXJnZXRUb1RvdWNoLmdldCh0YXJnZXQpKTtcbiAgICB2YXIgdGFyZ2V0VG91Y2hlcyA9IGFycmF5VG9Ub3VjaExpc3QoYXJyKTtcblxuICAgIC8vIEFsbCB0b3VjaGVzXG4gICAgdmFyIGFsbFRvdWNoZXMgPSBhcnJheVRvVG91Y2hMaXN0KHZhbHVlc1RvQXJyYXkoaWRUb1RvdWNoKSk7XG5cbiAgICByZXR1cm4gbmV3IEdUb3VjaEV2ZW50KCd0b3VjaG1vdmUnLCB0YXJnZXQsIHgsIHksXG4gICAgICBjaGFuZ2VkVG91Y2hlcywgdGFyZ2V0VG91Y2hlcywgYWxsVG91Y2hlcyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBpZFxuICAgKiBAcGFyYW0ge2VsZW1lbnR9IHRhcmdldFxuICAgKiBAcGFyYW0ge251bWJlcn0gW3g9Y3VycmVudF1cbiAgICogQHBhcmFtIHtudW1iZXJ9IFt5PWN1cnJlbnRdXG4gICAqL1xuICB0aGlzLnRvdWNoZW5kID0gZnVuY3Rpb24gKGlkLCB0YXJnZXQsIHgsIHkpIHtcbiAgICBpZiAoIWlkVG9Ub3VjaC5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGVuZCBub24tZXhpc3RpbmcgdG91Y2guJyk7XG4gICAgfVxuXG4gICAgLy8gVXNlIGN1cnJlbnQgY29vcmRpbmF0ZXMgaWYgbm90IGdpdmVuXG4gICAgaWYgKHR5cGVvZiB4ID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgeSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHggPSBpZFRvVG91Y2hbaWRdLmNsaWVudFg7XG4gICAgICB5ID0gaWRUb1RvdWNoW2lkXS5jbGllbnRZO1xuICAgIH1cblxuICAgIC8vIERvIG5vdCBtb2RpZnkgb2xkLCBidXQgY3JlYXRlIG5ldy5cbiAgICB2YXIgdCA9IG5ldyBHVG91Y2goaWQsIHRhcmdldCwgeCwgeSk7XG5cbiAgICAvLyBSZW1vdmUgdGhlIHRvdWNoXG4gICAgZGVsZXRlIGlkVG9Ub3VjaFtpZF07XG5cbiAgICAvLyBDaGFuZ2VkIHRvdWNoZXMgKG9ubHkgb25lKTtcbiAgICAvLyBcIkZvciB0aGUgdG91Y2hlbmQgYW5kIHRvdWNoY2FuY2VsIGV2ZW50cyB0aGlzIG11c3QgYmVcbiAgICAvLyBhIGxpc3Qgb2YgdGhlIHRvdWNoIHBvaW50cyB0aGF0IGhhdmUganVzdCBiZWVuIHJlbW92ZWRcbiAgICAvLyBmcm9tIHRoZSBzdXJmYWNlLlwiIC1NRE4vdG91Y2hjYW5jZWxcbiAgICB2YXIgY2hhbmdlZFRvdWNoZXMgPSBuZXcgR1RvdWNoTGlzdCgpO1xuICAgIGNoYW5nZWRUb3VjaGVzLmFkZFRvdWNoKHQpO1xuXG4gICAgLy8gQ3VycmVudCB0b3VjaGVzIHRoYXQgb3JpZ2luYXRlZCBmcm9tIHRoZSB0YXJnZXQuXG4gICAgLy8gVG91Y2ggdGhhdCBlbmRlZCBpcyBub3QgYW55bW9yZSBwYXJ0IG9mIHRob3NlIHRvdWNoZXMuXG4gICAgZGVsZXRlIHRhcmdldFRvVG91Y2guZ2V0KHRhcmdldClbaWRdO1xuICAgIHZhciBhcnIgPSB2YWx1ZXNUb0FycmF5KHRhcmdldFRvVG91Y2guZ2V0KHRhcmdldCkpO1xuICAgIHZhciB0YXJnZXRUb3VjaGVzID0gYXJyYXlUb1RvdWNoTGlzdChhcnIpO1xuXG4gICAgLy8gQWxsIHRvdWNoZXNcbiAgICB2YXIgYWxsVG91Y2hlcyA9IGFycmF5VG9Ub3VjaExpc3QodmFsdWVzVG9BcnJheShpZFRvVG91Y2gpKTtcblxuICAgIHJldHVybiBuZXcgR1RvdWNoRXZlbnQoJ3RvdWNoZW5kJywgdGFyZ2V0LCB4LCB5LFxuICAgICAgY2hhbmdlZFRvdWNoZXMsIHRhcmdldFRvdWNoZXMsIGFsbFRvdWNoZXMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAcGFyYW0ge251bWJlcn0gaWRcbiAgICogQHBhcmFtIHtlbGVtZW50fSB0YXJnZXRcbiAgICogQHBhcmFtIHtudW1iZXJ9IFt4PWN1cnJlbnRdXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbeT1jdXJyZW50XVxuICAgKi9cbiAgdGhpcy50b3VjaGNhbmNlbCA9IGZ1bmN0aW9uIChpZCwgdGFyZ2V0LCB4LCB5KSB7XG4gICAgaWYgKCFpZFRvVG91Y2guaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBjYW5jZWwgbm9uLWV4aXN0aW5nIHRvdWNoLicpO1xuICAgIH1cblxuICAgIC8vIFVzZSBjdXJyZW50IGNvb3JkaW5hdGVzIGlmIG5vdCBnaXZlblxuICAgIGlmICh0eXBlb2YgeCA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIHkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB4ID0gaWRUb1RvdWNoW2lkXS5jbGllbnRYO1xuICAgICAgeSA9IGlkVG9Ub3VjaFtpZF0uY2xpZW50WTtcbiAgICB9XG5cbiAgICAvLyBEbyBub3QgbW9kaWZ5IG9sZCwgYnV0IGNyZWF0ZSBuZXcuXG4gICAgdmFyIHQgPSBuZXcgR1RvdWNoKGlkLCB0YXJnZXQsIHgsIHkpO1xuXG4gICAgLy8gUmVtb3ZlIHRoZSB0b3VjaFxuICAgIGRlbGV0ZSBpZFRvVG91Y2hbaWRdO1xuXG4gICAgLy8gQ2hhbmdlZCB0b3VjaGVzIChvbmx5IG9uZSk7XG4gICAgLy8gXCJGb3IgdGhlIHRvdWNoZW5kIGFuZCB0b3VjaGNhbmNlbCBldmVudHMgdGhpcyBtdXN0IGJlXG4gICAgLy8gYSBsaXN0IG9mIHRoZSB0b3VjaCBwb2ludHMgdGhhdCBoYXZlIGp1c3QgYmVlbiByZW1vdmVkXG4gICAgLy8gZnJvbSB0aGUgc3VyZmFjZS5cIiAtTUROL3RvdWNoY2FuY2VsXG4gICAgdmFyIGNoYW5nZWRUb3VjaGVzID0gbmV3IEdUb3VjaExpc3QoKTtcbiAgICBjaGFuZ2VkVG91Y2hlcy5hZGRUb3VjaCh0KTtcblxuICAgIC8vIEN1cnJlbnQgdG91Y2hlcyB0aGF0IG9yaWdpbmF0ZWQgZnJvbSB0aGUgdGFyZ2V0LlxuICAgIC8vIFRvdWNoIHRoYXQgY2FuY2VsbGVkIGlzIG5vdCBhbnltb3JlIHBhcnQgb2YgdGhvc2UgdG91Y2hlcy5cbiAgICBkZWxldGUgdGFyZ2V0VG9Ub3VjaC5nZXQodGFyZ2V0KVtpZF07XG4gICAgdmFyIGFyciA9IHZhbHVlc1RvQXJyYXkodGFyZ2V0VG9Ub3VjaC5nZXQodGFyZ2V0KSk7XG4gICAgdmFyIHRhcmdldFRvdWNoZXMgPSBhcnJheVRvVG91Y2hMaXN0KGFycik7XG5cbiAgICAvLyBBbGwgdG91Y2hlc1xuICAgIHZhciBhbGxUb3VjaGVzID0gYXJyYXlUb1RvdWNoTGlzdCh2YWx1ZXNUb0FycmF5KGlkVG9Ub3VjaCkpO1xuXG4gICAgcmV0dXJuIG5ldyBHVG91Y2hFdmVudCgndG91Y2hjYW5jZWwnLCB0YXJnZXQsIHgsIHksXG4gICAgICBjaGFuZ2VkVG91Y2hlcywgdGFyZ2V0VG91Y2hlcywgYWxsVG91Y2hlcyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIE51bWJlciBvZiBvbmdvaW5nIHRvdWNoZXNcbiAgICovXG4gIHRoaXMubnVtVG91Y2hlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoaWRUb1RvdWNoKS5sZW5ndGg7XG4gIH07XG5cbiAgLyoqXG4gICAqIE51bWJlciBvZiBvbmdvaW5nIHRvdWNoZXMgb24gYW4gZWxlbWVudFxuICAgKiBAcGFyYW0ge2VsZW1lbnR9IHRhcmdldFxuICAgKi9cbiAgdGhpcy5udW1Ub3VjaGVzT25FbGVtZW50ID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgIHZhciBpZDJ0b3VjaDtcbiAgICBpZiAodGFyZ2V0VG9Ub3VjaC5oYXModGFyZ2V0KSkge1xuICAgICAgaWQydG91Y2ggPSB0YXJnZXRUb1RvdWNoLmdldCh0YXJnZXQpO1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGlkMnRvdWNoKS5sZW5ndGg7XG4gICAgfSAvLyBlbHNlXG4gICAgcmV0dXJuIDA7XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBPYmplY3RNYXAoKSB7XG4gIC8vIFNlZSBNRE4gV2Vha01hcFxuXG4gIHZhciBvYmplY3RzID0gW107XG4gIHZhciB2YWx1ZXMgPSBbXTtcblxuICB0aGlzLmdldCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gdmFsdWVzW29iamVjdHMuaW5kZXhPZihvYmopXTtcbiAgfTtcblxuICB0aGlzLnNldCA9IGZ1bmN0aW9uIChvYmosIHZhbHVlKSB7XG4gICAgdmFyIGluZGV4ID0gb2JqZWN0cy5pbmRleE9mKG9iaik7XG4gICAgaWYgKGluZGV4IDwgMCkge1xuICAgICAgLy8gTm90IGZvdW5kLiBDcmVhdGUuXG4gICAgICBvYmplY3RzLnB1c2gob2JqKTtcbiAgICAgIHZhbHVlcy5wdXNoKHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm91bmQuIFJlcGxhY2UuXG4gICAgICB2YWx1ZXNbaW5kZXhdID0gdmFsdWU7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMuaGFzID0gZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiAob2JqZWN0cy5pbmRleE9mKG9iaikgIT09IC0xKTtcbiAgfTtcblxuICB0aGlzLnJlbW92ZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgaW5kZXggPSBvYmplY3RzLmluZGV4T2Yob2JqKTtcbiAgICBpZiAoaW5kZXggPCAwKSB7XG4gICAgICAvLyBEb2VzIG5vdCBleGlzdC4gRG8gbm90aGluZy5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm91bmQuIFJlbW92ZS5cbiAgICAgIG9iamVjdHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIHZhbHVlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKipcbiAqIEFkYXB0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vaGFtbWVyanMvdG91Y2hlbXVsYXRvclxuICovXG5cbi8qKlxuICogU2ltcGxlIHRyaWNrIHRvIGZha2UgdG91Y2ggZXZlbnQgc3VwcG9ydFxuICogdGhpcyBpcyBlbm91Z2ggZm9yIG1vc3QgbGlicmFyaWVzIGxpa2UgTW9kZXJuaXpyIGFuZCBIYW1tZXJcbiAqL1xuZXhwb3J0cy5mYWtlVG91Y2hTdXBwb3J0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgb2JqcyA9IFt3aW5kb3csIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudF07XG4gIHZhciBwcm9wcyA9IFsnb250b3VjaHN0YXJ0JywgJ29udG91Y2htb3ZlJywgJ29udG91Y2hjYW5jZWwnLCAnb250b3VjaGVuZCddO1xuXG4gIGZvciAodmFyIG8gPSAwOyBvIDwgb2Jqcy5sZW5ndGg7IG8gKz0gMSkge1xuICAgIGZvciAodmFyIHAgPSAwOyBwIDwgcHJvcHMubGVuZ3RoOyBwICs9IDEpIHtcbiAgICAgIGlmIChvYmpzW29dICYmIHR5cGVvZiBvYmpzW29dW3Byb3BzW3BdXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgb2Jqc1tvXVtwcm9wc1twXV0gPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiB3ZSBkb24ndCBoYXZlIHRvIGVtdWxhdGUgb24gYSB0b3VjaCBkZXZpY2VcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5leHBvcnRzLmhhc1RvdWNoU3VwcG9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIChcIm9udG91Y2hzdGFydFwiIGluIHdpbmRvdykgfHwgLy8gdG91Y2ggZXZlbnRzXG4gICAgICAgICAod2luZG93Lk1vZGVybml6ciAmJiB3aW5kb3cuTW9kZXJuaXpyLnRvdWNoKSB8fCAvLyBtb2Rlcm5penJcbiAgICAgICAgIChuYXZpZ2F0b3IubXNNYXhUb3VjaFBvaW50cyB8fCBuYXZpZ2F0b3IubWF4VG91Y2hQb2ludHMpID4gMjsgLy8gcG9pbnRlciBldmVudHNcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9ICcwLjIuMCc7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAoIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiXG4vKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIEVtaXR0ZXIgPSByZXF1aXJlKCdlbWl0dGVyJyk7XG52YXIgY2xvbmUgPSByZXF1aXJlKCdjbG9uZScpO1xudmFyIHR5cGUgPSByZXF1aXJlKCd0eXBlJyk7XG52YXIgZWFzZSA9IHJlcXVpcmUoJ2Vhc2UnKTtcblxuLyoqXG4gKiBFeHBvc2UgYFR3ZWVuYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFR3ZWVuO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYFR3ZWVuYCB3aXRoIGBvYmpgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gVHdlZW4ob2JqKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBUd2VlbikpIHJldHVybiBuZXcgVHdlZW4ob2JqKTtcbiAgdGhpcy5fZnJvbSA9IG9iajtcbiAgdGhpcy5lYXNlKCdsaW5lYXInKTtcbiAgdGhpcy5kdXJhdGlvbig1MDApO1xufVxuXG4vKipcbiAqIE1peGluIGVtaXR0ZXIuXG4gKi9cblxuRW1pdHRlcihUd2Vlbi5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFJlc2V0IHRoZSB0d2Vlbi5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblR3ZWVuLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuaXNBcnJheSA9ICdhcnJheScgPT09IHR5cGUodGhpcy5fZnJvbSk7XG4gIHRoaXMuX2N1cnIgPSBjbG9uZSh0aGlzLl9mcm9tKTtcbiAgdGhpcy5fZG9uZSA9IGZhbHNlO1xuICB0aGlzLl9zdGFydCA9IERhdGUubm93KCk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBUd2VlbiB0byBgb2JqYCBhbmQgcmVzZXQgaW50ZXJuYWwgc3RhdGUuXG4gKlxuICogICAgdHdlZW4udG8oeyB4OiA1MCwgeTogMTAwIH0pXG4gKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IG9ialxuICogQHJldHVybiB7VHdlZW59IHNlbGZcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVHdlZW4ucHJvdG90eXBlLnRvID0gZnVuY3Rpb24ob2JqKXtcbiAgdGhpcy5yZXNldCgpO1xuICB0aGlzLl90byA9IG9iajtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBkdXJhdGlvbiB0byBgbXNgIFs1MDBdLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtc1xuICogQHJldHVybiB7VHdlZW59IHNlbGZcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuVHdlZW4ucHJvdG90eXBlLmR1cmF0aW9uID0gZnVuY3Rpb24obXMpe1xuICB0aGlzLl9kdXJhdGlvbiA9IG1zO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IGVhc2luZyBmdW5jdGlvbiB0byBgZm5gLlxuICpcbiAqICAgIHR3ZWVuLmVhc2UoJ2luLW91dC1zaW5lJylcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge1R3ZWVufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Ud2Vlbi5wcm90b3R5cGUuZWFzZSA9IGZ1bmN0aW9uKGZuKXtcbiAgZm4gPSAnZnVuY3Rpb24nID09IHR5cGVvZiBmbiA/IGZuIDogZWFzZVtmbl07XG4gIGlmICghZm4pIHRocm93IG5ldyBUeXBlRXJyb3IoJ2ludmFsaWQgZWFzaW5nIGZ1bmN0aW9uJyk7XG4gIHRoaXMuX2Vhc2UgPSBmbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFN0b3AgdGhlIHR3ZWVuIGFuZCBpbW1lZGlhdGVseSBlbWl0IFwic3RvcFwiIGFuZCBcImVuZFwiLlxuICpcbiAqIEByZXR1cm4ge1R3ZWVufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Ud2Vlbi5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuc3RvcHBlZCA9IHRydWU7XG4gIHRoaXMuX2RvbmUgPSB0cnVlO1xuICB0aGlzLmVtaXQoJ3N0b3AnKTtcbiAgdGhpcy5lbWl0KCdlbmQnKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFBlcmZvcm0gYSBzdGVwLlxuICpcbiAqIEByZXR1cm4ge1R3ZWVufSBzZWxmXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5Ud2Vlbi5wcm90b3R5cGUuc3RlcCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLl9kb25lKSByZXR1cm47XG5cbiAgLy8gZHVyYXRpb25cbiAgdmFyIGR1cmF0aW9uID0gdGhpcy5fZHVyYXRpb247XG4gIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICB2YXIgZGVsdGEgPSBub3cgLSB0aGlzLl9zdGFydDtcbiAgdmFyIGRvbmUgPSBkZWx0YSA+PSBkdXJhdGlvbjtcblxuICAvLyBjb21wbGV0ZVxuICBpZiAoZG9uZSkge1xuICAgIHRoaXMuX2Zyb20gPSB0aGlzLl90bztcbiAgICB0aGlzLl91cGRhdGUodGhpcy5fdG8pO1xuICAgIHRoaXMuX2RvbmUgPSB0cnVlO1xuICAgIHRoaXMuZW1pdCgnZW5kJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyB0d2VlblxuICB2YXIgZnJvbSA9IHRoaXMuX2Zyb207XG4gIHZhciB0byA9IHRoaXMuX3RvO1xuICB2YXIgY3VyciA9IHRoaXMuX2N1cnI7XG4gIHZhciBmbiA9IHRoaXMuX2Vhc2U7XG4gIHZhciBwID0gKG5vdyAtIHRoaXMuX3N0YXJ0KSAvIGR1cmF0aW9uO1xuICB2YXIgbiA9IGZuKHApO1xuXG4gIC8vIGFycmF5XG4gIGlmICh0aGlzLmlzQXJyYXkpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZyb20ubGVuZ3RoOyArK2kpIHtcbiAgICAgIGN1cnJbaV0gPSBmcm9tW2ldICsgKHRvW2ldIC0gZnJvbVtpXSkgKiBuO1xuICAgIH1cblxuICAgIHRoaXMuX3VwZGF0ZShjdXJyKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIG9iamVjaFxuICBmb3IgKHZhciBrIGluIGZyb20pIHtcbiAgICBjdXJyW2tdID0gZnJvbVtrXSArICh0b1trXSAtIGZyb21ba10pICogbjtcbiAgfVxuXG4gIHRoaXMuX3VwZGF0ZShjdXJyKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB1cGRhdGUgZnVuY3Rpb24gdG8gYGZuYCBvclxuICogd2hlbiBubyBhcmd1bWVudCBpcyBnaXZlbiB0aGlzIHBlcmZvcm1zXG4gKiBhIFwic3RlcFwiLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtUd2Vlbn0gc2VsZlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Ud2Vlbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oZm4pe1xuICBpZiAoMCA9PSBhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGhpcy5zdGVwKCk7XG4gIHRoaXMuX3VwZGF0ZSA9IGZuO1xuICByZXR1cm4gdGhpcztcbn07IiwiLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciB0eXBlO1xudHJ5IHtcbiAgdHlwZSA9IHJlcXVpcmUoJ2NvbXBvbmVudC10eXBlJyk7XG59IGNhdGNoIChfKSB7XG4gIHR5cGUgPSByZXF1aXJlKCd0eXBlJyk7XG59XG5cbi8qKlxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBjbG9uZTtcblxuLyoqXG4gKiBDbG9uZXMgb2JqZWN0cy5cbiAqXG4gKiBAcGFyYW0ge01peGVkfSBhbnkgb2JqZWN0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGNsb25lKG9iail7XG4gIHN3aXRjaCAodHlwZShvYmopKSB7XG4gICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgIHZhciBjb3B5ID0ge307XG4gICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGNvcHlba2V5XSA9IGNsb25lKG9ialtrZXldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGNvcHk7XG5cbiAgICBjYXNlICdhcnJheSc6XG4gICAgICB2YXIgY29weSA9IG5ldyBBcnJheShvYmoubGVuZ3RoKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gb2JqLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBjb3B5W2ldID0gY2xvbmUob2JqW2ldKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb3B5O1xuXG4gICAgY2FzZSAncmVnZXhwJzpcbiAgICAgIC8vIGZyb20gbWlsbGVybWVkZWlyb3MvYW1kLXV0aWxzIC0gTUlUXG4gICAgICB2YXIgZmxhZ3MgPSAnJztcbiAgICAgIGZsYWdzICs9IG9iai5tdWx0aWxpbmUgPyAnbScgOiAnJztcbiAgICAgIGZsYWdzICs9IG9iai5nbG9iYWwgPyAnZycgOiAnJztcbiAgICAgIGZsYWdzICs9IG9iai5pZ25vcmVDYXNlID8gJ2knIDogJyc7XG4gICAgICByZXR1cm4gbmV3IFJlZ0V4cChvYmouc291cmNlLCBmbGFncyk7XG5cbiAgICBjYXNlICdkYXRlJzpcbiAgICAgIHJldHVybiBuZXcgRGF0ZShvYmouZ2V0VGltZSgpKTtcblxuICAgIGRlZmF1bHQ6IC8vIHN0cmluZywgbnVtYmVyLCBib29sZWFuLCDigKZcbiAgICAgIHJldHVybiBvYmo7XG4gIH1cbn1cbiIsIlxuLyoqXG4gKiBFeHBvc2UgYEVtaXR0ZXJgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIEVtaXR0ZXIob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufTtcblxuLyoqXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG1peGluKG9iaikge1xuICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uID1cbkVtaXR0ZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gICh0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdID0gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSB8fCBbXSlcbiAgICAucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIGZ1bmN0aW9uIG9uKCkge1xuICAgIHRoaXMub2ZmKGV2ZW50LCBvbik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIG9uLmZuID0gZm47XG4gIHRoaXMub24oZXZlbnQsIG9uKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgLy8gYWxsXG4gIGlmICgwID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNwZWNpZmljIGV2ZW50XG4gIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xuICBpZiAoIWNhbGxiYWNrcykgcmV0dXJuIHRoaXM7XG5cbiAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xuICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxuICB2YXIgY2I7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2IgPSBjYWxsYmFja3NbaV07XG4gICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcbiAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEVtaXQgYGV2ZW50YCB3aXRoIHRoZSBnaXZlbiBhcmdzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtNaXhlZH0gLi4uXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldmVudCl7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgICAsIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XG5cbiAgaWYgKGNhbGxiYWNrcykge1xuICAgIGNhbGxiYWNrcyA9IGNhbGxiYWNrcy5zbGljZSgwKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICBjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybiBhcnJheSBvZiBjYWxsYmFja3MgZm9yIGBldmVudGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gIHJldHVybiB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdIHx8IFtdO1xufTtcblxuLyoqXG4gKiBDaGVjayBpZiB0aGlzIGVtaXR0ZXIgaGFzIGBldmVudGAgaGFuZGxlcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5oYXNMaXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XG4gIHJldHVybiAhISB0aGlzLmxpc3RlbmVycyhldmVudCkubGVuZ3RoO1xufTtcbiIsIi8qKlxuICogdG9TdHJpbmcgcmVmLlxuICovXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogUmV0dXJuIHRoZSB0eXBlIG9mIGB2YWxgLlxuICpcbiAqIEBwYXJhbSB7TWl4ZWR9IHZhbFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbCl7XG4gIHN3aXRjaCAodG9TdHJpbmcuY2FsbCh2YWwpKSB7XG4gICAgY2FzZSAnW29iamVjdCBEYXRlXSc6IHJldHVybiAnZGF0ZSc7XG4gICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzogcmV0dXJuICdyZWdleHAnO1xuICAgIGNhc2UgJ1tvYmplY3QgQXJndW1lbnRzXSc6IHJldHVybiAnYXJndW1lbnRzJztcbiAgICBjYXNlICdbb2JqZWN0IEFycmF5XSc6IHJldHVybiAnYXJyYXknO1xuICAgIGNhc2UgJ1tvYmplY3QgRXJyb3JdJzogcmV0dXJuICdlcnJvcic7XG4gIH1cblxuICBpZiAodmFsID09PSBudWxsKSByZXR1cm4gJ251bGwnO1xuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHJldHVybiAndW5kZWZpbmVkJztcbiAgaWYgKHZhbCAhPT0gdmFsKSByZXR1cm4gJ25hbic7XG4gIGlmICh2YWwgJiYgdmFsLm5vZGVUeXBlID09PSAxKSByZXR1cm4gJ2VsZW1lbnQnO1xuXG4gIHZhbCA9IHZhbC52YWx1ZU9mXG4gICAgPyB2YWwudmFsdWVPZigpXG4gICAgOiBPYmplY3QucHJvdG90eXBlLnZhbHVlT2YuYXBwbHkodmFsKVxuXG4gIHJldHVybiB0eXBlb2YgdmFsO1xufTtcbiIsIlxuLy8gZWFzaW5nIGZ1bmN0aW9ucyBmcm9tIFwiVHdlZW4uanNcIlxuXG5leHBvcnRzLmxpbmVhciA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gbjtcbn07XG5cbmV4cG9ydHMuaW5RdWFkID0gZnVuY3Rpb24obil7XG4gIHJldHVybiBuICogbjtcbn07XG5cbmV4cG9ydHMub3V0UXVhZCA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gbiAqICgyIC0gbik7XG59O1xuXG5leHBvcnRzLmluT3V0UXVhZCA9IGZ1bmN0aW9uKG4pe1xuICBuICo9IDI7XG4gIGlmIChuIDwgMSkgcmV0dXJuIDAuNSAqIG4gKiBuO1xuICByZXR1cm4gLSAwLjUgKiAoLS1uICogKG4gLSAyKSAtIDEpO1xufTtcblxuZXhwb3J0cy5pbkN1YmUgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIG4gKiBuICogbjtcbn07XG5cbmV4cG9ydHMub3V0Q3ViZSA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gLS1uICogbiAqIG4gKyAxO1xufTtcblxuZXhwb3J0cy5pbk91dEN1YmUgPSBmdW5jdGlvbihuKXtcbiAgbiAqPSAyO1xuICBpZiAobiA8IDEpIHJldHVybiAwLjUgKiBuICogbiAqIG47XG4gIHJldHVybiAwLjUgKiAoKG4gLT0gMiApICogbiAqIG4gKyAyKTtcbn07XG5cbmV4cG9ydHMuaW5RdWFydCA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gbiAqIG4gKiBuICogbjtcbn07XG5cbmV4cG9ydHMub3V0UXVhcnQgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIDEgLSAoLS1uICogbiAqIG4gKiBuKTtcbn07XG5cbmV4cG9ydHMuaW5PdXRRdWFydCA9IGZ1bmN0aW9uKG4pe1xuICBuICo9IDI7XG4gIGlmIChuIDwgMSkgcmV0dXJuIDAuNSAqIG4gKiBuICogbiAqIG47XG4gIHJldHVybiAtMC41ICogKChuIC09IDIpICogbiAqIG4gKiBuIC0gMik7XG59O1xuXG5leHBvcnRzLmluUXVpbnQgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIG4gKiBuICogbiAqIG4gKiBuO1xufVxuXG5leHBvcnRzLm91dFF1aW50ID0gZnVuY3Rpb24obil7XG4gIHJldHVybiAtLW4gKiBuICogbiAqIG4gKiBuICsgMTtcbn1cblxuZXhwb3J0cy5pbk91dFF1aW50ID0gZnVuY3Rpb24obil7XG4gIG4gKj0gMjtcbiAgaWYgKG4gPCAxKSByZXR1cm4gMC41ICogbiAqIG4gKiBuICogbiAqIG47XG4gIHJldHVybiAwLjUgKiAoKG4gLT0gMikgKiBuICogbiAqIG4gKiBuICsgMik7XG59O1xuXG5leHBvcnRzLmluU2luZSA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gMSAtIE1hdGguY29zKG4gKiBNYXRoLlBJIC8gMiApO1xufTtcblxuZXhwb3J0cy5vdXRTaW5lID0gZnVuY3Rpb24obil7XG4gIHJldHVybiBNYXRoLnNpbihuICogTWF0aC5QSSAvIDIpO1xufTtcblxuZXhwb3J0cy5pbk91dFNpbmUgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIC41ICogKDEgLSBNYXRoLmNvcyhNYXRoLlBJICogbikpO1xufTtcblxuZXhwb3J0cy5pbkV4cG8gPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIDAgPT0gbiA/IDAgOiBNYXRoLnBvdygxMDI0LCBuIC0gMSk7XG59O1xuXG5leHBvcnRzLm91dEV4cG8gPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIDEgPT0gbiA/IG4gOiAxIC0gTWF0aC5wb3coMiwgLTEwICogbik7XG59O1xuXG5leHBvcnRzLmluT3V0RXhwbyA9IGZ1bmN0aW9uKG4pe1xuICBpZiAoMCA9PSBuKSByZXR1cm4gMDtcbiAgaWYgKDEgPT0gbikgcmV0dXJuIDE7XG4gIGlmICgobiAqPSAyKSA8IDEpIHJldHVybiAuNSAqIE1hdGgucG93KDEwMjQsIG4gLSAxKTtcbiAgcmV0dXJuIC41ICogKC1NYXRoLnBvdygyLCAtMTAgKiAobiAtIDEpKSArIDIpO1xufTtcblxuZXhwb3J0cy5pbkNpcmMgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIDEgLSBNYXRoLnNxcnQoMSAtIG4gKiBuKTtcbn07XG5cbmV4cG9ydHMub3V0Q2lyYyA9IGZ1bmN0aW9uKG4pe1xuICByZXR1cm4gTWF0aC5zcXJ0KDEgLSAoLS1uICogbikpO1xufTtcblxuZXhwb3J0cy5pbk91dENpcmMgPSBmdW5jdGlvbihuKXtcbiAgbiAqPSAyXG4gIGlmIChuIDwgMSkgcmV0dXJuIC0wLjUgKiAoTWF0aC5zcXJ0KDEgLSBuICogbikgLSAxKTtcbiAgcmV0dXJuIDAuNSAqIChNYXRoLnNxcnQoMSAtIChuIC09IDIpICogbikgKyAxKTtcbn07XG5cbmV4cG9ydHMuaW5CYWNrID0gZnVuY3Rpb24obil7XG4gIHZhciBzID0gMS43MDE1ODtcbiAgcmV0dXJuIG4gKiBuICogKCggcyArIDEgKSAqIG4gLSBzKTtcbn07XG5cbmV4cG9ydHMub3V0QmFjayA9IGZ1bmN0aW9uKG4pe1xuICB2YXIgcyA9IDEuNzAxNTg7XG4gIHJldHVybiAtLW4gKiBuICogKChzICsgMSkgKiBuICsgcykgKyAxO1xufTtcblxuZXhwb3J0cy5pbk91dEJhY2sgPSBmdW5jdGlvbihuKXtcbiAgdmFyIHMgPSAxLjcwMTU4ICogMS41MjU7XG4gIGlmICggKCBuICo9IDIgKSA8IDEgKSByZXR1cm4gMC41ICogKCBuICogbiAqICggKCBzICsgMSApICogbiAtIHMgKSApO1xuICByZXR1cm4gMC41ICogKCAoIG4gLT0gMiApICogbiAqICggKCBzICsgMSApICogbiArIHMgKSArIDIgKTtcbn07XG5cbmV4cG9ydHMuaW5Cb3VuY2UgPSBmdW5jdGlvbihuKXtcbiAgcmV0dXJuIDEgLSBleHBvcnRzLm91dEJvdW5jZSgxIC0gbik7XG59O1xuXG5leHBvcnRzLm91dEJvdW5jZSA9IGZ1bmN0aW9uKG4pe1xuICBpZiAoIG4gPCAoIDEgLyAyLjc1ICkgKSB7XG4gICAgcmV0dXJuIDcuNTYyNSAqIG4gKiBuO1xuICB9IGVsc2UgaWYgKCBuIDwgKCAyIC8gMi43NSApICkge1xuICAgIHJldHVybiA3LjU2MjUgKiAoIG4gLT0gKCAxLjUgLyAyLjc1ICkgKSAqIG4gKyAwLjc1O1xuICB9IGVsc2UgaWYgKCBuIDwgKCAyLjUgLyAyLjc1ICkgKSB7XG4gICAgcmV0dXJuIDcuNTYyNSAqICggbiAtPSAoIDIuMjUgLyAyLjc1ICkgKSAqIG4gKyAwLjkzNzU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIDcuNTYyNSAqICggbiAtPSAoIDIuNjI1IC8gMi43NSApICkgKiBuICsgMC45ODQzNzU7XG4gIH1cbn07XG5cbmV4cG9ydHMuaW5PdXRCb3VuY2UgPSBmdW5jdGlvbihuKXtcbiAgaWYgKG4gPCAuNSkgcmV0dXJuIGV4cG9ydHMuaW5Cb3VuY2UobiAqIDIpICogLjU7XG4gIHJldHVybiBleHBvcnRzLm91dEJvdW5jZShuICogMiAtIDEpICogLjUgKyAuNTtcbn07XG5cbi8vIGFsaWFzZXNcblxuZXhwb3J0c1snaW4tcXVhZCddID0gZXhwb3J0cy5pblF1YWQ7XG5leHBvcnRzWydvdXQtcXVhZCddID0gZXhwb3J0cy5vdXRRdWFkO1xuZXhwb3J0c1snaW4tb3V0LXF1YWQnXSA9IGV4cG9ydHMuaW5PdXRRdWFkO1xuZXhwb3J0c1snaW4tY3ViZSddID0gZXhwb3J0cy5pbkN1YmU7XG5leHBvcnRzWydvdXQtY3ViZSddID0gZXhwb3J0cy5vdXRDdWJlO1xuZXhwb3J0c1snaW4tb3V0LWN1YmUnXSA9IGV4cG9ydHMuaW5PdXRDdWJlO1xuZXhwb3J0c1snaW4tcXVhcnQnXSA9IGV4cG9ydHMuaW5RdWFydDtcbmV4cG9ydHNbJ291dC1xdWFydCddID0gZXhwb3J0cy5vdXRRdWFydDtcbmV4cG9ydHNbJ2luLW91dC1xdWFydCddID0gZXhwb3J0cy5pbk91dFF1YXJ0O1xuZXhwb3J0c1snaW4tcXVpbnQnXSA9IGV4cG9ydHMuaW5RdWludDtcbmV4cG9ydHNbJ291dC1xdWludCddID0gZXhwb3J0cy5vdXRRdWludDtcbmV4cG9ydHNbJ2luLW91dC1xdWludCddID0gZXhwb3J0cy5pbk91dFF1aW50O1xuZXhwb3J0c1snaW4tc2luZSddID0gZXhwb3J0cy5pblNpbmU7XG5leHBvcnRzWydvdXQtc2luZSddID0gZXhwb3J0cy5vdXRTaW5lO1xuZXhwb3J0c1snaW4tb3V0LXNpbmUnXSA9IGV4cG9ydHMuaW5PdXRTaW5lO1xuZXhwb3J0c1snaW4tZXhwbyddID0gZXhwb3J0cy5pbkV4cG87XG5leHBvcnRzWydvdXQtZXhwbyddID0gZXhwb3J0cy5vdXRFeHBvO1xuZXhwb3J0c1snaW4tb3V0LWV4cG8nXSA9IGV4cG9ydHMuaW5PdXRFeHBvO1xuZXhwb3J0c1snaW4tY2lyYyddID0gZXhwb3J0cy5pbkNpcmM7XG5leHBvcnRzWydvdXQtY2lyYyddID0gZXhwb3J0cy5vdXRDaXJjO1xuZXhwb3J0c1snaW4tb3V0LWNpcmMnXSA9IGV4cG9ydHMuaW5PdXRDaXJjO1xuZXhwb3J0c1snaW4tYmFjayddID0gZXhwb3J0cy5pbkJhY2s7XG5leHBvcnRzWydvdXQtYmFjayddID0gZXhwb3J0cy5vdXRCYWNrO1xuZXhwb3J0c1snaW4tb3V0LWJhY2snXSA9IGV4cG9ydHMuaW5PdXRCYWNrO1xuZXhwb3J0c1snaW4tYm91bmNlJ10gPSBleHBvcnRzLmluQm91bmNlO1xuZXhwb3J0c1snb3V0LWJvdW5jZSddID0gZXhwb3J0cy5vdXRCb3VuY2U7XG5leHBvcnRzWydpbi1vdXQtYm91bmNlJ10gPSBleHBvcnRzLmluT3V0Qm91bmNlO1xuIiwiLypnbG9iYWxzIGRlZmluZSwgbW9kdWxlICovXG5cbi8vIFRoaXMgbW9kdWxlIGNvbnRhaW5zIGZ1bmN0aW9ucyBmb3IgY29udmVydGluZyBtaWxsaXNlY29uZHNcbi8vIHRvIGFuZCBmcm9tIENTUyB0aW1lIHN0cmluZ3MuXG5cbihmdW5jdGlvbiAoZ2xvYmFscykge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciByZWdleCA9IC9eKFtcXC1cXCtdP1swLTldKyhcXC5bMC05XSspPykobT9zKSQvLFxuXG4gICAgZnVuY3Rpb25zID0ge1xuICAgICAgICBmcm9tOiBmcm9tLFxuICAgICAgICB0bzogdG9cbiAgICB9O1xuXG4gICAgZXhwb3J0RnVuY3Rpb25zKCk7XG5cbiAgICAvLyBQdWJsaWMgZnVuY3Rpb24gYGZyb21gLlxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyByZXByZXNlbnRlZCBieSBhXG4gICAgLy8gQ1NTIHRpbWUgc3RyaW5nLlxuICAgIGZ1bmN0aW9uIGZyb20gKGNzc1RpbWUpIHtcbiAgICAgICAgdmFyIG1hdGNoZXMgPSByZWdleC5leGVjKGNzc1RpbWUpO1xuXG4gICAgICAgIGlmIChtYXRjaGVzID09PSBudWxsKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQ1NTIHRpbWUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KG1hdGNoZXNbMV0pICogKG1hdGNoZXNbM10gPT09ICdzJyA/IDEwMDAgOiAxKTtcbiAgICB9XG5cbiAgICAvLyBQdWJsaWMgZnVuY3Rpb24gYHRvYC5cbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSBDU1MgdGltZSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBudW1iZXJcbiAgICAvLyBvZiBtaWxsaXNlY29uZHMgcGFzc2VkIGluIHRoZSBhcmd1bWVudHMuXG4gICAgZnVuY3Rpb24gdG8gKG1pbGxpc2Vjb25kcykge1xuICAgICAgICBpZiAodHlwZW9mIG1pbGxpc2Vjb25kcyAhPT0gJ251bWJlcicgfHwgaXNOYU4obWlsbGlzZWNvbmRzKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG1pbGxpc2Vjb25kcycpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1pbGxpc2Vjb25kcyArICdtcyc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXhwb3J0RnVuY3Rpb25zICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAgICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb25zO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlICE9PSBudWxsKSB7XG4gICAgICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9ucztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdsb2JhbHMuY3NzVGltZSA9IGZ1bmN0aW9ucztcbiAgICAgICAgfVxuICAgIH1cbn0odGhpcykpO1xuXG4iLCJ2YXIgbm93ID0gcmVxdWlyZSgncGVyZm9ybWFuY2Utbm93JylcbiAgLCBnbG9iYWwgPSB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/IHt9IDogd2luZG93XG4gICwgdmVuZG9ycyA9IFsnbW96JywgJ3dlYmtpdCddXG4gICwgc3VmZml4ID0gJ0FuaW1hdGlvbkZyYW1lJ1xuICAsIHJhZiA9IGdsb2JhbFsncmVxdWVzdCcgKyBzdWZmaXhdXG4gICwgY2FmID0gZ2xvYmFsWydjYW5jZWwnICsgc3VmZml4XSB8fCBnbG9iYWxbJ2NhbmNlbFJlcXVlc3QnICsgc3VmZml4XVxuICAsIGlzTmF0aXZlID0gdHJ1ZVxuXG5mb3IodmFyIGkgPSAwOyBpIDwgdmVuZG9ycy5sZW5ndGggJiYgIXJhZjsgaSsrKSB7XG4gIHJhZiA9IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ1JlcXVlc3QnICsgc3VmZml4XVxuICBjYWYgPSBnbG9iYWxbdmVuZG9yc1tpXSArICdDYW5jZWwnICsgc3VmZml4XVxuICAgICAgfHwgZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnQ2FuY2VsUmVxdWVzdCcgKyBzdWZmaXhdXG59XG5cbi8vIFNvbWUgdmVyc2lvbnMgb2YgRkYgaGF2ZSByQUYgYnV0IG5vdCBjQUZcbmlmKCFyYWYgfHwgIWNhZikge1xuICBpc05hdGl2ZSA9IGZhbHNlXG5cbiAgdmFyIGxhc3QgPSAwXG4gICAgLCBpZCA9IDBcbiAgICAsIHF1ZXVlID0gW11cbiAgICAsIGZyYW1lRHVyYXRpb24gPSAxMDAwIC8gNjBcblxuICByYWYgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmKHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIF9ub3cgPSBub3coKVxuICAgICAgICAsIG5leHQgPSBNYXRoLm1heCgwLCBmcmFtZUR1cmF0aW9uIC0gKF9ub3cgLSBsYXN0KSlcbiAgICAgIGxhc3QgPSBuZXh0ICsgX25vd1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNwID0gcXVldWUuc2xpY2UoMClcbiAgICAgICAgLy8gQ2xlYXIgcXVldWUgaGVyZSB0byBwcmV2ZW50XG4gICAgICAgIC8vIGNhbGxiYWNrcyBmcm9tIGFwcGVuZGluZyBsaXN0ZW5lcnNcbiAgICAgICAgLy8gdG8gdGhlIGN1cnJlbnQgZnJhbWUncyBxdWV1ZVxuICAgICAgICBxdWV1ZS5sZW5ndGggPSAwXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBjcC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmKCFjcFtpXS5jYW5jZWxsZWQpIHtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgY3BbaV0uY2FsbGJhY2sobGFzdClcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlIH0sIDApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCBNYXRoLnJvdW5kKG5leHQpKVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKHtcbiAgICAgIGhhbmRsZTogKytpZCxcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFjayxcbiAgICAgIGNhbmNlbGxlZDogZmFsc2VcbiAgICB9KVxuICAgIHJldHVybiBpZFxuICB9XG5cbiAgY2FmID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZihxdWV1ZVtpXS5oYW5kbGUgPT09IGhhbmRsZSkge1xuICAgICAgICBxdWV1ZVtpXS5jYW5jZWxsZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZm4pIHtcbiAgLy8gV3JhcCBpbiBhIG5ldyBmdW5jdGlvbiB0byBwcmV2ZW50XG4gIC8vIGBjYW5jZWxgIHBvdGVudGlhbGx5IGJlaW5nIGFzc2lnbmVkXG4gIC8vIHRvIHRoZSBuYXRpdmUgckFGIGZ1bmN0aW9uXG4gIGlmKCFpc05hdGl2ZSkge1xuICAgIHJldHVybiByYWYuY2FsbChnbG9iYWwsIGZuKVxuICB9XG4gIHJldHVybiByYWYuY2FsbChnbG9iYWwsIGZ1bmN0aW9uKCkge1xuICAgIHRyeXtcbiAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHRocm93IGUgfSwgMClcbiAgICB9XG4gIH0pXG59XG5tb2R1bGUuZXhwb3J0cy5jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgY2FmLmFwcGx5KGdsb2JhbCwgYXJndW1lbnRzKVxufVxuIiwiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjYuM1xuKGZ1bmN0aW9uKCkge1xuICB2YXIgZ2V0TmFub1NlY29uZHMsIGhydGltZSwgbG9hZFRpbWU7XG5cbiAgaWYgKCh0eXBlb2YgcGVyZm9ybWFuY2UgIT09IFwidW5kZWZpbmVkXCIgJiYgcGVyZm9ybWFuY2UgIT09IG51bGwpICYmIHBlcmZvcm1hbmNlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgfTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgcHJvY2VzcyAhPT0gbnVsbCkgJiYgcHJvY2Vzcy5ocnRpbWUpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChnZXROYW5vU2Vjb25kcygpIC0gbG9hZFRpbWUpIC8gMWU2O1xuICAgIH07XG4gICAgaHJ0aW1lID0gcHJvY2Vzcy5ocnRpbWU7XG4gICAgZ2V0TmFub1NlY29uZHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBocjtcbiAgICAgIGhyID0gaHJ0aW1lKCk7XG4gICAgICByZXR1cm4gaHJbMF0gKiAxZTkgKyBoclsxXTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gZ2V0TmFub1NlY29uZHMoKTtcbiAgfSBlbHNlIGlmIChEYXRlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBEYXRlLm5vdygpO1xuICB9IGVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsb2FkVGltZTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH1cblxufSkuY2FsbCh0aGlzKTtcblxuLypcbi8vQCBzb3VyY2VNYXBwaW5nVVJMPXBlcmZvcm1hbmNlLW5vdy5tYXBcbiovXG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBTZXFJZFxuXG5mdW5jdGlvbiBTZXFJZChpbml0aWFsKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTZXFJZCkpIHtcbiAgICByZXR1cm4gbmV3IFNlcUlkKGluaXRpYWwpXG4gIH1cbiAgaWYgKGluaXRpYWwgPT0gbnVsbCkge1xuICAgIGluaXRpYWwgPSAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiBNYXRoLnBvdygyLCAzMilcbiAgfVxuICB0aGlzLl9pZCA9IGluaXRpYWwgfCAwXG59XG5TZXFJZC5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5faWQgPSAodGhpcy5faWQgKyAxKSB8IDBcbiAgcmV0dXJuIHRoaXMuX2lkXG59XG4iLCJ2YXIgR1RvdWNoRW1pdHRlciA9IHJlcXVpcmUoJy4vbGliL0dUb3VjaEVtaXR0ZXInKTtcbnZhciB0b3VjaFN1cHBvcnQgPSByZXF1aXJlKCcuL2xpYi90b3VjaFN1cHBvcnQnKTtcbnZhciB2ZXJzaW9uID0gcmVxdWlyZSgnLi9saWIvdmVyc2lvbicpO1xudmFyIHR3ZWVuID0gcmVxdWlyZSgnY29tcG9uZW50LXR3ZWVuJyk7XG52YXIgY3NzVGltZSA9IHJlcXVpcmUoJ2Nzcy10aW1lJyk7XG52YXIgcmFmID0gcmVxdWlyZSgncmFmJyk7IC8vIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbFxuXG52YXIgQ2hhaW5pbmdFcnJvciA9IGZ1bmN0aW9uICh0aHJvd2VyRm5OYW1lKSB7XG4gIHRoaXMubmFtZSA9ICdDaGFpbmluZ0Vycm9yJztcbiAgdGhpcy5tZXNzYWdlID0gdGhyb3dlckZuTmFtZSArICcgaXMgcHJvYmFibHkgd3JvbmdseSBjaGFpbmVkLic7XG59O1xuQ2hhaW5pbmdFcnJvci5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxudmFyIFBhcmFtZXRlckVycm9yID0gZnVuY3Rpb24gKHBhcmFtTmFtZSwgdmFsdWUpIHtcbiAgdGhpcy5uYW1lID0gJ1BhcmFtZXRlckVycm9yJztcbiAgdGhpcy5tZXNzYWdlID0gJ0ludmFsaWQgJyArIHBhcmFtTmFtZSArICcgdmFsdWU6ICcgKyB2YWx1ZTtcbn07XG5QYXJhbWV0ZXJFcnJvci5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxudmFyIGVtaXQgPSBuZXcgR1RvdWNoRW1pdHRlcigpO1xuXG4vLyBBZGQgb250b3VjaHN0YXJ0IGFuZCBzaW1pbGFyIGRvY3VtZW50IGF0dHJpYnV0ZXMgdG8gZmFrZVxuLy8gdG91Y2ggc3VwcG9ydCBkZXRlY3Rpb24gaW4gbGlicmFyaWVzIGxpa2UgTW9kZXJuaXpyIGFuZCBIYW1tZXIuXG5pZiAoIXRvdWNoU3VwcG9ydC5oYXNUb3VjaFN1cHBvcnQoKSkge1xuICB0b3VjaFN1cHBvcnQuZmFrZVRvdWNoU3VwcG9ydCgpO1xufVxuXG4vLyBEZWZhdWx0IGNhbGxiYWNrXG52YXIgbm9vcCA9IGZ1bmN0aW9uICgpIHt9O1xuXG52YXIgR2VzdHVyZSA9IGZ1bmN0aW9uICh4LCB5KSB7XG5cbiAgLy8gU2VxdWVuY2Ugb2YgZnVuY3Rpb25zIHRvIGJlIGV4ZWN1dGVkIHdoZW4gJy5ydW4oKScgaXMgY2FsbGVkLlxuICB2YXIgc2VxdWVuY2UgPSBbXTtcblxuICAvLyBJZGVudGlmaWVyIG9mIHRoZSB0b3VjaC5cbiAgLy8gRGVmaW5lZCBkdXJpbmcgdGhlIGZpcnN0IGZ1bmN0aW9uIGV4ZWN1dGlvbiAoc3RhcnQpXG4gIHZhciBpZDtcblxuICAvLyBBIGdlc3R1cmUgY2FuIG9ubHkgZW5kZWQgb3IgY2FuY2VsbGVkIG9uY2UuXG4gIHZhciBmaW5pc2hlZCA9IGZhbHNlO1xuXG4gIHNlcXVlbmNlLnB1c2goZnVuY3Rpb24gc3RhcnQobmV4dCkge1xuICAgIC8vIGVtaXQgdG91Y2hzdGFydCBhdCB4LCB5XG4gICAgaWQgPSBlbWl0LnRvdWNoc3RhcnQoeCwgeSk7XG4gICAgaWYgKGlkID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BvaW50ICgnICsgeCArICcsICcgKyB5ICsgJykgaXMgb3V0c2lkZSB0aGUgZG9jdW1lbnQnKTtcbiAgICB9XG4gICAgbmV4dCgpO1xuICB9KTtcblxuICB0aGlzLmNhbmNlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoZmluaXNoZWQpIHtcbiAgICAgIHRocm93IG5ldyBDaGFpbmluZ0Vycm9yKCdjYW5jZWwnKTtcbiAgICB9IC8vIGVsc2VcbiAgICBmaW5pc2hlZCA9IHRydWU7XG5cbiAgICBzZXF1ZW5jZS5wdXNoKGZ1bmN0aW9uIGNhbmNlbChuZXh0KSB7XG4gICAgICBlbWl0LnRvdWNoY2FuY2VsKGlkLCB4LCB5KTtcbiAgICAgIG5leHQoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICB0aGlzLmVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoZmluaXNoZWQpIHtcbiAgICAgIHRocm93IG5ldyBDaGFpbmluZ0Vycm9yKCdlbmQnKTtcbiAgICB9IC8vIGVsc2VcbiAgICBmaW5pc2hlZCA9IHRydWU7XG5cbiAgICBzZXF1ZW5jZS5wdXNoKGZ1bmN0aW9uIGVuZChuZXh0KSB7XG4gICAgICBlbWl0LnRvdWNoZW5kKGlkLCB4LCB5KTtcbiAgICAgIG5leHQoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQHBhcmFtIHtudW1iZXJ8b2JqZWN0fSBkdXJhdGlvblxuICAgKi9cbiAgdGhpcy5ob2xkID0gZnVuY3Rpb24gKGFyZykge1xuICAgIGlmIChmaW5pc2hlZCkge1xuICAgICAgdGhyb3cgbmV3IENoYWluaW5nRXJyb3IoJ2hvbGQnKTtcbiAgICB9IC8vIGVsc2VcblxuICAgIHZhciBkZWxheTtcblxuICAgIC8vIEFyZ3VtZW50IHZhbGlkYXRpb25cbiAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICAgIGRlbGF5ID0gYXJnO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFyZyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChhcmcuaGFzT3duUHJvcGVydHkoJ2R1cmF0aW9uJykgJiZcbiAgICAgICAgICB0eXBlb2YgYXJnLmR1cmF0aW9uID09PSAnbnVtYmVyJykge1xuICAgICAgICBkZWxheSA9IGFyZy5kdXJhdGlvbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBhcmd1bWVudCcpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgZGVsYXkgPSAxMDA7IC8vIERlZmF1bHRcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGFyZ3VtZW50Jyk7XG4gICAgfVxuXG4gICAgc2VxdWVuY2UucHVzaChmdW5jdGlvbiBob2xkKHRoZW4pIHtcbiAgICAgIHNldFRpbWVvdXQodGhlbiwgZGVsYXkpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkeFxuICAgKiBAcGFyYW0ge251bWJlcn0gZHlcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtkdXJhdGlvbj0nNTBtcyddIC0gRHVyYXRpb24gaW4gbWlsbGlzZWNzIG9yIENTUyB0aW1lIHN0cmluZy5cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtlYXNpbmc9J2xpbmVhciddXG4gICAqIEB0aHJvd3MgQ2hhaW5pbmdFcnJvclxuICAgKi9cbiAgdGhpcy5tb3ZlQnkgPSBmdW5jdGlvbiAoZHgsIGR5LCBkdXJhdGlvbiwgZWFzaW5nKSB7XG4gICAgaWYgKGZpbmlzaGVkKSB7XG4gICAgICB0aHJvdyBuZXcgQ2hhaW5pbmdFcnJvcignbW92ZUJ5Jyk7XG4gICAgfSAvLyBlbHNlXG5cbiAgICAvLyBQYXJhbWV0ZXIgaGFuZGxpbmcgaGVyZVxuICAgIGlmICh0eXBlb2YgZHVyYXRpb24gPT09ICd1bmRlZmluZWQnKSB7IGR1cmF0aW9uID0gJzUwbXMnOyB9XG4gICAgaWYgKHR5cGVvZiBlYXNpbmcgPT09ICd1bmRlZmluZWQnKSB7IGVhc2luZyA9ICdsaW5lYXInOyB9XG4gICAgaWYgKHR5cGVvZiBkdXJhdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGR1cmF0aW9uID0gY3NzVGltZS5mcm9tKGR1cmF0aW9uKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aHJvdyBuZXcgUGFyYW1ldGVyRXJyb3IoJ2R1cmF0aW9uJywgZHVyYXRpb24pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNlcXVlbmNlLnB1c2goZnVuY3Rpb24gbW92ZUJ5KG5leHQpIHtcbiAgICAgIHZhciBhbmltYXRlO1xuXG4gICAgICB2YXIgdHcgPSB0d2Vlbih7eDogeCwgeTogeX0pXG4gICAgICAgIC5lYXNlKGVhc2luZylcbiAgICAgICAgLnRvKHt4OiB4ICsgZHgsIHk6IHkgKyBkeX0pXG4gICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbik7XG5cbiAgICAgIHR3LnVwZGF0ZShmdW5jdGlvbiAobykge1xuICAgICAgICB4ID0gby54OyAvLyBVcGRhdGUgdGhlIGtub3dsZWRnZSB3aGVyZSB0aGUgcG9pbnRlciBpcy5cbiAgICAgICAgeSA9IG8ueTtcbiAgICAgICAgZW1pdC50b3VjaG1vdmUoaWQsIG8ueCwgby55KTtcbiAgICAgIH0pO1xuXG4gICAgICB0dy5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBhbmltYXRlID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuXG4gICAgICBhbmltYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByYWYoYW5pbWF0ZSk7XG4gICAgICAgIHR3LnVwZGF0ZSgpO1xuICAgICAgfTtcbiAgICAgIGFuaW1hdGUoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAcGFyYW0ge251bWJlcn0gZHhcbiAgICogQHBhcmFtIHtudW1iZXJ9IGR5XG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbZHVyYXRpb249JzUwbXMnXSAtIER1cmF0aW9uIGluIG1pbGxpc2VjcyBvciBDU1MgdGltZSBzdHJpbmcuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbZWFzaW5nPSdsaW5lYXInXVxuICAgKiBAdGhyb3dzIENoYWluaW5nRXJyb3JcbiAgICovXG4gIHRoaXMubW92ZVRvID0gZnVuY3Rpb24gKHR4LCB0eSwgZHVyYXRpb24sIGVhc2luZykge1xuICAgIHJldHVybiB0aGlzLm1vdmVCeSh0eCAtIHgsIHR5IC0geSwgZHVyYXRpb24sIGVhc2luZyk7XG4gIH07XG5cbiAgdGhpcy5ydW4gPSBmdW5jdGlvbiAoZmluYWxDYWxsYmFjaykge1xuICAgIC8vIEFkZCB0aGUgbGFzdCBvbmVcbiAgICBpZiAodHlwZW9mIGZpbmFsQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHNlcXVlbmNlLnB1c2goZmluYWxDYWxsYmFjayk7XG4gICAgfVxuXG4gICAgLy8gRXhlY3V0ZSB0aGUgZnVuY3Rpb24gc2VxdWVuY2UgcmVjdXJzaXZlbHkuXG4gICAgLy8gUmVtb3ZlIHRoZSBmdW5jdGlvbiB0byBiZSBleGVjdXRlZCBmcm9tIHRoZSBzZXF1ZW5jZSBiZWZvcmVcbiAgICAvLyBpdHMgZXhlY3V0aW9uLiBUaGlzIGlzIGEgcHJlY2F1dGlvbiBmb3IgdGhlIHNpdHVhdGlvbiB3aGVyZVxuICAgIC8vIGEgZm4gaW4gdGhlIHNlcXVlbmNlIHdvdWxkIGFkZCBuZXcgZm5zIHRvIHRoZSBzZXF1ZW5jZS5cbiAgICAoZnVuY3Rpb24gY29uc3VtZShsaXN0KSB7XG4gICAgICBpZiAobGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGxpc3Quc2hpZnQoKShmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICAgIGNvbnN1bWUobGlzdCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0oc2VxdWVuY2UpKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHRoaXMudGhlbiA9IGZ1bmN0aW9uIChmbikge1xuICAgIHNlcXVlbmNlLnB1c2goZnVuY3Rpb24gdGhlbihuZXh0KSB7XG4gICAgICBmbigpO1xuICAgICAgbmV4dCgpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHRoaXMud2FpdCA9IHRoaXMuaG9sZDtcbn07XG5cblxuZXhwb3J0cy5zdGFydCA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gIHJldHVybiBuZXcgR2VzdHVyZSh4LCB5KTtcbn07XG5cbmV4cG9ydHMubnVtVG91Y2hlcyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGVtaXQubnVtVG91Y2hlcygpO1xufTtcblxuZXhwb3J0cy5lbmRUb3VjaGVzID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gZW1pdC5lbmRUb3VjaGVzKCk7XG59O1xuXG5leHBvcnRzLnZlcnNpb24gPSB2ZXJzaW9uO1xuIl19
