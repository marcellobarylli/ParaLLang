# Round 044 plan v1: a leak scan that also catches words inside authored phrases (backlog G2)

Round 023 found a near-leak its checks missed: in Spanish, Mortimer asked "¿Quieres más?" before the player had asked
for *un poco más*. Leak checks so far (round 026 `replay-leaks.mjs`, round 022 `summarize.py`, round 020
`compare.py`) match only a whole authored form of an open objective's target. This round builds one reusable scanner
and runs it over the live reports already in the repo (89 JSON files, rounds 003–026): data from existing runs, no
new LLM calls (Codex at its usage limit).

## Decisions (autonomous, pending owner review)

1. **Two kinds of hit**, both reported, neither failing anything:
   - **exact**: a line holds a whole surface form of a target of an objective still open at that line;
   - **word**: a line holds a content word from inside a multi-word form of an open target ("más" from
     "un poco más"), but not the whole form. Content word: folded (lowercase, accents stripped), 3+ letters, not in
     a short per-language function-word list (articles, prepositions, conjunctions, clitics).
2. **Open at a line**: an objective is closed at line k once any grading before line k passed it (grading j
   follows the player's answer that line j+1 replies to). The greeting (line 0) has every objective open.
3. **Scanned against today's content.** Reports from earlier rounds are read against the current packs; scenes whose
   encounter no longer exists are skipped and counted. This measures the instrument and the historical rate, not
   any one round's prompt.
4. A word hit is a flag for reading, not a verdict: modelling a common word ("más", "poco") can be natural speech.
   The decision on what to do about them (a prompt rule, content changes, or accept) is made from the data.

## Design

1. `server/scripts/leak-scan.js` (ES module, exported functions plus a CLI):
   - `scenesOf(report)`: every object with `encounterId`, `lines` and `grading` arrays, found anywhere in a report
     (single runs, tours, party runs).
   - `openObjectives(definition, gradings, k)`; `scanLine(native, forms, language)` → `{ exact, words }`.
   - `scanReport(report, content)` → per scene: lines, exact-hit lines, word-only-hit lines, each hit with turn,
     objective, form or word, and the line.
   - CLI: `node server/scripts/leak-scan.js <report.json ...> [--json out]`; prints a table per language and the
     word-only lines.
2. Content per report language (`loadGameContent({ language })`), cached.

## Tests

- `server/test/leak-scan.test.js`: "¿Quieres más?" against an open *un poco más* → word hit "mas", no exact; "un
  poco più" exact, not double-counted as words; function words never hit ("de", "la"); a closed objective never
  hits (grading passed before the line); the greeting has every objective open; accents and punctuation folded;
  word boundaries ("mascota" does not hit "mas"); `scenesOf` finds the scenes of a tour, a party run and a single
  run (fixture shapes taken from real reports); an unknown encounter is skipped and counted.
- Run over all 89 reports; record counts and every word-only line in findings.
