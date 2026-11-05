# Claude subagent critique 1: fragments of The Journey

- **Dispatched:** 2026-11-05T18:52Z (approximate)
- **Returned:** 2026-11-05T18:54:28 (notification)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only, repo access; Codex at its usage limit
- **Prompt:** adversarial critique of `docs/rounds/030/trail/plan-v1.md` against the named server, mobile and content files; numbered Error / Risk / Suggestion list, Optional unnumbered, under 700 words
- **Reviewed input:** `plan-v1.md`, sha256 dd4c3c87c0cb5cd55e7b2a21653ef9006cf75be1eaeed376dff8ed28627169fe, HEAD 2a7dd09, working tree: draft content (`content/languages/*/lore/fragments.yaml`) and the loader draft were uncommitted while it ran
- **Findings:** 10

## Raw output (verbatim)

```text
1. **Error — Translation and glossary answer the protected line during an encounter.** Plan §3 only checks a fragment's `text` against objective targets. The containment check also bans every `narrationEntries` form of the file's own encounter (`server/test/containment.test.js:17-21`), because the NPC's current line hides word meanings until the player pays for a reveal (`server/src/learning-service.js:219-233`). A fragment is visible during every encounter, so if its text uses a narration word ("viaggio", "storia", "lingua" in `content/languages/it/vocabulary/bookshop_journey.yaml`), the English translation or glossary hands over that meaning for free. A replayed `marginalia_fragment` or a restarted Bookshop would hit this. Fix: have the server leave out `translation` and `glossary` while `inEncounter` is true, the same way cards hide meanings (`learning-service.js:135`, `Spellbook.js:13`). Also widen the leak check to all pack vocabulary, or at least the union of all `narrationEntries`.

2. **Error — The fold misses Italian elision.** `fold` keeps apostrophes (`containment.test.js:12`), so "vent'anni", "un'ora" and "dell'ora" each stay one token, and the whole-word search for " anni " or " ora " finds nothing. That matters because `ora` and `anni` are targets or entries, and literary Italian elides all the time. The same gap affects the loader's "glossary word occurs in the folded text" check. Fix: for fragments, fold apostrophes to spaces on both the text and the forms. Add a planted case like "un'ora" alongside the plan's planted answer.

3. **Risk — Inflected forms of targets get through.** The check matches only the listed `surface_variants`; `anni` has only "anni" and "anno" (`bookshop_journey.yaml:94-104`). A passage in the passato remoto may use "case", "nessun" or "fui" and still give away `casa`, `nessuno` or `sono`. Fix: either add a per-pack `forbidden_forms` list to the test for these lemmas, or hand-check each text against every target lemma and record that in findings.

4. **Risk — The target list makes natural prose hard to write.** Italian objective targets include `sono`, `io`, `tu`, `ora`, `ancora`, `insieme`, `nome`, `tre`, `cento`, `mezzo` and `buono`. "sono" is also "they are", and accent folding makes Spanish "tu"/"tú" and "si"/"sí" collide. Three literary texts per pack that avoid all of these, with no native reviewer and no LLM run, is the real cost of the round. Fix: draft the six texts and run the leak check on them first, before building the app side. Cut to one fragment per pack if they read badly.

5. **Error — DialoguePanel has no spellbook data.** `DialoguePanel` takes only `encounter, language, isLoading, assessment, ...` (`mobile/src/components/DialoguePanel.js:7`), and App passes no spellbook (`mobile/App.js:51`). Fix: add a `fragments` prop fed from `state.spellbook.fragments`. Put the note in the existing `role="status"` area (`DialoguePanel.js:34`) so it is announced together with the victory line.

6. **Risk — The "You found" note repeats.** A completed location encounter can be restarted (`learning-service.js:298-300`, `restart`). Each time it resolves again, the note says "You found a fragment" even though the fragment was filed long ago. Fix: word it as "A fragment of The Journey from here is in your Spellbook", or show it only when the resolving response's spellbook has more fragments than before. Add a test for either choice.

7. **Risk — Screen readers read the passage twice.** `PronounceButton` builds its label as `Hear ${text} in ${name}` (`mobile/src/components/PronounceButton.js:18`). With a 3–4 sentence passage, VoiceOver reads the whole text again as the button name. Fix: add an optional `label` prop (for example "Hear the fragment in Italian").

8. **Suggestion — Make the reveal toggle accessible.** "Show translation" should switch to "Hide translation" and expose `accessibilityState={{ expanded }}`. Glossary lines mix two languages, so wrap each `word` in a nested `&lt;Text accessibilityLanguage={tag}&gt;`, as `Spellbook.js:41` does for file names.

9. **Suggestion — Fill the gaps in the test plan.** Missing tests:
   - snapshot during an ongoing encounter: no translation or glossary;
   - the elision planted case;
   - a glossary word that matches only as a substring ("nome" inside "nomea"), which must be rejected (fold the glossary word and match whole words);
   - a pack missing the `lore/` directory entirely. `yamlFiles`/`readdirSync` throws on a missing directory (`server/src/content-loader.js:262-265`), so use `existsSync` on the single file rather than `yamlFiles`;
   - the Rift resolving turn files `journey_shroud`.
   Mobile needs a test that the translation stays hidden while `inEncounter`.

10. **Suggestion — Check glossary meanings against targets.** Fix: assert that no glossary `meaning` equals an `accepted_translations` value of an objective target. Then the glossary cannot double as an English-to-target dictionary for a current prompt, for example a synonym glossed "home" or "again" while Marginalia's party conversation asks for `di_nuovo`.

## Optional
- `fragments` sits close to the existing `marginalia_fragment` encounter id. Consider calling the snapshot field `journeyFragments`.
- Sort by an explicit `order` or by encounter order rather than file order, to match `containmentFiles`' explicit sort (`learning-service.js:188`).
- Leave the English `title`/`found` lines out of the leak check; they are English. But make sure `found` does not quote target words, such as a title "Casa".
- Spellbook empty state: when there are no cards but there are fragments, check the section still renders (`Spellbook.js:16`).
```
