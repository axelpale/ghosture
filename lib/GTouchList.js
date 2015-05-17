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
