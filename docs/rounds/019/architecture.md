# Round 019 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog E1 (narrowed to Portia) and E2 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md);
  rounds [009](../009/architecture.md) (the tutorial), [012](../012/architecture.md) (no menus; Portia's
  "Come ti chiami?" kept), [014](../014/findings.md) (Portia greeting 0.07 against 0.20).
- **Findings:** [`findings.md`](findings.md), after the runs.
- **Artifact:** `server/src/content-loader.js`, `server/src/llm/prompt-builder.js`, `server/src/learning-service.js`,
  `prompts/system/base.txt`, `content/characters/enemies/archway_portia.yaml`, both packs'
  `encounters/market_entrance_tutorial.yaml` and `vocabulary/entrance_greetings.yaml`, tests, `results/`.

## Goal (pre-run)

Portia's lines carry closer to their requested share of target language (greeting 0.20, rising 0.05 a turn), using
authored words that get chips and Spellbook cards, without giving away an open objective's answer.

**Hypothesis** (critique 1.1: a hypothesis, not a fact). At her greeting every authored word in the narration
prompt (ciao, buongiorno, io, sono, mi chiamo, tu, come ti chiami) answers an open objective, so the style rules
against dictation and menus leave the narrator little authored Italian to speak; the rules do allow target words in
her own remarks, and she uses some ("Come ti chiami?"). The other NPCs have scene words beyond their targets.
Baseline on HEAD (3 Italian runs, `results/base-{1,2,3}.json`): greeting shares 0.10, 0.08, 0.07; every run already
has her say *piacere* and *benvenuto* in later lines, unauthored (no chips).

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Ambient vocabulary** (a new optional encounter field) rather than a prompt clarification that objective words
   may be spoken naturally (1.1's comparison arm): the clarification pushes the narrator towards modelling answers,
   which rounds 007 and 012 removed, and adds an A/B arm's worth of quota.
2. **Ambient words are not answers.** *Piacere* or *mucho gusto* alone does not pass the greeting objective (1.4);
   the grader's rubric is unchanged. A live variant run checks that the grader refuses it without dictating.
3. **Portia may still ask "Come ti chiami?"** before the ask-back objective (1.3): round 012's decision stands;
   this round does not reopen it. Accepted examples stay in the narration data (round 007's design).
4. **Hints:** tapping an ambient word on her newest line spends a hint, as scene words do with every other NPC
   (1.10). Unchanged; noted for the owner's Simulator check.
5. **The sign** (1.6): the shared character sheet's quirk named the Italian *MERCATO*, wrong in the Spanish pack. It
   becomes language-neutral.

## Claim boundary (pre-run)

Live runs measure the share with the script's two rough measures (tokens not in the English translation; tokens
covered by authored matches), on a handful of runs: an indication, not an estimate with error bars.

## Design (pre-run)

1. **Encounter field `ambient_vocabulary_ids`** (optional, non-empty). Loader checks: every id exists, no duplicates,
   none is a target of the encounter's objectives, and no folded surface form of one equals or contains as whole
   words (or is contained in) a folded surface form of a target (1.2). Ambient entries join the encounter's
   `narrationEntries` **one by one**, not their whole file (1.8); the definition gains `ambientEntries`.
2. **Narration prompt:** `prompts/system/base.txt` reads
   `ACTIVE LEARNING DATA: {{language.learningData}}{{language.ambientVocabulary}}`. With ambient entries the variable
   is one new line, `FREE VOCABULARY (authored <language> you may use in any line, including the greeting; it is not
   the answer to any objective, and every rule above about open objectives still applies): [{target, meanings,
   usage}]`, `usage` being the entry's note (agreement, register; 1.5). Without, the empty string: Gerald's pinned
   prompts (`gerald-prompts-r012.json`) stay byte-identical. Both narration calls pass it; the grading prompt does
   not change.
3. **Content.** Italian (`entrance_greetings.yaml` → `entrance-greetings-it-v2`): `benvenuto` (benvenuta, benvenuti,
   benvenute; note on agreement, masculine as the default), `piacere` (on being introduced; also the noun),
   `mercato` (mercati). Spanish (`entrance-greetings-es-v2`): `bienvenido` (bienvenida, bienvenidos, bienvenidas),
   `mucho gusto`, `mercado` (mercados). Treccani / RAE references, not opened from the container. Both tutorials
   list them as `ambient_vocabulary_ids`. No form is an English word (*gusto* alone is, so it is not a variant).
4. **Character sheet:** the sign quirk loses the word *MERCATO*: "Her half-translated sign never says *market* in
   the same language two days running, and she takes questions about it personally."

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 494940b1…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Cause stated as fact; the rules allow objective words in remarks | 0 | Accept the framing; reject the comparison arm | **Accepted in part** (autonomous) | Goal, decision 1 |
| 1.2 | Risk | Distinct ids can still share a target's form | + | Accept: folded surface-form check; prompt keeps the open-objective rules | **Accepted** (autonomous) | Design 1, 2 |
| 1.3 | Risk | Natural dialogue can model later answers ("Come ti chiami?") | 0 | Reject here: round 012's decision; read lines for it | **Rejected** (autonomous) | Decision 3, live reading |
| 1.4 | Risk | *Piacere* as a greeting would fail | 0 | Accept: not an answer; live variant run | **Accepted** (autonomous) | Decision 2, Live runs |
| 1.5 | Risk | Agreement and usage never reach the narrator | + | Accept: note as `usage` | **Accepted** (autonomous) | Design 2 |
| 1.6 | Risk | Spanish prompt carries the Italian sign *MERCATO* | + | Accept: neutral quirk | **Accepted** (autonomous) | Decision 5, Design 4 |
| 1.7 | Gap | Chip test does not exercise a separate ambient file | 0 | Accept: fixture with ambient words in their own file | **Accepted** (autonomous) | Tests |
| 1.8 | Risk | Whole ambient files widen exposure | + | Accept: entries one by one | **Accepted** (autonomous) | Design 1 |
| 1.9 | Gap | Collision claim is not a matcher test | 0 | Accept in part: matcher tests for the new forms; existing *soy*/*yo* out of scope | **Accepted in part** (autonomous) | Tests |
| 1.10 | Risk | Ambient chips spend tutorial hints | − | Reject: same as every NPC's scene words; owner's Simulator check | **Rejected** (autonomous) | Decision 4 |
| 1.11 | Gap | Success criterion too thin | 0 | Accept: both measures, every line, lengths; Spanish baseline | **Accepted** (autonomous) | Live runs |
| 1.12 | Gap | Static checks miss behaviour | 0 | Accept in part: variant run (ambient-only answer); existing service tests | **Accepted in part** (autonomous) | Live runs |

Net change: ambient entries join one by one with a surface-form check, carry usage notes, the sign is neutral, and
the runs report both measures per line with a Spanish baseline and a variant run.

## Tests (pre-run)

- Loader (`server/test/tutorial.test.js` or a new `ambient-vocabulary.test.js`): Portia's ambient entries load in
  both packs; unknown id, duplicate id, target id and a form overlapping a target's form are rejected; a fixture
  with an ambient entry in a separate file adds only that entry to `narrationEntries` (not its siblings).
- Prompt: Portia's greeting and turn prompts contain one FREE VOCABULARY line with the three words and their usage;
  her grading prompt has none; Gerald's golden prompts unchanged.
- Matching: "Benvenuto al mercato!" chips `benvenuto` and `mercato`; English "Welcome to the supermarket, my
  pleasure." chips nothing; Spanish "¡Bienvenida! Mucho gusto." chips `bienvenido` and `mucho_gusto`, "gusto" alone
  nothing. A started tutorial whose fixture greeting uses ambient words puts them in the Spellbook.
- All suites: server, mobile 25/25, web client 12/12 and build.

## Live runs (pre-run)

codex-cli (claude-cli if Codex hits its limit and the shell has the token):

- After the build: 3 Italian tutorial runs, 1 Spanish, and 1 Italian variant run with
  `--lines 'Piacere!|Buongiorno, Portia.|Mi chiamo Robin.|E tu?'` (the first line must fail greet without the
  feedback dictating a greeting).
- Report per line: both share measures, token count, requested ratio, the line verbatim; per run: verdicts against
  the script, ambient words used and chipped, dictation or menus of open targets, feedback leaks.
- Compared with the baseline (3 it + 1 es on HEAD). Target: mean Italian greeting share (not-in-translation) ≥ 0.15
  and a higher per-line mean, verdicts as scripted, no new dictation.

## Outcome (2026-11-05)

Built as designed, with no Amendment. Tests: server 114/114, mobile 25/25, web client 12/12 and build. Live (codex-cli,
9 runs, 65 calls): every run resolved and every scripted line graded as intended; the ambient words appear and are
chipped in every Italian line (E2 done), but the share of target language did not rise (Italian lines 0.17 → 0.16,
greeting 0.08 → 0.12 on three runs; Spanish 0.21 → 0.19): the hypothesis does not explain the gap, and E1 stays open
with a content hypothesis. See [findings](findings.md).
