# Spec Delta

## ADDED Requirements

### Requirement: A lesson ends in its practice
Every Skill and Trick page SHALL end its lesson with one button, "Practice it now" (Explorer: "Now you try"), that brings that Skill's own practice into view and moves focus to its answer, at once under reduced motion, Pause motion or Calm. It SHALL NOT be a primary button.

#### Scenario: On a phone
- **WHEN** a Challenger on a 390px wide screen reads the lesson of a Skill and presses Practice it now
- **THEN** the Skill's practice card is on screen and its answer box has focus

#### Scenario: Explorer
- **WHEN** an Explorer opens a Skill
- **THEN** its lesson ends with Now you try

### Requirement: Try it yourself starts a round on the Trick
In a Deep dive, each Trick under Try it yourself SHALL be a primary button that starts a round on that exact Trick: for Challenger and Pro its first Star not yet lit; for Explorer, and for a Trick with all three Stars lit, its Trick page, whose practice starts at once. Each Trick SHALL also link to its Trick page ("See how the trick works") and keep its progress line.

#### Scenario: Challenger
- **WHEN** a Challenger with no Stars lit opens the Deep dive of Ekādhikena Pūrveṇa and presses its first Trick
- **THEN** Star 1 of squares ending in 5 starts

#### Scenario: Explorer
- **WHEN** an Explorer presses a Trick under Try it yourself
- **THEN** the Trick page opens with its practice, and no Star starts

### Requirement: A Star from a Deep dive goes back to it
A Star started from a Deep dive's Try it yourself SHALL offer "Back to the sutra" and return to that Deep dive, and closing that Deep dive SHALL open the Sutras page, never the round again.

#### Scenario: Back to the sutra
- **WHEN** a Challenger starts Star 1 from the Deep dive of Ekādhikena Pūrveṇa and leaves it with its Back control
- **THEN** that Deep dive is open, and closing it shows the Sutras page
