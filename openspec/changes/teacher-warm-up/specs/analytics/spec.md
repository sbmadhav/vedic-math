# Spec Delta

## ADDED Requirements

### Requirement: Warm-up counts
The warm-up SHALL send `math/teachers/warmup/start/<trick>` on the first Next of a page load and `math/teachers/warmup/done/<trick>` on reaching Practice at home, each once per page load, `<trick>` being a Trick id from the catalog. These follow "Events carry no identifiers".

#### Scenario: A whole warm-up
- **WHEN** a teacher goes through the Multiply by 11 warm-up twice without reloading
- **THEN** `math/teachers/warmup/start/by11` and `math/teachers/warmup/done/by11` are each sent once
