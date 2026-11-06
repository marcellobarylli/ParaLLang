# Round 092 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (review, plan as sent, raw
critique, journal) is in `trail/`; it is not needed to implement this round.

- **Source:** an independent read-only review, at HEAD, of the core server paths built in rounds 001–016 (language
  engine, world, routes and the token check, the turn, help, review and move paths),
  [`trail/review-1.md`](trail/review-1.md): one Error, four Gaps, two Minor, checked by hand at HEAD. The Error: with
  `PARALLANG_TOKEN` set, `requireToken` skips any path not starting with `/api/` case-sensitively, while Express 5
  (5.2.1) routes case-insensitively, so `/API/world` reaches the handler without the token (reproduced in-process).
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/app.js`, `server/src/learning-service.js`, tests.

## Goal (pre-run)

With a token set, no request but the health check reaches the service without it; grader evidence counts only where
the entry stands in the answer as a word; a reveal in an ordered encounter caps every objective graded that turn.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The token by default (R1.1, critique 1.3).** With a token set, every request needs it except the health check,
   recognised as `req.path.toLowerCase().replace(/\/+$/, '') === '/api/health'`. The check no longer depends on how
   the router matches, so `/API`, `//api`, `/%61pi` and the like are covered. CORS preflights are still answered by
   `cors()` before the check. Behaviour change: an unknown path is 401, not 404, without the token. The Express
   settings are not changed (the allowlist is enough; the Optional is rejected).
2. **Evidence in context (R1.2, critique 1.1, 1.2).** A grader's evidence also needs a match of its entry alone in
   the answer (`matchCanonicalVocabulary(playerInput, [entry])`, so a longer overlapping entry such as *caffè nero*
   does not hide *caffè*) whose folded excerpt equals the folded evidence. The only answers newly refused are forms
   glued inside a longer word ("pane" in "panettone"), which the authored-forms rule never accepted. A refusal is the
   existing retryable INVALID_GRADING; a grader that keeps quoting that way keeps the player retrying (stated).
3. **The cap (R1.6, critique 1.4).** Ordered encounters use `anyReveal` too (in an ordered encounter only the current
   objective can have reveals, so it is the same condition); held and failed evidence is capped in the record as
   well, which changes no schedule (only closing evidence schedules).
4. **Rejected:** R1.3 (the review response's Spellbook carries the challenged card's meanings: by design since round
   017, the app hides; no Spellbook shows during a review); R1.4 (an earlier NPC line's translation shows while its
   objective is open: round 001's design, NPC lines never dictate the answer; owner question); R1.7 (a review reveal
   is quality 0, a wrong answer 2: SM-2's scale; owner question).
5. **Deferred (R1.5):** dialogue receipts are never pruned, so the save grows with every turn; backlog **F13**, which
   measures save sizes first (pruning changes replay safety).

## Design (pre-run)

1. `app.js` `requireToken`: the health test above, else the header check; comment updated.
2. `learning-service.js` `submitDialogue` evidence loop: `inContext = matchCanonicalVocabulary(playerInput,
   [entry]).some((match) => foldEvidenceText(match.excerpt) === foldEvidenceText(evidence.evidence))`, required with
   the existing checks.
3. The cap: `const assisted = anyReveal;` for both kinds of encounter.

## Claim boundary (pre-run)

Tests only. The token check is an allowlist of one path; it says nothing about who knows the token.

## Second opinion (pre-run)

Source review: [`trail/review-1.md`](trail/review-1.md) (7 findings). Critiqued draft: `trail/plan-v1.md`, sha256
3ea9f470…; a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex; raw text in
[`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Error | The token check is bypassed by the URL's case | + | Accept: token by default | **Accepted** (autonomous decision, pending owner review) | Decision 1 |
| R1.2 | Gap | Grader evidence is checked out of context ("pane" in "panettone") | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 2 |
| R1.3 | Gap | The review response's Spellbook carries the challenged card's meanings | − | Reject: by design (round 017) | **Rejected** (autonomous, pending owner review) | Decision 4 |
| R1.4 | Gap | An earlier line's translation shows while its objective is open | − | Reject: round 001's design; owner question | **Rejected** (autonomous, pending owner review) | Decision 4 |
| R1.5 | Gap | Dialogue receipts are never pruned | 0 | Defer: backlog F13, measure first | **Deferred** (autonomous, pending owner review) | Decision 5 |
| R1.6 | Minor | A reveal caps only the current objective in an ordered encounter | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 3 |
| R1.7 | Minor | A review reveal scores worse than a wrong guess | − | Reject: SM-2's scale; owner question | **Rejected** (autonomous, pending owner review) | Decision 4 |
| 1.1 | Error | The entry-in-answer check does not tie the evidence to its place | + | Accept: the match's excerpt equals the evidence | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.2 | Gap | Which correct answers could be refused; what the player sees | 0 | Accept: stated, message tested | **Accepted** (autonomous, pending owner review) | Decision 2, Tests |
| 1.3 | Gap | HEAD, OPTIONS, `/API/HEALTH/`, 401 for unknown paths, the comment | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 1, Tests |
| 1.4 | Gap | Held and failed evidence capped too; use `anyReveal` | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.5 | Cut | The rejections are reasonable; decisions rows; a backlog id for R1.5 | − | Accept | **Accepted** (autonomous, pending owner review) | Decisions 4, 5 |
| 1.6 | Gap | Check existing grading stubs; a mutation for the *caffè nero* case | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |

**Optionals:** `case sensitive routing` and `strict` as a second layer: rejected (the allowlist does not depend on
routing).

## Tests (pre-run)

- `server/test/world.test.js` (the token test): without the token `/API/world`, `/Api/onboarding`, `/api/world/`,
  `HEAD /API/world` and `/nope` are 401; `/API/HEALTH/` and `/api/health/` are 200; an OPTIONS preflight on
  `/API/world` is 204; with the token `/API/world` passes the check.
- server (Italian): a grader quoting "pane" from "vorrei un panettone" is INVALID_GRADING with the existing message;
  "caffè" quoted from "un caffè nero" still passes for *caffe* (a test that fails if the entry is matched with the
  whole pack); existing grading stubs pass unchanged.
- server: an ordered encounter, a sentence reveal on the first objective, one turn closing the first and second: both
  capped at 2.
- Full suites; each fix removed in turn fails a test.
