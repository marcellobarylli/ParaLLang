# Round 103 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Source:** iteration 29's candidates: the web client (`client/`, frozen since round 004, never reviewed; it only
  has to keep working). Its 12 vitest tests mock the API, so nothing shows it still plays against today's server. A
  probe (in-process server, the client's real store and API module) played start → send → resolve → Spellbook →
  review → restart without an error.
- **Offline round:** no LLM call (FixtureProvider). Critic: a fresh read-only subagent (Codex limited until
  2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/test/web-client.test.js`, `client/src/components/Spellbook.jsx` and its test.

## Goal (pre-run)

A test in the server suite plays the web client's own store and API module against the real server and checks the
fields its components read; the web Spellbook follows round 017's rule.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The contract test** `server/test/web-client.test.js`: `createRuntime()` (127.0.0.1, port 0, random token,
   FixtureProvider, Spanish), the client's unmodified `createGameStore` and `learningApi`, and `globalThis.fetch`
   replaced by a wrapper that prefixes the base URL to paths starting with `/` and adds the token header; restored in
   `after`. The import resolves `zustand` (and its `react` import) from the root `node_modules` (hoisted;
   `client/node_modules` is empty) (critique 1.7).
2. **The token (critique 1.1).** The web client sends no token and its Vite proxy adds none, so under
   `PARALLANG_TOKEN` every request is 401; the sandbox only allows token-protected servers, so the test adds it. One
   test shows the gap: without the header, `initialize` ends with the store's error and no learner. No client change
   (the client is frozen; the app has the same open owner item since round 039); recorded as an open item.
3. **Fields the components read are asserted (critique 1.3):** `assessment.overallFeedback`,
   `objectiveResults[].objectiveId/passed/feedback`; `currentObjective.prompt`, `difficulty`,
   `hints.remaining/limit`, `hints_available`, `protected`, player `text`; `dialogue.translation`,
   `words[].vocabularyId/canonicalTarget/meaning/partOfSpeech`; the review challenge `id/target/practice` and result
   `feedback/canonicalAnswer/effectiveQuality/nextReviewAt`; cards `meanings/partOfSpeech/mastery/due/nextReviewAt`,
   `dueCount`; `language.tag/name`.
4. **The play (critique 1.4, 1.5):** initialize (Gerald's encounter, ongoing); a review during it fails with the
   `IN_ENCOUNTER` message; a word help on a chip of the active NPC line (`hints.used` 1); send "Quiero un café
   negro." → resolved; review a named card (answer wrong, the result fields; `practice` asserted as the server
   says); a reveal on a named card; restartEncounter → a new ongoing encounter; a second store on the same Map storage
   recovers the same learner and the same encounter id.
5. **A stale version (critique 1.6):** a direct help call for the same learner moves the version; the store's send
   then shows the stale message and keeps the draft and the pending input.
6. **The web Spellbook follows round 017 (critique 1.2).** It showed meanings during an encounter and on due cards
   (the answer of the card's review) and a Review button that the server refuses during an encounter. Minimal change:
   meanings hidden while `spellbook.inEncounter` or the card is due; no Review button in an encounter; the line
   "Meanings are hidden and reviews wait while an encounter is under way." A client vitest covers both. Round 090's
   finer rules (other cards' forms) stay app-only.
7. **Mutation (critique 1.6):** a wrapper that drops one field the components read (`hints`, `challenge.id`) must
   fail the test; the token and route mutations are cut.
8. **Not covered (Optionals):** the Italian path (FixtureProvider is Spanish); the header's hardcoded Gerald / Coffee
   Cart (right for `imp_coffee_greeting` in both packs); real server fixtures for the component tests (cut).

## Claim boundary (pre-run)

The store and API module against the in-process server with a fixture provider, in Spanish; no browser, no Vite
proxy, no rendering of the real responses.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 e45fdb48…; a fresh general-purpose subagent (claude-opus-5-5), read-only,
in place of Codex; raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The client sends no token; the wrapper hides it | + | Accept: a test shows the 401; no client change, open item | **Accepted** (autonomous decision, pending owner review) | Decision 2 |
| 1.2 | Gap | The web Spellbook shows meanings during an encounter | + | Accept: minimal client fix and a test | **Accepted** (autonomous, pending owner review) | Decision 6 |
| 1.3 | Gap | Fields the components read are not asserted | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.4 | Gap | The review step assumes two due cards | + | Accept: named cards, IN_ENCOUNTER, `practice` | **Accepted** (autonomous, pending owner review) | Decision 4 |
| 1.5 | Gap | Recovery: same learner and encounter, Map storage | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 4 |
| 1.6 | Cut | The mutations test the wrapper, not the contract | + | Accept: a stale version test and a field-drop mutation | **Accepted** (autonomous, pending owner review) | Decisions 5, 7 |
| 1.7 | Error | zustand resolves from the root, and imports react | 0 | Accept: stated | **Accepted** (autonomous, pending owner review) | Decision 1 |

**Optionals:** real fixtures for the component tests: cut; Gerald coupling and the Italian path: noted (Decision 8);
`client/dist` gitignored: checked.

## Tests (pre-run)

- `server/test/web-client.test.js`: the play (Decision 4) with the field checks (Decision 3), the stale version
  (Decision 5), the missing token (Decision 2).
- `client/src/components/__tests__/spellbook.test.jsx`: in an encounter, no meanings, no Review, the line; out of it,
  a due card's meanings hidden with Review shown, a card not due shows its meanings.
- Mutations: the field drop (Decision 7); the Spellbook's two hides removed in turn.
- Full suites; `npm run build` in `client/`.
