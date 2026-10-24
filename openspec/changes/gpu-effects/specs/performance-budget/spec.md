# Spec Delta

## ADDED Requirements

### Requirement: Every scene loads on its own inside the 3D budget
Each 3D scene SHALL be its own chunk, loaded by a dynamic import only on a route that shows it, so a route downloads only the scenes it shows. Every scene SHALL count toward the 3D budget (all 3D code under 170 KB Brotli in total) and SHALL NOT be part of any first load. Turning the scenes on SHALL NOT raise the median total blocking time of Home, the Arena or a Deep dive by more than 20 ms in the Lighthouse check.

#### Scenario: A Deep dive does not download the Sky
- **WHEN** a Player opens a Deep dive that shows a 3D illustration
- **THEN** the illustration's chunk is requested and the Sky's scene chunk is not

#### Scenario: A heavy celebration
- **WHEN** a change brings the celebration scene's chunk to a size that takes the 3D total over 170 KB Brotli
- **THEN** the build fails and names the 3D budget
