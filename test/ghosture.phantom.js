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

    it('& move should cause panend', function (done) {
      var mc = new Hammer(el);
      mc.on('panend', function () {
        done();
      });

      ghosture.start(100, 100)
        .moveBy(300, 0, 50)
        .end()
        .run();
    });

  });
});
