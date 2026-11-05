# Round 047 plan v1: relationship tiers (backlog G4)

## Goal

A party member's conversation changes as the relationship deepens: after N finished conversations, the Party
screen's Talk starts a deeper, authored conversation instead of the first one. Gerald is the first, after three
coffee breaks (the same count that unlocks his Dead Branch fragment, so the deeper talk follows the story).

## Today

- One party conversation per home encounter (`party_of`), enforced by the loader ("has more than one party
  conversation"). `partyConversationFor(homeId)` finds it; `partySnapshot` sends it as `conversationId`; the app's
  Talk button starts `member.conversationId`.
- A resolved party conversation increments `member.conversations` (matched by character id).
- Fragments with `after_conversations` unlock by that count (rounds 032–033); `storyProgress` gives the hint.

## Design

1. **Schema.** A party conversation may set `after_conversations: <int ≥ 1>` (same name and meaning as on fragments:
   available once the member has finished that many conversations). Loader rules, per home encounter:
   - exactly one party conversation without it (the first tier);
   - thresholds unique among its conversations;
   - `after_conversations` on a location encounter is refused.
   The "more than one party conversation" error becomes "more than one party conversation without
   after_conversations"; a duplicate threshold has its own error.
2. **Which conversation.** `partyConversationFor(homeId, count = 0)`: among the home's conversations whose threshold
   (0 for the first) ≤ count, the one with the largest threshold. The deepest unlocked tier is what Talk offers, and
   it repeats like the first tier does today. Every caller passes the count it means:
   - `partySnapshot`: the member's count; adds `conversationTier` (the threshold, 0 for the first) and
     `conversationNew` (tier > 0 and count equals the tier: unlocked and not played yet, since finishing it raises
     the count).
   - `journeyFragments.conversationOf`: the first tier (the fragment's `encounterId` stays `gerald_coffee_break`).
3. **Start.** `startEncounter` of a party conversation whose threshold exceeds the member's count: 409
   `NOT_YET` ("Gerald is not ready for that conversation yet."). Earlier tiers stay startable over the API (the app
   only offers the deepest).
4. **Counting.** Unchanged: any tier's resolution adds one to the member (by character id).
5. **App.** `PartyPanel` shows "Gerald has something new to talk about." when `conversationNew`; nothing else changes
   (Talk already uses `conversationId`). Old servers without the fields: no line.
6. **Content, both packs: `gerald_confidence`** (`party_of: imp_coffee_greeting`, `after_conversations: 3`), a new
   vocabulary file `gerald_confidence.yaml`. Gerald, after reciting the Dead Branch passage, is quietly morose about
   the word that died; the player
   1. tells Gerald he is a friend: `amico` (it: amico, amica, amici), `amigo` (es: amigo, amiga, amigos);
   2. raises a toast with the coffee: `cin cin` (it: "cin cin", "cincin"), `salud` (es: "salud").
   Ordered (friend, then toast). Italian "salute" is left out on purpose: it is an English word and would be chipped
   in English text (round 009 trap).
7. **play-market.** `--party --tier N` plays the home encounter, recruits, sets the member's count to N in the save
   (a test-harness shortcut) and then plays `partyConversationFor(home, N)`; scripts for `gerald_confidence`
   (an English line first, then the friend line, then the toast).

## Tests

- Loader: threshold on a location encounter refused; two first tiers refused; duplicate thresholds refused; the
  shipped packs have exactly the five party conversations, one first tier per saveable home and
  `gerald_confidence` at 3.
- Service: count 2 → snapshot `conversationId` `gerald_coffee_break`, tier 0; count 3 → `gerald_confidence`, tier 3,
  `conversationNew` true; after resolving it, count 4, `conversationNew` false, still `gerald_confidence`; starting
  `gerald_confidence` at count 2 → 409 `NOT_YET`; the base stays startable at count 3; the fragment's `encounterId`
  is still the first tier. An HTTP test for the 409.
- Existing content tests updated on purpose: party vocabulary count (9 → 11), overlap and English-word checks over
  the new forms, the fragment stem check's expected stems (new: it `amic`, `cinc`; es `amig`, `salu`), the aggregate
  vocabulary version pins, the Rift's exclusion of party targets.
- Mobile: PartyPanel shows the new-conversation line only when `conversationNew`.

## Live runs (after build)

codex-cli: `play-market.js --party --tier 3` in it and es (one run each, ~14 calls). Bar: both resolve; the
English line fails; the opening line refers to the earlier breaks or the story without giving "amico"/"amigo" or
the toast away; leak-scan over the lines.

## Out of scope

Tiers for Mortimer, Flick and Marginalia (content only once this works); tiers changing an existing conversation's
text in place.
