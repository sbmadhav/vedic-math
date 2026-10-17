# Spec Delta

## ADDED Requirements

### Requirement: Decoration has its own budget
The decoration engine and its scenes SHALL load only after the first view has rendered, SHALL NOT be part of the JS before play, and SHALL together stay within 20 KB Brotli, checked by the build. Turning decoration on SHALL NOT raise the median total blocking time of `/play/` by more than 20 ms in the Lighthouse check.

#### Scenario: A heavy scene
- **WHEN** a change brings `js/gfx/` to 24 KB compressed
- **THEN** the build fails and names the decoration budget
