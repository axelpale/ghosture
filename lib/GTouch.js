// See docs
//   https://developer.mozilla.org/en-US/docs/Web/API/Touch
module.exports = function GTouch(id, target, x, y) {
  this.identifier = id;
  this.clientX = x;
  this.clientY = y;
  this.force = 1.0; // default
  this.pageX = x; // TODO
  this.pageY = y; // TODO
  this.radiusX = 1; // default
  this.radiusY = 1; // default
  this.rotationAngle = 0; // probably default
  this.screenX = x; // TODO
  this.screenY = y; // TODO
  this.target = target; // original element
};
