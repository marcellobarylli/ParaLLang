# Round 014 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present and not through the round pipeline. Sections marked *pre-run* must not be
edited after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section,
added later. The full record (drafts, raw critiques, timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** [`prototype.md`](../../../prototype.md) §8.2 node 6 (The Rift, "gated on the other
  encounters"); backlog A7 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md), split here into the gate (this
  round) and the boss (A7b); rounds [005](../005/architecture.md) (map, world API, save v2) and
  [006](../006/architecture.md) (encounters as content).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `server/src/world.js`, `server/src/content-loader.js`, `content/world/locations/the_rift.yaml`,
  `mobile/src/components/MapPanel.js`, `server/scripts/play-market.js` (`--tour`), tests.

## Goal (pre-run)

The Rift cannot be entered until the player has completed the other five encounters (Portia, Gerald, Mortimer,
Flick, Marginalia). The app's map shows it as sealed, with progress, and the server refuses a move into it. The five
encounters play as before, the prompts are byte-identical (Gerald's golden prompts unchanged) and the frozen web
client (which has no map) is unchanged. A live tour of the whole market shows the gate holding and opening.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Split A7:** the gate and a live full-market tour now; the Rift boss next (A7b). The Rift holds no encounter in
   this round.
2. **Content field `requires_completed: [encounter ids]`** on a location (optional, default `[]`). `the_rift.yaml`
   lists the five ids explicitly, rather than a keyword "all other encounters", so a later encounter (party, lore
   fragments) does not silently tighten the gate. The loader checks per pack: each id is an encounter of the pack,
   none twice, not the location's own encounter.
3. **Snapshot:** every visible gated location, including a `known` one seen through the fog, carries
   `gate: { sealed, required, completed }`; open locations have no `gate` key. Completed ids only grow, so the Rift
   stays open once open.
4. **Move:** adjacency first (`NOT_ADJACENT`), then the gate: 409 `SEALED`, "The Rift is sealed. Finish the other
   encounters first (4 of 5 done)." A move to the current location stays a no-op, so a save from rounds 005–013 that
   stands in the Rift is not thrown out (it holds nothing yet; A7b's encounter start must check the gate too).
5. **App:** a sealed node has a lock mark, its own dot style and the caption "Sealed 4/5"; its accessible label is
   "The Rift, sealed: 4 of 5 encounters complete" and it is disabled even when adjacent. The store is unchanged (a
   409 already shows in the error banner).
6. **Live tour:** `play-market.js --tour` plays the five encounters in route order with their scripted lines, tries
   the Rift at the Old Bookshop before Marginalia (expect `SEALED`) and after her (expect success), and returns the
   existing per-encounter reports plus the two gate results. Exit code 0 only if all five resolved and the gate
   behaved. One Italian tour (critique 1.3).
7. **Second opinion:** see the table.

## Claim boundary (pre-run)

The round can claim the gate holds in-process and over HTTP (127.0.0.1, token), the map data, the sealed node under
jest, and the live Italian tour as reported. It cannot claim how the sealed node looks or reads on an iPhone (no
Simulator), the Spanish tour (not run live; covered by the loader tests), or learning quality.

## Deferred (pre-run)

The Rift boss and its vocabulary review (A7b), a companion line about the seal, infohazard flavour (B3),
the pre-boss Spellbook drill (C1), Simulator checks.

## Design (pre-run)

- `server/src/world.js`: `gateFor(location, progress)` → `null` or `{ sealed, required, completed }`; used by
  `worldSnapshot` (adds `gate`) and `applyMove` (throws `SEALED` after the adjacency check).
- `server/src/content-loader.js`: `requires_completed` in the location schema (default `[]`) and the three load
  checks.
- `content/world/locations/the_rift.yaml`: the five encounter ids.
- `mobile/src/components/MapPanel.js`: the sealed node.
- `server/scripts/play-market.js`: `--tour` and an exported `tourOrder`; the encounter loop becomes `playAt()`,
  shared with single-location runs, whose report shape is unchanged.
- `server/test/encounters.test.js`: the fixture content swaps the Butcher's id in the Rift's list too.

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 c3390969…; Codex, effort high, code inlined on stdin;
raw text in [`trail/critique-1.md`](trail/critique-1.md). Dispositions are autonomous decisions by Claude, pending
owner review.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The tour needs ~45 calls (20 lines × 2 + 5 starts), not ~30 | − | Accept: no estimate; measure | **Accepted** (autonomous, pending owner review) | Decision 6, findings |
| 1.2 | Gap | Tests would not catch a gate checking only Marginalia | + | Accept: leave out each of the five in turn | **Accepted** (autonomous, pending owner review) | Tests |
| 1.3 | Cut | A Spanish tour repeats the same language-blind gate | − | Accept: one Italian tour; both packs' lists checked in tests | **Accepted** (autonomous, pending owner review) | Decision 6, Claim boundary |
| 1.4 | Cut | expo-doctor and the web build do not test this change | − | Reject: the run brief requires every suite before a non-wip commit | **Rejected** (autonomous, pending owner review) | Tests |
| 1.5 | Cut | Verdict counts and an assessment audit go beyond the gate | − | Accept: reuse the per-encounter reports; findings still list the verdicts from them | **Accepted** (autonomous, pending owner review) | Decision 6 |

Net change from plan v1: −1 live tour, −the call estimate, −verdict aggregation in the script, +1 table-driven test.

## Tests (pre-run)

1. `node --test server/test/*.test.js`: new `server/test/rift-gate.test.js` (both packs list the five; `gateFor`;
   loader rejects an unknown, repeated or own encounter; over HTTP the fog hides the Rift at the start, adjacency
   comes first, 4 of 5 shows `gate` and refuses with `SEALED` and the exact message without writing, 5 of 5 opens;
   leaving out each of the five keeps it sealed; standing in the Rift from an old save is a no-op, walking back in is
   refused). `play-market.test.js`: the tour covers every encounter once and ends next to the Rift. Gerald's golden
   prompt test unchanged.
2. `npm run test:mobile` (new `map-gate.test.js`: sealed node disabled with label and caption; open node walkable),
   `npx expo-doctor` (known D4 dependency check only), `npx expo export --platform ios`, web client tests and build.
3. Live, codex-cli: `play-market.js --tour` in Italian. Findings: per encounter resolved and the verdict on each
   line, the two Rift attempts, calls and time, language shares, menus, dictation and feedback leaks.
