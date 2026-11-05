# Round 032 plan v1: a fragment Gerald tells after three coffee breaks (relationship unlock)

## Goal

The first relationship unlock (prototype.md §4.2 `relationship_unlocks` / `lore_fragments`: "Gerald mutters
something about 'the old tongue' — the language of the branch before it died. He says the coffee there was
indescribable, literally: the word for it no longer exists"; GAME MECHANICS.md: "build a relationship with them and
have more meaningful conversations over time"; round 023 deferred "deeper tiers by `conversations`"). It reuses
round 030's fragments: deterministic, authored, no LLM call and no prompt change.

## Design

1. **Content.** A fragment may carry `after_conversations: N` (integer ≥ 1). It is then unlocked by the party
   conversation of `found_after`'s character: found when the party member whose `encounterId` is `found_after` has
   `conversations >= N`. Loader: `found_after` must have a party conversation (`party_of` pointing at it), else it
   refuses.
2. **Gerald's fragment** `journey_dead_branch`, `found_after: imp_coffee_greeting`, `after_conversations: 3`
   (prototype.md says relationship 10; three coffee breaks is reachable in a prototype level). Title "The word for
   it". Found line: "On your third coffee break, Gerald recites a passage he swears he learned as a barista in the
   Dead Branch." The passage: in the Dead Branch Journathan drank something dark and bitter, in very small cups;
   whoever tasted it wept; the word for it no longer exists — it died with the branch, and no language remembers it.
   The text never says "coffee" (the word is gone; also a vocabulary form). Both packs, same English (tested).
3. **Server.** `journeyFragments` also returns conversation fragments whose member count is reached. For them
   `encounterId` is the party conversation's id (`gerald_coffee_break`), so the resolved-encounter note (round 030)
   appears on that conversation, and `locationName` is the home location (The Coffee Cart). Order: file order.
   Withheld translation during encounters as before.
4. **App.** No change: the Spellbook section and the resolved note already key on `encounterId`.
5. **Tests.** Loader (refuses `after_conversations` without a party conversation, 0, non-integer); snapshot (2
   conversations → absent, 3 → present, encounterId and locationName); the third coffee break's resolving turn
   returns it (extend `party-conversation.test.js`); leak check covers it (existing test iterates all fragments);
   pack equality updated to four fragments.

## Out of scope

Unlocks for Mortimer, Flick and Marginalia; a visible progress hint in the Party screen; tiers that change the
conversation itself.
