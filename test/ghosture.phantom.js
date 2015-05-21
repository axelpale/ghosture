/*jshint expr: true*/ // prevent error in ...be.a.Function

describe('ghosture', function () {

  afterEach(function () {
    // Without this one failed test might make all remaining tests to fail.
    ghosture.endTouches();
  });

  it('should have api', function () {
    ghosture.should.have.keys('start', 'numTouches', 'endTouches');
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
          should(true).not.be.ok;
        })
        .run(function () {
          i.should.equal(2);
          done();
        });
      (typeof result).should.equal('object');
    });

  });

  describe('numTouches', function () {

    it('should count number of ongoing touches', function () {
      ghosture.numTouches().should.equal(0);
      var a = ghosture.start(1, 1).run();
      ghosture.numTouches().should.equal(1);
      var b = ghosture.start(1, 1).run();
      ghosture.numTouches().should.equal(2);
      a.end().run();
      b.cancel().run();
      ghosture.numTouches().should.equal(0);
    });
  });

  describe('endTouches', function () {
    it('should end all ongoing touches', function () {
      ghosture.numTouches().should.equal(0);
      ghosture.start(1, 1).run();
      ghosture.endTouches();
      ghosture.numTouches().should.equal(0);
    });
  });
});
