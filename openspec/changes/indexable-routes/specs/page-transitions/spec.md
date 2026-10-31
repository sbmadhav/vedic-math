# Spec Delta

## ADDED Requirements

### Requirement: Moving between screens of the game is smooth
In a browser that has `document.startViewTransition`, a route change inside the game SHALL run its update inside a view transition: the site header, the game's nav and the Player chip stay in place while the view cross-fades in at most 200 ms, with no slide. The first render and a redraw of the same route SHALL swap without one. Focus and scroll SHALL behave as without a transition, and no route change inside the game SHALL load a new document.

#### Scenario: From Games to the Arena
- **WHEN** a Player in Chromium with motion allowed taps Arena on the Games page
- **THEN** a view transition runs, the header and nav do not move, no document is requested, and focus lands on the Arena's heading

#### Scenario: Play again
- **WHEN** a Player presses Play again at the end of a game Level
- **THEN** the round redraws without a view transition

### Requirement: Moving between pages of the site is smooth
Every page of the site (the landing page, the Trick pages, the grown-up pages, `/import/` and the game) SHALL opt in to cross-document view transitions, with the shared header and nav named the same on each, so that in a browser that supports them, moving from one page to another keeps the header still and fades the content. A browser without support SHALL get a plain navigation.

#### Scenario: From the landing page into the game
- **WHEN** a visitor in Chromium with motion allowed follows Start learning on the landing page
- **THEN** the new page's `pagereveal` event carries a view transition, and the header is not redrawn in a new place

#### Scenario: A browser without cross-document transitions
- **WHEN** a visitor in Firefox follows the same link
- **THEN** the game opens with a plain navigation and no error

### Requirement: No motion when motion is off
With `prefers-reduced-motion: reduce`, Pause motion or Calm on, every move between screens and between pages SHALL be an instant swap: no view transition SHALL run, inside the game or across documents.

#### Scenario: Reduced motion
- **WHEN** a Player with `prefers-reduced-motion: reduce` taps Games in the nav
- **THEN** `document.startViewTransition` is not called and Games is shown at once

#### Scenario: Calm
- **WHEN** a Player with Calm on follows a link from the game to `/parents/` and back
- **THEN** no view transition runs on either page

### Requirement: Likely next pages are prefetched, never prerendered
The landing page and each Trick page SHALL carry speculation rules that prefetch `/learn/` and links into it on hover or press, and SHALL NOT prerender any page. A browser without speculation rules SHALL ignore them.

#### Scenario: Hovering Start learning
- **WHEN** a visitor in Chromium hovers Start learning on the landing page
- **THEN** `/learn/` is fetched as a prefetch, no script of the game runs, and no page view is counted until the visitor follows the link
