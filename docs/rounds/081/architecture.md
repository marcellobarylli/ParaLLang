# Round 081 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Design source:** `parallang_obsidian/GAME MECHANICS.md`, "Terry Pratchett × meme culture": "The narrator keeps
  the dry wit, the footnotes and the satire of the mundane" and "The footnotes can turn into meme formats: 'Nobody: /
  The Imp:', 'POV: you just learned the word for oat milk', a narrator who gets ratioed by the characters". Until now
  the style guide only said "footnote energy" ([round 007](../007/architecture.md)). Backlog B5, seeded this round.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/llm/schemas.js`, `content/narration/style_guide.yaml`, `server/src/learning-service.js`
  (`keptFootnote`), `server/test/footnotes.test.js`, `server/test/fixtures/gerald-prompts-r081.json`,
  `mobile/src/components/DialoguePanel.js`, `mobile/src/__tests__/footnotes.test.js`.

## Goal (pre-run)

An NPC reply may carry one short English narrator footnote, now and then, shown under the narration in the app: the
Pratchett aside, sometimes an evergreen meme format. It must not carry the pack's target-language words.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **A separate field**, `footnote`, not text inside `narrative`: the app can style it and the server can filter it.
2. **Rare by prompt; never two in a row by the server.** The rule asks for a footnote only for a real aside, about one
   reply in three. The server drops a footnote when the previous NPC line of the same session kept one. A positional
   quota (every third line) was rejected: it picks lines by position, not by joke.
3. **No pack vocabulary in a footnote**, with the atmosphere line's English homographs exempt (`ATMOSPHERE_ENGLISH`).
   Not a guarantee of English (critique 1.3): a target word outside the pack, or Spanish *once* meaning eleven, gets
   through. A fixed list of authored footnotes was rejected: it defeats the point of a narrator reacting to the scene.
4. **The narrator may use meme formats in footnotes only**: the existing "the narrator does not" rule is reworded
   (critique 1.4).

## Design (pre-run)

1. `encounterResponseSchema` gains `footnote: z.string().nullable().optional()` with a description ("an optional
   English narrator footnote, one dry aside; null on most replies"). The CLI schema lists it as required-nullable,
   so Codex always emits the key; fixtures that leave it out stay valid.
2. `content/narration/style_guide.yaml`:
   - rule 4 becomes "Characters may use internet register in their English (…); the narrator does not, except in a
     footnote";
   - a new rule: "The narrator may add a footnote (the footnote field): one or two English sentences, under 30 words,
     a dry aside on the scene or the character, now and then an evergreen meme format (Nobody: / The Imp: …, POV: …,
     the narrator getting ratioed by a character). Only when there is a real aside, about one reply in three;
     otherwise null. Never a target-language word in it, and never a hint at what the player should say".
   Style rules reach only the narration prompts (`buildNarrationMessages`); the atmosphere prompt takes tone and voice
   only (prompt-builder.js:104–107; critique 1.5 checked and rejected). Gerald's golden prompts change on purpose:
   `gerald-prompts-r081.json`, the test asserting the rule.
3. `LearningService.keptFootnote(generated, previousNpc)`: trim and collapse spaces; none if not a string, blank,
   over 200 characters, if `previousNpc?.footnote` is set, or if `matchCanonicalVocabulary(text,
   content.vocabulary.entries)` finds a form not in `ATMOSPHERE_ENGLISH`. `canonicalizeNarration(generated,
   definition, previousNpc)` adds `footnote` to the message only when kept. The start passes no previous line (the
   prefetched greeting too); the turn reply passes the last NPC message of the current encounter. The round 078 guard
   is unchanged.
4. `serializeEncounter`: `...(message.footnote ? { footnote: message.footnote } : {})` (critique 1.1). Saved in the
   transcript as is; older lines have none.
5. App: `DialoguePanel` passes `footnote={message.footnote}` to `Narration` (critique 1.2). With a footnote, the
   narration ends in "*" and a line "* {footnote}" follows in a smaller muted style with
   `aria-label="Footnote: {footnote}"`; the 🔊 reads `speechText([text, footnote])`. A footnote without narration is
   shown alone. The web client is frozen and ignores the field.
6. No counters and no report changes (critique 1.8): play-market reports already hold every raw output (offered
   footnotes) and the serialized transcript (kept ones).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 fb501d8b…; Codex, effort high; raw text in
[`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | `{ footnote }` in the serializer has no binding | 0 | Accept: `message.footnote` | **Accepted** (autonomous decision, pending owner review) | Design 4 |
| 1.2 | Gap | `Narration`'s caller never passes the footnote | + | Accept: pass it; test through `DialoguePanel` | **Accepted** (autonomous, pending owner review) | Design 5, Tests |
| 1.3 | Error | A vocabulary match with exemptions cannot guarantee English | + | Accept in part: the claim narrowed to "no pack vocabulary" (Decision 3, Claim boundary); no fixed list of footnotes | **Accepted in part** (autonomous, pending owner review) | Decision 3, Claim boundary |
| 1.4 | Error | "The narrator does not" use internet register contradicts meme footnotes | 0 | Accept: reword the rule | **Accepted** (autonomous, pending owner review) | Decision 4, Design 2 |
| 1.5 | Error | The shared style guide may reach the atmosphere prompt and its strict schema | 0 | Reject: checked, `buildAtmosphereMessages` takes tone and voice only, not rules (prompt-builder.js:104–107) | **Rejected** (autonomous, pending owner review) | Design 2 |
| 1.6 | Error | Live criteria measure offered footnotes; all could be dropped and still pass | 0 | Accept: at least one kept footnote and one reply without per language; zero kept fails | **Accepted** (autonomous, pending owner review) | Live runs |
| 1.7 | Error | No Spanish share baseline | − | Accept in part: per-language baselines (it 0.43 round 080, es 0.44 round 067 addendum), reported as a regression check, not a footnote criterion | **Accepted in part** (autonomous, pending owner review) | Live runs |
| 1.8 | Cut | Counters and report plumbing | − | Accept: the reports already hold raw and kept footnotes | **Accepted** (autonomous, pending owner review) | Design 6 |
| 1.9 | Cut | Two full tours with a verdict gate | − | Accept in part: one Italian tour (the rule reaches every encounter, so it doubles as the regression run) and a short Spanish sample; verdicts reported, not a footnote criterion | **Accepted in part** (autonomous, pending owner review) | Live runs |

**Deferred:** none (no Optional items). Net change: −counters, −report plumbing, −one tour; +one call-site prop.

## Tests (pre-run)

- `server/test/footnotes.test.js` (queued test provider): a greeting footnote kept, saved and serialized; blank, over
  200 characters, an Italian form ("caffè") and a Spanish one dropped; Spanish "once" kept; two in a row: the second
  dropped, a third after a line without one kept; a missing key and `null` both mean none, and no `footnote` key is
  serialized then.
- The golden prompt test on `gerald-prompts-r081.json`, asserting the new rule and the reworded rule 4.
- `mobile/src/__tests__/footnotes.test.js`: through `DialoguePanel`, a footnote shown with "*" and its label, none
  when absent, and the narrator button's text holding it.
- Full suite (`npm test`: server, client, mobile).

## Live runs (pre-run)

codex-cli: one Italian `--tour` (about 45 calls) and a Spanish sample of Gerald and the Market Entrance (about 12
calls). Recorded: footnotes offered (raw outputs) and kept (transcripts), each text, drop reasons by reading.
Success, per language: at least one kept footnote, at least one reply without one, and no kept footnote with a
target-language word by reading. Reported as regression checks: verdicts against round 080 (Italian 6/6), the share
(`folded`) against it 0.43 / es 0.44. If more than 60% of lines offer a footnote, the rule is tightened by Amendment
and measured once more.

## Claim boundary (pre-run)

Shows that the model writes footnotes at some rate, that the server keeps out pack vocabulary (bar listed English
homographs) and never keeps two in a row, and that the app renders them in jest. It does not show that a footnote
is English (a target word outside the pack passes), that footnotes are funny (owner), or how they look on an iPhone
(Simulator).
