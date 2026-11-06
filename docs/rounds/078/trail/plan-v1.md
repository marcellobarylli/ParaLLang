# Round 078 plan v1: an NPC line with no target language is written again, once

## Goal

prototype.md §11 (Technical risks) lists, against "LLM ignores the target-language ratio", a "post-processing layer
that checks the ratio and rejects/retries non-conforming responses". It was never built. Live data since round 005
shows one failure kind worth a retry: a line with **no target language at all** (round 048, Marginalia's folded page,
both packs: `native` equal to `translation`, all English). The player then has nothing to translate on that turn.
Lines merely under the ratio (by 0.10–0.15 at most, rounds 067–074) are left alone: a share estimate on mixed text is
noisy (round 026 hand counts) and a retry costs a full call (~9 s).

## Rule

`lacksTargetLanguage(native, translation, vocabulary)` in `server/src/language-engine.js`:
- fold both texts as answers are folded (`normalizeAnswer`, accents stripped), split into words;
- flagged only if `native` has at least one word, **every** word of `native` occurs in `translation`, and
  `matchCanonicalVocabulary(native, narrationEntries)` finds no entry.
Words borrowed in English ("ciao", "Sam") stay safe through the vocabulary check (ciao is an entry) or need the whole
line to be English anyway.

Offline check (done before this plan, `docs/rounds/078/results/offline-scan.mjs`): over 1,208 distinct NPC lines in
every recorded live report (rounds 005–077, it and es), the rule flags exactly 2, the two round-048 lines. No false
positive.

## Design

1. `LearningService.narrate(messages, definition)` replaces the three narration `callProvider` calls (start greeting,
   prefetched greeting, turn reply). It calls the provider; if the result `lacksTargetLanguage`, it calls once more
   with the same messages plus one appended user message:
   "CORRECTION: your last reply's dialogue.native had no {Language} in it (it was the same as its translation). Write
   the reply again for the same turn, following every rule above; dialogue.native must mix {Language} and English as
   LANGUAGE RULES require." The first reply is not shown to the model (the history stays as it was).
2. The second result is used if it has target language. If it also lacks it, or the second call fails (provider error
   or invalid schema), the **first** line is used: the guard never turns a playable turn into an error.
3. Counters `narrationStats = { checked, flagged, retried, fixed, kept }` on the service (memory only), no change to
   the save, the transcript or the API shape. `play-market.js` reports include `narrationStats`.
4. The pinned golden prompts (Gerald r012) do not change: the first call's messages are byte-identical.
5. Grading calls are not touched.

## Tests (server)

- unit: `lacksTargetLanguage` — English-only flagged; mixed line not; English line with a vocabulary word (ciao) not;
  empty native not; native words ⊂ translation (translation longer) flagged; accents/apostrophes folded.
- service, with a test provider: greeting all-English → second call has the CORRECTION message appended, the started
  encounter shows the second line; still English → first line kept, `kept` counted; second call throws → first line,
  start succeeds; turn reply likewise (one test); prefetched greeting goes through the same guard; a normal line makes
  exactly one call (stats `checked` only).
- golden prompt test unchanged and passing.

## Live

The failure is rare (2 / 1,208); a live run cannot be made to trigger it on purpose without changing content. One
Gerald run (`play-market.js`, codex-cli, ~5 calls) and its `narrationStats` checks that normal lines make no extra
call. If Codex is at its limit, the offline scan is the data and the live run is queued.

## Claim boundary

Catches only lines with no target language. Does not enforce the ratio, and does not judge whether the target
language is correct.
