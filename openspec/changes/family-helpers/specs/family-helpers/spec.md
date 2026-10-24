# Spec Delta

## ADDED Requirements

### Requirement: The Family helpers are off until turned on
Me SHALL offer every Player, in every Mode, a switch "Try the Nikhilam Family helpers", off by default and saved per Player on the device. With it off, no Family helper SHALL appear, no "Ask a friend" button SHALL be drawn, and the helpers' overlay, engine and line table SHALL NOT load. With it on, Me SHALL show "When they help" with Always (the default), Only when I ask, and Off.

#### Scenario: A new Player
- **WHEN** a Player who never touched the switch misses the same Practice question twice
- **THEN** no Family helper appears and there is no Ask a friend button

#### Scenario: Turning them on
- **WHEN** a Player turns on "Try the Nikhilam Family helpers" in Me and reloads
- **THEN** the switch is still on and "When they help" shows Always chosen

### Requirement: Three friends, never teachers
The Family helpers SHALL be Shunya (the Zero, funny), Nava (the Nine, witty, with comebacks) and Eka (the One, a little serious, who names the Sutra and works the steps through with the Player). They SHALL speak as the Player's fellow students and friends, never as teachers, and SHALL credit Bolt as the teacher ("Bolt showed us this one"). Only one SHALL speak at a time; a visit with two or three SHALL show one turn at a time, with Next between turns, each bubble naming its speaker.

#### Scenario: Two friends take turns
- **WHEN** a level 2 visit opens
- **THEN** one friend's turn shows with a Next button, and after Next the other friend's turn shows

### Requirement: Help signals start a visit
With the setting at Always, a visit SHALL start on a help signal: 2 wrong tries in a row on the same Skill, 3 wrong tries in one round, about 20 seconds with no input on one question, the round's Hint pressed twice on one question, or leaving a round after a miss with no right answer since. A visit SHALL NOT start mid-question in a timed race; what was noticed SHALL wait for the round's end. With the setting at Only when I ask, only Ask a friend SHALL start a visit.

#### Scenario: Two misses in a row
- **WHEN** a Player with the helpers on misses a Practice question on the first and second try
- **THEN** one friend hops in with a hint while the question stays open

#### Scenario: Idle on a question
- **WHEN** a Player with the helpers on leaves a Practice question untouched for 20 seconds
- **THEN** a friend hops in

#### Scenario: Only when I ask
- **WHEN** a Player whose setting is Only when I ask misses twice in a row
- **THEN** no friend appears until the Player taps Ask a friend, and then one does

### Requirement: Help escalates
The first visit for a Skill in a session SHALL be one friend with a light hint; a second SHALL be two friends (one shows the method in words, one encourages); a third SHALL be all three in a short skit that works one example on different numbers step by step. A breakthrough (the Skill right first try after a level 2 or 3 visit on it) SHALL get a cheer from all three.

#### Scenario: A real block
- **WHEN** a Player has had two visits on one Skill and hits a third help signal on it after 3 minutes
- **THEN** all three friends visit, and Eka's turn shows a worked example on numbers different from the Player's question

### Requirement: Visits rest between
Between automatic visits SHALL be at least 3 minutes. Ask a friend SHALL open a visit at any time, and a cheer that ends a visit whose buttons the Player used SHALL NOT wait.

#### Scenario: Not again so soon
- **WHEN** a friend visited less than 3 minutes ago and the Player misses twice in a row again
- **THEN** no friend appears

### Requirement: The friends never give the answer
A visit SHALL give a hint, the method, or a worked example on a problem whose question and answer both differ from the Player's question. It SHALL NOT show or say the answer to the Player's question; that comes only from the round's own Show me. Another hint SHALL use the round's own Hint, counted exactly as the Hint button is.

#### Scenario: Show me in a visit
- **WHEN** a Player taps Show me in a visit on a Practice question
- **THEN** the bubble shows a worked example whose question and answer differ from the Player's, and the Player's question is still unanswered with Check enabled

#### Scenario: Another hint counts as a hint
- **WHEN** a Player taps Another hint in a visit
- **THEN** the round's hint shows under the answer, the same as pressing Hint

### Requirement: Playful mistakes on other numbers
Rarely, and only for Growing and Fluent readers, Shunya MAY make a playful mistake on the visit's worked example, which Nava or Eka then catches and puts right. It SHALL never be about the Player's question, and Early readers SHALL never see one.

#### Scenario: An Early reader's skit
- **WHEN** an Explorer Player with no Grade answer gets a level 3 visit
- **THEN** Shunya makes no mistake in it

### Requirement: Never in the way
A visit SHALL NOT cover the question, the answer field or the round's buttons at any width from 320 px; with no free space beside them it SHALL dock under the round's card in the page. It SHALL NOT take focus from the answer field. Every visit SHALL close with one tap on its close button or Escape. Not now SHALL close it and stop automatic visits for the rest of the browser session; Ask a friend SHALL still work.

#### Scenario: A phone 320 pixels wide
- **WHEN** a visit opens on a Practice question in a 320 px wide window
- **THEN** the friends and the bubble do not overlap the question, the answer field or the Check, Hint and Show me buttons

#### Scenario: Focus stays in the answer
- **WHEN** a visit opens while the Player's cursor is in the answer field
- **THEN** the answer field still has focus, and typing goes on into it

#### Scenario: Escape
- **WHEN** a visit is open and the Player presses Escape
- **THEN** the visit is gone

#### Scenario: Not now
- **WHEN** a Player taps Not now and later misses twice in a row on another question
- **THEN** no friend appears, and Ask a friend still opens a visit

### Requirement: Their words fit the reader
Each friend's lines SHALL follow the Reading band: Early silly and gentle, at most 8 words a sentence and 2 sentences, always kind; Growing playful with puns, at most 14 words a sentence; Fluent dry wit and real method talk, with Eka naming the Sutra in its IAST spelling marked as Sanskrit. Without a Grade answer the band SHALL come from the Mode (Explorer Early, Challenger Growing, Pro Fluent). No line SHALL use an em dash, a number or a claim that the Sutras come from the Vedas.

#### Scenario: Eka in Pro
- **WHEN** a Pro Player gets a level 2 visit on a Trick
- **THEN** Eka's turn names the Trick's Sutra, marked with lang sa-Latn, and its meaning

### Requirement: They remember on the device only
On the first visit of a browser session a friend SHALL greet the Player by Nickname (its two words). The helpers SHALL remember which Sutra or Skill was hard last time, kept in the Player's record on this device only; it SHALL NOT be in any request, analytics event or hand-off, and SHALL be removed with the Player.

#### Scenario: Greeted by Nickname
- **WHEN** Swift Tiger 42 gets the first visit of a session
- **THEN** the first turn says "Swift Tiger"

#### Scenario: Nothing is sent
- **WHEN** a Player has three visits in a session
- **THEN** no request made during the session holds the Nickname, the Skill id outside the route views or the helpers' memory

### Requirement: Text now, voices once recorded
The bubble SHALL always show the words. Until the owner's recording of the Family's lines is published, the helpers SHALL say nothing aloud. Once it is, a line SHALL play only when Read aloud or sound is on, in that friend's own voice (Shunya Puck, Nava Leda, Eka Charon, all distinct from Bolt's), and never when both are off.

#### Scenario: No voice yet
- **WHEN** a Player with Read aloud on gets a visit
- **THEN** the words show in the bubble and no speech starts for them

### Requirement: Screen readers hear the friends
A visit's words SHALL be announced through the app's polite live region, each turn prefixed by the friend's name. The friends' art SHALL be hidden from assistive technology. Every button SHALL have a visible label and be reachable by keyboard.

#### Scenario: A visit with a screen reader
- **WHEN** a visit opens
- **THEN** the live region says the friend's name and their words, and the art is aria-hidden
