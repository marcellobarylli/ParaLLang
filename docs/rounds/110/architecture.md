# Round 110 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (journal, review) is in
`trail/`; it is not needed to implement this round.

- **Source:** backlog B7 (seeded by round 109's audit): LORE.md, "Mushrooms grow on the roots, destroying and
  recycling them. The mushrooms produce spores, which can be inhaled or consumed in some other way. The consumer
  dreams of another language, creating a new world from it." The notes are not edited.
- **Offline round:** no LLM call. Authored content shown verbatim (one fragment of *The Journey*) and tests. Codex is
  limited until 2026-11-09 17:32 UTC: a fresh read-only subagent reviews the build.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `content/languages/{it,es}/lore/fragments.yaml`, the server tests that list fragments,
  `mobile/src/__tests__/fragments.test.js`.

## Goal (pre-run)

One fragment, `journey_spores`, "Spores", in both packs, in story order right after `journey_dead_branch` (the same
Dead Branch): pale mushrooms on the dead branch's roots devour the finished world to make soil of it; Journathan
breathes in their spores, dreams in a tongue no living soul has spoken, and wakes in a world just born that already
speaks it. Last line, the notes' 4th wall: "Some say this book was born the same way."

Found after the **Butcher's Stall's first completion** (`butchers_stall_charcutier`, no `after_conversations`), the
only location encounter that files nothing on first completion: "Folded around a jar of dried mushrooms at the back
of Mortimer's stall, labelled NOT FOR SALE in three different hands." The stall's third-tasting fragment (the
forbidden herd) is unchanged.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **A Journey fragment, not a containment file or inscription.** Every location already has its one inscription
   (round 082); a containment file belongs to an infohazard character's encounter, and no character carries spores.
   A fragment is shown as written and needs no live run; Journathan on the Dead Branch ties the spores to the lore's
   dead realities without a new character.
2. **The Butcher's Stall** files it: a food stall is where a jar of dried mushrooms would sit, and round 109 left it
   as the one first completion with no fragment. This reverses round 109's "keeps none" (which had no stated reason
   beyond its third-tasting fragment).
3. **Same rules as every fragment** (rounds 030, 083, 109): no pack form, no word or 4-letter stem of any objective
   or party-conversation target (allowlists unchanged), no glossed target meaning; same English `title`, `found`,
   `translation` in both packs; 4–10 glossary entries; withheld during encounters (no code change). Draft words the
   check caught and replaced before the freeze: it *nessuno*, *nuovo*; es *nadie*, *nuevo*, *despertar*.
4. **The `found` text avoids the stall's targets in English** (sausage, salami, chicken, weights): it is shown on
   the victory note, and the Spellbook lists it during later tastings.
5. **No app or server code change.** The victory note "A fragment of The Journey from here is in your Spellbook"
   covers it.

## Tests (pre-run)

- `server/test/lore-fragments.test.js`: ten fragments in both packs, in the new order, after the same encounters;
  the answer check and stem checks over each (existing tests extended, not weakened).
- A test that completing the Butcher's Stall the first time files `journey_spores` (and not the forbidden herd), and
  any test that assumed the stall's first completion files nothing, updated to the full lists.
- Full suites: server, client, mobile.
