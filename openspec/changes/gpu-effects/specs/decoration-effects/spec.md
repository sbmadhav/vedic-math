# Spec Delta

## Purpose

Draw the Sky, the Moving background, celebrations and Mandala glow with the GPU, off the main thread where the browser allows, without ever drawing the interface, getting in the way of play, or moving when motion is off.

## ADDED Requirements

### Requirement: WebGL draws decoration only
WebGL SHALL be used only for the Sky backdrop, the Moving background, celebrations and Mandala Studio's glow view. Questions, answers, Stars, Landmarks, names, scores, timers and every control SHALL stay HTML, SVG or canvas 2D. Every canvas the decoration engine draws SHALL be hidden from assistive technology and SHALL take no pointer input.

#### Scenario: The Sky with the backdrop on
- **WHEN** a Player opens the Sky on a browser with WebGL 2
- **THEN** every Star and Landmark is still an SVG or HTML link with its name, and the backdrop canvas has `aria-hidden="true"` and no pointer events

### Requirement: Drawn off the main thread where supported
With Save-Data on or 2 GB of memory or less, the Sky backdrop and the Moving background SHALL be one still frame, whatever the browser supports. Otherwise, when the browser supports OffscreenCanvas, module workers and a hardware WebGL 2 context, decoration SHALL be drawn in a worker, and when it does not, with canvas 2D on the main thread with fewer particles and at most 30 frames a second.

#### Scenario: Chromium on a laptop
- **WHEN** the Sky opens in Chromium with a hardware GPU
- **THEN** the backdrop is drawn by a worker and the page reports the `gl-worker` path

#### Scenario: No WebGL 2
- **WHEN** the Sky opens in a browser where WebGL 2 cannot be created without software rendering
- **THEN** the backdrop is drawn with canvas 2D and the Sky works as before

### Requirement: Off with Calm, Pause motion and reduced motion
With reduced motion on the device, Pause motion or Calm, no celebration SHALL run and the Sky backdrop and Moving background SHALL show one still frame. A change to any of these SHALL take effect at once, without a reload, and after a reload.

#### Scenario: Pause motion during a celebration
- **WHEN** a Player turns on Pause motion while confetti is falling
- **THEN** the confetti disappears at once and the backdrop holds still

#### Scenario: A gold Medal with reduced motion
- **WHEN** a Player with reduced motion earns a gold Medal
- **THEN** no burst is drawn and the Medal message is shown and announced as before

### Requirement: Paused when not seen
A decoration scene SHALL stop drawing while it is off screen, while the tab is hidden and while a round is in play, and SHALL resume when it is seen again.

#### Scenario: Hidden tab
- **WHEN** a Player switches to another tab while the Sky is open
- **THEN** the backdrop draws no frames until the Player comes back

### Requirement: Decoration lowers its own quality when it is slow
When drawing a frame takes more than 20 ms on average for 2 seconds (the work of drawing it, not the wait between frames), a scene SHALL halve its particles and pixel ratio, and if frames are still slow 2 seconds later it SHALL hold still for the rest of the page.

#### Scenario: A slow phone
- **WHEN** drawing each backdrop frame takes 28 ms on average on a phone for 4 seconds
- **THEN** the backdrop first draws fewer stars and then holds a still frame

### Requirement: Decoration never breaks a view
If the WebGL context is lost and not restored within 3 seconds, the worker fails to start or a scene throws, the page SHALL switch to the canvas 2D path or drop that scene, and the view SHALL keep working.

#### Scenario: Context lost
- **WHEN** the GPU context is lost while the Sky is open and does not come back
- **THEN** the backdrop continues with canvas 2D and the Stars stay usable

### Requirement: Colors come from the design tokens
Decoration SHALL take its colors from the design tokens of the current color scheme and SHALL change them when the scheme changes. No color SHALL be written as a hex value in the decoration code.

#### Scenario: Switching to Deep Space
- **WHEN** a Player switches from Daybreak to Deep Space with the Sky open
- **THEN** the backdrop's colors change to the Deep Space tokens without a reload

### Requirement: Mandala wallpapers stay the same everywhere
Mandala Studio's glow view SHALL be optional and off by default, SHALL switch off while the Player edits, and SHALL NOT change the saved wallpaper, which SHALL always come from the 2D drawing.

#### Scenario: Saving with Glow on
- **WHEN** a Player turns on Glow and then saves a wallpaper
- **THEN** the saved picture is the 2D drawing, identical to one saved with Glow off
