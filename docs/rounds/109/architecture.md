# Round 109 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (journal, review) is in
`trail/`; it is not needed to implement this round.

- **Source:** iteration 32's handoff ("consider a content round: an owner-notes check of the characters against
  `parallang_obsidian/`"), backlog B (content in line with the newer lore notes; the notes are not edited).
- **Offline round:** no LLM call. Authored content shown verbatim (fragments of *The Journey*), tests, an audit table.
  Codex is limited until 2026-11-09 17:32 UTC: a fresh read-only subagent reviews the build (the texts' Italian and
  Spanish, their fit with the notes, the tests).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `content/languages/{it,es}/lore/fragments.yaml`, `server/test/lore-fragments.test.js` (and any test
  that counts fragments), `docs/rounds/109/findings.md` (the audit).

## Goal (pre-run)

1. **Audit.** Every character and lore element of the owner's notes (`CHARACTERS.md`, `LORE.md`, `Anulus
   Mirabilis.md`, `GAME MECHANICS.md`, `PLOT & QUESTS.md`, `LOCATIONS.md`) gets a row: where it is in the game's
   content, or why it is not (later phase, a mechanic, needs live calls), and which gaps are next.
2. **Fill the clearest gap that needs no live call.** Journathan's notes have two parts no content holds: the
   Odyssey's frame (*polytropos*, "the man of many tongues"; "the story wrote the hero", nobody remembers which came
   first) and the Pratchett option (an ageing, washed-up hero, "still technically on his way home"; the journey
   motto he can no longer stand hearing). Two of the three encounters that file no fragment on first completion get
   one:
   - `journey_proem`, "The first lines", after the Market Entrance tutorial, first in story (file) order: the
     invocation, twenty winters from branch to branch, "which came first, the hero or the book?".
   - `journey_still_on_his_way`, "Still on his way", after Gerald's encounter at the Coffee Cart, last in file order
     (it is today): Journathan never arrived; creaking knees; the motto and his sigh. Found under Gerald's tip jar,
     on an unpaid bill signed with a flourish.
   The Butcher's Stall keeps none on first completion (its fragment is the third tasting's).

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Fragments, not character sheets.** The Wizard of Just in Case and the Trepanners also appear nowhere, but a
   new character needs a place and an encounter, and a character sheet change only shows through the LLM (needs live
   runs); a fragment is authored text shown as written. They are listed as next gaps in the audit.
2. **Same rules as every fragment** (rounds 030, 083): no pack form, no word or 4-letter stem of any objective
   target (allowlists unchanged), no glossed target meaning; `title`, `found` and `translation` the same English in
   both packs; 4–10 glossary entries; withheld translation during encounters (no code change).
3. **Wording.** The notes' "man of many tongues" becomes "countless tongues" (it *innumerevoli*, es *innumerables*):
   *molti*/*muchos* and *lingue*/*lenguas* are blocked by the answer check (*mucho gusto*, the Bookshop's
   *lingua*); *idiomi*/*idiomas* stand for "tongues".
4. **The English "found" texts avoid "espresso" and "coffee"**: they are shown during encounters (Gerald's coffee
   break).
5. **No app change.** The victory note "A fragment of The Journey from here is in your Spellbook" covers both
   encounters; the Spellbook lists fragments in file order.

## Tests (pre-run)

- `server/test/lore-fragments.test.js`: nine fragments in both packs, in the new order, after the same encounters;
  the answer check over each (existing tests extended, not weakened).
- A test: completing the Entrance tutorial files `journey_proem`; completing Gerald's encounter files
  `journey_still_on_his_way`; both withheld during an encounter.
- Full suites: server, client, mobile.

## Amendment 1 (2026-11-06, after the build): the review's dispositions

A fresh read-only subagent reviewed the build ([`trail/review-1.md`](trail/review-1.md): 2 Error, 3 Minor, 2 Gap,
3 Style; numbered R1.1–R1.10 in the review's order, its section in brackets). Each disposition is an **autonomous decision, pending owner review**.

| # | Severity | Finding (review §) | Recommendation | Change | Disposition | Decision |
|---|---|---|---|---|---|---|
| R1.1 | Error | es "un viejo héroe de rodillas que crujen" reads as "kneeling" (§1.1) | Fix | "un viejo héroe al que le crujen las rodillas" | **Accepted** (autonomous, pending owner review) | Amendment 1 |
| R1.2 | Minor | it "tecnicamente sempre in cammino" reads as "always" (§1.2) | Fix | "tecnicamente tuttora in cammino" | **Accepted** (autonomous, pending owner review) | Amendment 1 |
| R1.3 | Style | "vagò venti inverni" without *per* / *durante* (§1.3) | Keep as written | The bare duration is the epic register the proem wants | **Rejected** (autonomous, pending owner review) | Amendment 1 |
| R1.4 | Style | Glosses: es *camino* means the journey in the motto; it/es "tells of" differ (§1.4) | Fix | *camino* / *percorso* "…; here the journey"; it gloss *lo racconta* "tells of him" as es | **Accepted** (autonomous, pending owner review) | Amendment 1 |
| R1.5 | Error | "Journathan never arrived" contradicts `journey_old_dog` (he comes home) (§2.1) | Fix | First sentence: "The book has him come back to his island; he swears he never arrived" (it *Il libro lo fa tornare sulla sua isola; lui giura di non essere mai arrivato*, es *El libro lo hace volver a su isla; él jura que nunca llegó*); *giura* / *jura* glossed (10 entries, the cap) | **Accepted** (autonomous, pending owner review) | Amendment 1 |
| R1.6 | Minor | "The first lines" is a second opening beside the one Marginalia reads (§2.2) | Fix | Title "The archway's telling": another telling, painted on the archway | **Accepted** (autonomous, pending owner review) | Amendment 1 |
| R1.7 | Style | A party-conversation test message now misleads (§4.1) | Fix | "Dead Branch: not on Gerald's defeat, …" | **Accepted** (autonomous, pending owner review) | Amendment 1 |
| R1.8 | Minor | party-tiers filtered on `unlockedAt`, weakening two assertions (§4.2) | Fix | Full lists asserted again, with Journathan today | **Accepted** (autonomous, pending owner review) | Amendment 1 |
| R1.9 | Gap | No test resolves the tutorial and sees the proem filed (§4.3) | Fix | `tutorial.test.js` (it, es): the resolving turn files `journey_proem`, earlier turns none; moving the proem off the tutorial fails it | **Accepted** (autonomous, pending owner review) | Amendment 1 |
| R1.10 | Gap | No mobile test of Gerald's two notes (§4.4) | Fix | `mobile/src/__tests__/fragments.test.js`: the third break notes the Dead Branch, the defeat "Still on his way" | **Accepted** (autonomous, pending owner review) | Amendment 1 |

## Outcome (2026-11-06)

Built as designed with Amendment 1. The audit is in [`findings.md`](findings.md). Two fragments in both packs:
"The archway's telling" (`journey_proem`, the Entrance tutorial, first in story order) and "Still on his way"
(`journey_still_on_his_way`, Gerald's encounter, last), both clean under the answer check. Tests that assumed those
encounters file nothing were updated to the full lists. Server 396/396, client 21/21, mobile 304/304.
