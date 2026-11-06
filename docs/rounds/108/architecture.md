# Round 108 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (raw review, journal) is in
`trail/`; it is not needed to implement this round.

- **Source:** a second review of rounds 105–107's code by a fresh read-only subagent (Codex limited until 2026-11-09
  17:32 UTC): 4 findings, raw text in [`trail/review-1.md`](trail/review-1.md). No Error.
- **Offline round:** no LLM call; config, a dependency declaration, tests, a comment.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/vite.config.js`, `client/package.json` (and the lockfile), `client/src/__tests__/proxy.test.js`,
  `server/test/spellbook-withheld.test.js`, `server/scripts/play-market.js`.

## Goal (pre-run)

`vite preview` stays without the token proxy, as round 105 decided; the client declares what its config imports;
every route that returns a Spellbook is tested for the withholding; play-market's tagging assumption is written down.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

| # | Severity | Finding | Recommendation | Change | Disposition | Decision |
|---|---|---|---|---|---|---|
| R1.1 | Minor | `vite preview` resolves with `command === 'serve'` and falls back to `server.proxy`, so it builds the token proxy (round 105 decision 4 says preview is unchanged) | Gate on `!isPreview` | `server.proxy` only when `command === 'serve' && !isPreview && mode !== 'test'`; a test calls the config function for dev, preview, build and test | **Accepted** (autonomous, pending owner review) | 1 |
| R1.2 | Minor | The client imports `dotenv` without declaring it (hoisted from the server) | Declare it | `dotenv` `^16.5.0` in the client's devDependencies (the server's range) | **Accepted** (autonomous, pending owner review) | 2 |
| R1.3 | Gap | Review, review submit, move and reveal responses have no withholding test | One test over them | A test: during an encounter, the sentence reveal (charged and already revealed) and a move's Spellbook are withheld; outside one, the review challenge's snapshot withholds the challenged due card, and the submit's snapshot after a correct answer shows it once not due. Receipt replay after a new start and party conversations: not added (replays return the stored response without a Spellbook since round 093; party starts go through the same `_startEncounter` path as the tested start) | **Accepted in part** (autonomous, pending owner review) | 3 |
| R1.4 | Gap | play-market tags new NPC lines only on a successful step; a step that committed and then threw would misattribute its line | Note the assumption | A comment at `markCommitted` | **Accepted** (autonomous, pending owner review) | 4 |

1. **R1.1:** as in the table; the `--host` consequence (anyone reaching the dev server gets the token's access) is
   noted in the config comment; the README is not changed (the web client is frozen and the dev server binds
   localhost by default).
2. **R1.2:** installed with `npm install -D dotenv@^16.5.0 -w client` (registry only).
3. **R1.3:** as in the table.
4. **R1.4:** as in the table; no code change.

## Tests (pre-run)

- `client/src/__tests__/proxy.test.js`: the config function gives a proxy for `serve` (development) only, not for
  preview, build or test.
- `server/test/spellbook-withheld.test.js`: the new test of R1.3.
- Mutation: dropping `!isPreview` fails the client test.
- Full suites: server, client, mobile.
