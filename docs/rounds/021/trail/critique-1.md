# Codex critique 1: party recruitment (A8a) and the start route

- **Dispatched:** 16:32:48 (a first dispatch at 16:32:25 failed: "Not inside a trusted directory and --skip-git-repo-check was not specified"; no output)
- **Returned:** 16:33:52
- **Model:** codex exec (model gpt-6.1-sol, provider openai), `--skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, run from /tmp/r021 with the bundle on stdin; session id 01a1ac8e-4bb2-7ac1-a006-ff7d63006da8
- **Prompt:** "You are an adversarial reviewer. Do NOT run any commands or read files: everything you need is on stdin, a bundle of cat -n copies of a plan (docs/rounds/021/trail/plan-v1.md) and the relevant source files of ParaLLang, a language-learning game (Node/Express server, Expo app). Critique the plan: find errors (things that would be wrong, break existing behaviour, or are unsafe), risks, and missing tests. Number each finding 1.1, 1.2, ... and label each Error, Risk or Suggestion, with a concrete fix. Put optional nice-to-haves under a final 'Optional' heading, unnumbered. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 2c0b93e3…, inside a bundle (sha256 0eac78fb…, 1296 lines) of: plan-v1.md, server/src/routes/encounter.js, server/src/app.js, server/src/learning-storage.js, server/src/learning-service.js, server/src/world.js, mobile/src/stores/gameStore.js, mobile/App.js, mobile/src/components/DialoguePanel.js, content/characters/enemies/imp_coffee.yaml; HEAD 0b83e7e, working tree: `docs/rounds/021/` untracked (bundle taken before any code was drafted)
- **Findings:** 8

## Raw output (verbatim)

```text
1.1 **Error — Map recruitment lacks the required API fields.** `worldSnapshot` exposes only encounter `id`, `completed`, and `characterName` (`world.js:55–59`). The map cannot determine saveability. Add `saveable` to the world encounter payload and test that completed, non-saveable NPCs never get an Invite button.

1.2 **Risk — Membership identity is incomplete in the UI contract.** Party membership is unique by `characterId`, but serialized encounters expose no character ID. Comparing encounter IDs can offer recruitment again when another encounter features the same character. Expose `character.id` and world encounter `characterId`; test membership across two encounters for one character.

1.3 **Risk — Content changes can misidentify saved members.** `partySnapshot` checks only whether the saved encounter still exists. If that encounter now references another character, it could display the wrong NPC. Require the definition’s character ID to match the saved `characterId`; preserve and hide mismatched entries, with a regression test.

1.4 **Risk — Recruitment failure and concurrency coverage is missing.** Sequential idempotency does not prove that simultaneous requests append once or that recruitment preserves concurrent dialogue/world saves. Clone the envelope inside the existing learner lock and publish success only after saving. Test concurrent recruitment, recruitment alongside another mutation, failed writes, and retry after a committed response is lost.

1.5 **Suggestion — Expand migration and corruption tests.** The plan tests v2 migration but also changes v1 migration and fresh saves. Test both, persistence after reload, and preservation of Spellbook receipts and world progress. Cover missing/non-array party, null members, duplicate character IDs, invalid timestamps, and verify rejected files remain unchanged.

1.6 **Risk — New mobile requests need stale-response protection.** Recruitment must capture the learner and request epoch before awaiting, then guard both success and failure updates. Include party in learner snapshots/reset behavior; existing snapshot replacements omit it. Test delayed recruitment across a learner switch, failure/retry, and prevention of duplicate taps.

1.7 **Suggestion — Protect the start route’s compatibility contract.** Add HTTP tests for omitted `encounterId` retaining the frozen web client’s default-anywhere behavior, malformed IDs returning 400, and sealed encounters remaining blocked. Exercise restart and resume with explicit IDs as well as the proposed right/wrong-location cases.

1.8 **Suggestion — Test the explicitly allowed active-encounter behavior.** Recruit a previously defeated character while another encounter is ongoing; assert that encounter ID, version, transcript, reveals, and protected translations remain unchanged and no provider call occurs. Also verify membership survives service recreation and Leave permits a later map invitation.

## Optional

Add navigation tests for Party ↔ Spellbook/review transitions, defining what happens to the return destination and any active review.
```
