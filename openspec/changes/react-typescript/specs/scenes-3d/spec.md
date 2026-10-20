# Spec Delta

## Purpose

Let the game show 3D decoration that loads late, never slows the first screen, never carries information, and falls back to a still frame or today's 2D drawing whenever motion is off or the device cannot keep up.

## ADDED Requirements

### Requirement: 3D is decoration only
3D scenes SHALL only decorate: they carry no information and take no input. Every Star, Landmark, name, question, answer, score, timer and control SHALL stay HTML or SVG. A 3D canvas SHALL be hidden from assistive technology and SHALL take no pointer input.

#### Scenario: The Sky in 3D
- **WHEN** a Player opens the Sky and the 3D scene is showing
- **THEN** every Star and Landmark is still a link with its name, and the 3D canvas has `aria-hidden="true"` and no pointer events

### Requirement: 3D loads late and only where it is used
The 3D code (three.js, React Three Fiber, drei and the scenes) SHALL be served from learnvedicmath.com, SHALL NOT be part of the first load of any page, and SHALL be requested only on a route that shows a 3D scene, after that route has rendered and the browser is idle. The Sky SHALL first show the 2D Sky, then fade into 3D once the scene is ready, without moving any Star, Landmark or text.

#### Scenario: Home without the Sky
- **WHEN** a Player whose Home does not show the Sky opens `/play/`
- **THEN** no 3D file is requested

#### Scenario: The Sky fades in
- **WHEN** a Player with WebGL and motion allowed opens the Sky
- **THEN** the 2D Sky is shown first, the 3D files are requested after it has rendered, and the 3D scene fades in with no layout shift

#### Scenario: No other origin
- **WHEN** the Sky's 3D scene loads
- **THEN** every request it makes goes to learnvedicmath.com

### Requirement: 3D never runs on the server
3D code SHALL never run on the server, and a page the server renders SHALL hold the 2D drawing where a scene will be.

#### Scenario: A server-rendered Sky
- **WHEN** the server renders a page that shows the Sky
- **THEN** its HTML holds the 2D Sky and no canvas, and the server bundle holds no 3D module

### Requirement: Still frame when motion is off
With Calm, Pause motion or the device's reduced-motion setting on, a 3D scene SHALL show one still frame and draw nothing further. Turning any of them on SHALL stop the scene at once; turning all of them off SHALL let it move again, without a reload.

#### Scenario: Reduced motion
- **WHEN** a Player with reduced motion on opens the Sky on a WebGL device
- **THEN** one frame is drawn and no further frames are rendered

#### Scenario: Calm turned on with the Sky open
- **WHEN** a Player turns on Calm while the 3D Sky is moving
- **THEN** the Sky holds a still frame at once

### Requirement: 2D when the device cannot draw 3D well
When WebGL is not available, or the scene stays under 30 frames a second for 3 seconds at any time while it is drawing, the route SHALL show today's 2D canvas or SVG instead, and SHALL stay on it until the page is reloaded. The view SHALL keep working through the switch.

#### Scenario: No WebGL
- **WHEN** the Sky opens in a browser where a WebGL context cannot be created
- **THEN** the 2D Sky is shown, no 3D file is requested, and no error is reported

#### Scenario: A short stutter
- **WHEN** the 3D Sky drops to 20 frames a second for 1 second and then draws 60 frames a second again
- **THEN** the 3D scene stays

#### Scenario: A slow device
- **WHEN** the 3D Sky draws 20 frames a second for 3 seconds
- **THEN** it is replaced by the 2D Sky, and Stars and Landmarks stay usable throughout

### Requirement: Paused when not seen
A 3D scene SHALL render on the main thread, and SHALL render no frames while the tab is hidden or the scene is off screen, and SHALL resume when it is seen again. Leaving the route SHALL stop the scene and release its GPU resources.

#### Scenario: Hidden tab
- **WHEN** a Player switches to another tab with the 3D Sky open
- **THEN** no frames are rendered until the Player comes back

#### Scenario: Leaving the Sky
- **WHEN** a Player leaves the Sky for the Arena
- **THEN** the 3D scene renders no further frames and its canvas is removed

### Requirement: Colors from the design tokens
A 3D scene SHALL take its colors from the design tokens of the current color scheme and SHALL change them when the scheme changes. No color SHALL be written as a hex value in scene code.

#### Scenario: Switching to Deep Space
- **WHEN** a Player switches from Daybreak to Deep Space with the 3D Sky open
- **THEN** the scene's colors change to the Deep Space tokens without a reload

### Requirement: Every fallback is tested
The Playwright suite SHALL cover each path: 3D with motion, the still frame under Calm, Pause motion and reduced motion, the 2D fallback without WebGL and when the scene stays under 30 frames a second for 3 seconds, and the pause in a hidden tab.

#### Scenario: The suite
- **WHEN** `e2e/tests/scenes-3d.spec.ts` runs on chromium
- **THEN** it checks the path the page reports (`3d`, `still`, `2d` or `paused`) in each of those cases
