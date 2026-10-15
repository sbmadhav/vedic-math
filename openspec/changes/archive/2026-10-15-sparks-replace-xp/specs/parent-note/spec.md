# Spec Delta

## MODIFIED Requirements

### Requirement: The note names every kind of post
The parent note SHALL name every kind of post the app makes (Arena daily round Scores, ranked game round Scores, the weekly Sparks total) and SHALL name nothing the app does not send.

#### Scenario: Note matches what is sent
- **WHEN** the parent note is compared with every request the app can send to World boards
- **THEN** each kind of post appears in the note, and the note mentions no other

## REMOVED Requirements

### Requirement: The note explains XP and Practice
**Reason**: XP no longer exists; Sparks replace it (ADR 0003).
**Migration**: Replaced by "The note explains Sparks and Practice" below, with the same rule in Sparks.

## ADDED Requirements

### Requirement: The note explains Sparks and Practice
The parent note SHALL state that Sparks from all play, Practice included, add up to one weekly total that is posted, and that Practice Scores never leave the device. It SHALL NOT mention XP.

#### Scenario: A parent reads about Practice
- **WHEN** a grown-up reads the note
- **THEN** it does not say Practice keeps everything on the device without also saying its Sparks count toward the posted weekly total
