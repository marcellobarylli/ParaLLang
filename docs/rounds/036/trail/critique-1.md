# Claude subagent critique 1: where each Journey fragment came from

- **Dispatched:** 2026-11-05, after 19:36:19 (journal row 3)
- **Returned:** unknown (the notification came after the build's first test run; journal row 4)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only, repo access; Codex at its usage limit
- **Prompt:** adversarial critique of `docs/rounds/036/trail/plan-v1.md` against `learning-service.js`, the fragment content, the server and mobile tests that compare fragment snapshots, `Spellbook.js`, the frozen web client and the theme test; numbered Error / Risk / Suggestion list with fixes, Optional unnumbered, under 350 words
- **Reviewed input:** `plan-v1.md`, sha256 eb9ffcb750498b89629ba272bc0a15ce4a02e5e113647a047b27c24ae8200a53, HEAD 51534f5, working tree: the draft server and Spellbook changes were uncommitted while it ran
- **Findings:** 7

## Raw output (verbatim)

```text
I found no blocking defects. The plan is sound, and the working tree already contains an implementation of it (uncommitted diffs in `server/src/learning-service.js` and `mobile/src/components/Spellbook.js`), so I checked that too.

1. **Risk: an older server's conversation fragment gets the wrong source line.** Round 032/033 servers send `locationName` on every fragment, conversation ones included, and never send `toldBy`. With the drafted `fragmentSource`, Gerald's fragment from such a server would read "Found at The Coffee Cart". The plan's planned test ("no `locationName` or `toldBy`") misses this, because older servers always send `locationName`. Fix: return `null` when `fragment.unlockedAt !== undefined && !fragment.toldBy`, and test that case (`unlockedAt: 3`, `locationName` set, no `toldBy`).

2. **Suggestion: the lookup in the server diff is redundant.** `this.content.encounters.get(encounter.id).character.name` repeats the lookup `memberCount` already does. Destructure `const { encounter, character } = this.content.encounters.get(fragment.found_after)` and use `character.name`. That is also the name `partySnapshot` exposes (`definition.character.name`), so "Told by" and the Party list always agree.

3. **Risk: test coverage of `toldBy`.** None will break:
   - The only exact-object test (`lore-fragments.test.js:192`) covers a completion fragment, so it still passes.
   - Both `party-conversation.test.js` checks (lines 259 and 303) compare chosen fields, not whole objects. Add `fragment.toldBy` to those tuples (`'Gerald'`, `'Mortimer'`), and add a `toldBy` column to the three-member tuple at `lore-fragments.test.js:150`.
   - Also assert `toldBy` is still present while `hidden: true` (line 178), so the "shown during encounters" decision is pinned by a test.

4. **Names are right.** Names come from the character files (`name: Gerald / Mortimer / Flick / Marginalia`), not from the file names or ids such as `imp_coffee` or `charcutier_mortimer_001`.

5. **Accessibility labels: no regression.** No test queries `getByLabelText('Fragment: …')`. The lower-cased label ("…, told by Flick") reads well.

6. **Theme test passes.** The new `source` style sets `fontSize: type.footnote`, and `accent` on `surface` is already in the contrast pairs at 4.5:1 or better.

7. **Web client: no impact.** Nothing in `client/src` reads `journeyFragments`, so the new field cannot break it.

Optional:
- The source line partly repeats the `found` text ("Gerald recites…", "Marginalia sold you…"). Accept that or record it.
- Set `accessibilityLanguage` only where it applies. The source line is English, so leaving it unset is correct.
```
