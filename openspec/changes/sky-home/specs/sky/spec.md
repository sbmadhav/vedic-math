# Spec Delta

## Purpose

Make the home a game world: a Sky of Constellations, one per Sutra, whose Stars are the steps of each Trick, with Landmarks leading to the rest of the app, a suggested path in Belt order, and a plain list for anyone who prefers one.

## ADDED Requirements

### Requirement: The Sky is home for Players who try it
A Challenger or Pro Player SHALL be able to turn on "Try the new Sky" on the Me page. While it is on, that Player's home SHALL be the Sky. It SHALL be off by default, stored per Player on this device, and turning it off SHALL bring back the current home. Explorer Players SHALL NOT see the switch and SHALL keep their current home.

#### Scenario: Turning it on
- **WHEN** a Challenger Player turns on "Try the new Sky" and opens home
- **THEN** the Sky is shown instead of the tile home

#### Scenario: Another Player on the device
- **WHEN** Player A turned the Sky on and the device switches to Player B, who did not
- **THEN** Player B's home is the tile home

#### Scenario: Explorer
- **WHEN** an Explorer Player opens the Me page
- **THEN** there is no "Try the new Sky" switch, and home is the Explorer home

### Requirement: Constellations hold the Tricks' Stars
The Sky SHALL show one Constellation for each Sutra name the Tricks use (17 in all, the three Ūrdhva Tiryagbhyām variants counted apart), named with that name, holding the three Stars of each of its Tricks, drawn as lines between Stars over the nakshatra wheel. The Sky SHALL hold Tricks only; school Skills stay in the Skill map.

#### Scenario: Ekādhikena Pūrvena
- **WHEN** the Sky is shown
- **THEN** the Ekādhikena Pūrvena Constellation holds six Stars: three for Square numbers ending in 5 and three for its recurring-decimal Trick

#### Scenario: Count
- **WHEN** the Sky is shown
- **THEN** it has 17 Constellations and 63 Stars

### Requirement: Star states on the Sky
Every Star on the Sky SHALL be open and SHALL show one of three states, in its look and in its accessible name: lit, skipped (a dashed outline, a skip badge and the word "skipped") or not yet lit. Choosing a Star SHALL open its round.

#### Scenario: A skipped Star
- **WHEN** a Player has skipped Star 2 of a Trick
- **THEN** that Star has a dashed outline, a skip badge, and its accessible name includes "skipped"

#### Scenario: Open from the start
- **WHEN** a Player who has lit nothing chooses a black belt Trick's Star 3
- **THEN** its round starts

### Requirement: A suggested path in Belt order
The Sky SHALL suggest one next Star: the first Star, in Belt order (white to black; within a Belt its three Tricks in order; within a Trick Stars 1 to 3), that is neither lit nor skipped. Bolt SHALL wait at that Star, and a dotted path SHALL lead from it through the next two suggested Stars. When a Placement result names a starting Belt, the path SHALL start at that Belt.

#### Scenario: New Player
- **WHEN** a Player with no Star progress and no Placement opens the Sky
- **THEN** Bolt waits at Star 1 of the first white belt Trick

#### Scenario: Skipped Stars are passed over
- **WHEN** a Player has lit Star 1 and skipped Star 2 of the first white belt Trick
- **THEN** Bolt waits at its Star 3

#### Scenario: Placement
- **WHEN** a Player's Placement result is the orange belt and nothing is lit
- **THEN** Bolt waits at Star 1 of the first orange belt Trick

### Requirement: Belts are earned by lighting Stars
A Belt SHALL be earned when all 9 Stars of its 3 Tricks are lit. A Belt a Player had already earned before this change SHALL stay earned. The Dojo, homes and the Me page SHALL count a Belt's progress in lit Stars (0 to 9).

#### Scenario: Ninth Star
- **WHEN** a Player lights the last of the 9 white belt Stars
- **THEN** they earn the white belt

#### Scenario: Earned before
- **WHEN** a Player who held the yellow belt under the old rule opens the app after this change with only 4 yellow belt Stars lit
- **THEN** they still hold the yellow belt

### Requirement: Existing Kata progress lights Stars
The first time a Player's progress loads after this change, each Star SHALL start lit when at least half of the Katas in its third are done (9 of 17 for Stars 1 and 2, 8 of 16 for Star 3). This SHALL happen once per Player, in every Mode, and SHALL NOT mark anything skipped.

#### Scenario: Katas 1 to 9 done
- **WHEN** a Player had Katas 1 to 9 of a Trick done before the update
- **THEN** its Star 1 starts lit and Stars 2 and 3 do not

#### Scenario: Eight of Star 2's Katas
- **WHEN** a Player had 8 of Katas 18 to 34 done
- **THEN** Star 2 is not lit

### Requirement: Landmarks
Around the Sky's edge, Landmarks SHALL lead to the Arena (race track), Duel (ring), Games (arcade), Watch (observatory) and the Skill map (library). Each SHALL be a link with a visible text label.

#### Scenario: Arena Landmark
- **WHEN** a Player chooses the race track Landmark
- **THEN** the Arena opens

### Requirement: All places
The Sky SHALL offer an "All places" menu: a plain list of every Constellation with its Stars and their states, every Landmark, and every other place in the app (Dojo, Sutra cards, Challenge tower, Me). It SHALL be usable by keyboard and screen reader alone and SHALL work without the map.

#### Scenario: Reaching a Star from the list
- **WHEN** a keyboard user opens All places and activates "Square numbers ending in 5, Star 2, skipped"
- **THEN** that Star's round opens

### Requirement: Back to the Sky
For a Player whose home is the Sky, a Star's Back button SHALL return to the Sky, with focus on the Star just played, and SHALL never return by itself.

#### Scenario: After lighting a Star
- **WHEN** a Player lights a Star and presses Back to the Sky
- **THEN** the Sky shows that Star lit and focus is on it

### Requirement: The Sky's art and Calm
The Sky SHALL be drawn with Constellation lines and Sutra names, the nakshatra wheel, parallax star layers and Bolt's poses, with no per-Constellation illustration. Parallax, twinkling and lighting animations SHALL stop when the Player's device asks for reduced motion, the site-wide motion pause is on, or Calm is on, and the Sky SHALL look complete without them. Both color schemes SHALL use design tokens only.

#### Scenario: Motion paused
- **WHEN** the site-wide motion pause is on and a Player opens the Sky
- **THEN** no layer moves and every Star and label is shown
