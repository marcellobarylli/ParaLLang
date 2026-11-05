# Round 043 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog G1. Rounds 032–033 unlock one *Journey* fragment per party member after three party
  conversations (`after_conversations: 3`), but nothing tells the player so. Both rounds left "a Party-screen hint"
  as an owner question.
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `partySnapshot` gains `nextStoryAt` and `storiesTold`, and `isHomeMember` is shared with
  `journeyFragments` (`server/src/learning-service.js`). The app gains `storyHint` in `PartyPanel.js` and a party
  refresh in the store's `openParty`. Tests. No content or prompt change.

## Goal (pre-run)

The Party screen tells the player how many finished conversations remain before each member tells a story, without
naming the story.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Show the hint** (the owner question of rounds 032–033). The lines:
   - "N more finished conversations until <Name> tells you a story." (singular "1 more finished conversation").
     "Finished" because only a resolved conversation counts (critique 1.4).
   - "<Name> has told you a story. It is in your Spellbook." when no threshold is left, or "has told you N stories.
     They are in your Spellbook." (critique 1.3).
   - When one story is told and another is ahead, only the countdown shows.
   - No line for a member without conversation fragments, or from a server without the fields.
2. **Count only.** The fragment's title is not shown before it is found.
3. **Critique by a Claude subagent** (Codex at its usage limit until 20:35 UTC).

## Design (pre-run)

1. **Server.**
   - `isHomeMember(member, homeId)`: the member's encounter is `homeId` and its character is that encounter's
     character. `journeyFragments` and the new `storyProgress` both use it (critique 1.1).
   - `storyProgress(member)` takes this member's fragments that have `after_conversations`. `nextStoryAt` is the
     smallest threshold above the member's count, or null. `storiesTold` is the number reached.
   - `partySnapshot` spreads `storyProgress` into each member. It is derived, not saved, like `journeyFragments`.
2. **App.**
   - `storyHint(member)` builds the line. `PartyPanel` computes it once per member and shows it under the count
     line, outside the card's `aria-label`.
   - `openParty` refreshes the party in the background, so a failed refresh after a resolve cannot leave the hint
     stale (critique 1.2). A reply for another save is dropped.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 cc4e28cf…; Claude subagent (general-purpose, claude-opus-5-5), read-only;
raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Suggestion | Share one matching rule with `journeyFragments` | + | Accept: `isHomeMember` | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.2 | Risk | No party in the resolving response; a failed refresh leaves the hint stale | + | Accept the second fix: `openParty` refreshes (smaller than changing the dialogue response) | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.3 | Suggestion | Plural told line; mixed states | + | Accept: "N stories"; countdown only when one is ahead (tested) | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.4 | Suggestion | Only finished conversations count | + | Accept: "finished" in the line | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.5 | Suggestion | Test through a content fixture and the API, not `.call` | 0 | In part: the real packs go through `/api/party`; the two-threshold case keeps a stand-in `this` (content is frozen, and no pack has two thresholds), with `isHomeMember` passed and a comment | **Accepted in part** (autonomous, pending owner review) | Tests |
| 1.6 | Risk | VoiceOver can't be checked here | + | Accept: `getByText` tests; Simulator open item; the hint stays outside the card's label | **Accepted** (autonomous, pending owner review) | Design 2, open items |
| 1.7 | Suggestion | Test both packs | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.8 | Suggestion | Write the mobile tests, including `nextStoryAt <= conversations` | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |

**Deferred / optional:** the hint is computed once per member (done); the record states the told line as
"`nextStoryAt` null and `storiesTold` > 0" (Decision 1); Flick and Marginalia's completion fragments are not counted
(they are not conversation fragments, and the two agree); old servers are handled by `Number.isInteger` (kept).

Net change from plan-v1: a shared matching rule, a refresh on opening the Party screen, "finished" and plural
wording, and tests over both packs.

## Tests (pre-run)

- Server (`lore-fragments.test.js`, it and es):
  - Gerald at no count, 2, 3 and 7 conversations: `nextStoryAt` 3, 3, null, null; `storiesTold` 0, 0, 1, 1;
  - the Spellbook holds as many of his stories as `storiesTold`;
  - Portia, and a member with the wrong character: null and 0;
  - two thresholds (3 and 6) at counts 1, 4 and 6.
- `party.test.js`: `nextStoryAt: 3` and `storiesTold: 0` in Gerald's snapshot.
- App (`party.test.js`):
  - the six lines: 2 left, 1 left, no count, told plus one ahead, one told, two told;
  - no line without the fields, for null with 0 told, or when `nextStoryAt` is at or below the count;
  - `openParty` refreshes, and drops a reply for another save.
- All suites.

## Outcome (2026-11-05)

Built as designed, with no Amendments. The Party screen counts down to each member's next story and then points to
the Spellbook. Server 165/165, mobile 120/120, web client 12/12 and build. See [findings](findings.md).
