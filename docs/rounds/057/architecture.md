# Round 057 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog C7 (new), from the owner's note `parallang_obsidian/GAME MECHANICS.md` ("The backbone
  of simpler, more crucial stuff is colour coded").
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `spans` on narration words (`server/src/learning-service.js`), `segmentLine` (`mobile/src/wordClass.js`),
  `wordClassStyle(...).mark` (`ui.js`), `BilingualText.js`, tests.

## Goal (pre-run)

Inside an NPC line, the words that have chips under it are marked where the server matched them. Each mark is
coloured by word class (round 056) and underlined, so the player sees which word of the sentence each chip is.
No live LLM calls. The frozen web client is unchanged.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The server says where; the app does not search** (critiques 1.1, 1.2, 1.3, 1.8). Each narration word
   carries `spans`, every `[start, end]` the matcher gave that id, so repeated words are all marked (critique
   1.6). These are UTF-16 offsets into `dialogue.native`. Lines saved before this round have no `spans` and are
   shown unmarked, the same as today. The app has no regex, so Hermes support is no question.
2. **Uncoloured classes get an ink underline** (critique 1.6, in part). Telling one ink-underlined span from
   another goes by the chip order, which follows the line order. This is a stated limit and an owner question.

## Design (pre-run)

1. **Server.** `canonicalizeNarration` groups the matches by id (the first match still sets the word order and
   `target`) and stores `spans: [[start, end], …]` on each word. `serializeEncounter` passes `spans` through when
   present. Words never reach a prompt, so the golden prompts are unchanged.
2. **`segmentLine(native, words)`.** It returns `[{ text, word | null }]`, which concatenates to `native`. It
   keeps only well-formed spans: integers with `0 ≤ start < end ≤ native.length`, sorted and not overlapping
   (overlaps are dropped). Anything malformed or missing gives the plain line as one segment.
3. **Rendering.** The line stays one `<Text>`, so VoiceOver reads one element and wrapping is unchanged. Marks are
   nested `<Text>` with `wordClassStyle(cls).mark`: `color`, `textDecorationLine: 'underline'`,
   `textDecorationColor` and `textDecorationStyle` (`dashed` for verbs, critique 1.5). Uncoloured classes get ink.
   The style is computed in `ui.js`, so the theme rules hold (critique 1.7).

## Tests (pre-run)

- Server: "Un caffè nero? Sì, caffè nero, non un caffè." on the real it pack gives `caffè nero` with two spans and
  `caffè` with one, at 38, never inside the phrase (critique 1.1). An NFD line and a typographic apostrophe give
  spans whose slices are the excerpts. The serialized encounter carries `spans`.
- Contract (critique 1.4): the real matcher output through `segmentLine` concatenates back to the line, and every
  marked segment is one of the server's slices. Sentence-initial capitals and inflected excerpts are covered.
- `segmentLine`: no spans means one segment; malformed, overlapping or out-of-range spans are dropped; repeated
  spans are all marked.
- Render (critique 1.9): queries go `within` the line. The noun mark has the noun colour and an underline, the verb
  mark is dashed, the adverb's underline is ink, and a line with no spans has no nested spans.

## Live (pre-run)

None.

## Success (pre-run)

All mobile, server and client tests pass, expo-doctor reports 20/20, and the iOS export builds.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`; a Claude general-purpose subagent standing in for Codex (Codex at its usage
limit), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A cursor search can mark an occurrence the server rejected (`caffè` inside `caffè nero`) | + | Accept: the server sends spans | **Accepted** (autonomous, pending owner review) | Decision 1, Design 1 |
| 1.2 | Error | The boundary check splits decomposed accents | 0 | Accept: no search in the app at all | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.3 | Risk | `\p{}` on Hermes | 0 | Accept: no regex in the app | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.4 | Gap | Fixtures never use a real excerpt; no contract test | + | Accept: a contract test with the real matcher | **Accepted** (autonomous, pending owner review) | Tests |
| 1.5 | Risk | Verbs told apart by hue only in the line | 0 | Accept: dashed underline from `wordClassStyle` | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.6 | Risk | Ink underlines are ambiguous; first occurrence only | 0 | In part: all spans marked; ink stays, stated as a limit | **Accepted in part** (autonomous, pending owner review) | Decision 2 |
| 1.7 | Gap | The unsized-style rule | 0 | Accept: the mark style is computed in `ui.js` | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.8 | Gap | Older saves | 0 | Accept: no spans, no marks | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.9 | Risk | Ambiguous text queries | 0 | Accept: `within` the line | **Accepted** (autonomous, pending owner review) | Tests |

**Deferred** (Optional): `accessibilityLanguage` on a mixed-language line (mostly English; one voice would misread
it); explicit `textDecorationColor` (done); a lint for forms that collide after folding (later); a line with no
spans renders plain (in the tests).

Net change: offsets from the server instead of a search in the app, every occurrence marked, dashed verbs, and a
contract test.
