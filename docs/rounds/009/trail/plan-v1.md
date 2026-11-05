# Round 009 plan v1: the Market Entrance tutorial (backlog A3)

## Goal

The Market Entrance, where every new player starts, gets the first real second encounter: a short tutorial in which
the companion introduces the mechanics and an NPC asks for greetings and pronouns (prototype.md §8.2 node 1:
"Tutorial — Companion introduces mechanics", vocabulary focus greetings, pronouns). Italian and Spanish packs. Gerald
plays exactly as before (golden prompt test), and the frozen web client is untouched (it still starts the default
encounter, Gerald).

## Decisions (autonomous, pending owner review)

1. **The NPC is Portia, the Archway** (from *porta*/*puerta*), the sentient entrance arch from the location
   description that has not decided which language it is in. She lets nobody into the market who has not greeted her
   and said who they are. Fussy, bureaucratic about manners, mild identity crisis about her bilingual sign. Not
   saveable (an archway cannot join a party). Difficulty 1, `base_target_ratio` 0.2, escalation 0.05/turn.
   Alternative: the companion itself as the encounter NPC. Rejected: the engine narrates as an opposing character, and
   the notes define the companion only as "translates for the player"; making it the opponent would blur the help
   role.
2. **The companion introduces the mechanics through static content, not the LLM:** a new optional encounter field
   `companion_briefing` (1–4 English strings), returned as `companionBriefing` (array or null), shown in the app as a
   "Your companion" card above the objective. Static text is predictable, testable and cannot dictate answers by
   accident. Only the tutorial sets it.
3. **No gating.** The Coffee Cart stays reachable without finishing the tutorial (the map is open since round 005;
   gating belongs to the Rift, A7). The pack `default_encounter` stays Gerald, so the frozen web client is unchanged.
4. **Reference URLs** follow the existing patterns (Treccani `vocabolario/<word>/`, Wiktionary, RAE `dle.rae.es`);
   they cannot be opened from this container (network is limited to LLM APIs, registries and the sandbox repo), so
   they are listed for the owner's content review.

## Content

- `content/characters/enemies/archway_portia.yaml` (shared by both packs; schema as Gerald's).
- `content/world/locations/market_entrance.yaml`: `encounter: market_entrance_tutorial`.
- Per pack `encounters/market_entrance_tutorial.yaml` and `vocabulary/entrance_greetings.yaml`
  (own version, `entrance-greetings-it-v1` / `entrance-greetings-es-v1`; ids unique across the pack).
- Three objectives, each with intent, required target groups, grammar constraints, accepted and negative examples
  (quoted, metalinguistic, third-person, English-only), hint limit 2:
  1. `greet`: greet Portia. it: [ciao, buongiorno]; es: [hola, buenos_dias].
  2. `introduce`: say who you are, first person. it: required [sono, mi_chiamo], also io; es: [soy, me_llamo], also yo.
     A name in any language is fine; "Lei è Sam" / "Ella es Sam" and "I am Sam" fail.
  3. `ask_back`: ask Portia who she is in return, addressing her. it: [tu, come_ti_chiami] ("E tu?",
     "Come ti chiami?"); es: [tu (tú), como_te_llamas] ("¿Y tú?", "¿Cómo te llamas?").
- Vocabulary, it (7): ciao, buongiorno, io, sono, mi_chiamo, tu, come_ti_chiami. es (7): hola, buenos_dias, yo, soy,
  me_llamo, tu, como_te_llamas. Each with accepted translations, surface variants, example, references.
- `resolved_message`: "Portia sighs with relief, unlocks herself and lets you into the market."
- Companion briefing (it; es says Spanish), three lines, no target-language words:
  - "Portia only lets in people who greet her properly. Answer in Italian; mixing in English is fine while you learn."
  - "Tap a word under her line to see what it means, or Translate sentence for the whole line. On her newest line each
    one uses a hint from my allowance."
  - "Every word you meet goes into your Spellbook, where you can review it later."

## Code

- `content-loader.js`: optional `companion_briefing: z.array(z.string().min(1)).min(1).max(4)` on the encounter
  schema. Load-time check: a briefing line must not contain the surface of any vocabulary entry the encounter's
  objectives target (the no-dictation rule, enforced for static text).
- `learning-service.js` `serializeEncounter`: `companionBriefing: encounter.companion_briefing ?? null`.
- `mobile/src/components/DialoguePanel.js`: "Your companion" card (each line a paragraph) above the objective when
  `companionBriefing` is non-empty.
- `server/scripts/play-market.js`: `--location <id>` (default `coffee_cart`), scripted answers per location and
  language (tutorial it: "Ciao!", "Mi chiamo Sam.", "E tu?"; es: "¡Hola!", "Me llamo Sam.", "¿Y tú?"); no move when
  the location is the start; `ratioFor` and `completedOnMap` use the played encounter and location.
- No prompt template changes. Gerald's golden prompts stay byte-identical.

## Tests

1. `node --test server/test/*.test.js`: all existing tests; "real packs hold one encounter each" becomes two
   encounters each (Gerald still default); new `tutorial.test.js`: both packs load the tutorial at
   `market_entrance`; a fresh learner can start it without moving; the greeting prompt speaks as Portia at Market
   Entrance; `companionBriefing` is returned (and null for Gerald); a test grader plays greet → introduce → ask_back
   to resolved and the map marks Market Entrance completed; a briefing line containing a target surface fails to
   load; Gerald's golden test unchanged.
2. `npm run test:mobile`: a DialoguePanel test that the briefing card renders for the tutorial and not for Gerald.
3. Web client: `npm test` and build in `client/` (unchanged).
4. `npx expo-doctor`, `npx expo export --platform ios` in `mobile/`.
5. Live, codex-cli: `play-market.js --location market_entrance` three times in Italian and once in Spanish, plus one
   Gerald run (regression). Record pass/fail per objective, the language share per line, whether Portia dictates an
   answer, and the LLM outputs, in findings.md.

## Claim boundary

Can claim: the tutorial content loads and plays to resolution in both packs in-process, the briefing is served and
rendered in jest, and the live runs as reported. Cannot claim: teaching quality as judged by a learner or the owner,
reference URLs resolving, anything in the iOS Simulator.
