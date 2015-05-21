// Finds elements and generates finger IDs.

var GTouchManager = require('./GTouchManager');

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
   * @return id
   */
  this.touchstart = function (x, y) {
    var id = seqid.next();
    var target = document.elementFromPoint(x, y);
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
      throw new Error('Unknown touch ID: ' + id);
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
      throw new Error('Unknown touch ID: ' + id);
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
      throw new Error('Unknown touch ID: ' + id);
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
