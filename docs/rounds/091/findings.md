# Round 091 findings

## Question

Rounds 017–028 (Spellbook hiding, the Rift gate and boss, party recruitment and conversations, ambient vocabulary,
onboarding, containment files) were never reviewed after their builds. Does an independent review find bugs, and can
they be closed offline?

## Finding

**No answer leak; one way to lose a conversation, now closed.** The map card's "Talk to …" started the encounter
here even while another conversation was under way, and the server silently replaced it: a party conversation with
Flick two objectives in was gone when the player tapped "Talk to Mortimer". The Party screen already refused that.

Now the server refuses a named start while another conversation is under way (409 `CONVERSATION_UNDER_WAY`,
"Finish your conversation with Flick first."), after the Rift's drill check, whose message names it too. The frozen
web client's default start still replaces. The map card disables Talk and says why, with "Return to Flick" and a way
out, "Leave Flick and talk to Mortimer", which is a restart start (the only path that replaces). It is also the
short way out when the app holds a conversation the server forgot after a restart. When the server refuses a start
the app did not expect, the app takes the server's conversation, so the card names it. A restart of the conversation
the server holds now works away from its place ("Return to X" leads there often).

The review's second item, a missing `/api/party` on a server older than round 021, was rejected: such a server also
lacks named starts and recruiting.

The review's "checked and fine" list covers containment files (no answer forms, re-checked by script), ambient
vocabulary, recruitment refusals and duplicates, schema migrations, party conversation counting and replays, the
Rift gate, round 028's progress order, onboarding races, the claude-cli preflight and the token check.

## Method

As in [architecture.md](architecture.md). Review and plan critique by fresh read-only subagents in place of Codex
(usage limit until 2026-11-09 17:32 UTC): review 2 findings (1 accepted, 1 rejected), critique 9 (1 Error: an app-only
guard leaks when the app does not know the server's conversation), all accepted. Offline, no LLM call. Each fix was
removed in turn (9 mutations) to see that a test fails without it.

## Results

| Check | Result |
|---|---|
| `server/test/conversation-under-way.test.js` (new) | 3/3: a party conversation under way blocks a named start (409, kept), resumes, is left by a restart start; a resolved one does not block; the default start still replaces; a restart of the held conversation works away from its place, of another one `NOT_HERE` holds |
| `server/test/encounters.test.js` | 4/4: the content-only encounter test now expects the 409 and leaves Gerald with `restart: true` |
| mobile `conversation-under-way.test.js` (new) | 5/5: the note, the disabled Talk with its accessible name, Return and Leave; the same encounter here and nothing under way show no note; the nameless wording; `leaveAndEnter` is a restart start; a 409 makes the store take the server's conversation after startup's `currentEncounter` failed |
| mobile `drill.test.js` | 5/5 (1 new): with the drill note showing, one "Return to Marginalia" only; the existing `ongoing` gains an `encounterId` |
| A fix removed → test fails | 9/9 |
| Full suites | server 330/330 (327 before), client 12/12, mobile 263/263 |
| `npx expo export --platform ios` | bundles (697 modules) |

## Decision

Keep the fixes (autonomous decisions, pending owner review).

## Evidence

`server/src/learning-service.js` (`_startEncounter`), `mobile/src/stores/gameStore.js` (`leaveAndEnter`,
`_startNamed`), `mobile/src/components/MapPanel.js`, `mobile/App.js`, the tests,
[`trail/review-1.md`](trail/review-1.md), [`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Tests only. A location conversation is still kept while the player walks away. Leaving has no confirmation dialog.
The web client's default start still replaces.

## Open items

- Owner (Simulator): start a party conversation, open the map at an open encounter: the note, "Return to …",
  "Leave … and talk to …", and VoiceOver on the disabled Talk.
- Owner: whether leaving a conversation should ask for confirmation.
