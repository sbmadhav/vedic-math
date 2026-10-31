# Spec Delta

## ADDED Requirements

### Requirement: Home says when quests change
The quest card on Home SHALL say that new quests come at local midnight and that every Player in the same Mode gets the same three, in the Mode's wording.

#### Scenario: The refresh line
- **WHEN** a Challenger Player opens Home
- **THEN** the quest card says "New quests at midnight, your time. Everyone in your Mode gets the same three."

## MODIFIED Requirements

### Requirement: Changing Mode starts the new quests at zero
When a Player changes Mode during a day, the new Mode's quests SHALL count only activity from that day, and SHALL NOT complete from activity before that day. A quest of the new Mode that the day's activity already meets SHALL complete at the Mode change, once, with its message shown then, not at the Player's next answer.

#### Scenario: Challenger to Explorer mid-day
- **WHEN** a Player with hundreds of lifetime right answers switches from Challenger to Explorer during a day
- **THEN** the Explorer "Get 5 right" quest shows only today's right answers and is not completed by the switch

#### Scenario: A quest already met today
- **WHEN** a Challenger Player finishes an Arena round, then switches to Explorer on a day whose Explorer quests include "Finish an Arena round or tower challenge"
- **THEN** that quest completes at the switch with its "Quest complete" message, and the Player's next answer shows no quest message
