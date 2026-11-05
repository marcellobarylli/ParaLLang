# Round 005 findings

## Question

Can the Crumbling Market be explored in the iPhone app: six locations joined by paths, with fog of war, the player's
position and visited places saved, and Gerald's encounter entered from The Coffee Cart on the map, without breaking
the Coffee Cart loop or the frozen web client?

## Finding

Yes, as far as automated tests and in-process live runs can show. The six locations load from `content/world/`, the
world API reveals the market as the player walks, and position, visited places and completed encounters survive a
restart (version 1 saves migrate with their Spellbook intact). The app opens on the map and reaches Gerald from The
Coffee Cart in jest. A live Codex playthrough walked the map, resolved Gerald in two turns and saw the map mark the
encounter complete; `verify:cli` still passes 9/9. Nothing was run in an iOS Simulator (none exists here).

The live data shows one teaching problem not caused by this round: Gerald **dictates the answer** ("Say: 'Senza
latte, per favore.'") after a partial order, and the grader then scores the echoed phrase quality 2. The
target-language share of Gerald's lines is roughly on target for the first two turns and overshoots on the
victory line.

## Method

- Built to [architecture.md](architecture.md) after Codex critique 2 (critique 1 could not run: Codex's sandbox
  fails in the Apptainer container; critique 2 got the code inlined on stdin). No owner: dispositions are autonomous
  decisions pending owner review.
- Automated: `node --test server/test/*.test.js`, `npm run test:mobile`, client vitest and build,
  `npx expo-doctor`, `npx expo export --platform ios`, `git diff --check`.
- Live: Codex CLI 0.166.0 on the ChatGPT subscription (`check:provider`: 0 inference requests), CPU, Linux compute
  node inside an Apptainer container, Italian (`TARGET_LANGUAGE` unset, default `it`), no `.env`.
  `play-market.js` ran in-process (no port); `verify:cli` bound an ephemeral 127.0.0.1 server protected by a
  random `PARALLANG_TOKEN`.

## Results

| Check | Result |
|---|---|
| Server tests | 73/73 (65 before; +7 `world.test.js`, +1 `play-market.test.js`) |
| Mobile tests | 18/18 (15 before; the UI flow now starts on the map; +3 store tests) |
| Web client (frozen) | vitest 12/12, build clean |
| iOS bundle | `expo export --platform ios` bundled 653 modules |
| `expo-doctor` | 19/20: the SDK version check wants expo ~58.0.23 and react-native-safe-area-context ~5.11.1. New upstream releases; this round changed no dependency (backlog D4) |
| Live 1: provider | codex-cli, ChatGPT subscription, isolation controls present, 0 inference requests |
| Live 2: map playthrough | 7/7 steps as expected; resolved; map shows `imp_coffee_greeting` completed; 5 generation calls |
| Live 3: `verify:cli` | passed; grading 9/9; encounter resolved in 2 turns, 33.8 s; 14/14 calls |

Live 2 steps: start at `market_entrance` with `butchers_stall` and `coffee_cart` known; a move to `the_rift`
rejected `NOT_ADJACENT`; the move to `coffee_cart` made the entrance `visited` and revealed `cracked_fountain`;
"Vorrei un caffè, per favore." passed `order_coffee` (vorrei 5, caffè 5) and not yet `no_milk`; "Senza latte, per
favore." passed `no_milk` (senza latte, quality 2).

Gerald's lines in Live 2 (the LLM's actual outputs) with the share estimates (tokens not in the English
translation; tokens covered by canonical vocabulary):

| Turn | Requested | Not in translation | Canonical | Line |
|---|---|---|---|---|
| 0 | 0.25 | 0.24 | 0.19 | "Buongiorno. I'm Gerald. This market: one espresso shot. My coffee: five. Un caffè? Senza latte, naturally. Milk is a war crime." |
| 1 | 0.30 | 0.25 | 0.17 | "Un caffè, yes. Three espresso shots for politeness. But you haven't specified without milk. Say: 'Senza latte, per favore.' Let's prevent a dairy atrocity." |
| 2 | 0.35 | 0.50 | 0.28 | "Perfetto! Un caffè senza latte. Four espresso shots for you. Civilisation survives another order. Ecco il tuo caffè!" |

Narration (English) kept the dry tone, e.g. "Gerald the imp polishes a cup as though the market's collapse is a
service complaint." Grading feedback: "Coffee ordered correctly; specify senza latte or caffè nero to request no
milk." and "Correct order, with assistance from the explicit model phrase."

Failures: none against the acceptance criteria. Problems seen: the dictated answer (both live encounters capped the
echoed "Senza latte" at quality 2, as round 003 item 4 predicted), and the share estimates are crude ("espresso"
counts as English because it appears in the translation).

## Decision

The round ships as designed. Departures: the build was drafted in the working tree while critique 2 ran, before the
freeze, then revised to the dispositions and committed after it (journal row 7). Next work, chosen from the data:
A2 (the multi-encounter engine) stays next, since every later encounter needs it; the dictated-answer problem goes
into B1 as a narration rule ("never give the player the exact phrase to type"), with a live re-measure of the
quality-2 echo.

## Evidence

- Build commit: "round 005: Crumbling Market map, world API and saved navigation". Main paths: `content/world/`,
  `server/src/world.js`, `server/src/content-loader.js`, `server/src/learning-storage.js`,
  `server/src/learning-service.js`, `server/src/app.js`, `server/scripts/play-market.js`,
  `server/scripts/verify-cli.js`, `mobile/src/components/MapPanel.js`, `mobile/src/stores/gameStore.js`,
  `mobile/App.js`, tests, README.
- Live: [`results/live-1-check-provider.txt`](results/live-1-check-provider.txt),
  [`results/live-2-play-market.json`](results/live-2-play-market.json) (every raw LLM output),
  [`results/live-3-verify-cli.json`](results/live-3-verify-cli.json).
- Design and critiques: [architecture.md](architecture.md), [trail/plan-v1.md](trail/plan-v1.md),
  [trail/plan-v2.md](trail/plan-v2.md), [trail/critique-1.md](trail/critique-1.md),
  [trail/critique-2.md](trail/critique-2.md). Timeline: [trail/journal.md](trail/journal.md).
- Autonomous decisions: [`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

## Claim boundary

Shown: the content, server behaviour and app logic as tested; the iOS bundle builds; one live map playthrough and
one `verify:cli` run with codex-cli in Italian. Not shown: how the map looks, lays out or responds to touch in the
iOS Simulator or on a device (the map's node positions use a 320-point fallback until layout, untested on screen);
claude-cli, Spanish or other providers live; the frozen web client against a map (it has none); the share
estimates as a real language-identification measure.

## Open items

1. **Owner, Simulator:** open the app in the iOS Simulator and check the map: node labels do not overlap or clip at
   iPhone widths, paths join the dots, tapping a neighbour walks there, "Talk to Gerald" opens the encounter, the
   Spellbook returns to the right screen, and "✓ Encounter complete" appears after the order.
2. **Owner:** review the six location descriptions (`content/world/locations/`) and the autonomous decisions.
3. Gerald dictates the answer; fold a narration rule into B1 and re-measure.
4. `expo-doctor` 19/20 (backlog D4).
