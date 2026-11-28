# Round 223 architecture

**Conversational round.** Opened 2026-11-28 on the owner's message ([`trail/interview.md`](trail/interview.md));
events in [`trail/journal.md`](trail/journal.md). No Codex critique. Findings: [`findings.md`](findings.md).

- **Design source:** the owner's message; round 181 (French, one server for several languages), round 003 (packs),
  round 144 (curriculum).
- **Artifact:** `content/languages/ja/` and `content/languages/zh/` (the packs), `server/src/content-loader.js`
  (`writing` in the language schema), `server/src/llm/prompt-builder.js` (`writingRule`), `prompts/system/base.txt`,
  `prompts/language/grading.txt`, `prompts/language/grading_beginner.txt`, `client/src/components/InputBar.jsx`,
  `content/world/knowledge.yaml`, `Dockerfile`, `render.yaml`, `tools/check_pack.mjs`;
  `server/test/romanized.test.js`, `server/test/language-packs.test.js`,
  `client/src/components/__tests__/input-romanized.test.jsx`.

## Decisions

1. **Two packs like French.** `ja` (Japanese, `ja-JP`) and `zh` (Chinese, Mandarin, `zh-CN`) have the Italian pack's
   files, encounter, objective, lesson, fragment, inscription and truth ids; vocabulary and reference ids are ASCII
   rōmaji and pinyin (`kohi`, `kafei`); references are Jisho, MDBG and Wiktionary, by URL pattern, not opened.
   Written by subagents from the Italian (with the French as a model of adaptation), not reviewed by a native speaker.
2. **No Japanese or Chinese script (the owner).** Every pack file is in Latin letters: Hepburn rōmaji with macrons
   (particles apart: `Kōhī o kudasai.`) and Hanyu Pinyin with tone marks (words joined, particles apart:
   `Wǒ yào yì bēi kāfēi.`). A test fails on any kana, kanji, hanzi or CJK punctuation in the packs.
3. **The model is told so.** A pack may carry `writing`, a sentence on how the language is written in the game. It goes
   after LANGUAGE RULES in the narration prompt and into both grading prompts as `- WRITING: ...`. A pack without one
   (Italian, Spanish, French) has prompts as before, byte for byte.
4. **Matching needs nothing new.** Answers are already folded (marks stripped, lower case), so `kohi` finds `kōhī`
   and `ni hao` finds `nǐ hǎo`. The packs add the other common spellings as forms (`koohii`, `kouhii`; `kā fēi`;
   `lv` for `lǜ`), avoid forms that are English words (`go`, `mite`, `ban`, `you`, `demo`: phrases instead), and
   avoid bare particles. Pinyin without tones has many homographs; they are told apart by phrase or left to the
   grader (findings).
5. **Adapted, not translated.** Each objective says what a speaker would say: a kissaten coffee and `kudasai`; jīn at
   the butcher, pork added as a fifth meat; minutes counted with `fun`/`pun` and `fēnzhōng`; no tense in Chinese
   (`le`, `guo`, time words); the Cyclops' Nobody is Daredemonai and Wúrén; the road's region acts as Nagano and
   Jiangnan.
6. **The microphone listens in English only** for a pack with `writing`: a browser listening in Japanese or Chinese
   writes kana, kanji or hanzi into the reply box. The language switch beside the microphone is hidden.
7. **`tools/check_pack.mjs`.** Checks a pack while it is being written: a copy of `content/` with the pack's missing
   files (or all but `--only` files) taken from Italian, stand-ins for the Rift's Errata, cited references and the
   curriculum's other stages, then the server's own loader and form-conflict check.
8. **Deploy.** The Dockerfile and `render.yaml` set `TARGET_LANGUAGES=it,fr,es,ja,zh`.

## Tests

`npm test` at the root: server 640, client 394, aesthetic 96, mobile 320; `vite build`; the title in headless
Chromium against a local server playing five languages ([shot](shots/title-language.png),
[Japanese chosen](shots/title-japanese.png)).

## Status

Built, tested, seen in headless Chromium; merged to `main` and pushed on the owner's word ("Then deploy").
