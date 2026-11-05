# Round 009 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present and not through the round pipeline. Sections marked *pre-run* must not be
edited after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section,
added later. The full record (drafts, raw critiques, timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** [`prototype.md`](../../../prototype.md) §8.2 node 1 ("Market Entrance: Tutorial — Companion
  introduces mechanics", greetings, pronouns); backlog A3 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md);
  [round 006](../006/architecture.md) (encounters are content).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `content/` (character, two encounters, two vocabulary files, the location), `server/src/content-loader.js`,
  `server/src/learning-service.js`, `server/scripts/play-market.js`, `mobile/src/components/DialoguePanel.js`, tests.

## Goal (pre-run)

The Market Entrance, where every new player starts, gets the first real second encounter: a short tutorial in which
the companion introduces the mechanics and an NPC asks for a greeting and pronouns, in the Italian and Spanish packs.
Gerald plays exactly as before, and the frozen web client still starts Gerald (the default encounter).

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The NPC is Portia, the Archway** (from *porta*/*puerta*): the entrance arch from the location description, which
   has not decided which language it is in. She lets nobody into the market who has not greeted her and said who they
   are; fussy and formal about manners. Not saveable. Difficulty 1, `base_target_ratio` 0.2, +0.05 per turn. The
   companion is not the opponent: the notes define it only as the one who translates for the player.
2. **The companion introduces the mechanics in static content**, not through the LLM: an optional encounter field
   `companion_briefing` (1–4 English lines), shown in the app as a "Your companion" card. Only the tutorial sets it.
3. **No gating** of the Coffee Cart behind the tutorial (gating belongs to the Rift, A7). `default_encounter` stays
   Gerald in both packs.
4. **Reference URLs** follow the existing patterns (Treccani, Wiktionary, RAE, Cambridge); they cannot be opened from
   the container and go to the owner's content review.
5. **Narration word matching is scoped to the played encounter's vocabulary files** (critique 1.3), so the new
   greetings and pronouns cannot appear as chips or Spellbook entries in Gerald's lines.
6. **Spanish "and you?" is the phrase `y tú`**, not a bare `tú` entry (critique 1.4): matching folds accents, so a
   bare entry would gloss possessive *tu* ("your") as "you".
7. **Second opinion:** see the table; every finding was accepted in full or in part.

## Claim boundary (pre-run)

The round can claim: the tutorial loads and plays to resolution in both packs in-process (fixture grader), the
briefing is served and rendered in jest, Gerald's prompts are byte-identical and his narration matches only his own
vocabulary, and the live runs as reported. It cannot claim teaching quality as judged by a learner or the owner,
that the reference URLs resolve, or anything in the iOS Simulator (layout, scrolling, taps).

## Deferred (pre-run)

Gating (A7), the companion as a speaking LLM character, the companion's hint budget across encounters, a briefing
in other encounters, `expo-doctor` (D4, unchanged inputs), Simulator checks.

## Design (pre-run)

### Content

- `content/characters/enemies/archway_portia.yaml` (shared; same schema as Gerald's).
- `content/world/locations/market_entrance.yaml`: `encounter: market_entrance_tutorial`.
- Per pack `encounters/market_entrance_tutorial.yaml` and `vocabulary/entrance_greetings.yaml`
  (`entrance-greetings-it-v1`, `entrance-greetings-es-v1`), `resolved_message` "Portia sighs with relief, unlocks
  herself and lets you into the market."
- Three objectives, each with intent, required target groups, grammar constraints, accepted and negative examples
  (English-only, quoted or metalinguistic, someone else), hint limit 2:
  1. `greet`: it [ciao, buongiorno]; es [hola, buenos_dias].
  2. `introduce` (first person; any name): it required [sono, mi_chiamo], also io; es [soy, me_llamo], also yo.
  3. `ask_back` (ask Portia her name): it [tu, come_ti_chiami] ("E tu?", "Come ti chiami?"); es [y_tu,
     como_te_llamas] ("¿Y tú?", "¿Cómo te llamas?").
- Vocabulary it (7): ciao, buongiorno, io, sono, mi_chiamo, tu, come_ti_chiami. es (7): hola, buenos_dias, yo, soy,
  me_llamo, y_tu, como_te_llamas.
- Briefing (es says Spanish), no target-language words, reviewed by hand (critique 1.7 cut the load-time check):
  - "Portia only lets in people who greet her properly. Answer in Italian; mixing in English is fine while you learn."
  - "Tap a word under her line to see what it means, or Translate sentence for the whole line. On her newest line each
    one uses a hint from my allowance."
  - "The words and phrases shown beneath her lines go into your Spellbook, where you can review them later."
    (critique 1.6)

### Code

- `content-loader.js`: optional `companion_briefing: z.array(z.string().min(1)).min(1).max(4)`. Each definition
  gains `narrationEntries`: the entries of every vocabulary file that holds one of its objectives' targets (whole
  files, so Gerald keeps `con_latte`).
- `learning-service.js`: `canonicalizeNarration` matches against `definition.narrationEntries` (critique 1.3);
  `serializeEncounter` adds `companionBriefing: definition.encounter.companion_briefing ?? null` (critique 1.1).
- `DialoguePanel.js`: a "Your companion" card above the objective when `companionBriefing` is non-empty; the list
  auto-scrolls to the end only once the transcript holds more than one message, so the first screen opens at the
  top (critique 1.5).
- `play-market.js`: `--location <id>` (default `coffee_cart`) with scripted answers per location and language
  (tutorial it "Ciao!", "Mi chiamo Sam.", "E tu?"; es "¡Hola!", "Me llamo Sam.", "¿Y tú?"); no move when the
  location is the start; ratio, language share and `completedOnMap` use the played encounter and location.
- No prompt template changes.

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 df634e6f…; Codex, effort high, code inlined on stdin;
raw text in [`trail/critique-1.md`](trail/critique-1.md). Dispositions are autonomous decisions by Claude, pending
owner review.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The briefing is read from the session, not the definition | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design: Code |
| 1.2 | Error | Two version assertions in `encounters.test.js` break with a new vocabulary file | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.3 | Error | Narration matching uses the whole pack, so tutorial words change Gerald's chips and Spellbook | + | Accept: scope matching to the encounter's vocabulary files | **Accepted** (autonomous, pending owner review) | Decision 5, Design: Code |
| 1.4 | Error | Spanish possessive *tu* would be taught as *tú* | 0 | Accept the finding, other fix: phrase `y tú`, not `usted` (keeps informal you in both packs) | **Accepted, different fix** (autonomous, pending owner review) | Decision 6 |
| 1.5 | Gap | Auto-scroll can hide the briefing on the first screen | + | Accept, narrower: no auto-scroll while the transcript has one message | **Accepted, narrower** (autonomous, pending owner review) | Design: Code |
| 1.6 | Error | "Every word you meet goes into your Spellbook" overpromises | 0 | Accept the wording | **Accepted** (autonomous, pending owner review) | Design: Content |
| 1.7 | Cut | The briefing vocabulary check does not detect dictation | − | Accept | **Accepted** (autonomous, pending owner review) | Design: Content |
| 1.8 | Cut | `expo-doctor` and the web build test unchanged inputs | − | Partly: drop `expo-doctor`; keep the web build (the run's quality bar says the web client keeps building) | **Partly accepted** (autonomous, pending owner review) | Tests |
| 1.9 | Cut | Three identical Italian runs and raw outputs in findings | − | Partly: no raw outputs in findings (they stay in `results/`); keep three Italian runs, since narration and grading varied run to run in rounds 007–008 | **Partly accepted** (autonomous, pending owner review) | Tests |

Net change from plan v1: +1 matching scope, +1 scroll rule; −1 load-time check, −1 expo-doctor; Spanish target
`tu` → `y_tu`.

## Tests (pre-run)

1. `node --test server/test/*.test.js`: all existing tests, with the real-pack test expecting two encounters per pack
   (Gerald default) and the two version assertions updated (critique 1.2). New `server/test/tutorial.test.js`: both
   packs load the tutorial at `market_entrance`; a fresh learner starts it without moving; the greeting prompt speaks
   as Portia at Market Entrance; `companionBriefing` is served (null for Gerald); a test grader plays greet →
   introduce → ask_back to resolved and the map marks Market Entrance completed; Gerald's narration "Bien. Tu café
   será tomado en serio." yields no tutorial word; Gerald's golden prompts unchanged.
2. `npm run test:mobile`: the briefing card renders for the tutorial and not for Gerald; no auto-scroll on the first
   message.
3. Web client tests and build in `client/` (unchanged code).
4. `npx expo export --platform ios` in `mobile/`.
5. Live, codex-cli: `play-market.js --location market_entrance` three times in Italian, once in Spanish, and one
   Gerald run in Italian (regression). Findings report pass/fail per objective, the language share per line, whether
   Portia dictates an answer, and representative outputs; full outputs stay in `results/`.
