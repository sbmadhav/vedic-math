# Proposal

Status: approved by the owner (Madhav) on 2026-10-21 in a grilling session ("Yes to all"); every decision in `design.md` was settled there. Step 1 (this plan and a look-and-listen prototype) and step 2 (the scripted Family helpers in the Legacy views, behind an off-by-default switch) are built in the pull request that proposes it, for the owner to try on a phone. Step 3 (the React port, the AI conversation layer for 13+, on-device listening and 3D) is planned here and built later.

## Why

When a Player gets stuck today, help is a button: Hint, Show me, or Bolt's one line in the bubble under the answer. Nothing notices that a Player has missed the same Skill twice, has been staring at one question for half a minute, or pressed Hint twice and still has nothing. A child who is stuck and alone with a screen often just leaves.

The Nikhilam Family (the brand mark: the Devanagari digits 1, 0 and 9 as a tall One, a baby Zero and a Nine) already lives on the landing and the app home. The owner wants them to step into the game as the Player's friends: fellow students who notice trouble, hop in from the edge of the screen, and help the way a friend at the next desk would. A hint, then the method, then a worked example on different numbers, never the answer. Bolt stays the teacher; the Family are classmates who learned from him too ("Bolt showed us this one...").

The model is two old desktop helpers, with their mistakes left out. From Bonzi Buddy, how a character appears over the screen (walks or hops in from an edge, perches, waves, hops out). From Clippy, the speech bubble with two or three buttons. Not Clippy's sin: they never cover the question, the answer field or the buttons, they close in one tap, and "Not now" means not now.

## What Changes

- **Three friends, one at a time.** Shunya (Zero, funny), Nava (Nine, witty, the nodder with comebacks) and Eka (One, a little serious, names the Sutra and works the steps through with the Player as a peer). All joyful. Their tone follows the Reading band (Early silly and gentle with short words, Growing playful with puns, Fluent dry wit and real method talk); until `age-bands` lands, the band comes from the Mode. Only one speaks at a time; a visit with two or three takes turns.
- **They notice trouble** (the help signals): 2 misses in a row on the same Skill, 3 misses in a round, about 20 seconds idle on one question, Hint pressed twice, or leaving a round early after misses. Never mid-question in a timed race (the Arena, a Star's clock): in Star rounds Bolt teaches as now and the Family come after the round or when asked.
- **They escalate gently.** One friend for a first stumble (a light hint); two for repeated trouble (one shows the method, one encourages); all three for a real block (a short skit that works one example on different numbers step by step) and for a breakthrough. At most one visit every 3 minutes unless the Player asks.
- **They never give the answer.** A hint, the method, or a worked example on different numbers; the answer only through the round's own Show me. Rarely, in Growing and Fluent only, Shunya makes a playful mistake on a different example and Nava or Eka catches it; never on the Player's question.
- **Never in the way.** They roam the edges and margins, never over the question, the answer field or the buttons; every visit closes in one tap or Escape; "Not now" mutes them for the session; focus stays in the answer field. Me gains a setting: Always, Only when I ask, Off. Calm, Pause motion and reduced motion make them fade in still. Screen readers hear the words through the existing polite live region; the art is hidden from them.
- **They know the Player a little, on the device only.** They greet the Player by Nickname and remember which Sutra or Skill was hard last time; both stay in the Player's record on this device and are never sent (ADRs 0006 and 0008).
- **Voices later, text now.** Text always shows in the bubble. Each friend gets a Chirp 3 HD voice distinct from Bolt's Aoede (Shunya Puck, Nava Leda, Eka Charon), every line prerecorded per band; the owner runs and pays for the samples and the recording. Until the recording lands the new lines are text only.
- **Second layer, later and opt-in: talking with the Family** (an AI conversation, server side, only for Players whose saved age or grade says 13 or over, never for under-13) and **listening** (push-to-talk in Pro, and an opt-in listening mode with a mic badge that only looks for help phrases, on the device where the browser allows, never storing audio or words). Both are planned here with a proposed ADR (0015) and built after the React port. On 2026-10-24 the owner settled the conversation's shape (design D18): Bolt joins Shunya, Nava and Eka, and answers every why or how question; one call per turn to Claude Haiku 4.5 on our own Worker route returns at most two short replies; four checked actions (an example on other numbers, pointing at a part of the question, the Sutra, a pose), none of which shows the answer; a clue limit per question; text only at first; fixed safety instructions, contact details stripped in the browser and a server check that swaps a bad reply for a scripted line; Cloudflare Turnstile once per browser session and about 20 turns an hour per address, the same protection on the server voice. CopilotKit was weighed and rejected. What a turn sends is unchanged.

Out of scope:

- Bolt's lines and poses in Star rounds and the Arena (unchanged). In Practice, Katas and content pages Bolt keeps his existing bubble lines; the Family are the helpers there.
- The Arena, games, Party Mode and the play experiences in step 2 (they are timed or have their own help); the Family may come to them later through the same engine.
- Any change to math difficulty, Ratings, Sparks, Scores or what counts as a try.
- 3D rendering of the Family (a later step on React Three Fiber, react-typescript Phase 7, ADR 0013).

## Order and dependencies

1. **Now (this PR):** this change, ADR 0015 (proposed), the glossary words, the prototype `docs/prototypes/family-helpers/` (look and motion) with its listening page, the voice sample tool `tools/voice/family-samples.mjs` (the owner runs it).
2. **Now (this PR):** the scripted Family in the Legacy Practice, Kata and Star end views, behind the per-Player switch "Try the Nikhilam Family helpers" in Me (off by default, like the Sky's switch was), with the help setting, the line table and the tests.
3. **After react-typescript phase 2 ships** (held for its owner task 0.8, Workers Paid): port the overlay into the React root layout; then the recording of the lines; then the AI conversation layer for 13+ and listening (ADR 0015, design D18, server code on the Worker with its own ledger limit beside `VoiceLedger`, behind Turnstile; a throwaway prototype outside the repository tries the chat first); then the 3D Family on React Three Fiber.

`age-bands` is not a dependency: the Family read `player.reading` when it exists and fall back to the Mode. `sutras-first`, when it lands, gives every Skill a Sutra tag; until then Eka names the Sutra from the Trick's own `sutra` and `meaning` (`js/vedic.js`), and says the method without a Sutra name for school Skills.

## Capabilities

### New Capabilities

- `family-helpers`: the three friends, the help signals, escalation, the visit and its buttons, never the answer, where they stand, the Me setting and the switch, memory on the device, text and voice, Calm and motion, screen readers.
- `helper-listening`: push-to-talk and the opt-in listening mode (planned, step 3).
- `helper-conversation`: the opt-in AI conversation layer for 13+: Bolt and the three friends, our own endpoint and model, what is sent, the server check, the four actions, the clue limit, safety, bot protection, text only, the caps and fallback (planned, step 3).

### Modified Capabilities

- `calm`: the Family stand still under Calm, Pause motion and reduced motion.
- `analytics`: anonymous Family visit counts.
- `star-round`: the Family wait for the round's end, and Bolt keeps teaching.

## Affected

Every Mode and every Player who turns the switch on (off by default): Practice on Skill pages and Endless practice and runs, Katas, the Star end screen, Me. Nothing is sent that was not sent before, except the anonymous fixed-word visit counts (analytics). Step 3 also adds the Turnstile check and per-address limit to the server voice planned in `react-typescript` (its server-voice spec). No change for a Player who leaves the switch off.
