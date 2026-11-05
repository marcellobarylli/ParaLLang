# Round 032 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** `prototype.md` §4.2 (`relationship_unlocks`, and the `lore_fragments` trigger "relationship
  >= 10": Gerald on the old tongue of the Dead Branch, where the word for the coffee no longer exists);
  GAME MECHANICS.md ("build a relationship with them and have more meaningful conversations over time"); round
  [023](../023/architecture.md) (deferred "deeper tiers by `conversations`"); round [030](../030/architecture.md)
  (fragments). New backlog item A12.
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** both packs' `lore/fragments.yaml`, `server/src/content-loader.js`, `server/src/learning-service.js`,
  `mobile/src/components/DialoguePanel.js`, tests.

## Goal (pre-run)

The first relationship unlock: after three resolved coffee breaks, Gerald recites a fragment of *The Journey* about
the Dead Branch's lost word for coffee. It goes into the Spellbook like round 030's fragments. Deterministic: no
LLM call and no prompt change.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Three conversations**, not prototype.md's relationship 10: a prototype level should reach it.
2. **A fragment of *The Journey*, told by Gerald.** It fits round 030's Spellbook section. The text never names the
   drink, because the word is lost and the name is also a vocabulary form.
3. **Critique by a Claude subagent** (Codex at its usage limit until about 20:35 UTC).

## Design (pre-run)

1. **Content.** A fragment may carry `after_conversations: N`, a whole number of at least 1. Gerald's
   `journey_dead_branch` ("The word for it") has `found_after: imp_coffee_greeting` and `after_conversations: 3`,
   comes last in both files, and its English is the same in both packs (tested, with N).
2. **Loader.** `after_conversations` is refused when no party conversation names `found_after` (`party_of`).
   `loadFragments` runs after `validatePartyConversations`.
3. **Server** (critique 2.1, 2.2). A fragment with `after_conversations` skips the completion test. It is found
   when a party member matches as `partySnapshot` does:
   - the member's `encounterId` is `found_after`;
   - its `characterId` is that encounter's character;
   - its `conversations` (missing counts as 0) is at least N.
   The snapshot entry then adds `unlockedAt: N` and `conversations` (the member's count). Its `encounterId` is the
   party conversation's id, and its `locationName` is the home location. No server path removes a member today. A
   later removal, or raising N, would hide the fragment again, since it is derived and not saved.
4. **App** (critique 2.3, 2.4). `fragmentNote` shows a conversation fragment only when `conversations ===
   unlockedAt`, that is, on the resolution that unlocked it. For a party conversation it is worded "A fragment of
   The Journey from Gerald is in your Spellbook: <title>." Location fragments keep round 030's wording.
5. **Leak check** (critique 2.5). Besides round 030's check against every vocabulary form, the text and glossary of
   a conversation fragment contain no stem of its party conversation's targets. The stems are the folded targets
   cut to their first 4 letters, at the start of a word: `buon`, `otti`, `graz` / `buen`, `deli`, `grac`.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 aae1aa28…; Claude subagent (general-purpose, claude-opus-5-5),
read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 2.1 | Error | The completion filter would show it after the greeting | + | Accept: conversation fragments skip the completion test (tested) | **Accepted** (autonomous, pending owner review) | Design 3 |
| 2.2 | Error | Member lookup must match `partySnapshot` | + | Accept: encounterId and characterId, missing count as 0; removal noted | **Accepted** (autonomous, pending owner review) | Design 3 |
| 2.3 | Risk | The note repeats on later breaks | + | Accept: `unlockedAt` and `conversations` in the snapshot; note only at equality | **Accepted** (autonomous, pending owner review) | Design 3, 4 |
| 2.4 | Risk | "From here" is false for party conversations | + | Accept: "from Gerald" wording | **Accepted** (autonomous, pending owner review) | Design 4 |
| 2.5 | Risk | Near-forms of the coffee break's targets | + | Accept in part: stem check on text and glossary; the English title and found line are English and need no target check | **Accepted in part** (autonomous, pending owner review) | Design 5 |
| 2.6 | Suggestion | Pack equality should cover N | + | Accept (already in the draft test) | **Accepted** (autonomous, pending owner review) | Design 1 |
| 2.7 | Suggestion | Resolving turn, replay, hidden on the 4th | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |

**Deferred / optional:** loader order (taken); clear message when the party conversation is missing (taken); the
"raising N" note (taken, Design 3).

Net change from plan-v1: a member match identical to the Party screen's, a note shown only on the unlocking
resolution and worded for a party conversation, and a stem leak check.

## Tests (pre-run)

- `lore-fragments.test.js`:
  - four fragments with the same English and N in both packs;
  - Gerald's completion alone, a member with a missing or 2-conversation count: absent; a count of 3 or 9:
    present;
  - a member whose `characterId` does not match: absent;
  - the loader refuses N without a party conversation, 0 and 1.5;
  - the stem check, with a planted "buonissimo" to show it is live.
- `party-conversation.test.js`:
  - three breaks give `[], [], [journey_dead_branch]`, with `encounterId`, `locationName`, `unlockedAt` 3 and
    `conversations` 3;
  - a replayed third attempt returns it without counting again;
  - during a fourth break it is hidden.
- Mobile: the note on the third break, none on the fourth, the "from Gerald" wording; round 030's location note is
  unchanged.
- All suites, expo-doctor, iOS export.
