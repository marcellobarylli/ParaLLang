# Round 066 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** prototype.md Phase 4, "Playtesting: 3–5 external testers, iterate on pacing and difficulty"
  (the only Phase 4 task left; it needs the owner and testers), and three README passages that still described the
  Phase 2 game (found while preparing it).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `docs/playtest/guide.md`, `README.md`.

## Goal (pre-run)

Give the owner a playtest kit they can run without reading the code: where testers play, setup, a per-tester
checklist, a 45-minute session plan by encounter, a recording table, questions, and how to turn 3–5 sessions into
tuning. Bring the README's description of the game, the language switch and `play-market.js` up to date. Docs only;
no code, no live calls.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **No round of rule-explaining for testers.** The guide tells the observer not to explain the rules (the
   onboarding statement and Portia's tutorial should). The critique's "tell them English-only answers fail" is
   rejected for this reason: whether they discover it is part of what is tested.
2. **Tuning order:** the NPC's numbers (`base_target_ratio`, the encounter's per-turn increase) before content.

## Design (pre-run)

The guide as revised after critique 1: every tester at the owner's Mac (CLI providers bind 127.0.0.1); Simulator
voices, accents, the token; per tester: `check:provider`, the language switch with `r`, a new save, its creation time
to match the file, copy before remove; the session table; the Rift drill when the cards are due; hand counts
(sends, word and sentence reveals, stalls) in a table; questions, with the "again tomorrow" one asked the next day;
tuning by `base_target_ratio` (`content/characters/`) or `escalation.target_ratio_increase_per_turn` (each pack's
encounter file, both packs).

## Live (pre-run)

None.

## Success (pre-run)

Every concrete label, path and field in the guide matches the code (checked by the critique and by grep); the
round-log check passes; tests untouched and passing.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 2ffe6202…; a Claude general-purpose subagent standing in for Codex
(Codex at its usage limit until 01:36 UTC), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | `escalation_rate` does not exist | 0 | Accept: the real field, per pack | **Accepted** (autonomous, pending owner review) | Design, guide §1 and §After |
| 1.2 | Error | The hint counter is one shared budget | 0 | Accept: count by hand | **Accepted** (autonomous, pending owner review) | Recording table |
| 1.3 | Error | No turn count on screen; transcripts in memory | 0 | Accept: count sends | **Accepted** (autonomous, pending owner review) | Recording table |
| 1.4 | Error | Wrong reason for removing saves; button location; STATE path | 0 | Accept | **Accepted** (autonomous, pending owner review) | Before each tester 3 |
| 1.5 | Risk | Remove deletes the server file | + | Accept: copy before remove | **Accepted** (autonomous, pending owner review) | Before each tester 3, Recording |
| 1.6 | Risk | Files named by learner id | 0 | Accept: note the creation time | **Accepted** (autonomous, pending owner review) | Before each tester 4 |
| 1.7 | Gap | Testers must sit at the Mac | + | Accept | **Accepted** (autonomous, pending owner review) | Where testers play |
| 1.8 | Gap | Voices, accents, token setup | 0 | Accept | **Accepted** (autonomous, pending owner review) | Setup |
| 1.9 | Gap | Provider and quota per session | 0 | Accept: check per tester, stop on a limit | **Accepted** (autonomous, pending owner review) | Before each tester 1 |
| 1.10 | Gap | The Rift drill may not appear | 0 | Accept, corrected: new cards are due on discovery, so it usually appears unless reviewed | **Accepted** (autonomous, pending owner review) | Session, the Rift |
| 1.11 | Gap | Language switch between testers | 0 | Accept | **Accepted** (autonomous, pending owner review) | Before each tester 2 |

**Optional** taken: README line 29; the consent line and a recording table; the "again" question asked the next day.
**Deferred / rejected:** listing `--tier`/`--recruit` in the README (the script header documents them); telling
testers that English-only answers fail (Decision 1).

Net change: where testers play, a per-tester checklist, hand counts in a table, the real escalation field.
