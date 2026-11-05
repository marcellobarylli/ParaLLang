# Round 036 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** round [033](../033/findings.md) open item 2 and its critique 1.6 (seven fragments, flat, no
  source).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `server/src/learning-service.js` (`toldBy`), `mobile/src/components/Spellbook.js`
  (`fragmentSource`), tests. No prompt change.

## Goal (pre-run)

Each fragment in the Spellbook says where it came from: "Told by Marginalia" or "Found at The Old Bookshop".

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **A source line, not grouping.** With seven fragments the source line is enough to tell them apart, so the list
   keeps file order.
2. **The source line is shown during encounters too.** It is English, but it names a character or a place, not an
   answer.
3. **Critique by a Claude subagent** (Codex at its usage limit until about 20:35 UTC).

## Design (pre-run)

1. **Server.** A conversation fragment carries `toldBy`, the character's display name. It comes from the location
   encounter's character, the same name `partySnapshot` shows (critique 1.2). A completion fragment has no `toldBy`.
2. **App.** `fragmentSource(fragment)` returns "Told by X" when `toldBy` is set, and "Found at Y" for a completion
   fragment with a `locationName`. In two cases it returns nothing: a fragment with neither field, and an older
   server's conversation fragment, which has `unlockedAt` but no `toldBy` (critique 1.1). The line appears under the
   title (`type.footnote`, accent, weight 600). The card's label becomes "Fragment: <title>, told by X" or
   "…, found at Y".

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 eb9ffcb7…; Claude subagent (general-purpose, claude-opus-5-5),
read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Risk | An older server's conversation fragment would read "Found at" its member's home | + | Accept: no line when `unlockedAt` without `toldBy`; tested | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.2 | Suggestion | Redundant lookup; use the same name as the Party list | + | Accept | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.3 | Risk | `toldBy` coverage: Gerald, Mortimer, hidden case | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.4 | Check | Names come from the character files | 0 | Noted | **Noted** (autonomous, pending owner review) | — |
| 1.5 | Check | No label regression | 0 | Noted | **Noted** (autonomous, pending owner review) | — |
| 1.6 | Check | Theme test passes for the new style | 0 | Noted | **Noted** (autonomous, pending owner review) | — |
| 1.7 | Check | The web client does not read fragments | 0 | Noted | **Noted** (autonomous, pending owner review) | — |

**Deferred / optional:** the source line partly repeats the `found` text (accepted as is); no
`accessibilityLanguage` on the English line (as built).

Net change from plan-v1: the old-server case, a single lookup, `toldBy` pinned in three more places.

## Tests (pre-run)

- Server:
  - the three members at 3 give `toldBy` Mortimer, Flick and Marginalia;
  - Gerald's third break gives `Gerald`, and it is kept while hidden during the fourth;
  - Mortimer's three tastings give `Mortimer`;
  - the exact completion-fragment object is unchanged (no `toldBy`).
- Mobile: both lines and both labels are shown; there is no line for a fragment without a source or for an older
  server's conversation fragment.
- All suites.

## Outcome (2026-11-05)

Built as designed, with no Amendments. Server 157/157, mobile 79/79, web client 12/12, expo-doctor 20/20. See
[findings](findings.md).
