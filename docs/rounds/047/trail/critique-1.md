# Codex critique 1: relationship tiers (round 047)

- **Dispatched:** 2026-11-05T21:10:14Z
- **Returned:** 2026-11-05T21:11:59Z
- **Model:** codex-cli 0.166.0, gpt-6.1-sol, `codex exec --sandbox read-only --skip-git-repo-check -c model_reasoning_effort=high`, read-only; session id 01a1ad8c-4973-7b10-b28d-598d08127e90
- **Prompt:** verbatim in `../results/critique-prompt.txt`; the bundle on stdin is `../results/critique-bundle.txt` (453 lines, sha256 bafa558b…)
- **Reviewed input:** `plan-v1.md`, sha256 dad5fbb1…, HEAD 0e56861, working tree: docs/rounds/047/ only
- **Findings:** 8

## Raw output (verbatim)

```text
codex
1. **Error — Existing conversations can lose their resume button.** An old save can have `gerald_coffee_break` ongoing with count ≥3. The new snapshot selects `gerald_confidence`, so `PartyPanel` disables Talk because its ID differs from the ongoing encounter. The same happens when an earlier tier is started through the API. Fix the panel to resume the ongoing conversation for that member, using its actual encounter ID.

2. **Error — `conversationNew` does not mean “not played yet.”** Finishing the base tier at count 3 clears the flag without playing the deeper tier; existing players with count ≥4 never get the announcement. Track completed tier IDs separately, treating newly introduced tiers as unplayed in old saves. Alternatively, remove the unread claim and show a persistent “A deeper conversation is available” hint.

3. **Risk — Thresholds use inconsistent member identity.** Snapshot and fragment logic identify members by home encounter plus character, while start authorization and completion counting use character alone. Multiple homes for one character—or retained members from another pack—could authorize or credit the wrong relationship. Use `isHomeMember` consistently for authorization, threshold lookup, and counting, or explicitly enforce and test a stronger uniqueness invariant.

4. **Risk — The Spanish targets repeat the English-word trap.** `amigo` and `amigos` occur in ordinary English (“Thanks, amigo”), so excluding Italian `salute` does not establish that these targets are safe. Test those English sentences against both chipping and assessment. Require a Spanish construction such as “eres mi amigo” if language use must be distinguishable, or choose another target.

5. **Risk — Accepted forms need semantic and agreement rules.** Listing `amica`, `amici`, `amiga`, and `amigos` leaves unclear whether the player describes Gerald, themselves, or several people. Token presence must not make “Gerald is not my amigo” or a quoted definition pass. Specify the permitted perspectives and agreement, following the existing YAML’s constraints and positive/negative examples; test both objectives independently, including English-only toasts.

6. **Risk — Unlocking a fragment does not establish that Gerald recited it.** The supplied service derives fragment availability from the count; it records no reading or recitation. Consequently, the deeper conversation may refer to a passage the player has never encountered. Make the opening understandable without reading the fragment, or introduce the relevant story context there without revealing either objective’s answer.

7. **Risk — Leak checks need to cover the whole conversation.** An opening-only check can miss Gerald saying “amico,” an accepted inflection, or the toast while responding to the failed English attempt or advancing objectives. Scan every player-visible NPC line for all accepted forms and phrases, including spaced/combined `cin cin` variants, until the relevant objective is completed.

8. **Risk — Compatibility and loader coverage miss critical cases.** The tests do not explicitly cover a threshold-only home with no base tier, encounter ordering, or loading a pre-047 save with an ongoing conversation. Add those cases, verify maximum eligible threshold selection independently of file order, and confirm that adding vocabulary preserves existing per-entry learning progress rather than merely updating aggregate version pins.

### Optional

`conversationTier` has no proposed UI consumer. Keep it internal unless clients need it; the selected `conversationId` already supplies the behavior.
```
