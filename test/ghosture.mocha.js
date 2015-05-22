/*jshint expr: true*/ // prevent error in ...be.a.Function
var should = require('should');
var pjson = require('../package.json');

describe('version', function () {
  var version = require('../lib/version');

  it('should match with package.json', function () {
    version.should.equal(pjson.version);
  });
});
