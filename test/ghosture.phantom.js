/*jshint expr: true*/ // prevent error in ...be.a.Function

describe('ghosture', function () {

  it('should have api', function () {
    ghosture.should.have.keys('start');
  });

  describe('start', function () {

    var el;

    beforeEach(function () {
      $('#sandbox').empty();
      $('#sandbox').append('<img src="assets/lego.png" width="256" height="256">');
      el = $('#sandbox img')[0];
    });

    it('& end should cause tap', function (done) {
      var mc = new Hammer(el);
      mc.on('tap', function () {
        done();
      });

      ghosture.start(50, 50)
        .hold(20)
        .end()
        .run();
    });

    it('& moveBy should cause panend', function (done) {
      var mc = new Hammer(el);
      mc.on('panend', function () {
        done();
      });

      ghosture.start(100, 100)
        .moveBy(300, 0, 100)
        .end()
        .run();
    });

    it('& moveBy should cause multiple pans', function (done) {
      var numPans = 0;
      var mc = new Hammer(el);
      mc.on('pan', function () {
        numPans += 1;
      });
      mc.on('panend', function () {
        numPans.should.be.above(5);
        done();
      });

      ghosture.start(100, 100)
        .moveBy(300, 0, 100)
        .end()
        .run();
    });

    it('& moveTo should cause multiple pans', function (done) {
      this.timeout(150);

      var numPans = 0;
      var mc = new Hammer(el);
      mc.on('pan', function () {
        numPans += 1;
      });
      mc.on('panend', function () {
        numPans.should.be.above(5);
        done();
      });

      ghosture.start(100, 100)
        .moveTo(500, 600, 100)
        .end()
        .run();
    });

    it('& then should run something between', function (done) {
      var i = 0;
      var result = ghosture.start(100, 100)
        .then(function () {
          i += 1;
        })
        .moveTo(200, 200, 100)
        .then(function () {
          i += 1;
        })
        .end(function () {
          // Is not run. '.then' should be used.
          i += 1;
          (false).should.be.True;
        })
        .run(function () {
          i.should.equal(2);
          done();
        });
      (typeof result === 'undefined').should.be.True;
    });

  });
});
