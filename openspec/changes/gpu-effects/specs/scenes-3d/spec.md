# Spec Delta

## ADDED Requirements

### Requirement: Sutra deep-dive illustrations
A Sutra's Deep dive MAY show a 3D illustration of the idea its first Worked example uses, at the top of the Deep dive. The illustration SHALL carry nothing the Worked examples do not already say in text, and its numbers SHALL match that first Worked example.

#### Scenario: Opening the Deep dive of Ekādhikena Pūrveṇa
- **WHEN** a Player with WebGL and motion allowed opens the Deep dive of Ekādhikena Pūrveṇa
- **THEN** the illustration shows 25² as 625, and the Worked examples stay where they were

#### Scenario: A Sutra without a picture
- **WHEN** a Player opens the Deep dive of a Sutra that has no illustration yet
- **THEN** no illustration host is shown and no 3D file is requested

### Requirement: The Deep dive illustration appears without a shift
The prerendered Deep dive SHALL hold only the illustration's host, with its space reserved and no canvas. The still drawing of the same picture SHALL be drawn in the browser after start-up, and the 3D scene SHALL fade in after that without moving any text.

#### Scenario: Still picture first
- **WHEN** a Player with WebGL and motion allowed opens a Deep dive that has an illustration
- **THEN** the still picture is shown first and the 3D illustration fades in after it with no layout shift

#### Scenario: The prerendered page
- **WHEN** the Deep dive of Ekādhikena Pūrveṇa is loaded with JavaScript off
- **THEN** its HTML holds the illustration's host with its space reserved and no canvas, and the Worked examples are readable

### Requirement: Celebrations in 3D
The big confetti burst (for true wins only, one at a time), the Star burst, and the Belt and gold Medal bursts SHALL be drawn as a 3D scene when it is loaded and the page is on the `3d` path, and with today's 2D drawing when the scene is not loaded yet or the page is on the `2d` path. A celebration SHALL last at most 2 seconds and SHALL remove its canvas when it ends.

#### Scenario: A Belt earned
- **WHEN** a Player with WebGL and motion allowed earns a Belt
- **THEN** the Belt burst plays in 3D, ends within 2 seconds and its canvas is removed

#### Scenario: A win before the scene has loaded
- **WHEN** a Player lights a Star before the celebration scene has finished loading
- **THEN** today's 2D confetti plays instead

#### Scenario: A gold Medal with reduced motion
- **WHEN** a Player with reduced motion earns a gold Medal
- **THEN** no burst is drawn and the Medal message is shown and announced as before

#### Scenario: Pause motion during a celebration
- **WHEN** a Player turns on Pause motion while confetti is falling
- **THEN** the confetti disappears at once

### Requirement: No celebration when motion is off
Under Calm, Pause motion or reduced motion no celebration SHALL run, in 3D or 2D, and one in flight SHALL be removed at once when any of them turns on. The message or announcement that goes with the win SHALL be shown as before.

#### Scenario: A gold Medal with Calm on
- **WHEN** a Player with Calm on earns a gold Medal
- **THEN** no burst is drawn and the Medal message is shown and announced as before

### Requirement: The Moving background in 3D
When the Moving background setting is on, its drawings (Śulba ropes, Meru-prastāra, the nakshatra wheel, drifting numerals) SHALL be drawn as a 3D scene on the `3d` path and with today's 2D canvas otherwise, both from the same line lists. Turning the setting off SHALL remove the scene.

#### Scenario: The setting turned off
- **WHEN** a Player turns the Moving background off with the 3D scene showing
- **THEN** the scene's canvas is removed and no further frames are rendered

#### Scenario: No WebGL for the Moving background
- **WHEN** the Moving background is on in a browser where a WebGL context cannot be created
- **THEN** today's 2D background is drawn and no 3D file is requested

### Requirement: Mandala glow never changes the wallpaper
Mandala Studio's glow view SHALL be optional and off by default, SHALL be hidden when motion is off or WebGL is not available, SHALL switch off while the Player edits, and SHALL NOT change the saved wallpaper, which SHALL always come from the 2D drawing.

#### Scenario: Saving with Glow on
- **WHEN** a Player turns on Glow and then saves a wallpaper
- **THEN** the saved picture is the 2D drawing, identical to one saved with Glow off

#### Scenario: Glow with reduced motion
- **WHEN** a Player with reduced motion opens Mandala Studio
- **THEN** no Glow toggle is shown

### Requirement: No 3D during a round
No 3D scene SHALL render frames while a round is in play. A celebration asked for during a round SHALL start only after the round's last answer has been checked, and the Moving background SHALL hold a still frame while a round is in play.

#### Scenario: The Moving background during an Arena round
- **WHEN** a Player starts an Arena round with the 3D Moving background on
- **THEN** the background holds a still frame until the round ends

#### Scenario: A Star lit on the last answer
- **WHEN** a Player's last answer in a Star round lights the Star
- **THEN** the burst starts on the result screen, after the answer has been checked and shown

### Requirement: A lost context falls back to 2D
When a 3D scene's WebGL context is lost and not restored within 3 seconds, the page SHALL switch to the 2D path for the rest of its life and show each scene's 2D drawing. An error inside a scene SHALL show that scene's 2D drawing, and the view SHALL keep working.

#### Scenario: Context lost on the Sutra illustration
- **WHEN** the GPU context is lost while a Deep dive's 3D illustration is showing and does not come back
- **THEN** after 3 seconds the still picture is shown, the page reports the `2d` path, and the Worked examples stay usable

### Requirement: Every scene follows the 3D rules
Every scene this change adds SHALL follow each `scenes-3d` rule the Sky follows: decoration only, loaded late and only where it is used, never on the server, a still frame when motion is off, the 2D drawing when the device cannot draw 3D well, paused when not seen, and colors from the design tokens.

#### Scenario: Calm turned on with the Moving background moving
- **WHEN** a Player turns on Calm while the 3D Moving background is moving
- **THEN** it holds a still frame at once

#### Scenario: Hidden tab with Mandala glow on
- **WHEN** a Player switches to another tab with Mandala glow turning
- **THEN** no frames are rendered until the Player comes back

#### Scenario: Switching to Deep Space on a Deep dive
- **WHEN** a Player switches from Daybreak to Deep Space with a Deep dive's 3D illustration showing
- **THEN** the illustration's colors change to the Deep Space tokens without a reload

#### Scenario: The suite for the new scenes
- **WHEN** `e2e/tests/scenes-3d.spec.ts` runs on chromium
- **THEN** it checks the path each new scene reports (`3d`, `still`, `2d` or `paused`) with motion, under Calm, Pause motion and reduced motion, without WebGL, after a forced context loss and in a hidden tab, and that each scene canvas is `aria-hidden` with no pointer events
