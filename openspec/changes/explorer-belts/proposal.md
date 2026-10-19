# Proposal

## Why

The in-app guide work (PR #37) reported a dead end: an Explorer Player can never earn a Belt. Belts are earned by lighting Stars (sky-home), and the star-round spec says Explorer SHALL NOT be offered Stars. Yet the Dojo (reachable in Explorer from the guide's "Open the Dojo" button and by link) tells Explorer to "Light all 9 Stars of a belt's three tricks to earn it", counts "0 of 7 belts earned" and "0/9 Stars" per belt, and the Me page lists the White, Green and Black belt badges and Sutra scholar (Sutra cards are not in Explorer's menu either) with a total Explorer cannot reach.

The owner asked to fix all open issues. Three ways were weighed:

1. Offer Stars in Explorer. Reverses a deliberate rule: Stars are Trick rounds for grade 3 and up, and Explorer is about 4 to 7. Largest change, doubtful pedagogy.
2. Let Explorer earn Belts from signals Explorer does see (mastered Explorer Skills, finished rounds). Redefines Belt (GLOSSARY: a rank earned by lighting every Star of its three Tricks) into two different things.
3. Stop dangling what Explorer is not offered: the Dojo in Explorer shows the Tricks grouped by belt and says belts and Stars come with Challenger and Pro; the Me page lists a Belt or Sutra scholar badge to Explorer only once earned (for example, before switching Modes), and counts what it lists.

This change is option 3, the smallest honest fix. The owner has not approved the design yet.

## What Changes

- Dojo in Explorer: no belt progress line, no per-belt Star count, a lede that explains the Tricks and says "Belts and Stars come with Challenger and Pro", and no "Read about all 29 sutras" button (Sutras are not offered in Explorer). Belt names still group the Tricks; a Belt the Player already holds still shows as earned.
- Me page: badges gain `modes`; `badgesFor(mode, got)` lists a badge whose way to earn it is not offered in the Mode only once it is earned. The count reads "earned of listed".
- Guide, Dojo section, Explorer wording: "Belts and Stars come with Challenger and Pro."
- GLOSSARY Belt entry says so.

Out of scope: Stars or Belts for Explorer, changes to Challenger or Pro.

## Capabilities

### Modified Capabilities

- `star-round`: "Where Stars are offered" also says what Explorer's Dojo shows instead.
- `badges`: a new requirement, "Badges listed per Mode".
