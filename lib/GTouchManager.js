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
