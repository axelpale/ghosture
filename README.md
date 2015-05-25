# ghosture.js

Simulate and automate touch gestures in your user interface unit tests. Designed to be used especially with [PhantomJS](http://phantomjs.org/).



## Install

    npm install ghosture



## Usage

    // "swipe left"
    ghosture.start(200, 50)
      .moveTo(100, 50, '500ms')
      .end()
      .run();

    // "tap"
    ghosture.start(50, 50)
      .hold('50ms')
      .end()
      .run();

    // execute functions between
    ghosture.start(50, 50)
      .then(function () { console.log('started'); })
      .moveBy(50, 50)
      .then(function () { console.log('moved to (100, 100)'); })
      .end()
      .then(function () { console.log('ended')})
      .run(function () {
        console.log('finally');
      });

    // store gesture to a variable before running
    var pan = ghosture.start(200, 200)
      .moveBy(-100, -100, '0.2s', 'in-out-sine')
      .end();
    ...
    pan.run();
    ...
    pan.run(); // reuse (Not yet implemented)

    // run in pieces
    var g = ghosture.start(200, 200).run();
    g.moveBy(-100, -100, '0.2s').run();
    g.end().run();


## API


### ghosture

#### ghosture.start(x, y)

Creates and initiates a new `Gesture` instance. Does not emit a `touchstart` event until `run()` is called.

    var g = ghosture.start(100, 20);

#### ghosture.endTouches()

End all ongoing ghosture-created touches.

#### ghosture.numTouches()

Number of ongoing ghosture-created touches.


### Gesture

#### g.cancel()

Cancel the gesture by emitting a `touchcancel`. The gesture cannot be restarted.

#### g.end()

End the gesture by emitting a `touchend`. The gesture cannot be restarted.

#### g.hold(duration)

Keep the gesture still. Duration is a [CSS time string](https://developer.mozilla.org/en/docs/Web/CSS/time), such as '0.5s' or '500ms'.

Throws error if invalid duration is given.

#### g.moveBy(dx, dy, [duration='50ms'], [easing='linear'])

Move the gesture in a relative manner. For available easing functions, see [component/ease](https://github.com/component/ease).

Throws error if invalid duration is given.

#### g.moveTo(x, y, [duration='50ms'], [easing='linear'])

Move the gesture to absolute [clientX and clientY](https://developer.mozilla.org/en-US/docs/Web/API/Touch) coordinates.

Throws error if invalid duration is given.

#### g.run([fn])

Run the gesture and execute optional `fn` function when finished.

#### g.then(fn)

Execute an arbitrary `fn` function during the gesture.



## Future plans

### Logo

### Example apps

### Reuse



### Premade gestures (Not yet implemented)

    var tap = ghosture.tap(100, 200);
    tap.run();
    ghosture.doubletap(100, 50).run();
    ghosture.tripletap(100, 50).run();
    ghosture.doubletap({
      x: 100,
      y: 50,
      interval: 10 // default
    }).run();

### Multitouch gestures (Not yet implemented)

    ghosture.transform({
      pointers: 2,
      centerXStart: 100,
      centerYStart: 50,
      duration: 500,
      ease: 'in-out',
      centerXEnd: 200,
      centerYEnd: 60,
      radiusStart: 50,
      radiusEnd: 100,
      angleStartDeg: 0,
      angleEndRad: 0
    }).run();


### Recording (Not yet implemented)

Train your ghost fingers by tracking a real touch gesture.

    ghosture.recordNext()
      .save(function (recordedData) {
        alert(recordedData);
      });

Records the gesture from the `touchstart` of the first finger touching the document to the `touchend` of the last finger leaving the document.

The default element to track is `document.body`. You can track specific element by `.recordNext(myElement)`.

#### Replay (Not yet implemented)

Play the recorded gesture in your unit tests by:

    var gesture = "ghosture,v1;0,1,s,730,343;100,1,m,733,342;";
    ghosture(gesture).end();

or

    ghosture.start(gesture).end();

#### Format (Not yet implemented)

Example of two events:

    "ghosture,v1;0,1,s,730,343;100,1,m,733,342;"

The format in the Backus-Naur notation for geeks:

    <engine>          ::= <string>
    <version>         ::= "v" + <positive integer>
    <format-id>       ::= <engine> + "," + <version>

    <elapsed-time-ms> ::= <positive integer>
    <pointer-id>      ::= <positive integer>
    <pointer-start>   ::= "s"
    <pointer-move>    ::= "m"
    <pointer-end>     ::= "e"
    <pointer-cancel>  ::= "c"
    <event-type>      ::= <pointer-start> | <pointer-move> |
                          <pointer-end> | <pointer-cancel>
    <x>               ::= <positive integer>
    <y>               ::= <positive integer>
    <event>           ::= <elapsed-time-ms> + "," + <pointer-id> + "," +
                          <event-type> + "," + <x> + "," + <y>
    <event-sequence>  ::= "" | <event-sequence> + <event> + ";"

    <gesture>         ::= <format-id> + ";" + <event-sequence>

Additional constraints:
- Events must be ordered by time i.e. in ascending order by elapsed-time-ms.



## Versioning

[Semantic Versioning 2.0.0](http://semver.org/)



## License

[MIT License](../blob/master/LICENSE)
