# Round 003 architecture

## Goal (pre-run)

**Italian by default: a configurable target language.**

ParaLLang stops being hardwired to Spanish. The server loads one *language pack* chosen by `TARGET_LANGUAGE`, which
defaults to `it` (Italian). Spanish keeps working as `TARGET_LANGUAGE=es`. Gerald's coffee encounter is rewritten in
idiomatic Italian, and each language keeps its own Spellbook, so existing Spanish progress survives and returns when
the owner switches back.

## Owner decisions (pre-run)

Asked and answered at the start of the round ([interview](trail/interview.md)).

1. **Configurable, Italian default.** Add a target-language setting; content, prompts, voice and UI labels come from
   the selected pack. Spanish stays a working option.
2. **Idiomatic Italian.** Gerald's encounter is written the Italian way (un caffè is an espresso; vorrei to order;
   senza latte), with dictionary sources, for the owner to review. It is not a word-for-word copy of the Spanish.
3. **One Spellbook per language.** Spanish cards are kept and come back when Spanish is selected again.

## Design (pre-run)

### Baseline

Spanish is hardcoded in four layers: content field names (`spanish`, `base_spanish_ratio`,
`spanish_ratio_increase_per_turn`), the loader's fixed file paths, the prompt templates ("Spanish" in
`system/base.txt`, `encounter/dialogue_turn.txt`, `language/grading.txt`) and the client (the `es` voice match in
`PronounceButton.jsx`, the "Spanish" labels, `lang="es"`). Text folding uses `toLocaleLowerCase('es')` in the loader,
the language engine, the learning service and the test fixtures. The fixture grader (`server/test/helpers.js`,
`server/test/fixtures/fake-cli.mjs`) and the live cases in `server/scripts/verify-cli.js` match Spanish words.

Round 001 and 002 decisions stay as they are: canonical vocabulary, contextual mixed-language answers, server-owned
grading and hint caps, SM-2, learner isolation, attempt receipts, committed-turn escalation, the CLI providers. The
Spellbook meaning leak noted in round 001 stays a separate open issue.

### Language packs

```
content/
├── characters/enemies/imp_coffee.yaml     shared; language-neutral text with a {language} placeholder
├── narration/style_guide.yaml             shared; same placeholder
└── languages/
    ├── it/
    │   ├── language.yaml                  code, name, BCP 47 tag, locale
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
locale: it          # toLocaleLowerCase and other locale-sensitive folding
```

The encounter file lives in the pack, whole, because its objectives (prompts, targets, examples, constraints) are
language-specific. The shared structure it repeats (escalation, max turns, templates) is a few lines; the loader
checks that every pack's encounter has the same id, character and objective ids in the same order, so the packs
cannot drift into different games.

The character and style guide stay shared. Their language mentions become `{language}`, filled with the pack's
`name` at load time (for example "Speaks in increasingly complex {language} when agitated"). The parenthetical
"(sin leche)" in Gerald's defeat condition is removed; the encounter's objectives already say what is required.

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

### Selection

`TARGET_LANGUAGE` in the root `.env`, default `it`. The value must name a folder under `content/languages/`; an
unknown value stops the server at startup with the list of available packs. The server logs the language beside the
provider at startup. Switching takes a restart, as switching provider does. There is no in-game picker this round.

`loadGameContent({ language })` returns the pack alongside the existing content: `{ language, character, encounter,
styleGuide, vocabulary, vocabularyById }`. Everything that folded with `'es'` takes `content.language.locale`.

### Prompts

Every "Spanish" in the three templates becomes `{{language.name}}` (for example "Mixed English/{{language.name}} is
allowed when the required {{language.name}} target is genuinely used"). Server error text that names Spanish ("the
required Spanish evidence") uses the pack name.

### Per-language Spellbooks

Saves move to one directory per language: `<saveDir>/<code>/<learnerId>.json`. The envelope format is unchanged
(schema version 1), so the storage code changes only in where it reads and writes. The same learner ID (kept in the
browser) owns a separate Spellbook in each language.

Existing saves sit at `<saveDir>/<learnerId>.json` and are Spanish. For `es` only, a missing
`es/<learnerId>.json` falls back to reading that legacy file; the next save writes to `es/` and leaves the legacy
file in place, untouched. Italian never reads legacy files, so an existing learner starts Italian with an empty
Spellbook and gets the Spanish cards back on switching to `es`.

### Client

`POST /api/learner` also returns `language: { code, name, tag }`; the store keeps it. Then:

- `PronounceButton` picks a voice whose primary subtag matches the pack (`it` → `it-IT`, `it-CH`), and its labels
  read "Hear caffè in Italian" / "Italian pronunciation unavailable".
- `lang` attributes use `tag`. The objective card reads "Italian target: 25%"; the review panel reads
  "Italian-to-English recall" and its aria label "Italian vocabulary review".
- The rest of the UI stays English. Translating the interface is out of scope.

### Italian content (draft for owner review)

In Italy *un caffè* is an espresso, so a plain order is already black; the no-milk objective asks the player to make
that explicit, and Gerald's purism lands on milk as before. `latte` means milk, which is the cultural trap the note
teaches.

| id | kind | target | accepted translations | surface variants | note |
|---|---|---|---|---|---|
| `caffe` | word | caffè | coffee, a coffee, an espresso | caffè, caffe, caffé | In Italy un caffè is an espresso. |
| `vorrei` | word | vorrei | I would like | vorrei | Conditional of volere; the polite way to order. Voglio (I want) is correct but blunt. |
| `senza_latte` | phrase | senza latte | without milk, no milk | senza latte | |
| `espresso` | word | espresso | espresso, an espresso | espresso | Coffee with no milk by definition. |
| `caffe_nero` | phrase | caffè nero | black coffee | caffè nero, caffe nero | Understood, though Italians usually just say un caffè. |
| `con_latte` | phrase | con latte | with milk | con latte | Un latte is a glass of milk, not a coffee. |

Objectives mirror today's structure:

- **order_coffee**: "Order a coffee from Gerald, using Italian for the coffee request." Targets vorrei, caffe,
  espresso, caffe_nero; required group [caffe, espresso, caffe_nero]. Accepted: "Vorrei un caffè.", "Un caffè, per
  favore.", "I would like un caffè, please." Negative: "I want coffee." (English only), "Gerald said, 'un caffè'."
  (quotation), "She wants un caffè." (someone else).
- **no_milk**: "Make clear that your coffee must have no milk, using Italian." Targets senza_latte, espresso,
  caffe_nero; required group [senza_latte, espresso, caffe_nero]. Accepted: "Vorrei un caffè senza latte.", "Un
  espresso, per favore.", "I want my caffè nero, please.", "Senza latte, per favore." Negative: "Non senza latte, con
  latte." (negated and contradicted), "The sign says 'senza latte'." (quotation), "My friend takes caffè nero."
  (someone else), "Senza latte is two words." (metalinguistic).

References: Treccani Vocabolario entries for caffè, volere, latte and espresso, and the Cambridge Italian–English
dictionary for caffè, senza and latte. Each URL is opened and checked during implementation; an entry whose source
does not support it is changed or dropped and the change is reported.

### Docs

README (setup, `TARGET_LANGUAGE`, saves layout), `.env.example`, and the project overview in `CLAUDE.md` and
`AGENTS.md` ("learn Spanish" becomes "learn a target language, Italian by default"; `base_spanish_ratio` becomes
`base_target_ratio`). `STATUS.md` gets the round 003 addendum and index row at close.

### Out of scope

An in-game language picker; translating the interface; learner native languages other than English; packs beyond
Italian and Spanish; the lore's language-distance power scaling; the Spellbook meaning leak.

## Tests (pre-run)

Automated (`npm test` in `server` and `client`):

1. **Loader.** Both packs load and validate. The default with no `TARGET_LANGUAGE` is `it`. An unknown code fails
   with the list of packs. A pack whose encounter objective ids differ from the other pack's fails. `{language}` is
   filled in the character and style guide.
2. **Learning flow under both packs.** The existing learning-flow and CLI learning-flow suites run once per pack. The
   fixture grader and fake CLI take their patterns from a per-language fixture table
   (`server/test/fixtures/languages/{it,es}.js`), replacing the hardcoded Spanish regexes.
3. **Matching.** `caffè nero` beats `caffè`; `caffé` and `caffe` match `caffe`; elided forms such as
   `dell'espresso` still find `espresso`.
4. **Prompts.** Narration says "30% Italian" under `it` and "30% Spanish" under `es`; grading names the pack.
5. **Storage.** Saves land in `<saveDir>/<code>/`. Under `es`, a legacy root file is read and the next save goes to
   `es/` with the legacy file unchanged. Under `it`, the same learner ID starts empty and the legacy file is not
   read. Switching back to `es` returns the Spanish cards.
6. **Client.** With an Italian pack the button picks an `it-IT` voice and ignores an `es-ES` one; labels and `lang`
   attributes follow the pack; Spanish still works.

Live (owner's subscription, recorded with commands and outputs): `npm run verify:cli` with `TARGET_LANGUAGE=it`
through one CLI provider, using the Italian case table (positive, complete, mixed-language, contextual, negated,
quoted, metalinguistic, third-person). A manual browser pass ordering "Vorrei un caffè senza latte" is reported as
done or not done, never assumed.
