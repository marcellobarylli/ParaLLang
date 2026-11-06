# Round 073 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog I3, from round 067's and round 072's tour timings (greeting median 8.6 s, up to about
  15 s with codex-cli) and [round 070](../070/architecture.md) (waiting lines during a turn).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/stores/gameStore.js`, `mobile/src/components/MapPanel.js`,
  `mobile/src/components/PartyPanel.js`, `mobile/App.js`, mobile tests.

## Goal (pre-run)

Starting an encounter, from the map's "Talk to {name}" or the Party screen's "Talk to {member}", waits for one LLM
call: the NPC's greeting. During that wait the app shows the same screen with a disabled button and no text, so it
can look frozen. Show a status line, "{name} is getting ready to talk…", next to the button that was pressed.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The line sits inside the card, as a status.** VoiceOver behaviour and the duplicate announcement risk inside
   the map card's `aria-live` region go to the owner's Simulator check (critique 1.5).
2. **Leaving the Party screen during a start is allowed, as today.** The line is not shown elsewhere, and a
   successful start still opens the dialogue (critique 1.6).

## Claim boundary (pre-run)

App logic and rendering under jest. No Simulator and no server change.

## Design (pre-run)

1. **Store** (critiques 1.1, 1.2, Optional 1.7): `starting: null | { encounterId, seq }`. The store's closure
   holds `startSeq`. `_startNamed` keeps its guards: with no learner, already loading, or a null id, it returns
   without touching `starting`. Otherwise it increments `startSeq` and sets `{ isLoading: true, error: null,
   starting: { encounterId, seq } }` in one `set`. Accepted success and failure clear `starting` in the same `set`
   as `isLoading: false`. A late reply whose epoch or learner changed applies nothing. Every epoch bump that resets
   the screen (initialize, save switch, removal, `switchLearnerForTest`) also sets `starting: null` (critique 1.2),
   so a stale indicator cannot outlive its request.
2. **Names come from the cards** (Optional 1.7). MapPanel shows the line when `starting?.encounterId ===
   here.encounter.id` and uses `here.encounter.characterName`. PartyPanel shows it under the member whose
   `conversationId` matches and uses `member.name`. Each falls back to "Someone" if the name is missing.
3. **Wiring** (critique 1.4): `App.js` passes `starting={state.starting}` to MapPanel and PartyPanel.
4. **Style**: a `starting` style in each panel, using the muted colour and the italic `type.subhead` already used
   for the dialogue's waiting line. No new colour pair.

## Tests (pre-run)

`mobile/src/__tests__/starting.test.js`:
- Store: while `startEncounter` is pending, `starting` has the id. It is cleared after success and after a rejected
  start. A start with a null id (no encounter here) never sets it. A start while loading changes nothing.
- A late success and a late rejection after `switchLearnerForTest` neither set nor clear the new state's `starting`.
  This is a test-only transition (critique 1.3): `switchSave` refuses while loading, which is asserted separately.
- A newer start's indicator survives an older start's late settle (the request token).
- Panels: MapPanel shows the line only for the current location's encounter, and with the "Someone" fallback.
  PartyPanel shows it only under the matching member.
- Integration (critique 1.4): render `App` with a fake API whose `startEncounter` is pending, press "Talk to
  Gerald", and see "Gerald is getting ready to talk…". After it resolves, the dialogue shows and the line is gone.
- The theme test passes.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 ba1e36af…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Risk | The encounter id is not request ownership | 0 | Accept: a start token | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.2 | Gap | Every exit path must be explicit and atomic | 0 | Accept: set and clear with `isLoading`; clear at each epoch reset | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.3 | Error | The planned save-switch test cannot exercise the race through `switchSave` | 0 | Accept: test-only transition, named as such; assert `switchSave` refusal separately | **Accepted** (autonomous, pending owner review) | Tests |
| 1.4 | Gap | App wiring missing; panel tests alone could pass | + | Accept: props from App.js and an App-level test | **Accepted** (autonomous, pending owner review) | Design 3, Tests |
| 1.5 | Risk | `role="status"` inside an `aria-live` card needs VoiceOver checks | 0 | In part: keep it; Simulator check for the owner | **Accepted in part** (autonomous, pending owner review) | Decision 1 |
| 1.6 | Gap | Tests omit boundaries (rejection, missing names, null id, name from the requested id, leaving Party) | 0 | Accept, except navigation-away (kept as today, decision 2) | **Accepted in part** (autonomous, pending owner review) | Tests, Decision 2 |
| 1.7 | Risk (Optional) | Storing the name duplicates state | + | Accept: store id and token only | **Accepted** (autonomous, pending owner review) | Design 1, 2 |

Net change: a start token, atomic set and clear, names from the cards, App wiring and an integration test.
