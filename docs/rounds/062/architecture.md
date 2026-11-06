# Round 062 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog C10b (new), a follow-up to [round 061](../061/architecture.md) (the owner's note: "it is
  very important that everything is spoken by a quirky narrator").
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/components/NarratorButton.js`, `MapPanel.js`, `DialoguePanel.js`, tests.

## Goal (pre-run)

The other English narrator texts can be heard too: the map card (place name, description, and the atmosphere line
when shown) and the companion briefing. App-only, no live calls; the frozen web client is unchanged.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Reads what is shown when pressed** (critique 1.4): an atmosphere line that arrives later is not read until the
   next press; nothing re-speaks by itself.
2. **Known limit** (critique 1.3): words in capitals or in the target language inside descriptions (MERCATO, PLEASE DO
   NOT HUM) are read by the English voice as it pleases. Simulator open item.
3. **The briefing button is "Hear the briefing"** (critique 1.6): the narrator voice reads the companion's lines, it
   does not pretend to be the companion.

## Design (pre-run)

1. **`NarratorButton({ text, label })`** in `mobile/src/components/NarratorButton.js`: `PronounceButton` with
   `NARRATOR`, `hideWhenUnavailable`, the label; nothing for blank text. `Narration` in `DialoguePanel` uses it with
   `label="Hear the narrator"` (critique 1.7: unchanged name).
2. **`speechText(parts)`** (same file): trims each part, drops blanks, adds a full stop to a part that does not end
   in `.`, `!`, `?`, `…` or a closing quote, and joins with a space (critique 1.6, Optional trim).
3. **Map card:** a `NarratorButton` labelled "Hear the place" in a row with the title, reading
   `speechText([name, description, atmosphere line if shown for this place])` (Optional: the name first).
   `MapPanel` calls `useEffect(() => () => { stopSpeech(); }, [currentLocationId])` next to its `useState`, above the
   `!world` early return (critiques 1.1, 1.2), so a move or leaving the map stops the voice and restores the ambience.
4. **Companion card:** a `NarratorButton` labelled "Hear the briefing" beside "Your companion", reading
   `speechText(briefing)`.

## Tests (pre-run)

- `speechText`: trim, blanks dropped, full stop added, existing punctuation kept.
- Map: "Hear the place" reads name + description (one call); with the atmosphere line it reads all three; pressed
  before the line arrives and again after, two different texts (critique 1.4); no English voice, no button.
- Map: a move (rerender with another current location) calls `Speech.stop`; `world=null` then a world then unmount
  works; speaking then moving leaves the new ambience player at full volume (critiques 1.1, 1.2, 1.5).
- Companion: "Hear the briefing" reads the exact joined string; distinct from "Hear the narrator" (critique 1.7).
- Existing map suites and `narrator.test.js` unchanged; full suites; expo-doctor; iOS export.

## Live (pre-run)

None.

## Success (pre-run)

All tests pass; expo-doctor 20/20; iOS export builds.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 c09993ba…; a Claude general-purpose subagent standing in for Codex (Codex
at its usage limit until 01:36 UTC), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Gap | A move does not stop the old description | + | Accept: stop on location change | **Accepted** (autonomous, pending owner review) | Design 3, Tests |
| 1.2 | Risk | Hook below the early return | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design 3, Tests |
| 1.3 | Risk | MERCATO read in English | 0 | Accept: known limit, open item | **Accepted** (autonomous, pending owner review) | Owner decision 2 |
| 1.4 | Gap | A late atmosphere line is not read | 0 | Accept: read at press time, tested | **Accepted** (autonomous, pending owner review) | Owner decision 1, Tests |
| 1.5 | Risk | Ambience after a move | 0 | Accept: test | **Accepted** (autonomous, pending owner review) | Tests |
| 1.6 | Gap | Briefing join and voice | 0 | Accept: `speechText`, "Hear the briefing" | **Accepted** (autonomous, pending owner review) | Owner decision 3, Design 2 |
| 1.7 | Gap | Existing suites and labels | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design 1, Tests |

**Deferred** (Optional): stopping speech when the Review or Spellbook view goes (backlog line C10c). Taken: name read
first, trimmed parts.

Net change: stop on a move, hook placement, read-at-press, `speechText` join, distinct labels.
