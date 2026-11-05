# Critique 1: a Party-screen hint for the next story (Claude subagent; Codex at its usage limit)

- **Dispatched:** unknown, between 20:16:16 and 20:16:40 UTC
- **Returned:** unknown, before 20:18:05 UTC (90 s after dispatch by the agent's own duration)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only by instruction, repo access
- **Prompt:** adversarial read-only review of `docs/rounds/043/trail/plan-v1.md` and the code it touches
  (learning-service.js partySnapshot and journeyFragments, content-loader.js, both fragments.yaml, party and
  lore-fragments server tests, PartyPanel.js, the mobile party test, round 032's architecture); numbered Error /
  Risk / Suggestion items with fixes, Optional unnumbered, under 500 words
- **Reviewed input:** `plan-v1.md`, sha256 cc4e28cfe6af2fe864d963500f75b930e61bfd05968c2152ce6d132ab6aa41a5, HEAD
  7b5d605, working tree: docs/rounds/043/ and a draft (learning-service.js, PartyPanel.js, two server tests) written
  during the critique
- **Findings:** 8 (0 Errors, 2 Risks, 6 Suggestions)

## Raw output (verbatim)

```text
I found no blocking errors in the plan. The implementation already in the working tree matches it, so I checked that diff as well. What's left are two risks and some suggestions.

1. **Suggestion: share one matching rule with `journeyFragments`.** `storyProgress` matches fragments by `found_after === member.encounterId` only. `journeyFragments` also checks `characterId`. They agree today only because `partySnapshot` already drops members whose `characterId` doesn't match the content. A later refactor could make the hint and the Spellbook disagree. Fix: pull out one helper, `memberFragments(homeId)`, and use it in both methods.

2. **Risk: the party isn't in the resolving turn's response, so the hint can go stale.** `sendDialogue`'s response carries `encounter`, `assessment` and `spellbook` but no `party`. The store refetches `getParty` after a resolve, but if that call fails it swallows the error. The Party screen then keeps saying "1 more conversation…" while the Spellbook already shows the story. Fix: add `party: this.partySnapshot(stagedEnvelope)` to the resolving response and have the store use it. Or refetch the party when the Party screen opens.

3. **Suggestion: the told line is singular and ignores mixed states.** If a member has several conversation fragments and all are found, it still says "has told you a story". Fix: say "has told you N stories" when `storiesTold > 1`. When one story is found and another is pending, consider showing both facts, or at least test that only the countdown shows.

4. **Suggestion: "conversations" really means finished conversations.** The count only goes up when a party conversation resolves (`learning-service.js:548-550`). Leaving partway through counts for nothing, so the hint can feel wrong. Fix: "2 more finished conversations until Gerald tells you a story", or say so in the decision record.

5. **Suggestion: the "member without conversation fragments" case doesn't exist in the content.** In both packs every recruitable member with a party conversation has an `after_conversations` fragment: Gerald, Mortimer, Flick and Marginalia. The current test calls `storyProgress` directly on `market_entrance_tutorial`, which bypasses `partySnapshot`. The two-threshold case uses `storyProgress.call({content:{fragments}})`, which breaks as soon as the method touches anything else on `this`. Fix: build the content with an edited fragments list through a fixture (the loader tests already do this) and test through `/api/party`.

6. **Risk: VoiceOver can't be checked here.** On iOS, a `View` with `aria-label` but without `accessible` normally lets VoiceOver read the children, so the hint should be heard. But nothing here can confirm that. The existing test uses `getByLabelText` on the card, which passes whether or not the hint is reachable. Fix: test with `getByText(hint)`. List "VoiceOver reads the hint on the Party card" as an open item for the owner (Simulator). Don't fold the hint into the card's `aria-label` unless the card is deliberately made `accessible`.

7. **Suggestion: test both language packs.** The new server test only runs `it`. The packs are meant to stay identical in English (`lore-fragments.test.js:33`), but a quick loop over `['it', 'es']` would catch drift.

8. **Suggestion: the mobile tests in the plan aren't written yet.** Add the cases listed in the plan: 2 left, 1 left, the told line, no fields, and `nextStoryAt` null with 0 told. Add one for `nextStoryAt <= conversations` too (no line), which the `> count` guard covers.

**Optional**
- `PartyPanel` calls `storyHint(member)` twice per member. Compute it once.
- The decision says "once every such fragment is found", but the code shows the told line whenever `nextStoryAt === null && storiesTold > 0`. That's the same thing; write it that way in the record.
- For Flick and Marginalia, whose home encounters also have completion fragments (The Sirens, The first stitch), the "has told you a story" line points to the "Told by" fragment. Since `storiesTold` only counts conversation fragments, the two agree.
- Old servers: `Number.isInteger` handles missing fields properly.

The files reviewed are `/work/ParaLLang/docs/rounds/043/trail/plan-v1.md` and the uncommitted diffs in `/work/ParaLLang/server/src/learning-service.js`, `/work/ParaLLang/mobile/src/components/PartyPanel.js`, `/work/ParaLLang/server/test/lore-fragments.test.js` and `/work/ParaLLang/server/test/party.test.js`.
```
