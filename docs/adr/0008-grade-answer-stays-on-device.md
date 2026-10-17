# The Grade answer stays on the device and only changes presentation

Status: proposed in the `age-bands` change.

To fit reading help to each child, every Player is asked once "What grade are you in?" (or their age). A child's grade or age is personal information under COPPA once an operator collects it, and the site is directed to children. So the answer is kept only in the browser, in the Player's record, and is never in any request: not to Boards, not to analytics, not to Firebase. The operator never collects it. It only chooses a Reading band, which changes read aloud, wording, answer buttons, Practice timers and Bolt's tone, and never math difficulty, Leagues or Ranked rounds.

## Considered Options

- **Infer reading from Placement**: rejected, because Placement measures math, not reading; a strong 5-year-old would get 25-word lines.
- **Use the Mode as the band**: rejected, because a Challenger can be 7 or 12, and Placement now lets young children play older math in any Mode.
- **Send a coarse band to analytics to measure the feature**: rejected, because even a band is a property of a child's age; funnels use fixed events only.
- **Ask for a birthday**: rejected, more than needed and more sensitive.

## Consequences

- The privacy policy, the parent note and `cloud/README.md` say the grade or age is kept on the device and never sent.
- The answer travels only where the rest of progress does: the backup code and the learnvedicmath progress hand-off (in the URL fragment, which never reaches a server). Removing the Player removes it.
- Reversing this (ever sending it) would need parental consent under COPPA and a new privacy notice, so it is treated as hard to reverse.
- If the owner confirms, an age given here is also the Age answer, so the age question is not asked twice; a grade never decides posting (ADR 0001 gains that consequence).
