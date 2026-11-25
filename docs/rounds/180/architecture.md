# Round 180 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-25 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 003 (language packs), round 144 (curriculum), round 178 (save slots).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `content/languages/fr/` (the pack), `server/src/app.js` (`LANGUAGE_HEADER`, a router per language),
  `server/src/config.js` (`resolveTargetLanguages`), `server/server.js` (a service per language),
  `server/src/language-engine.js` (`foldLigatures`, guillemets), `client/src/slots.js` (`LANGUAGE_KEY`,
  `setSlotLanguage`), `client/src/api/encounter.js`, `client/src/stores/gameStore.js` (`chooseLanguage`),
  `client/src/components/DungeonScreen.jsx` (`TitleLanguage`), `client/src/components/SaveSlots.jsx`,
  `client/src/speech.js`, `content/world/knowledge.yaml`, `Dockerfile`, `render.yaml`.

## Decisions

1. **A French pack like the others.** `content/languages/fr/` has the Italian pack's files, encounter, objective,
   lesson, fragment, inscription and truth ids; vocabulary ids are French (`cafe_noir`, `je_voudrais`); references are
   Larousse, CNRTL and Wiktionary. The content was written by subagents from the Italian (and the Spanish adaptation)
   and is French in what it teaches: tu and vous, elided forms (`je m'appelle`, `j'ai`), spoken negation without
   `ne` beside the written one, inversion with and without hyphens, agreement (`fatigué`, `fatiguée`), the courses of
   a French meal, charcuterie at Mortimer's, `Personne` as the name in The Journey. Authored, not reviewed by a native
   speaker.
2. **One server, several languages.** The hosted server played one language (`TARGET_LANGUAGE`). Now
   `TARGET_LANGUAGES=it,fr,es` loads a service per language (content, saves, Spellbook; the LLM provider is shared),
   `TARGET_LANGUAGE` first as the default. A request names its game's language in `X-ParaLLang-Language`; none plays
   the default (every client before this round), and a language the server does not play is refused
   (`LANGUAGE_UNAVAILABLE`, 400). The health check and the learner response list the languages.
3. **A game's language per save slot.** The slot keeps `parallang.language`; a new game's language is chosen on the
   title (Learn: Italian, French, Spanish; the page reloads into the new game) or in Save slots (New game, Start
   over). A slot without one plays the server's default, so today's Italian saves are unchanged.
4. **French in the text folds.** œ and æ fold to oe and ae wherever accents are folded (the matcher, keeping excerpt
   offsets; curriculum forms; lore words; `sameLetters`, so a ligature is not a mistake); « » are punctuation in
   answers.
5. **Around the language.** Speech prefers fr-FR voices (Thomas, Amélie, Audrey, Marie…); the road's region acts as
   Burgundy in French.
6. **Deploy.** The Dockerfile and `render.yaml` set `TARGET_LANGUAGES=it,fr,es`.

## Tests

`npm test` at the root: server 597 (new `server/test/french.test.js`: the pack, French matching, the language list,
three languages on one server), client 313 (3 new in `slots.test.js`), aesthetic 95, mobile 320; `vite build`; the
title in headless Chromium ([shot](shots/title-language.png)).

## Status

Built, tested, seen in headless Chromium; merged to `main` and pushed on the owner's word ("push and deploy").
