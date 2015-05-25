/*jshint expr: true*/ // prevent error in ...be.a.Function

describe('ghosture', function () {

  var el;

  beforeEach(function () {
    $('#sandbox').empty();
    $('#sandbox').append('<img src="assets/lego.png" width="256" height="256">');
    el = $('#sandbox img')[0];
  });

  afterEach(function () {
    // Without this one failed test might make all remaining tests to fail.
    ghosture.endTouches();
  });

  it('should have api', function () {
    ghosture.should.have.keys('start', 'numTouches', 'endTouches', 'version');
  });

  describe('start', function () {

    it('& end should cause tap', function (done) {
      var mc = new Hammer(el);
      mc.on('tap', function () {
        done();
      });

      ghosture.start(50, 50)
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
          Should(true).not.be.ok;
        })
        .run(function () {
          i.should.equal(2);
          done();
        });
      (typeof result).should.equal('object');
    });

    it('should allow parallelism', function (done) {
      var a = false;
      var b = false;
      var c = false;
      var twice = function () {
        if (!c) {
          c = true;
        } else {
          done();
        }
      };

      ghosture.start(100, 100)
        .moveBy(100, 100, 50)
        .then(function () {
          a = true;
        })
        .moveBy(100, 100, 50)
        .end()
        .run(function () {
          b.should.equal(true);
          twice();
        });

      ghosture.start(200, 100)
        .moveBy(100, 100, 50)
        .then(function () {
          b = true;
        })
        .moveBy(100, 100, 50)
        .end()
        .run(function () {
          a.should.equal(true);
          twice();
        });
    });

    it('should not allow negative coordinates', function () {
      (function () {
        ghosture.start(-100, -100)
          .moveBy(-100, -100, 100)
          .end()
          .run();
      }).should.throw(/outside/);
    });
  });

  describe('moveBy', function () {
    it('should cause panend', function (done) {
      var mc = new Hammer(el);
      mc.on('panend', function () {
        done();
      });

      ghosture.start(100, 100)
        .moveBy(300, 0, 100)
        .end()
        .run();
    });

    it('should cause multiple pans', function (done) {
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

    it('should emit correctly positioned events', function (done) {

      var x, y;
      var mc = new Hammer(el);
      mc.on('hammer.input', function (ev) {
        ev.should.have.property('srcEvent');
        ev.srcEvent.should.have.property('changedTouches');
        var touch = ev.srcEvent.changedTouches[0];
        x = touch.clientX;
        y = touch.clientY;
      });

      ghosture.start(10, 10)
        .then(function () {
          x.should.equal(10, 'x before 1st move');
          y.should.equal(10, 'y before 1st move');
        })
        .moveBy(40, 0, 50) // to 50, 10
        .then(function () {
          x.should.equal(50, 'x after 1st move');
          y.should.equal(10, 'y after 1st move');
        })
        .moveBy(0, 40, 50) // to 50, 50
        .then(function () {
          x.should.equal(50, 'x after 2nd move');
          y.should.equal(50, 'y after 2nd move');
        })
        .moveBy(-40, -40, 50) // to 10, 10
        .then(function () {
          x.should.equal(10, 'x after 3rd move');
          y.should.equal(10, 'y after 3rd move');
        })
        .end()
        .run(function () {
          x.should.equal(10);
          y.should.equal(10);
          done();
        });
    });

    it('should allow css time', function (done) {
      var after80ms = false;

      ghosture.start(100, 100)
        .moveBy(100, 100, '100ms')
        .end()
        .run(function () {
          after80ms.should.equal(true);
          done();
        });

      setTimeout(function () {
        after80ms = true;
      }, 80);
    });
  });

  describe('moveTo', function () {
    it('should cause multiple pans', function (done) {
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
  });

  describe('end', function () {
    it('should be called after moves', function () {
      (function () {
        ghosture.start(1, 1)
          .end()
          .moveTo(10, 10, 50)
          .run();
      }).should.throw(/wrongly chained/);
    });

    it('should be called only once', function () {
      (function () {
        ghosture.start(1, 1)
          .moveTo(10, 10, 50)
          .end()
          .then(function () {
            // Something between just for precaution.
          })
          .end()
          .run();
      }).should.throw(/wrongly chained/);
    });
  });

  describe('hold', function () {
    it('should postpone end', function (done) {
      var flag = false;

      var mc = new Hammer(el);
      mc.on('tap', function () {
        flag.should.equal(true);
        done();
      });

      ghosture.start(50, 50)
        .hold(80)
        .end()
        .run();

      setTimeout(function () {
        flag = true;
      }, 60);
    });

    it('should allow css time', function (done) {
      var flag = false;
      ghosture.start(50, 50)
        .hold('80ms')
        .end()
        .run(function () {
          flag.should.equal(true);
          done();
        });
      setTimeout(function () {
        flag = true;
      }, 60);
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

    // TODO moveBys after endTouches?
  });
});
