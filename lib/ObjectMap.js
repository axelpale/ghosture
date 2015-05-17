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
