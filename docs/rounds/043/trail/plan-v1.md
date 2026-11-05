# Round 043 plan v1: a Party-screen hint for the next story (backlog G1)

Rounds 032–033 unlock one *Journey* fragment per party member after three party conversations
(`after_conversations: 3` in `content/languages/<code>/lore/fragments.yaml`). Today nothing tells the player that
more conversations lead anywhere; the rounds left "a Party-screen hint" as an owner question. Codex is at its usage
limit; no live LLM call is needed.

## Decisions (autonomous, pending owner review)

1. **Show the hint.** Each party member with an unfound conversation fragment shows "N more conversations until
   <Name> tells you a story." (singular "1 more conversation"). Once every such fragment is found: "<Name> has told
   you a story. It is in your Spellbook." No hint for a member without conversation fragments.
2. **Count only, no title**: the fragment's title is not shown before it is found (no spoiler).

## Design

1. Server `partySnapshot`: each member gains `nextStoryAt` — the smallest `after_conversations` among this member's
   fragments (`found_after` = the member's encounter, matched as `journeyFragments` does) that the count has not
   reached, or `null` when none is left — and `storiesTold`, the number of conversation fragments already found.
   Derived, not saved (like `journeyFragments`).
2. App `PartyPanel`: the hint line under "Met at … · Conversations: N", from `nextStoryAt - conversations`, or
   the "has told you a story" line when `nextStoryAt` is null and `storiesTold > 0`.
3. A member whose snapshot lacks the fields (an old server) shows no hint.

## Tests

- Server: Gerald after 0, 2 and 3 conversations: `nextStoryAt` 3, 3, null; `storiesTold` 0, 0, 1; a member without
  conversation fragments: null and 0; the existing `deepEqual` snapshots updated; the HTTP route returns the fields.
- App: the hint for 2 remaining (plural), 1 (singular), the told line, no line without the fields or with
  `nextStoryAt` null and 0 told.
