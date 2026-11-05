# Review 1: rounds 052–053 code diff (58cf236..HEAD)

- **Dispatched:** journal row 10
- **Returned:** before the row recording it (notification)
- **Model:** a fresh Claude general-purpose subagent (claude-opus-5-5, effort unknown), read-only instructions
- **Prompt:** read-only correctness review of `git diff 58cf236..HEAD -- server mobile prompts` (matcher rework, getAtmosphere, providerCallsInFlight, followAtmosphere, MapPanel line); findings with file:line, failing input and fix; under 500 words
- **Findings:** 2 (no serious bugs)

## Raw output (verbatim)

```text
I found no serious correctness bugs in either round. One behaviour gap and one minor robustness issue are listed below. All 213 server tests pass (`node --test server/test/*.test.js`), as do the 4 tests in `npx jest atmosphere`.

**Matcher (round 052, `server/src/language-engine.js:49-86`)**
- **Old vs new:** I ran 200,000 random inputs through both versions, using the old one from `58cf236`. The characters included è é È ì ñ Ñ á, 😀, ß, İ, ﬁ, a bare U+0301, `_` and digits. There were 0 differences in which words matched, and 0 differences in offsets wherever folding keeps the string length.
- **Specific cases:**
  - A combining mark at the start (`"́due"`) gives 1–4. The mark becomes its own cluster with nothing left after folding, so it adds no entries to the index map.
  - Emoji (`"DUE😀 due"`): the surrogate pair is one cluster that keeps both units, so the offsets are 0–3 and 6–9.
  - Decomposed text (`"caffè"`) gives 0–6 and the excerpt includes the mark.
  - `"İ due"` gives 2–5.
  - An empty string gives `[]`.
- **Edge cases:**
  - A zero-length match would read `endOf[index-1]`, but `content-loader.js:23` rejects empty forms, so it can't happen.
  - Folding letter by letter differs from folding the whole string only for the Greek final sigma, which doesn't matter for the Italian and Spanish packs.

**`getAtmosphere` / `callProvider` (round 053, `server/src/learning-service.js`)**
- **In-flight counter:** `callProvider` increments before the `try`, and a provider that throws synchronously still throws inside the `await`, so `finally` always decrements. The counter can't drift.
- **Call map:** `.finally()` always removes the key from the map, so a rejected promise is never left in it.
- **Failure cache:** failures expire after `ATMOSPHERE_RETRY_MS`, and a success clears them. Nothing is cached forever.
- **Minor, line 706:** if `buildAtmosphereMessages` or `loadTemplate` throws (for example a missing template or bad style guide), `writeAtmosphere` rejects. That error then reaches the client as a 500 and is not cached, so every map visit tries again. Content validation makes this unlikely, and the app swallows the error. Fix: wrap the body of `writeAtmosphere` in a `try` and have it return `null` with a `'build'` drop.
- **Behaviour gap, line 681:** the `'busy'` drop is not cached, but the app asks only when its state key changes. Sequence: an encounter or grading call is in flight (another tab or client, or a drill) → the app asks → `null` → the app never asks again for that state, so no line appears until the location, completion or party changes. With the serial single-player flow this is rare. Fix: return a `retry` hint and have the app re-ask once after a delay, or wait for the in-flight call instead of dropping.

**Store (`mobile/src/stores/gameStore.js:411-432`)**
- **No loop:** `setState({ atmosphere: null })` inside the subscriber runs the listener again with the same key, so it returns at once. A reply's `setState` doesn't change the key either.
- **No call on every change:** each state change only builds a `JSON.stringify` key, and the API is called only when that key changes.
- **No stale line:** an old line is cleared as soon as the key changes, late replies are checked against the current key, and `MapPanel` also checks `locationId`. The party key uses `characterId`, which `partySnapshot` provides (`learning-service.js:731`).
- **Errors and old fakes:** errors are swallowed, so `error` and `isLoading` are untouched, and a fake API without `getAtmosphere` is skipped.

**Existing behaviour:** the feature is off by default (`PARALLANG_ATMOSPHERE=on` turns it on), and the matcher's results are unchanged for NFC input.
```
