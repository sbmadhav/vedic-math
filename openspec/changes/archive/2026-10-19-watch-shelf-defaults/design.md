# Design

## Decisions

**1. Both is the starting Mode, not a remembered choice.** The filter state lives only while the shelf is open, as before. The starting value is `'all'` when `MODE_SEES[mode]` has more than one Mode, else the Player's own Mode (Explorer, who has no chip). `filterShelf()` keeps its own default (`level = mode`) so its unit tests and other callers are unchanged; the shelf passes `level` explicitly.

**2. One kind at a time.** The kind chip has no "all" value any more: Videos, Shorts, and for Pro Links. The shelf always passes `kind`, so `filterShelf()` never mixes videos and Shorts on the shelf. Its "unset keeps everything" rule stays for other callers (the Skill and Trick picks, which show 2 or 3 matched entries of either kind).

**3. Links are their own view.** Before, Pro's sites and games showed under the videos only with no other filter set. Now they show exactly when Links is picked, whatever the other chips say, since those chips describe videos (Skill area, Trick, length) and links carry none of that data. The other chip rows stay on screen under Links, so switching back keeps the Player's filters.

**4. Video tiles only on open.** An Explorer opening the shelf sees Explorer's videos (70 at the time of writing) and picks Shorts for its 2 Shorts. Tests that counted every entry now gather Videos and Shorts separately.
