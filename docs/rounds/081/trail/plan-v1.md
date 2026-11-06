# Round 081 plan v1: narrator footnotes

Autonomous round (no owner present). Backlog item B5, seeded this iteration: the owner's GAME MECHANICS note
("Terry Pratchett × meme culture") says "The narrator keeps the dry wit, the footnotes and the satire of the
mundane" and "The footnotes can turn into meme formats: 'Nobody: / The Imp:', 'POV: you just learned the word for
oat milk', a narrator who gets ratioed by the characters". Today the style guide only says "footnote energy"; the
game has no footnotes. Every other backlog item is done.

## Goal

An NPC reply may carry one short English narrator footnote, shown under the narration in the app, now and then
(not every line). It is the Pratchett aside; sometimes an evergreen meme format. It never teaches or gives away
target-language words.

## Decisions (autonomous, pending owner review)

1. **A separate field, not text inside `narrative`.** `footnote` in the encounter response schema, nullable and
   optional (`.nullable().optional()`, as `root` in words: the CLI schema lists it as required-nullable, so Codex
   always emits the key). Alternative: let the narrative carry "*" text inline; rejected: the app cannot style it,
   and the server cannot filter it.
2. **Rare by prompt, enforced lightly by the server.** The prompt asks for a footnote only when there is a real aside,
   "in about one reply in three, null otherwise". The server drops a footnote on a line whose previous NPC line in the
   same session kept one (never two in a row). Alternative: a server quota (every third line); rejected: it would
   pick lines by position, not by joke.
3. **No target language in a footnote.** Dropped if any pack vocabulary form matches (`matchCanonicalVocabulary`
   over `content.vocabulary.entries`), with the atmosphere line's exemptions for English homographs
   (`ATMOSPHERE_ENGLISH`: once, kilo, salami, …). Dropped also if blank after trimming or over 200 characters.
   Footnotes are English only; the narrator's aside must not become a hint channel.
4. **Shown, not read by default differently.** The app shows the narration ending in "*" and, below it, "* {footnote}"
   in a smaller muted style. The narrator's 🔊 reads the narration then the footnote. Web client frozen: it ignores
   the field.
5. **Stored with the line.** A kept footnote is saved on the NPC transcript message (`footnote`, only when kept) and
   serialized; older lines have none. Not in the conversation history sent to the model (history carries only
   `dialogue.native` today).
6. **Counters** `footnoteStats = { offered, kept, dropped: { blank, length, vocabulary, consecutive } }` in memory;
   play-market and verify:cli reports carry them.

## Design

- `server/src/llm/schemas.js`: `footnote: z.string().nullable().optional().describe('An optional English narrator
  footnote (one dry aside), null on most replies')`.
- `content/narration/style_guide.yaml`: one new rule: "The narrator may add a footnote (the footnote field): one or
  two English sentences, under 30 words, a dry Pratchett aside on the scene or the character, now and then an
  evergreen meme format (Nobody: / The Imp: …, POV: …, the narrator getting ratioed by a character). Only when there
  is a real aside, about one reply in three; otherwise null. Never a target-language word in it, never a hint at what
  to say." This reaches every narration prompt (base.txt fills style rules). Gerald's golden prompts change on
  purpose: regenerated as `gerald-prompts-r081.json`, the test asserting the rule is present.
- `server/src/learning-service.js`: `keptFootnote(generated, previousNpc)` → string or undefined, counting stats;
  `canonicalizeNarration(generated, definition, previousNpc)` adds `footnote` when kept. The greeting has no previous
  line; the turn reply passes the last NPC message of the staged encounter. A prefetched greeting goes the same way
  (it is canonicalized at start). The round 078 guard is unchanged (it reads `dialogue` only).
- `serializeEncounter`: `...(message.footnote ? { footnote } : {})`.
- `mobile/src/components/DialoguePanel.js`: `Narration({ text, footnote })`; a footnote line with
  `aria-label="Footnote: …"`; `NarratorButton text={speechText([text, footnote])}`. A footnote with no narration is
  shown alone.
- `server/scripts/play-market.js`, `verify-cli.js`: `footnoteStats` in reports; play-market `lines` carry the
  footnote (raw and kept) so findings can read them.
- `FixtureProvider` unchanged (no footnote → none kept), plus a test provider that returns footnotes.

## Tests

- server `footnotes.test.js`: a footnote kept and serialized; blank, too long, with an Italian form ("caffè") and
  with a Spanish one dropped, with counters; "once" in Spanish kept (homograph); two in a row → second dropped,
  third (after a line without) kept; greeting footnote kept; a missing key and null both mean none; saved in the
  transcript; the guard's retry path still works with a footnote present.
- golden prompts regenerated (r081) with the rule asserted; the rest of the suite unchanged.
- mobile: a footnote rendered with "*" and its label; none when absent; the 🔊 text includes it.

## Live runs (criteria fixed before the run)

A full Italian `--tour` and a Spanish one (codex-cli, about 45 calls each). Record: lines, footnotes offered and
kept, drop reasons, every footnote text. Success if: verdicts as scripted (as round 080: 6/6 encounters), footnotes
offered on 15–60% of lines, no kept footnote holds a target-language word by reading, and the share (`folded`) stays
within 0.05 of round 080 (it 0.43). If footnotes come on more than 60% of lines, tighten the rule wording in an
Amendment and re-measure once. A footnote rate under 15% is recorded, not fixed.

## Claim boundary

Shows that the model writes footnotes at some rate, that the server keeps them English-only by vocabulary match and
never two in a row, and that the app renders them in jest. Whether they are funny is the owner's call; how they
look on an iPhone needs the Simulator.
