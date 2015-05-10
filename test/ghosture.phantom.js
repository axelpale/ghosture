/*jshint expr: true*/ // prevent error in ...be.a.Function

describe('ghosture', function () {

  it('should be a function', function () {
    ghosture.should.be.a.Function;
  });

  describe('start instance', function () {

    it('should start and end and have api', function (done) {
      ghosture(function (start) {
        start.should.be.a.Function;

        var s = start(0, 0);
        s.should.have.keys('cancel', 'during', 'end',
          'moveBy', 'moveTo', 'then', 'wait');
        s.end();
      }, done);
    });

    describe('#then', function () {
      it('should exec', function (done) {
        var i = 0;
        ghosture(function (start) {
          start(0, 0)
            .then(function () {
              i += 1;
            })
            .end();
        }, function almostDone() {
          i.should.equal(1);
          done();
        });
      });
    });


  });
});
