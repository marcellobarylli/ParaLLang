# Round 012 findings

## Question

Does one narration style rule ("never offer an open objective's target words as options to choose from") stop NPCs
listing the passing answers, as Mortimer did after a wrong request in 3/3 runs (round 010) and Flick once in Spanish
(round 011), without changing verdicts or bringing dictation back?

## Finding

Yes, in this sample. In the four after runs where a menu had appeared before (butcher it ×2, es ×1; fountain es ×1)
no NPC line offered the targets as a list or an either/or question: 0/4, against 4/4 in the baseline runs at the same
prompt without the rule. Mortimer now answers the ham request with an open question ("Ma vuole una carne diversa?
What meat would you like that isn't ham?", "¿Qué carne quieres? Necesito otro nombre."), and Flick asks "¿Por dónde
seguimos?" instead of "¿A la izquierda o a la derecha?". Every run resolved with the same verdicts as rounds 009–011,
and none of the 29 NPC lines dictated an answer. Gerald and Portia played as before; Portia did not ask "Come ti
chiami?" in this run (she had in 3/4 in round 009), so whether the rule also reduced that is not known.

## Method

- Built to [architecture.md](architecture.md) after Codex critique 1 (1 Cut, rejected autonomously).
- Live: Codex CLI 0.166.0 (ChatGPT subscription, CLI default model), CPU, Linux compute node in Apptainer,
  `node server/scripts/play-market.js --provider codex-cli --location <place>` in-process, with each location's
  scripted lines (ham, a real meat, a bare unit, a quantity; look, stop, English, left, tomorrow, now; Gerald's order;
  Portia's greeting, name, ask-back).
- Baseline: round 010's after runs (`docs/rounds/010/results/after-butcher-*.json`) and round 011's runs
  (`docs/rounds/011/results/`), the same narration prompt minus the new rule. Every NPC line read and classified as
  menu yes/no and dictation yes/no.

## Results

| Check | Result |
|---|---|
| Server tests | 88/88 (golden test on `gerald-prompts-r012.json`, asserts the new rule) |
| Mobile / web client | 20/20; 12/12 and build (no app changes) |
| Runs resolved | 6/6 (butcher 3, fountain 1, Gerald 1, tutorial 1) |
| Verdicts as scripted | 23/23 assessments |
| Menus of an open objective's targets | 0/4 runs after; 4/4 baseline |
| Dictation | 0/29 NPC lines |
| Portia's "Come ti chiami?" before ask-back | 0/1 (round 009: 3/4) |
| Target-language share | butcher 0.26–0.59, fountain 0.14–0.65, Gerald 0.13–0.35, Portia 0.05–0.22 per line |

Representative lines (verbatim). `results/butcher-it-1.json`, after the ham request: "Prosciutto? Certo! Everything
here is certified ham. Ma vuole una carne diversa dal prosciutto. Che cosa desidera? Be specific; my taxonomy can
take it." `results/fountain-es-1.json`, after "¡Quieto!": "¡Vale, estoy quieto! Pero ¿adónde voy? What has two paths
and—wait, moving dust. Your stopping skills: ten out of ten. ¿Por dónde seguimos?" `results/gerald-it-1.json`, after
the order: "Un caffè, certo. Four espresso shots for politeness; no notes. Come vuoi il caffè? Milk is a war crime, but
apparently I must ask."

## Decision

Ships. Backlog E3 is done. Portia's opening shares (0.05–0.22 against 0.20) and Gerald's opener (0.13 against 0.25)
are low again, which is backlog E1; Mortimer and Flick sit near or above the request. Next: A6, the Old Bookshop
(with B2, Journathan), or E1.

## Evidence

- Build commit: "round 012: narration rule against menus of an open objective's answers"
  (`content/narration/style_guide.yaml`, `server/test/fixtures/gerald-prompts-r012.json`,
  `server/test/encounters.test.js`). The r007 fixture's removal landed in "round 012: pre-run record" (journal row 9).
- Live: [`results/butcher-it-1.json`](results/butcher-it-1.json), [`results/butcher-it-2.json`](results/butcher-it-2.json),
  [`results/butcher-es-1.json`](results/butcher-es-1.json), [`results/fountain-es-1.json`](results/fountain-es-1.json),
  [`results/gerald-it-1.json`](results/gerald-it-1.json), [`results/tutorial-it-1.json`](results/tutorial-it-1.json).
- Design and critique: [architecture.md](architecture.md), [trail/plan-v1.md](trail/plan-v1.md),
  [trail/critique-1.md](trail/critique-1.md). Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

Shown: codex-cli, one scripted line sequence per encounter, four after runs against four baseline runs. Not shown: a
rate in general (small samples; the baseline is from other sessions), claude-cli, free-form answers, the app in the
iOS Simulator, or teaching quality as a learner or the owner would judge it.

## Open items

1. Owner, teaching choice: menus of the answers are now banned in narration (autonomous decision); Portia may still
   model "Come ti chiami?" (round 009 open item 3).
2. Owner, Simulator: no app changes; nothing new to check beyond earlier rounds.
