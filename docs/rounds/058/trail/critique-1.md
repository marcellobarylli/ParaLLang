# Codex critique 1: no two vocabulary entries share a folded form (a Claude subagent stood in for Codex)

- **Dispatched:** journal row 3
- **Returned:** 23:55:21 (notification; the subagent ran 73 s)
- **Model:** a fresh Claude general-purpose subagent (claude-opus-5-5), repo read access, read-only instructions. Codex was at its usage limit (reset 01:36 UTC 2026-11-06)
- **Prompt:** adversarial review of `plan-v1.md` against `language-engine.js`, `content-loader.js`, `party-conversation.test.js` and the vocabulary YAMLs; numbered Error/Risk/Gap items, then Optional
- **Reviewed input:** `plan-v1.md`, sha256 90149fb4…, HEAD d0fa912, working tree docs/rounds/058/ only
- **Findings:** 6

## Raw output (verbatim)

```text
1. **Gap — Existing test already covers part of this, and the plan does not mention it**
`server/test/party-conversation.test.js:226-248` already fails on equal or whole-word-contained folded forms. It only checks the 28 party entries against every other entry, and it uses its own fold (`:203`, which drops punctuation except `'`). The ambient check uses a third fold, `normalizeAnswer(..., {stripAccents})` at `content-loader.js:328`, which also strips `'`. Fix: say what the new test adds (every entry against every entry, using the matcher's fold), and either drop the equality half of the party test or note on purpose that the three folds differ.

2. **Error — "Share a folded form" is the wrong invariant; the real risk is containment, which longest-first handles only per entry**
`language-engine.js:75-79` sorts entries by their longest variant, then each entry tries all of its variants (`:83`). So an entry with one long variant also claims spans with its short ones. Today `buono` (longest `buonissimo`, 10 characters; `gerald_break.yaml:24`) sorts just after `buongiorno` (`buon giorno`, 11) by one character. A synthetic `buono` with a 12-character variant takes `buon giorno` and returns `["buono"]` (I checked with node). All 23 containment pairs in the packs (`caffè`/`caffè nero`, `sono`/`sono le`, `cafe`/`cafe solo`, `buen`/`buen día`, ...) resolve correctly today, but by luck of lengths. Fix: a behavioural test instead of a fold comparison. For each pack, each entry and each variant `v`, `matchCanonicalVocabulary(v, entries)` must return exactly one match, of that entry, covering `[0, v.length)`. That catches both equal-fold collisions (one entry always loses) and containment stealing. It passes today (0 failures in it and es), and it needs no export or refactor. Optionally fix the matcher to sort (entry, variant) pairs by folded variant length.

3. **Error — "Matched arbitrarily (sort order)" is inaccurate**
`Array.prototype.sort` is stable, so a tie goes to the entry that comes first in load order. The result is deterministic, not arbitrary. The later entry never gets a chip. Fix the wording.

4. **Risk — `foldForm` must not trim, and only covers one of the matcher's two folds**
The text is folded cluster by cluster (`:67-68`), the variants as whole strings (`:85`). If `foldForm` collapses or trims whitespace and is later used at `:68`, a single space cluster becomes `''`. That breaks the offsets (`startOf`/`endOf`) and the word boundaries. Whole-string versus per-cluster `toLowerCase` also differs for context-sensitive casing (Greek final sigma). `İ` is safe here because NFD runs before the marks are stripped and before lowercasing. Collapsing whitespace in variants is a no-op today, since `:86` turns whitespace into `\s+` anyway. Fix: `foldForm` = NFD, strip marks, lowercase, apostrophes, with no whitespace step. Normalise whitespace only in the test's comparison key. Or skip the export entirely (see item 2).

5. **Gap — Punctuation and whitespace edge cases go unspecified**
The schema (`content-loader.js:23`) allows leading or trailing spaces and punctuation (`che ora è?`). The matcher treats punctuation literally, and the text is never stripped of it. No variant in either pack has such characters today (I checked). Fix: add a loader check or test assertion that variants are trimmed and contain no runs of whitespace.

6. **Gap — The fixture test is not specified**
The check lives in a test, so a fixture with `año`/`ano` can only fail it if the check is a callable helper. Fix: write the check as a function and unit-test it with the fixture. Or put it in `loadGameContent`, next to `validateAmbientVocabulary`, so content authors get the error at startup and the fixture can go through the existing temp-dir pattern (`party-conversation.test.js:195-198`).

## Optional
- Crossing overlaps (neither form inside the other): in `Che ore sono le tre`, `che_ore_sono` wins and `sono_le` gets no chip. That is probably right, but the plan should say crossing overlaps are out of scope.
- The entry sort uses raw `.length` (`:76`), not folded length. NFD-authored variants would count as longer. Sort by folded length.
```
