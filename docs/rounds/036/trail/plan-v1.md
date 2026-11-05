# Round 036 plan v1: where each Journey fragment came from, in the Spellbook

Round 033 open item (critique 1.6): the Spellbook lists seven fragments flat in file order, and only the English
`found` line says where each came from; Flick and Marginalia each have two. Codex is at its usage limit (until about
20:35 UTC). No prompt change, no LLM call.

## Design

1. **Server** (`journeyFragments` in `server/src/learning-service.js`): a conversation fragment also carries
   `toldBy`, the character's name (`Mortimer`, from the location encounter's character file). Completion fragments
   carry no `toldBy`. Nothing else changes (withheld fields during encounters stay as they are; `toldBy` is English
   and shown during encounters too).
2. **App** (`Spellbook.js`, `Fragment`): a source line under the title, before `found`: "Told by Marginalia" for a
   conversation fragment, "Found at The Old Bookshop" for a completion fragment. The card's accessible label becomes
   "Fragment: The old dog, told by Marginalia" / "Fragment: The first stitch, found at The Old Bookshop".
3. **Order**: unchanged (file order). Grouping by member was considered and left out: seven items, and the source
   line already tells them apart.

## Tests

- Server (`lore-fragments.test.js`): the three new members at 3 give `toldBy` Mortimer / Flick / Marginalia;
  completion fragments have no `toldBy` key; the exact-object test for a completion fragment stays as it is.
  Gerald's fragment in `party-conversation.test.js` has `toldBy: 'Gerald'`.
- Mobile (`fragments.test.js`): both source lines and both accessible labels; a fragment without `locationName`
  or `toldBy` (older server) shows no source line.
- All suites.
