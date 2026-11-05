# Round 019 plan v1: Portia's own words (backlog E1 narrowed to Portia, and E2)

## Problem

Round 014's and 015's tours: Portia's tutorial lines carry about a third of the requested target language (mean
0.11 against 0.28; greeting 0.07 against 0.20); every other NPC meets its ratio. Representative greeting:
"Buongiorno! A greeting and your name, please. I am an archway, not a loophole."

Hypothesis: at Portia's greeting every authored word in the prompt's ACTIVE LEARNING DATA (ciao, buongiorno, io,
sono, mi chiamo, tu, come ti chiami) is the answer to an objective the player has not passed yet. The style rules
forbid dictating or offering open objectives' answers, so the narrator has no authored Italian left to speak except
one modelled greeting. Gerald, Mortimer, Flick and Marginalia have scene words (caffè, latte, prosciutto...) beyond
their targets. Round 012 also found Portia saying words she was never given (E2: piacere, benvenuto; mucho gusto,
bienvenido), which get no chips or Spellbook cards.

Baseline before the build: 3 `play-market.js --location market_entrance` runs on HEAD (codex-cli), greeting and
per-line shares and the lines verbatim.

## Change

1. **Encounter field `ambient_vocabulary_ids`** (optional): authored entries the NPC may use freely in any line,
   which are not targets of the encounter's objectives. Loader: every id must exist; none may be a target of any
   objective in the same encounter; their files join `narrationEntries` (chips, Spellbook exposure).
2. **Narration prompt:** `prompts/system/base.txt` line `ACTIVE LEARNING DATA: {{language.learningData}}` becomes
   `ACTIVE LEARNING DATA: {{language.learningData}}{{language.ambientVocabulary}}`. For an encounter with ambient
   vocabulary the variable is a new line:
   `FREE VOCABULARY (authored {{language.name}} the character may use in any line, including the greeting; these are not answers to any objective, so using them gives nothing away): [{"target":..,"meanings":[..]}...]`;
   otherwise the empty string, so Gerald's pinned prompts (`gerald-prompts-r012.json`) stay byte-identical. Both
   narration calls (greeting and turns) pass it. The grading prompt is unchanged.
3. **Content, Italian** (`entrance_greetings.yaml`, version bump to v2): `benvenuto` (welcome; variants benvenuta,
   benvenuti, benvenute), `piacere` (nice to meet you; pleasure), `mercato` (market; her sign says MERCATO).
   **Spanish:** `bienvenido` (bienvenida, bienvenidos, bienvenidas), `mucho gusto` (nice to meet you), `mercado`. Each with notes and reference ids (Treccani / RAE / Wiktionary URL patterns, listed for owner review).
   `market_entrance_tutorial.yaml` in both packs: `ambient_vocabulary_ids: [benvenuto, piacere, mercato]` /
   `[bienvenido, mucho_gusto, mercado]`.
   English collisions: none of benvenuto, piacere, mercato, bienvenido, mucho gusto, mercado is an English word.
4. Character sheet unchanged (shared across packs).

## Tests

- Loader: ambient ids load; an unknown ambient id, and an ambient id that is an objective target, are rejected.
- Prompt: Portia's greeting system prompt contains FREE VOCABULARY with benvenuto, piacere, mercato and no grading
  forms; Gerald's golden prompts unchanged (existing test).
- Narration chips: a fixture Portia line using "Benvenuto al mercato" yields chips for benvenuto and mercato and
  Spellbook exposure.
- Grading rubric unchanged for Portia (no ambient entries in it).
- All suites green.

## Live runs (codex-cli)

- 3 tutorial runs after the build (it), 1 Spanish tutorial run; one with variant answers (`--lines`).
- Report per run: greeting share and per-line shares (both measures) against requested, whether lines use the
  ambient words, verdicts as scripted, dictation or menus of open targets (read the lines), feedback leaks.
- Success: mean greeting share ≥ 0.15 (requested 0.20) across the 3 Italian runs, verdicts unchanged, no
  dictation of open targets.
- Regression: one Gerald run (`--location coffee_cart`) is unnecessary because his prompts are byte-identical.
