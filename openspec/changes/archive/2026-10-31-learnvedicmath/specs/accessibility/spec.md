# Spec Delta

## MODIFIED Requirements

### Requirement: Motion can be paused
The system SHALL offer a Pause motion switch on the Me page and in the music panel, saved on the device and applied before the page paints, which sets `html.motion-paused`. The system SHALL treat `html.motion-paused` like the reduced-motion setting: the moving background holds still and looping animations stop, at once and after a reload. Turning off the page's Moving background SHALL also stop the background.

#### Scenario: Pause from the Explore menu
- **WHEN** a Player turns on Pause motion, which is on the Me page now that the site has no Explore menu
- **THEN** the background canvas stops changing and no looping animation runs, still after a reload, and both resume when Pause motion is turned off

#### Scenario: Landing page
- **WHEN** Pause motion is on and the Player opens the landing page
- **THEN** the Nikhilam Family and the page hold still, as they do with reduced motion on the device or Calm on
