# Spec Delta

## MODIFIED Requirements

### Requirement: Experiences work offline
An experience page SHALL open offline once it has been opened online. Experiences SHALL NOT be downloaded for offline use before a Player opens them. Offline, a shelf card for an experience that was never opened SHALL say it needs a connection the first time, and opening it SHALL show the Retry message instead of a broken page.

#### Scenario: Tala Lab offline
- **WHEN** a Player opened Tala Lab online before and is now offline and opens `/learn/games/tala`
- **THEN** Tala Lab opens from the files saved when it was first opened, with no Retry message

#### Scenario: Never opened
- **WHEN** a Player who never opened Mandala Studio is offline and looks at the Games shelf
- **THEN** the Mandala Studio card says it needs a connection the first time

#### Scenario: First visit downloads no experience
- **WHEN** a first-time visitor's worker finishes installing
- **THEN** no chunk or stylesheet that only a Play experience route uses has been requested
