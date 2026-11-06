# Round 086 findings

## Question

Rounds 081–085 were built while Codex was at its usage limit, each with only a plan critique. Does an independent
review of their code find bugs, and can they be closed offline?

## Finding

**No Errors, three smaller gaps, all closed.** A read-only review of `git diff e7c93a1 030f35a` (code only) found:

1. **A move's Spellbook skipped round 084's encounter guard.** After a server restart mid-encounter, a move would
   have put a Spellbook with every meaning into the app while it still held the encounter. The move now applies the
   world always and the Spellbook (and its snapshot) only under the same guard as the refresh (`leaksMeanings`).
2. **Footnotes kept unlisted inflections of answers.** The round 081 filter dropped a footnote only for listed pack
   forms, so it *buoni* (for *buono*) or es *quieres* (for *quiero*) would have been shown under the narration
   during the encounter. The plan's first fix, a 4-letter stem, was measured and rejected: over 47,361 English tokens
   of live narration it dropped words such as *translation*, *children* and *quiet*. The rule taken drops a word that
   starts with a single-word form of an open objective's target minus its last letter and is 0–2 letters longer:
   it caught every synthetic inflection (555/555 it, 522/522 es) with fewer English collisions (2.9 and 6.9 tokens
   per encounter over the whole corpus, against 13.4 and 16.3).
3. **The foreground refresh needed a direct `background` → `active`.** It now remembers `background` until the next
   `active`, also when `inactive` comes between, and an app mounted in the background refreshes on its first
   `active`.

## Method

As in [architecture.md](architecture.md). Review and plan critique by fresh read-only subagents in place of Codex
(usage limit until 2026-11-09 17:32 UTC): review 3 findings (all checked by hand), critique 7 (5 accepted, 1 in part
by measurement, 1 rejected), three Optionals taken. The stem rules were compared with
[`results/rule.mjs`](results/rule.mjs) (output [`results/rule.txt`](results/rule.txt)): English words are every
3+-letter token of the `narrative`, `translation` and `footnote` fields of every JSON report under
`docs/rounds/*/results`; synthetic inflections are each single-word target of 4+ letters with its final vowel
swapped (a, o, i, e) or -s, -es, -as, -os, when not itself a form. Offline, no LLM call. Each change was removed in
turn to see that a test fails without it.

## Results

| Check | Result |
|---|---|
| Stem rules ([`results/rule.txt`](results/rule.txt)) | 4-letter prefix: it 13.4 English tokens per encounter (worst 77), 506/555 inflections; es 16.3 (77), 446/522. 5-letter: it 0.3, 411/555; es 6.6, 323/522. Inflection rule: it 2.9 (14), 555/555; es 6.9 (21), 522/522 |
| `server/test/footnotes.test.js` | 11/11 (3 new): greeting footnotes with it *vorresti*, *espressi*, es *quieres* dropped, an English footnote (quietly, translation, grammar, cafeteria) kept in both packs; after its objective passes, es *quieres* is kept; direct calls for Gerald's coffee break (it *buoni*, es *buenos*) and the Rift (an inflection of one of its own targets) dropped, English kept, no open objectives keeps all |
| `mobile/src/__tests__/spellbook-refresh.test.js` | 15/15 (2 new): a move during an encounter the server forgot keeps the Spellbook and snapshot and applies the world, with `inEncounter: true` applies both; background → inactive → active refreshes once, mounted in background the first active refreshes |
| A change removed → test fails | inflection check (2 tests), open objectives on a turn (1), move guard (1), the flag reset by inactive (1), the flag's start from `currentState` (1) |
| Full suites | server 304/304, client 12/12, mobile 242/242 (240 before) |
| `npx expo export --platform ios` | bundles (697 modules) |

## Decision

Keep the three fixes (autonomous decisions, pending owner review). The review also listed what it checked and found
fine (inscriptions never shown for unvisited places, old saves, replays, epoch checks on moves, refresh ordering,
the footnote schema under OpenAI strict mode): see [`trail/review-1.md`](trail/review-1.md).

## Evidence

`server/src/learning-service.js` (`inflectsAnswer`, `keptFootnote`, `canonicalizeNarration`),
`mobile/src/stores/gameStore.js` (`leaksMeanings`, `moveTo`), `mobile/App.js`, the tests,
[`results/`](results/), [`trail/review-1.md`](trail/review-1.md), [`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Tests and an offline corpus measure only. Footnotes are not measured live (Codex limited; round 081 saw none in 21
lines), so the English-drop rate is from narration, not from real footnotes. The rule covers only the open
objectives' single-word answers of 4+ letters: other encounters' words and words outside the pack still pass. The
iOS `AppState` sequence is not observed.

## Open items

- Queued live (after 2026-11-09 17:32 UTC): with round 081's firmer footnote rule, count footnotes dropped by the
  inflection rule and read them.
- Owner (Simulator): background and foreground the app via the app switcher and via Notification Centre; the header
  badge updates after a card fell due.
