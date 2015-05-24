# ghosture.js

Simulate touch gestures in your unit tests

# Usage (Not yet)

    ghosture.start({x: 100, y: 50})
      .moveTo({x: 200, y: 50, duration: 500})
      .hold({duration: 200}).end().run();

    ghosture.start(100, 50)
      .moveTo(200, 50, '500ms')
      .hold('200ms').end().run();

    ghosture.start(100, 50)
      .during(500).moveTo(200, 50)
      .hold(200).end().run();

    ghosture.start({x: 100, y: 50})
      .moveTo({x: 200, y: 50, duration: 200, ease: 'in-out'})
      .hold({duration: 200}).end().run();

    ghosture.start(100, 50)
      .moveBy(100, 0, 200)
      .hold(200).end().run();

    var gest = ghosture(100, 50)
      .during(200)
      .moveBy(100, 0)
      .then(function () {
        console.log('First move');
      })
      .during(100, 'in-out') // ms + easing
      .moveBy(100, 100)
      .then(function(x, y) {
        console.log(x, y); // 300 150
      })
      .end();
    gest.run();

    ghosture.tap(100, 200).run();

    "ghosture.start() === ghosture()" // convenience?
    ".wait === .hold" // for readability
    ".end !== .run" // for semantics?

    var tap = ghosture.tap(100, 200);
    tap.run();

    ghosture.doubletap(100, 50).run();
    ghosture.tripletap(100, 50).run();
    ghosture.doubletap({
      x: 100,
      y: 50,
      interval: 10 // default
    }).run();

    ghosture.pinch({
      pointers: 3,
      centerX: 100,
      centerY: 50,
      radiusStart: 30,
      radiusEnd: 60,
      angleStartRad: 0,
      angleEndDeg: 30 // alternative
    });

    ".pinch === .rotate"

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


# Recording (Not yet)

Train your ghost fingers by tracking a real touch gesture.

    ghosture.recordNext()
      .save(function (recordedData) {
        alert(recordedData);
      });

Records the gesture from the `touchstart` of the first finger touching the document to the `touchend` of the last finger leaving the document.

The default element to track is `document.body`. You can track specific element by `.recordNext(myElement)`.

## Replay

Play the recorded gesture in your unit tests by:

    var gesture = "ghosture,v1;0,1,s,730,343;100,1,m,733,342;";
    ghosture(gesture).end();

or

    ghosture.start(gesture).end();

## Format

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
