# Spec Delta

## ADDED Requirements

### Requirement: Cleanup holds across Legacy and React views
While the game is moving to React, leaving a Legacy view for a React view, or a React view for a Legacy view, SHALL stop everything the previous page started, exactly as leaving one Legacy view for another does today. A React view SHALL stop every listener, timer, interval and animation-frame loop it started when it unmounts, and a round inside it SHALL stop its own when it ends.

#### Scenario: A React game round left during its hold
- **WHEN** a Player misses a question in a game drawn by a React view and taps Home during the hold
- **THEN** no later question, sound or result from that game appears on Home

#### Scenario: From a React view to a Legacy view
- **WHEN** a Player leaves the React Sky while its parallax is running and opens a Legacy view
- **THEN** no Sky listener or frame loop runs afterwards

### Requirement: Cleanup is checked by lint
The lint step SHALL fail on a bare `addEventListener`, `setTimeout`, `setInterval` or `requestAnimationFrame` in a component or view; these SHALL be started only through the app's lifecycle hooks, which stop them on unmount or when their signal aborts. Page-lifetime listeners in the shell SHALL be the only exceptions, each listed by name. Until the last Legacy view is gone, the existing lifecycle scan SHALL keep covering Legacy views.

#### Scenario: A bare timer in a component
- **WHEN** a change calls `setTimeout` directly in `app/src/views/arena/ArenaRound.tsx`
- **THEN** `pnpm lint` fails and names the file and line

#### Scenario: Through the hook
- **WHEN** the same delay is started with the timer hook
- **THEN** lint passes, and leaving the Arena before it fires means it never runs
