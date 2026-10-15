# Spec Delta

## Purpose

Keep game prompts readable at a glance and the page steady while it loads, so young Players can read the question and nothing jumps under a tap.

## ADDED Requirements

### Requirement: Game prompts are large and high contrast
Every game's main prompt and instruction line SHALL render at the game prompt size and in the main ink color, whatever element or card contains it.

#### Scenario: Balloon pop prompt
- **WHEN** an Explorer Player starts Balloon pop
- **THEN** the "Pop N balloons" prompt renders at least 24 px and in the main ink color, not 15 px grey

#### Scenario: Make ten and Multiple rain
- **WHEN** a Player starts Make ten or Multiple rain
- **THEN** the target line renders at the game instruction size and in the main ink color

### Requirement: Stable layout while loading
The main view SHALL reserve at least the screen height before its content renders, so the footer and page do not jump. Cumulative layout shift on a phone-sized first load SHALL be below 0.1.

#### Scenario: Phone first load
- **WHEN** the home page loads on a phone-sized screen with an empty cache
- **THEN** the measured cumulative layout shift is below 0.1
