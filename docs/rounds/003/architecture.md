# Round 003 architecture

**Conversational round, recorded before the run.** Designed on 2026-10-31 with the owner, not through the round
pipeline. Sections marked *pre-run* must not be edited after the commit that holds them. Changes go into dated
Amendments; results go into the dated Outcome section, added later. The full record (interview, drafts, raw
critiques, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** [round 001](../001/architecture.md) (learning loop), [round 002](../002/architecture.md) (CLI
  providers, `verify:cli`), [`prototype.md`](../../../prototype.md) section 3.3 (content and prompts).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `content/languages/{it,es}/`, `server/src/`, `prompts/`, `client/src/`, `server/test/`,
  `server/scripts/verify-cli.js`, README and `.env.example`.

## Goal (pre-run)

**Italian by default: a configurable target language.**

ParaLLang stops being hardwired to Spanish. The server loads one *language pack* chosen by `TARGET_LANGUAGE`, which
defaults to `it` (Italian). Spanish keeps working as `TARGET_LANGUAGE=es`. Gerald's coffee encounter is rewritten in
idiomatic Italian, and each language keeps its own Spellbook, so existing Spanish progress survives and returns when
the owner switches back.

## Owner decisions (pre-run)

Asked and answered at the start of the round ([interview](trail/interview.md)).

1. **Scope.** Offered: configurable with Italian default (recommended), or replace Spanish. Chosen: **configurable,
   Italian default**. Content, prompts, voice and UI labels come from the selected pack; Spanish stays a working
   option.
2. **Content.** Offered: idiomatic Italian (recommended), or a literal translation of the Spanish. Chosen:
   **idiomatic Italian**, with dictionary sources, for the owner to review.
3. **Saves.** Offered: one Spellbook per language (recommended), or start fresh. Chosen: **one Spellbook per
   language**. Spanish cards are kept and come back when Spanish is selected again.
4. **Second opinion.** All 14 findings of Codex critique 1 accepted as recommended (see Second opinion).

## Claim boundary (pre-run)

The round can claim: both packs load and validate; under `it` the server, prompts, grading, Spellbook and client
labels use Italian; Spanish saves stay readable and separate from Italian ones; the automated suites named in Tests
pass; and, if run, the live `verify:cli` result for one CLI provider in Italian. It cannot claim that the Italian
content is reviewed by a native speaker, that model narration is always idiomatic, or anything about providers or
languages not run.

## Deferred (pre-run)

- Showing vocabulary notes (such as the *latte* trap) in the Spellbook or prompts (from finding 1.5).
- An in-game language picker; translating the interface; learner native languages other than English; packs beyond
  Italian and Spanish; the lore's language-distance power scaling; the Spellbook meaning leak from round 001.

## Design (pre-run)

### Baseline

Spanish is hardcoded in four layers: content field names (`spanish`, `base_spanish_ratio`,
`spanish_ratio_increase_per_turn`), the loader's fixed file paths, the prompt templates ("Spanish" in
`system/base.txt`, `encounter/dialogue_turn.txt`, `language/grading.txt`) and the client (the `es` voice match in
`PronounceButton.jsx`, the "Spanish" labels, `lang="es"`). Text folding uses `toLocaleLowerCase('es')` in the loader,
the language engine, the learning service and the test fixtures. The fixture grader and narrator
(`server/test/helpers.js`, `server/test/fixtures/fake-cli.mjs`) and `server/scripts/verify-cli.js` (its case table
and its HTTP encounter answers) use Spanish words.

Round 001 and 002 decisions stay as they are: canonical vocabulary, contextual mixed-language answers, server-owned
grading and hint caps, SM-2, learner isolation, attempt receipts, committed-turn escalation, the CLI providers.

### Language packs

```
content/
├── characters/enemies/imp_coffee.yaml     shared; says "the target language" where it named Spanish
├── narration/style_guide.yaml             shared; same wording
└── languages/
    ├── it/
    │   ├── language.yaml                  code, name, BCP 47 tag
    │   ├── vocabulary/gerald_coffee.yaml
    │   └── encounters/imp_coffee_greeting.yaml
    └── es/                                today's Spanish files, moved with git mv and renamed fields
        ├── language.yaml
        ├── vocabulary/gerald_coffee.yaml
        └── encounters/imp_coffee_greeting.yaml
```

`language.yaml`:

```yaml
code: it            # matches the folder name
name: Italian       # used in prompts and UI labels
tag: it-IT          # lang attributes and speech-synthesis voice matching (primary subtag "it")
```

The encounter file lives in the pack, whole, because its objectives (prompts, targets, examples, constraints) are
language-specific. Each pack is validated on its own, with the existing checks; packs are not compared with each
other.

The character and style guide stay shared. Where they name Spanish they say "the target language" instead (for
example "Speaks in increasingly complex target-language phrases when agitated"); the prompt templates carry the
actual language name. The parenthetical "(sin leche)" in Gerald's defeat condition is removed; the encounter's
objectives already say what is required.

### Neutral field names

| Today | After |
|---|---|
| vocabulary `spanish`, example `spanish` | `target` |
| `language_profile.base_spanish_ratio` | `base_target_ratio` |
| `escalation.spanish_ratio_increase_per_turn` | `target_ratio_increase_per_turn` |
| `calculateSpanishRatio`, `spanishRatio` | `calculateTargetRatio`, `targetRatio` |
| API `spanish`, `canonicalSpanish` (words, cards, review challenges) | `target`, `canonicalTarget` |
| prompt `{{language.spanishRatio}}` | `{{language.targetRatio}}`, plus `{{language.name}}` |

Stored saves hold no `spanish` field (cards store `vocabularyId`, `contentVersion`, schedule and evidence), so the
rename does not touch save files. The one exception is a stored attempt receipt, which replays its original response
verbatim; a replay of a pre-upgrade attempt would return the old field names. Attempt IDs are per-attempt and the
client does not retry across a server restart, so this is accepted and noted, not migrated.

`toLocaleLowerCase('es')` becomes plain `toLowerCase()`, which folds Italian and Spanish identically. English recall
normalization stays as it is.

### Selection

`TARGET_LANGUAGE` in the root `.env`, default `it`. The value must name a folder under `content/languages/`; an
unknown value stops the server at startup with the list of available packs. The server logs the language beside the
provider at startup. Switching is: restart the server, then reload the browser page (the client reads the language
once, at start). There is no in-game picker.

`loadGameContent({ language })` returns the pack alongside the existing content: `{ language, character, encounter,
styleGuide, vocabulary, vocabularyById }`. The loader's module-level cache is removed: the server loads content once
at startup and the service keeps that object, and tests load both packs in one process.

### Prompts

Every "Spanish" in the three templates becomes `{{language.name}}` (for example "Mixed English/{{language.name}} is
allowed when the required {{language.name}} target is genuinely used"). Both prompt builders take the selected
language and pass it to every `fillTemplate` call that uses it: the system and turn templates in
`buildNarrationMessages`, and the grading template in `buildGradingMessages`, which `verify-cli.js` also calls
directly. Server error text that names Spanish ("the required Spanish evidence") uses the pack name.

### Per-language Spellbooks

Spanish saves stay where they are, at `<saveDir>/<learnerId>.json`. Every other language saves to
`<saveDir>/<code>/<learnerId>.json`, so Italian uses `<saveDir>/it/`. The server picks the directory at startup and
passes it to `JsonLearningStorage`, which already takes a directory; the envelope format and storage code are
unchanged. The same learner ID (kept in the browser) owns a separate Spellbook in each language, and nothing is
moved or migrated.

### Client

`POST /api/learner` also returns `language: { code, name, tag }`; the store keeps it. Then:

- `PronounceButton` picks a voice whose primary subtag matches the pack (`it` → `it-IT`, `it-CH`), and its labels
  read "Hear caffè in Italian" / "Italian pronunciation unavailable".
- `lang` attributes use `tag`. The objective card reads "Italian target: 25%"; the review panel reads
  "Italian-to-English recall" and its aria label "Italian vocabulary review".
- The rest of the UI stays English.

### Italian content (draft for owner review)

In Italy *un caffè* is an espresso. Ordering one passes the first objective; the second asks the player to make the
no-milk order explicit with *senza latte* or *caffè nero*. Notes are author documentation; the app does not show
them.

| id | kind | target | accepted translations | surface variants | note |
|---|---|---|---|---|---|
| `caffe` | word | caffè | coffee, a coffee, espresso, an espresso | caffè, caffe, caffé | In Italy un caffè is an espresso. |
| `vorrei` | word | vorrei | I would like, I'd like | vorrei | Conditional of volere; the polite way to order. Voglio (I want) is correct but blunt. |
| `senza_latte` | phrase | senza latte | without milk, no milk | senza latte | |
| `espresso` | word | espresso | espresso, an espresso | espresso | |
| `caffe_nero` | phrase | caffè nero | black coffee | caffè nero, caffe nero | Understood, though Italians usually just say un caffè. |
| `con_latte` | phrase | con latte | with milk | con latte | Un latte is a glass of milk, not a coffee. |

Objectives mirror today's structure:

- **order_coffee**: "Order a coffee from Gerald, using Italian for the coffee request." Targets vorrei, caffe,
  espresso, caffe_nero; required group [caffe, espresso, caffe_nero]. Accepted: "Vorrei un caffè.", "Un caffè, per
  favore.", "I would like un caffè, please." Negative: "I want coffee." (English only), "Gerald said, 'un caffè'."
  (quotation), "She wants un caffè." (someone else).
- **no_milk**: "Make clear that your coffee must have no milk, using Italian." Targets senza_latte, caffe_nero;
  required group [senza_latte, caffe_nero]. Accepted: "Vorrei un caffè senza latte.", "I want my caffè nero,
  please.", "Senza latte, per favore." Negative: "Non senza latte, con latte." (negated and contradicted), "The sign
  says 'senza latte'." (quotation), "My friend takes caffè nero." (someone else), "Senza latte is two words."
  (metalinguistic).

References: Treccani Vocabolario entries for caffè, volere, latte and espresso, and the Cambridge Italian–English
dictionary for caffè, senza and latte. Each URL is opened and checked during implementation; an entry whose source
does not support it is changed or dropped and the change is reported.

### Docs

README (setup, `TARGET_LANGUAGE`, switching, saves layout), `.env.example`, and the project overview in `CLAUDE.md`
and `AGENTS.md` ("learn Spanish" becomes "learn a target language, Italian by default"; `base_spanish_ratio` becomes
`base_target_ratio`). `STATUS.md` gets the round 003 addendum and index row.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 0c9b4c5c…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Gap | The content cache ignores language, so a second pack in one process returns the first | − | Accept: remove the cache | **Accepted** | Selection |
| 1.2 | Gap | Prompt builders do not pass the language, leaving literal `{{language.name}}` | + | Accept: every prompt breaks otherwise | **Accepted** | Prompts |
| 1.3 | Error | `espresso` passes no-milk while plain `caffè` does not, though the plan calls them the same drink | − | Accept: espresso orders coffee only; drop "by definition" | **Accepted** | Italian content |
| 1.4 | Error | Recall rejects "espresso" and "I'd like" | + | Accept: author the two answers, keep the grader | **Accepted** | Italian content |
| 1.5 | Error | Notes are never shown, so the *latte* note teaches nothing | − | Accept: notes are author documentation | **Accepted** | Italian content; Deferred |
| 1.6 | Error | `npm test` is not defined in either workspace | 0 | Accept: use the README commands | **Accepted** | Tests |
| 1.7 | Error | Running suites under Italian needs Italian narration, answers and IDs, not just regexes | − | Accept: pin existing suites to `es`, add one Italian flow | **Accepted** | Tests |
| 1.8 | Error | `verify-cli.js` hardcodes Spanish answers outside its case table | 0 | Accept: take them from the selected table | **Accepted** | Tests |
| 1.9 | Gap | Live verification has no pass condition; `verify:cli` exits 0 on wrong grading | 0 | Accept: all cases match and the encounter resolves | **Accepted** | Tests |
| 1.10 | Gap | Switching languages also needs a page reload | 0 | Accept: document it | **Accepted** | Selection; Docs |
| 1.11 | Cut | Cross-pack objective-id checks couple packs for no gain | − | Accept: validate each pack alone | **Accepted** | Language packs; Tests |
| 1.12 | Cut | Moving Spanish saves into `es/` creates an avoidable migration | − | Accept: Spanish stays at the root, Italian in `it/` | **Accepted** | Per-language Spellbooks |
| 1.13 | Cut | The `{language}` placeholder in shared YAML is a mechanism the goal does not need | − | Accept: write "the target language" | **Accepted** | Language packs |
| 1.14 | Cut | A separate `locale` field is redundant | − | Accept: plain lowercasing | **Accepted** | Language packs; Neutral field names |

**Deferred:** none (Codex listed no Optional items).

Net change from v1: +2 content aliases, +1 prompt plumbing, +1 live pass condition; −cache, −cross-pack check,
−save migration and fallback, −placeholder substitution, −`locale`, −duplicated Italian runs of every suite.

## Tests (pre-run)

Automated, with the commands in the README (`node --test` in `server`, Vitest in `client`):

1. **Loader.** Both packs load and validate. The default with no `TARGET_LANGUAGE` is `it`. An unknown code fails
   with the list of packs.
2. **Spanish regression.** The existing server and client suites keep their Spanish fixtures and run explicitly
   under `es` (field names updated to the neutral ones).
3. **Italian flow.** One focused server test under `it`, reusing the existing helpers with an Italian fixture
   (narration, answers, vocabulary IDs, grading patterns): Gerald's greeting discovers Italian words; a word hint for
   `caffe` is charged; "Vorrei un caffè senza latte" resolves the encounter; "Un espresso, per favore" passes
   order_coffee but not no_milk; a due review of `vorrei` accepts "I'd like".
4. **Matching.** `caffè nero` beats `caffè`; `caffé` and `caffe` match `caffe`; `dell'espresso` finds `espresso`.
5. **Prompts.** Narration says "30% Italian" under `it` and "30% Spanish" under `es`; no prompt contains a literal
   `{{`.
6. **Storage.** Under `es`, saves stay at `<saveDir>/<learnerId>.json` and existing files load. Under `it`, saves go
   to `<saveDir>/it/`, and the same learner ID starts with an empty Spellbook. Switching back to `es` returns the
   Spanish cards.
7. **Client.** With an Italian pack the button picks an `it-IT` voice and ignores an `es-ES` one; labels and `lang`
   attributes follow the pack.

Live (owner's subscription): `TARGET_LANGUAGE=it npm run verify:cli` through one CLI provider. Its case table and
HTTP encounter answers come from the selected language (positive, complete, mixed-language, contextual, negated,
quoted, metalinguistic, third-person). It passes only if every grading case matches its expected verdict and the
HTTP encounter ends `resolved`; commands and output are recorded. A manual browser pass ordering "Vorrei un caffè
senza latte" is reported as done or not done, never assumed.

## Outcome (2026-10-31)

Built as designed, with the departures listed in [findings.md](findings.md#decision). The main one: Cambridge
blocked fetching, so Wiktionary replaced it as the English-gloss source, and two unsourced note claims were dropped.
Every check in Tests ran except the manual browser pass. Server 65/65 and client 12/12 tests pass. The live
`TARGET_LANGUAGE=it npm run verify:cli -- --provider codex-cli` passed: 9/9 cases matched and the encounter
resolved, in 14 calls. Open: the owner's review of the Italian content and a manual browser pass. Details and claim
boundary are in [findings.md](findings.md).
