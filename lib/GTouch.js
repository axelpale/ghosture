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
