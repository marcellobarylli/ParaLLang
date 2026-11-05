# Claude subagent critique 1: a fragment after three coffee breaks

- **Dispatched:** 2026-11-05 (journal row 3)
- **Returned:** 2026-11-05T19:09:52 (notification)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only, repo access; Codex at its usage limit
- **Prompt:** adversarial critique of `docs/rounds/032/trail/plan-v1.md` against the named loader, service, storage, test, content and app files; numbered Error / Risk / Suggestion list, Optional unnumbered, under 500 words
- **Reviewed input:** `plan-v1.md`, sha256 aae1aa289b93b796a8899637dd99bf92c7f1cb45a4a2e5d14ddcecdfa03f8941, HEAD 07ed6dd, working tree: draft loader, service, content and test changes were uncommitted while it ran
- **Findings:** 7

## Raw output (verbatim)

```text
1. **Error — The existing filter shows the fragment once the greeting is complete**
`journeyFragments` (server/src/learning-service.js:197) shows any fragment whose `found_after` is in `completedEncounterIds`. Gerald's fragment has `found_after: imp_coffee_greeting`, so plan step 3 ("also returns") would show it from the moment Gerald is defeated, before any coffee break. Fix: split the filter so fragments with `after_conversations` skip the completion test and use only the member count. Test it: greeting completed with no member, then a member with `conversations` 0 or missing, both give no fragment.

2. **Error — The member lookup must match the one used for the count and the Party screen**
The count goes up by `characterId` (learning-service.js:519). `partySnapshot` hides members whose definition or character does not match (:575-576). The plan looks members up by `encounterId` only. Fix: use the same rule as `partySnapshot` (`encounterId === found_after` and `characterId === definition.character.id`) and treat a missing `conversations` as 0. Nothing on the server removes a member (`onLeave` only leaves the encounter), so "a member leaving" cannot happen today. Write that down so a later removal feature knows the fragment would disappear with the member.

3. **Risk — The resolved note repeats on every later coffee break**
`fragmentNote` (mobile/src/components/DialoguePanel.js:70-72) matches on `encounterId` alone. With `encounterId: gerald_coffee_break`, the 4th, 5th and later breaks all say a fragment "is in your Spellbook". That reads as a new find each time, and Gerald's found line says "third". Fix: on the server, set a `foundOnResolve` (or `unlockedAt: N`) flag that the client compares with `party[].conversations === N`, which `DialoguePanel` already receives. Add a jest case for the 3rd break versus the 4th.

4. **Risk — "From here" is false for party conversations**
The coffee break takes place wherever the player stands (party-conversation.test.js:60). The note's "from here" (DialoguePanel.js:72) and `locationName: The Coffee Cart` then disagree when the player is at the Fountain. Fix: use different wording when the encounter is a party conversation (for example "Gerald's fragment ... is in your Spellbook").

5. **Risk — The coffee break's answer words may slip past the leak test**
From the 4th break on, the fragment text shows during an ongoing coffee break (`hidden` withholds only the translation and glossary, :202-204). The leak test only matches exact `surface_variants` (lore-fragments.test.js:18). A passage about a drink that made people weep invites near-forms such as "buonissimo", "buona", "deliziosa" or "squisito". Fix: add a stem check for the coffee break's targets (it: `buon`, `ottim`, `grazi`; es: `buen`, `delicios`, `graci`, and so on) over text and glossary. Also check the English `title` and `found` lines, which are never withheld.

6. **Suggestion — The pack-equality test should cover the new field**
`english()` (lore-fragments.test.js:31) and the `found_after` list at :30 leave out `after_conversations`, so the packs could disagree on N. Fix: add it to `english()`, update `IDS` and the `found_after` list, and keep the "story order" test (:101) right by placing Gerald's fragment in a stated position in the file.

7. **Suggestion — Test the resolving turn from a seeded count**
Extend party-conversation.test.js by seeding `conversations: 2`, resolving one break and asserting the fragment is in `response.spellbook` with `hidden: false` (`stagedEncounter.state` is `resolved`, :136, :514). Also assert that a replayed attempt returns it without counting again. In addition, seed 3 and open a 4th break to check the hidden flag during it.

Optional
- Keep `loadFragments` after `validatePartyConversations` (content-loader.js:240/248). With that order, the existing broken-conversation cases (party-conversation.test.js:156-161) still hit their expected errors. `fixtureContent` (encounters.test.js:54-79) keeps Gerald's files and needs no change.
- In the schema, make `after_conversations` `z.number().int().min(1).optional()` and refuse it with a clear message when `found_after` has no `party_of` pointing at it. Test the case with Gerald's conversation removed.
- Raising N later makes the fragment disappear from saves that have fewer breaks. That is acceptable, but record it next to round 030's "no save change" note.
```
