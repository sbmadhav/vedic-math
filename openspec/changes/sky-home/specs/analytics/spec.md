# Spec Delta

## ADDED Requirements

### Requirement: Star Quest counts
The system SHALL send one anonymous event when a Star is lit in a round (`math/star/lit/<trick>`), when a Star is skipped (`math/star/skipped/<trick>`), on each Comeback (`math/star/comeback/<trick>`), when a Dare is taken (`math/star/dare_taken/<trick>`) and when a Dare is won (`math/star/dare_won/<trick>`). `<trick>` SHALL be a Trick id from the catalog. Stars lit by the one-time migration of Kata progress SHALL send nothing. These events SHALL follow "Events carry no identifiers".

#### Scenario: A round with a Comeback that lights the Star
- **WHEN** a Player misses once, makes a Comeback and lights Star 1 of `sq5`
- **THEN** `math/star/comeback/sq5` and `math/star/lit/sq5` are each sent once

#### Scenario: A Dare lost
- **WHEN** a Player takes a Dare on `by11` and misses it
- **THEN** `math/star/dare_taken/by11` is sent and `math/star/dare_won/by11` is not

#### Scenario: Migration
- **WHEN** a Player's Kata progress lights 12 Stars on first load
- **THEN** no `math/star/lit` event is sent for them

### Requirement: Sky views are counted
When home shows the Sky, its route view SHALL be `math/view/sky` instead of `math/view/home`, and the All places menu SHALL be counted as `math/view/places`.

#### Scenario: Home with the Sky on
- **WHEN** a Pro Player with the Sky on opens `#/`
- **THEN** one `math/view/sky` event is sent and no `math/view/home`
