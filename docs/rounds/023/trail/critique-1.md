# Codex critique 1: party conversations for Mortimer, Flick and Marginalia (A8c)

- **Dispatched:** 17:04:20 (approximate; the launch time printed by the command was not kept, journal row 3)
- **Returned:** 17:06:12 (observed by the wait loop)
- **Model:** codex exec (model gpt-6.1-sol), `--skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, run from /tmp/r023 with the bundle on stdin; session id 01a1acab-2820-7251-ba0a-3f9f05370224
- **Prompt:** "You are an adversarial reviewer. Do NOT run any commands or read files: everything you need is on stdin, a bundle of cat -n copies of a plan (docs/rounds/023/trail/plan-v1.md) and relevant content files of ParaLLang, a language-learning game with Italian and Spanish packs. The plan adds three authored party conversations. Critique it: errors (wrong or unnatural Italian/Spanish, wrong agreement, a vocabulary form that collides with an English word or name, since the matcher is language-blind, case-insensitive and folds accents, matching whole words), overlaps with existing vocabulary ids or forms in the same pack, objectives that a beginner cannot meet or that the NPC would give away, risks, and missing tests. Number each finding 1.1, 1.2, ... and label each Error, Risk or Suggestion, with a concrete fix. Put optional nice-to-haves under a final 'Optional' heading, unnumbered. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 a2ce0feb…, inside a bundle (sha256 a2d1866b…, 1068 lines) of: plan-v1.md, content/languages/it/encounters/gerald_coffee_break.yaml, content/languages/es/vocabulary/gerald_break.yaml, content/characters/enemies/{charcutier_mortimer,letharger_flick,bookworm_marginalia}.yaml, content/languages/it/vocabulary/{butcher_meats,fountain_riddles,bookshop_journey}.yaml, content/languages/es/vocabulary/{fountain_riddles,bookshop_journey}.yaml; HEAD 1596855, working tree: `docs/rounds/023/` untracked
- **Findings:** 11

## Raw output (verbatim)

```text
1.1 **Error — `más` collides with English** (plan L21–22). Accent folding produces `mas`, an English plural of *ma*. Remove the bare form; require a phrase such as `un poco más`, and test English “mas and pas.”

1.2 **Error — `juntas` collides with English** (L29). It is the English plural of *junta*. Remove the standalone variant; retain it within a phrase such as `vamos juntas`, with appropriate agreement.

1.3 **Risk — Italian musical vocabulary can collide too** (L21, L29). Bare `ancora` and `insieme` have English musical uses. Prefer phrase forms such as `ancora un po’` and `andiamo insieme`; include musical English sentences in collision tests.

1.4 **Error — Spanish noun in the agreement rule** (L37). Spanish requires `la historia`, not Italian `la storia`. Write separate Italian and Spanish agreement examples.

1.5 **Error — plural liking forms contradict the singular scene** (L17–20). For one slice, use `mi piace` / `me gusta`; `mi piacciono` / `me gustan` require plural subjects. Keep plural vocabulary variants only with explicit plural food referents, and test singular/plural mismatches.

1.6 **Risk — scripted feminine praise has no fixed antecedent** (L33–37, L53–54). A *fragment* is masculine (`il frammento` / `el fragmento`); `Preciosa!` could also address Marginalia herself. Establish `la storia` / `la historia` explicitly and script `La storia è meravigliosa` / `La historia es preciosa`, or consistently use masculine referents and praise.

1.7 **Risk — the fragment exceeds the claimed beginner level** (L42–43). Italian `parlò` / `rispose`, Spanish `habló` / `respondió`, and elliptical possessives add difficulty without supporting either objective. Use present tense and explicit nouns, for example `Journathan parla con il mare. Il mare risponde.` and `Journathan habla con el mar. El mar responde.`

1.8 **Risk — NPC dialogue naturally supplies the answers** (L17–39). Mortimer may ask “Vuoi ancora?” / “¿Quieres más?”, Flick may say “andiamo insieme,” and Marginalia may offer “otra vez.” Add explicit instructions withholding each pending answer outside requested hints, and inspect greetings and every intervening turn. The live-data checklist alone does not prevent leakage.

1.9 **Risk — listed negative examples are not assessment tests** (L12–13, L56–62). Run every accepted and negative example through assessment in both packs. Include wrong agreement, reported speech, English collisions, and wrong actions: `Lo leggo di nuovo` / `Lo leo otra vez` describes the player reading, rather than asking Marginalia to reread.

1.10 **Risk — overlap coverage is missing** (L58–61). No direct duplicate with the supplied existing entries is apparent, but the tests do not enforce this. Check vocabulary-ID uniqueness and normalized target/surface-form overlaps across each complete pack, allowing intentional overlaps within one entry.

1.11 **Risk — six successful scripts leave progression untested** (L47–67). Assert that English failures do not advance objectives, objectives unlock in order, resolution increments only the selected member’s count, and conversations require recruitment and work away from home. Preserve coverage of Gerald’s default script path.

### Optional

Have native speakers review the completed encounter text and vocabulary notes before release.
```
