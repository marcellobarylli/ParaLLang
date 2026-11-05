# Round 022 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog A8b in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); round
  [021](../021/architecture.md) (the party); prototype.md §2.1 item 5 ("unlocking deeper conversations over time");
  GAME MECHANICS.md ("build a relationship with them and have more meaningful conversations over time").
- **Findings:** [`findings.md`](findings.md), after the runs.
- **Artifact:** loader and service (party conversations), Gerald's coffee break in both packs, app (Talk on the Party
  screen), tests, `play-market.js --party`.

## Goal (pre-run)

A party member can be talked to again: from the Party screen, anywhere on the map, the player plays an authored
conversation with them, and each resolved conversation counts towards that member. First and only content this
round: Gerald's coffee break (it, es).

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **A party conversation is an authored encounter** (`party_of`), graded like any other, not free chat: it keeps
   "translation generates power" and reuses objectives, hints and the Spellbook.
2. **It starts anywhere** once the member has joined (they travel with the player) and is set at the player's current
   location. It never appears on the map, never counts for the Rift gate, and the Rift's review does not include its
   vocabulary (you may never recruit Gerald).
3. **Resolved conversations count** (`conversations` on the member); a resolved conversation can be played again,
   which starts a fresh session (critique 1.1). Deeper tiers unlocked by the count are deferred.
4. **Spanish praise is *bueno* or *delicioso*, not *rico*** (critique 1.2: "Puerto Rico", "RICO", and *rica* in
   "Costa Rica").
5. **Agreement is graded**: with the coffee as referent the masculine form is required ("Il caffè è buona" fails);
   a bare feminine form passes only with an explicit feminine referent (1.3).
6. **Talk is unavailable while another encounter is under way** (1.7): the Party screen says to finish it first.

## Design (pre-run)

### Content

- Encounter schema: `location` is optional and `party_of` new; exactly one of them is set.
- Loader, after all encounters are read (1.6): `party_of` names an existing **location** encounter (not a party
  conversation, not itself), with the **same character file**, whose character is `saveable`; at most one party
  conversation per location encounter (Optional item); the default encounter and `requires_completed` may not name a
  party conversation; the world's "held by its location" check skips party conversations.
- `content/languages/{it,es}/encounters/gerald_coffee_break.yaml`, `party_of: imp_coffee_greeting`, Gerald's sheet,
  escalation 0.05:
  - `praise_coffee`: it *buono* (buono, buona, buon, buonissimo, buonissima), *ottimo* (ottimo, ottima); es *bueno*
    (bueno, buena, buen, buenísimo, buenísima), *delicioso* (delicioso, deliciosa). Constraints: the player's own
    positive verdict on the coffee; masculine agreement with the coffee as referent, feminine only with an explicit
    feminine referent (la tazza / la taza); reject English-only, negated ("Non è buono", "no bueno"), quoted, and
    other referents.
  - `thank_gerald`: it *grazie* (grazie, grazie mille); es *gracias* (gracias, muchas gracias).
  - The scene ("Gerald, now in the party, has brewed the player a coffee on the road") is in the objective intent,
    which reaches the narration prompt (1.4, as round 013's passages); no template change.
- New vocabulary files `gerald_break.yaml` per pack (Treccani / RAE and Wiktionary references).

### Engine

- `startEncounter` with a party conversation: 409 `NOT_IN_PARTY` unless the character is in the party; no location
  or gate check. The session stores `locationId` (the player's location at start); narration (greeting and turns)
  and `location` in the serialized encounter use it (1.5). An active session of the same definition is resumed if
  ongoing and restarted if resolved (1.1); location encounters keep today's behaviour.
- Serialized encounter: `partyConversation: true|false`.
- Resolution of a party conversation: the member's `conversations` += 1 (once per resolution; a replayed attempt
  returns the stored response); `completedEncounterIds` is untouched.
- Save: party members may carry `conversations` (non-negative integer; missing = 0). No schema bump.
- `partySnapshot`: adds `conversations` and `conversationId`.

### App

- Party screen: "Met at … · Conversations: N" and **Talk to *Name*** when `conversationId` is set; while another
  encounter is ongoing the button is disabled with "Finish your conversation with *X* first." (1.7).
- Store `talkTo(encounterId)` shares the start path with `enterEncounter`; after any resolution the store refreshes
  world and party.
- The resolved card offers recruitment only for location encounters and checks membership by character (1.8).

### Tests (pre-run)

- Loader: missing, chained, self, wrong-character and non-saveable `party_of`; both or neither of
  `location`/`party_of`; party conversation as default or in `requires_completed`; two conversations for one
  encounter.
- Service: `NOT_IN_PARTY` before recruiting; start elsewhere after; greeting and turn prompts name the current
  location and carry the intent; after moving mid-conversation the scene stays; resolution increments once, twice
  after a second fresh session; `completedEncounterIds` and the Rift gate unchanged; replaying the final attempt does
  not count twice; missing `conversations` reads 0; invalid values (−1, 1.5, "2") → `SAVE_UNREADABLE`, file kept.
- Gerald's golden prompts unchanged; both packs load; the Rift's review excludes party vocabulary.
- Fixture-graded objective paths: praise alone leaves thanks open, praise and thanks together resolve.
- Mobile: Talk and count on the Party screen; Talk disabled during another ongoing encounter; `talkTo` opens the
  dialogue; no recruitment offer on a resolved party conversation; party refreshed after resolution.

### Live data (pre-run)

`play-market.js --party`: Gerald's encounter, recruit, walk to the Market Entrance, play the coffee break: it
`Delicious!` (English, should fail), `È buonissimo!` (variant, praise passes), `Grazie mille!` (thanks passes);
es `Delicious!`, `¡Está buenísimo!`, `¡Muchas gracias!`. 3 it + 1 es runs, plus 1 it variant with
`--lines 'Il caffè è buona.|Un buon caffè, grazie!'` (agreement fails, then both pass in one line). Record:
resolution, verdicts against the script, language share against the requested ratio, the scene location named,
and lines that give away an open objective's answer (Gerald saying *buono*/*grazie* before the player).

## Claim boundary (pre-run)

Tests and a handful of live runs as a smoke check of one authored conversation; no claim about relationship depth
or learning effect. Not checked in the iOS Simulator.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 a7ddd54d…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A resolved session is resumed, so a second conversation never starts and the count stays at 1 | + | Accept: restart a resolved party conversation; test two completions | **Accepted** (autonomous) | Decision 3; Engine; Tests |
| 1.2 | Error | *rico* matches "Puerto Rico" / "RICO" (and *rica* "Costa Rica") | + | Accept: replace with *delicioso*; "no bueno" is a negated verdict in the constraints | **Accepted** (autonomous) | Decision 4; Content |
| 1.3 | Risk | Agreement and degree: "Il caffè è buona" would pass; superlatives as plain "good" | 0 | Accept in part: agreement in `grammar_constraints`; superlatives stay variants of one entry, explained in the note | **Accepted in part** (autonomous) | Decision 5; Content |
| 1.4 | Risk | The coffee-break scene does not reach the narration | 0 | Accept in part: the scene goes in the objective intent (it reaches the prompt); test it; no template change | **Accepted in part** (autonomous) | Content; Tests |
| 1.5 | Risk | Locationless definitions reach location code in later turns and serialization | + | Accept: session `locationId` everywhere; test after moving | **Accepted** (autonomous) | Engine; Tests |
| 1.6 | Risk | Impossible references (default, gate) and load order | 0 | Accept: validation after all encounters load; reject default and gate references; listed cases tested | **Accepted** (autonomous) | Content; Tests |
| 1.7 | Risk | Talk silently discards an ongoing encounter | + | Accept in part: Talk disabled in the app during another ongoing encounter; server keeps one session per learner as for location encounters | **Accepted in part** (autonomous) | Decision 6; App; Tests |
| 1.8 | Risk | Recruitment card identity vs conversation identity | 0 | Accept: membership by character; no offer on party conversations; test | **Accepted** (autonomous) | App; Tests |
| 1.9 | Suggestion | Persistence tests beyond replay | 0 | Accept in part: missing = 0, invalid values, replay of the final attempt, Rift unchanged; provider and storage failures already leave staged state unwritten (not retested) | **Accepted in part** (autonomous) | Tests |
| 1.10 | Suggestion | Objective and mobile failure paths | 0 | Accept in part: praise-only and praise+thanks paths with a fixture grader; LLM grading of negation, quotes and referents in the live variant run; party-refresh failure not tested (same catch as the world refresh) | **Accepted in part** (autonomous) | Tests; Live data |

**Optional, taken:** *buon* / *buen* as surface forms ("un buon caffè"); at most one party conversation per
location encounter instead of "first by file order".

Net change from v1: resolved conversations restart, *rico* replaced by *delicioso*, agreement graded, session
location used throughout, stricter loader checks, Talk guarded during other encounters.

## Outcome (2026-11-05)

Built as designed, with no amendment. Tests: server 127/127, mobile 37/37, web client 12/12 and build, expo-doctor
20/20, iOS export ok; Gerald's pinned prompts unchanged. Live codex-cli: the coffee break resolved in all five runs
with the planned script (it ×3, es ×1, it variant ×1), every verdict as scripted, agreement refused in the variant,
no answer given away, share 0.37 against 0.32 requested; a sixth run used a stale script line (*riquísimo*, dropped
by critique 1.2) and was correctly refused. A8b is done; Mortimer, Flick and Marginalia's conversations are next
(A8c). Nothing was checked in the iOS Simulator. See [findings](findings.md).
