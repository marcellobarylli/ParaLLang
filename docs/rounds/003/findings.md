# Round 003 findings

## Question

Can ParaLLang default to Italian, with the target language configurable, Spanish still working, Gerald's encounter
in idiomatic Italian and a separate Spellbook per language, without changing the learning loop of rounds 001–002?

## Finding

Yes. `TARGET_LANGUAGE` selects a language pack under `content/languages/`. It defaults to `it` and keeps `es`
working. Under `it`, the prompts, grading, Spellbook and client labels and voice use Italian. Spanish saves stay
where they were and stay separate from Italian ones. A live run through the Codex CLI graded all nine Italian cases
as expected and resolved a full encounter.

## Method

- Built to the pre-run design in [architecture.md](architecture.md), revised after
  [Codex critique 1](trail/critique-1.md) (all 14 findings accepted).
- Automated suites, as named in the README: `node --test server/test/*.test.js` and
  `npm exec --workspace client -- vitest run`, plus `npm run build -w client` and `git diff --check`.
- Startup smoke test: `NODE_ENV=test LLM_PROVIDER=ollama node -e "import('./server.js')…"` with `TARGET_LANGUAGE`
  unset, `es` and `fr`.
- Live: `npm run check:provider -- --provider codex-cli` (no inference), then
  `TARGET_LANGUAGE=it npm run verify:cli -- --provider codex-cli` on the owner's ChatGPT subscription, CPU, local
  machine.
- Sources: each Italian entry checked against Treccani (fetched). English glosses come from Wiktionary (fetched).

## Results

| Check | Result |
|---|---|
| Server suites | 65/65 pass: the 60 existing tests, pinned to `es`, and the 5 new tests in `server/test/language-packs.test.js` |
| Client suites | 12/12 pass: the 10 existing tests plus 2 new ones (Italian voice, labels and `lang` follow the pack); client build clean |
| Startup | Unset → `it`, saves in `server/data/saves/it`; `es` → saves in `server/data/saves`; `fr` → "Unknown target language: fr. Available: es, it" |
| `check:provider` (Codex) | `chatgpt-subscription`, CLI default model, all isolation controls, 0 inference requests |
| `verify:cli`, Italian, Codex CLI 0.162.1 | `passed: true`. 9/9 grading cases matched (positive, complete, mixed-language, English-only, contextual, negated, quoted, metalinguistic, third-person); the HTTP encounter ("Vorrei un caffè." then "Senza latte, per favore.") ended `resolved`; 14 of the 14 allowed calls; model not reported by the CLI |

In the live encounter the grader gave "Senza latte, per favore." quality 2 for `senza_latte`. Its feedback said the
answer used "the supplied prompt", probably because Gerald's previous line contained the phrase. The objective still
passed and the encounter resolved. A quality of 2 means the card's schedule does not advance from that evidence.

## Decision

The round ships as built. Departures from the pre-run text, all within its stated rules:

- **Sources.** The Cambridge Italian–English pages returned 403 to fetching, so Cambridge is dropped and Wiktionary
  supplies the English glosses. The design allowed this ("changed or dropped and reported").
- **Content edits from the sources.** Two unsourced note claims were dropped: that voglio is "blunt", and that
  Italians rarely say caffè nero. The caffè note now follows Treccani: a cup of coffee, today usually made with an
  espresso machine. `caffe_nero` also accepts "coffee without milk", after Treccani's "c. nero, senza latte".
  `con_latte` also matches "col latte", after Treccani's "c. col latte". `caffé nero` is an added surface variant.
  Example sentences: espresso "Mi fa un espresso?" (Treccani's example), caffè nero "Prendo il caffè nero.", con latte
  "Non voglio il caffè con latte."
- **Dead code.** The unused `buildEncounterPrompt` export is removed. It had no callers and would have crashed
  without a language.
- **Live pass condition.** `verify:cli` now reports `passed` and exits 1 when it is false, which makes finding 1.9's
  condition checkable.
- **Accessibility.** The native dialogue line and the word buttons now carry the pack's `lang` tag too.
- **Spanish content version.** It stays `gerald-coffee-v1`, so existing Spanish cards still load. Italian is
  `gerald-coffee-it-v1`.

## Evidence

- Build commit: "round 003: Italian by default with configurable language packs". Main paths:
  `content/languages/`, `server/src/`, `client/src/`, `prompts/`, `server/scripts/verify-cli.js`.
- New tests: `server/test/language-packs.test.js`; client additions in
  `client/src/components/__tests__/learning-flow.test.jsx`.
- Live output: [`results/verify-it-codex.json`](results/verify-it-codex.json).
- Design and critique: [architecture.md](architecture.md), [trail/plan-v1.md](trail/plan-v1.md),
  [trail/critique-1.md](trail/critique-1.md), [trail/interview.md](trail/interview.md).
- Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

This round shows that both packs load, Italian is the default, the code paths are language-correct under both
packs, saves are kept apart per language, and one live Codex run in Italian passed. It does not show:

- that a native speaker has reviewed the Italian content;
- that model narration is always idiomatic;
- anything about the Claude CLI, OpenAI or Ollama in Italian, none of which were run live;
- anything about a live Spanish run in this round;
- browser speech on a real device;
- a manual browser playthrough, which was **not done**.

## Open items

1. The owner reviews the Italian vocabulary and objectives (`content/languages/it/`).
2. A manual browser pass ordering "Vorrei un caffè senza latte", including the Italian voice on the target device.
3. Optional: `verify:cli` for `claude-cli` in Italian, and for either provider in Spanish after the rename.
4. The live grader may cap echoed phrases at quality 2 even when the objective passes. If that slows review
   scheduling in practice, it is a grading-prompt question for a later round.
5. Still deferred from the pre-run record: showing vocabulary notes, the Spellbook meaning leak from round 001.
