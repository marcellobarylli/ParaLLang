# Round 006 findings

## Question

Can the server and the app run any number of encounters, one per location, each with its own character, objectives
and vocabulary from the language pack, so that later encounters are content only, while Gerald plays exactly as
before and the frozen web client keeps working?

## Finding

Yes. A second encounter written only as content (a test fixture: Bernard the Charcutier at The Butcher's Stall, with
his own character and vocabulary files) loads, can only be started at its location, is narrated as Bernard at The
Butcher's Stall, grades against its own objective, adds its vocabulary with its own file version, resolves and is
marked complete on the map without touching Gerald's cards. Gerald's narration prompts are byte-identical to round
005 (golden test), and a live Codex playthrough resolved him as before. The frozen web client, which starts an
encounter without naming one, gets the default encounter.

The live run repeated round 005's teaching problem: Gerald tells the player the exact phrase to type, and the grader
then scores the echo quality 2. Two runs out of two.

## Method

- Built to [architecture.md](architecture.md) after Codex critique 1 (10 findings, all accepted autonomously; code
  inlined on stdin because Codex's sandbox cannot start in the container).
- Automated: `node --test server/test/*.test.js`, `npm run test:mobile`, client vitest and build,
  `npx expo export --platform ios`, `git diff --check`.
- Live: Codex CLI 0.166.0 (ChatGPT subscription), CPU, Linux compute node in Apptainer, Italian;
  `node server/scripts/play-market.js --provider codex-cli`, in-process, no port.

## Results

| Check | Result |
|---|---|
| Server tests | 77/77 (73 before; +4 in `encounters.test.js`) |
| Mobile tests | 19/19 (18 before; +1 switch-and-reset test) |
| Web client (frozen) | vitest 12/12, build clean |
| iOS bundle | 653 modules |
| Live 1: map playthrough | 7/7 steps as expected; resolved in 2 turns; map shows Gerald complete; 5 calls |

Gerald's lines (the LLM's actual outputs), with the two share estimates (not in translation; canonical):

| Turn | Requested | Not in translation | Canonical | Line |
|---|---|---|---|---|
| 0 | 0.25 | 0.31 | 0.25 | "Buongiorno. I'm Gerald. This cart: five espresso shots. Milk: a war crime. Un caffè, senza latte?" |
| 1 | 0.30 | 0.30 | 0.20 | "Un caffè—accepted. Three espresso shots for politeness. But specify: senza latte, per favore. Milk is still a war crime." |
| 2 | 0.35 | 0.33 | 0.22 | "Perfetto! Un caffè senza latte. Five espresso shots for your answer. Your coffee—and civilization—are safe. Grazie!" |

Grading: "Vorrei un caffè, per favore." passed `order_coffee` (Vorrei 5, caffè 5); "Senza latte, per favore." passed
`no_milk` with quality 2, feedback "Objective achieved using the prompted Italian expression."

Failures: none against the acceptance criteria.

## Decision

Ships as designed. Next work from the data: B1 (tone layer) with the narration rule against dictating the answer,
re-measured live; after that A3, the first real second encounter (the Market Entrance tutorial), which this engine
now allows as content only.

## Evidence

- Build commit: "round 006: multi-encounter engine". Main paths: `server/src/content-loader.js`,
  `server/src/learning-service.js`, `server/src/world.js`, `server/src/llm/prompt-builder.js`,
  `prompts/encounter/`, `content/languages/*/language.yaml`, `content/languages/*/encounters/`,
  `mobile/src/` (store, API, DialoguePanel, InputBar, MapPanel), `server/test/encounters.test.js`,
  `server/test/fixtures/gerald-prompts-r005.json` (captured before the prompt change).
- Live: [`results/live-1-play-market.json`](results/live-1-play-market.json).
- Design and critique: [architecture.md](architecture.md), [trail/plan-v1.md](trail/plan-v1.md),
  [trail/critique-1.md](trail/critique-1.md). Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

Shown: the engine runs a content-only second encounter in tests; Gerald's prompts are unchanged; one live Gerald
playthrough. Not shown: any real second encounter's teaching quality (none is authored), the app in the iOS
Simulator, claude-cli or Spanish live. `verify:cli` was not re-run (critique 1.10); its grading prompts did not change.

## Open items

1. **Owner, Simulator:** the app's texts now come from the server ("Talk to Gerald", "Reply to Gerald…",
   "Encounter complete"); check them in the Simulator together with round 005's map items.
2. Gerald dictates the answer (B1).
