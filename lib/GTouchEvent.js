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
