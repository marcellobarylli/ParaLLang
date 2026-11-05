# Round 033 plan v1: relationship unlocks for Mortimer, Flick and Marginalia

Backlog A12 follow-up (round 032 open item: "unlocks for Mortimer, Flick, Marginalia"). Codex is at its usage limit
(until about 20:35 UTC); no LLM call and no prompt change in this round.

## Goal

After three resolved party conversations with Mortimer (tasting), Flick (slow walk) or Marginalia (fragment), that
member recites a fragment of *The Journey*, filed in the Spellbook as Gerald's is since round 032. Reuses
`after_conversations` unchanged; content and tests only, plus the app note's wording if needed.

## Design

1. **Content, both packs** (`content/languages/<it|es>/lore/fragments.yaml`), appended after `journey_dead_branch`,
   same English (`title`, `found`, `translation`) and same N in both packs:
   - `journey_forbidden_herd` "The forbidden herd", `found_after: butchers_stall_charcutier`, N=3. The sailors roast
     the Sun's sacred herd against Journathan's word; the meat lows on the spit; since then whoever cuts meat asks
     permission. (Odyssey: cattle of Helios.)
   - `journey_lotus` "The lotus", `found_after: cracked_fountain_letharger`, N=3. Sailors eat the lotus, forget the
     course and the wish to leave, "five minutes" and five more; Journathan drags them to the ships weeping.
   - `journey_old_dog` "The old dog", `found_after: old_bookshop_bookworm`, N=3. Journathan returns as a beggar;
     only the old dog on the dung heap knows him, raises its ears, moves its tail, closes its eyes.
   Flick and Marginalia already have a completion fragment with the same `found_after` (round 030); the loader allows
   that (no uniqueness on `found_after`), and the two get different `encounterId`s in the snapshot (location
   encounter vs party conversation), so `fragmentNote` keeps them apart.
2. **No server change expected.** `journeyFragments` already matches the member by encounter and character and
   reports `unlockedAt`/`conversations`. `fragmentNote` already says "from <character name>".
3. **Leak checks** (round 030 and 032 tests, generalised): no vocabulary form of the pack in text or glossary words;
   no glossary meaning equal to a target's accepted translation; and for every conversation fragment, no word in text
   or glossary starting with a 4-letter folded stem of *its own* party conversation's targets (it: `anco`, `anda`,
   `insi`, `mera`; es: `vamo`, `junt`, `prec`, `otra`; multi-word targets give stems with a space, which never match).

## Tests

- `lore-fragments.test.js`: seven ids in order, `found_after` and N lists, English equal across packs; the stem test
  runs over all four conversation fragments; the API test seeds each of the three new members at 2 (absent) and 3
  (present, `encounterId` = its party conversation, `unlockedAt` 3) and checks Flick's and Marginalia's completion
  fragments are unaffected.
- `party-conversation.test.js`: existing Gerald flow unchanged (the new fragments need members that test lacks).
- Mobile `fragments.test.js`: "from Mortimer" note on the third tasting; Marginalia's completion note and her
  conversation note do not collide.
- All suites; expo-doctor; web build.

## Not in scope

Tiers that change the conversation; a Party-screen hint (owner question since round 032); native-speaker review.
