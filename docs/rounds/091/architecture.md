# Round 091 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (review, plan as sent, raw
critique, journal) is in `trail/`; it is not needed to implement this round.

- **Source:** an independent read-only review of the code of rounds 017–028 (Spellbook hiding, Rift gate and boss,
  party recruitment and conversations, ambient vocabulary, onboarding, containment files), never reviewed after
  their builds, [`trail/review-1.md`](trail/review-1.md): no Error, one Gap, one Minor, both checked by hand at HEAD.
  The Gap: the map card's "Talk to …" silently replaces a conversation under way elsewhere (a party conversation two
  objectives in is lost), while the Party screen guards against that ("Finish your conversation with X first.").
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-service.js`, `mobile/src/components/MapPanel.js`,
  `mobile/src/stores/gameStore.js`, `mobile/App.js`, tests.

## Goal (pre-run)

A conversation under way is never replaced without the player choosing to leave it; the player always has a way
back to it and a way out of it.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The server refuses (critique 1.1).** `_startEncounter` throws 409 `CONVERSATION_UNDER_WAY` ("Finish your
   conversation with X first.") when a start names an encounter (`encounterId !== null`, so the frozen web client's
   default start keeps replacing), `restart` is false, and another encounter is ongoing. The app guard alone would
   leak whenever the app does not know the server's encounter (startup's `currentEncounter` failed, critique 1.1).
2. **The map card (R1.1, critique 1.5, Optional):** when `ongoing` (App passes only an ongoing encounter) has another
   `encounterId` than the one here and no drill note shows, Talk is disabled (its accessible name says why) and a note
   says "Finish your conversation with X first." with "Return to X" (`onReturnToEncounter`) and a text button "Leave
   X and talk to Y" (decision 3). Without a name: "the conversation under way". The drill note keeps its own wording
   and way back (critique 1.6: with the drill pending for the same encounter, its "Return to X" resumes it).
3. **A way out (critique 1.3, 1.4).** Leaving is a start with `restart: true` for the encounter here (the server then
   replaces, as before this round). It is also the short way out when the app holds an encounter the server forgot
   after a restart (round 084). No confirmation dialog (the conversation can be started again; its progress is in
   memory only).
4. **A 409 teaches the app (critique 1.1, 1.4).** On `CONVERSATION_UNDER_WAY` the store asks `currentEncounter` and
   takes its encounter and Spellbook (same epoch and learner checks as a start), so the map shows the note.
5. **Restart away from the place (critique 1.2).** A restart of the encounter the server holds skips the `NOT_HERE`
   check, since "Return to X" now routinely leads into a conversation whose place the player left.
6. **R1.2 rejected (critique 1.7, 1.8):** a server older than round 021 also lacks named starts and recruiting, so
   tolerating a missing `/api/party` would not make the app work against it.

## Design (pre-run)

1. `learning-service.js` `_startEncounter`: read `active` before the location checks; `NOT_HERE` only when not
   (`restart && active && definition(active) === definition`); after the gate, the `CONVERSATION_UNDER_WAY` check.
2. `gameStore.js`: `_startNamed(encounterId, { restart = false } = {})` passes `restart`; `leaveAndEnter()` starts the
   encounter here with `restart: true`; the 409 handling of decision 4.
3. `MapPanel.js`: `elsewhere` (compare `ongoing.encounterId` with `here.encounter.id`), `ConversationNote`, the Talk
   button's `disabled` and `accessibleName`; new prop `onLeaveForEncounter`. `App.js` passes it.

## Claim boundary (pre-run)

Tests only. A location conversation is still kept while the player walks away (as before); the web client's default
start still replaces.

## Second opinion (pre-run)

Source review: [`trail/review-1.md`](trail/review-1.md) (2 findings). Critiqued draft: `trail/plan-v1.md`, sha256
092bce01…; a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex; raw text in
[`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Gap | The map's Talk replaces a conversation under way elsewhere | + | Accept: note, way back, way out, server 409 | **Accepted** (autonomous decision, pending owner review) | Decisions 1–5 |
| R1.2 | Minor | No `/api/party` fails startup | − | Reject (critique 1.8) | **Rejected** (autonomous, pending owner review) | Decision 6 |
| 1.1 | Error | The web-client reason against a server guard does not hold; the app guard leaks | + | Accept: 409 for named starts | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.2 | Gap | Restart away from the place gets `NOT_HERE` | + | Accept: skip it for the held encounter | **Accepted** (autonomous, pending owner review) | Decision 5 |
| 1.3 | Gap | No way out of a conversation that cannot be finished | + | Accept: "Leave X and talk to Y" | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.4 | Gap | After a server restart the disabled Talk costs extra steps | 0 | Accept: the leave button; a 409 refreshes | **Accepted** (autonomous, pending owner review) | Decisions 3, 4 |
| 1.5 | Gap | Compare `encounterId`; one name fallback | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.6 | Gap | With the drill pending for the same encounter, Talk stays disabled | 0 | Accept: the drill note's Return resumes it; stated | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.7 | Gap | The 404 rule misses `sendMessage`'s party call | 0 | Accept as a reason to drop R1.2 | **Accepted** (autonomous, pending owner review) | Decision 6 |
| 1.8 | Cut | R1.2 is not worth doing | − | Accept | **Accepted** (autonomous, pending owner review) | Decision 6 |
| 1.9 | Gap | Tests: server guard, failed `currentEncounter` then Talk, drill test's `ongoing`, resolved elsewhere, party conversation blocks | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |

**Optionals:** the Talk button's accessible name says why it is disabled (accepted, Decision 2).

## Tests (pre-run)

- server (new `conversation-under-way.test.js`): with a party conversation ongoing, a named start of a location
  encounter gets 409 `CONVERSATION_UNDER_WAY` and the session stays; the same with `restart: true` replaces it; a
  start without `encounterId` still replaces; the same encounter resumes; a resolved one elsewhere does not block;
  a restart of the held encounter away from its place works.
- mobile `MapPanel` (in `drill.test.js` or a new file): an ongoing party conversation elsewhere disables Talk with the
  note, "Return to X" and "Leave X and talk to Y"; the same encounter ongoing here keeps Talk; no `ongoing`, no note;
  the drill note case shows one "Return to X"; the drill test's `ongoing` gains an `encounterId`.
- mobile store: `leaveAndEnter` starts with `restart: true`; a 409 `CONVERSATION_UNDER_WAY` makes the store take the
  server's encounter (startup's `currentEncounter` had failed).
- Full suites; each fix removed in turn fails a test.
