# Design

## Decisions

**1. One constant.** `MAX_LENGTH = 720` in `js/watch.js` is the bar. The top length bucket ends at it, the shelf's lede is built from it, and `test/videos.test.mjs` imports it. Changing the bar again is a one-line change plus the filter label.

**2. A fourth bucket rather than widening "5 to 8".** "5 to 12 min" would put a 6-minute and an 11-minute video in one group, which is the difference a Player choosing by length cares about. Four chips ("Under 2 min", "2 to 5 min", "5 to 8 min", "8 to 12 min") still fit on one row on a phone, and the existing three keep their meaning. The key is `longer`.

**3. No separate Explorer cap.** The owner dropped it with the new bar. Explorer still sees made-for-kids videos first and its own videos only, and the shelf and picks still sort shortest first within those rules, so short clips stay at the front.

**4. Bolt's offer is unchanged.** `pickForTrick()` already takes the shortest hand-matched video, so a longer video is offered in a Star only when a Trick has nothing shorter for the Mode.
