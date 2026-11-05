# Round 028 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog B4 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); `parallang_obsidian/LORE.md`
  ("Infohazards": the SCP-style file with Virulence, Harm, Incubation, Vector, Containment; "The Spellbook keeps a
  containment file for every infohazard you encounter, written in the deadpan SCP voice"); rounds
  [015](../015/architecture.md) (Errata) and [025](../025/architecture.md) (Flick's jingle); round
  [017](../017/architecture.md) (the Spellbook never answers what the game is asking).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** the Rift and Fountain encounter files in both packs, `server/src/content-loader.js`,
  `server/src/learning-service.js`, `mobile/src/components/Spellbook.js`, tests.

## Goal (pre-run)

The Spellbook lists a deadpan containment file for each infohazard the player has dealt with: Errata (the Rift) and
the Fountain jingle. Nothing the LLM sees changes.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Critique by a Claude subagent** (Codex at its usage limit until 20:35 UTC), as in round 027.
2. **A file is filed when its encounter is completed** (critique 1.2), not on a visit or at the start: before that
   it would explain the hazard, and its counter, before the player met it. World progress already records
   completions, so there is no save change. Each file says where it was "recovered".
3. **No refresh on opening the Spellbook** (critique 1.1): the turn that resolves the encounter returns the
   spellbook with the new file, so the race that could show meanings during an encounter does not arise.
4. **Content per pack** in the encounter file (`containment_file`), since the jingle's name is target language;
   Errata's file is the same English text in both packs, held equal by a test (critique 1.6).
5. **No live LLM runs.**

## Design (pre-run)

1. **Schema.** Optional `containment_file` on an encounter: `designation` (`CM-` and three digits), `name`, `class`,
   `virulence`, `harm`, `incubation`, `vector`, `containment`, `notes` (1–3). Strict. A party conversation may not
   hold one; designations are unique in a pack.
2. **Content.**
   - Fountain: CM-001, name "Dopo, dopo, domani!" (es "¡Después, después, mañana!"), class "Brainrot (mild)".
     - Virulence: "Very high. It spreads from host to host faster than it can be filed."
     - Harm: "Low. Hosts put things off, beginning with reading this file."
     - Incubation: "Immediate on understanding. Listeners who do not understand it are unaffected, and slightly smug
       about it."
     - Vector: "Song: a three-word jingle, hummed at the end of every sentence by Flick the Letharger."
     - Containment: "Do not hum along. Do not translate it for anyone who has not asked. If humming begins, do the
       thing you were putting off."
     - Notes: "Recovered at the Cracked Fountain, whose plaque reads PLEASE DO NOT HUM." and "Native speakers of the
       realm's language are immune. The author of this file is not." (critique 1.7).
   - The Rift: CM-002, "Errata", class "Rift-born (corruption)".
     - Virulence: "Unknown. It does not spread so much as leak, through the seam where the two languages touch."
     - Harm: "Moderate. The host's own language turns çùršęd. It reads anyone whose name it learns."
     - Incubation: "Begins as soon as the host understands one of its sentences. The host understands quite a lot
       by now."
     - Vector: "Speech, in both languages at once, slightly wrong in each."
     - Containment: "Do not understand it more than necessary. Do not tell it who you are."
     - Notes: "Recovered at the Rift, once the other five encounters were filed." and "It talks in fragments of this
       file. This file would prefer that it did not."
3. **Server.** `spellbookSnapshot` gains `containmentFiles`: the files of completed encounters, sorted by
   designation, each `{ encounterId, locationName, designation, name, class, properties: { virulence, harm,
   incubation, vector, containment }, notes }`.
4. **Mobile.** The Spellbook shows a "Containment files" heading and one card per file (heading with designation and
   name, class and place, five label/value lines, notes) below the vocabulary cards, during encounters too.
5. **Web client:** frozen; it ignores the field.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 a52a2b54…; a Claude subagent (decision 1); raw text in
`trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A late background refresh can show meanings during an encounter or undo newer state | 0 | Accept: drop the refresh (decision 2 makes it unnecessary) | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.2 | Error | A visit is not a meeting: the file would spoil the hazard and its counter | 0 | Accept in part: completion only (not the live session either) | **Accepted in part** (autonomous) | Decision 2, Design 3 |
| 1.3 | Risk | Refresh error and loading state on the wrong screen | 0 | Moot: no refresh | **Accepted** (autonomous) | Decision 3 |
| 1.4 | Risk | The form check covers objective targets only | 0 | Accept: also every entry of the encounter's own vocabulary files, with the jingle's own words allowed in `name` only; a planted-word negative test | **Accepted** (autonomous) | Tests |
| 1.5 | Risk | Fakes that test nothing; hand-written visited saves skip the seal | 0 | Accept in part: the mobile race is moot; server tests complete encounters through the service and through `api()` | **Accepted in part** (autonomous) | Tests |
| 1.6 | Suggestion | Errata's file written twice | 0 | Accept: equality test | **Accepted** (autonomous) | Decision 4, Tests |
| 1.7 | Suggestion | "The other language" is ambiguous | 0 | Accept: "the realm's language" | **Accepted** (autonomous) | Design 2 |
| 1.8 | Suggestion | Party conversation must not reveal or duplicate a file | 0 | Accept: test | **Accepted** (autonomous) | Tests |
| 1.9 | Suggestion | Simulator checks for the section | 0 | Accept | **Accepted** (autonomous) | Open items |

Net change: files are filed on completion instead of on a visit, the Spellbook refresh is dropped, the leak check
covers the encounter's own vocabulary, and Errata's two copies are held equal.

## Tests (pre-run)

- Server (`server/test/containment.test.js`): both packs load CM-001 and CM-002; the loader rejects a file on a party
  conversation, a duplicate designation, a missing property, an unknown key, a bad designation; no file text (name
  aside for the jingle's own words) contains a surface form of any objective target in the pack or any entry of its
  encounter's vocabulary files, and a planted target word makes that check fail; CM-002 is equal in both packs; a
  fresh learner has no files; after the Fountain encounter resolves (scripted fixture grader), the resolving turn's
  spellbook and `GET /api/spellbook` list CM-001 only; a completed party conversation adds nothing.
- Mobile (`spellbook.test.js`): a file renders heading, class, the five properties and notes, also during an
  encounter; no section without files.
- Full suites, expo-doctor, iOS export.

## Amendment 1 (2026-11-05): the resolving turn records progress before building its response

The live-flow test found that the turn resolving the Fountain returned a spellbook without CM-001: `submitDialogue`
built its response (and the spellbook in it) before pushing the encounter into `completedEncounterIds` (and, for a
party conversation, before raising the member's count). The bookkeeping now runs first, inside the same serialized
write, so the response reflects the saved state. Nothing else in the response depends on the order; the stored
replay response is the same object. Decision 3 (no refresh) rests on this.

## Outcome (2026-11-05)

Built as designed, with Amendment 1. Completing the Cracked Fountain files CM-001 ("Dopo, dopo, domani!" /
"¡Después, después, mañana!") in the Spellbook, and completing the Rift files CM-002 (Errata). Each file has a
class, the five LORE properties and two notes, and is listed during later encounters too. No file holds an
objective's answer: a test checks every pack target and the encounter's own words, and a planted-word case shows
the check is live. Server 142/142 (4 new, 1 extended), mobile 47/47 (2 new), web client 12/12 and build,
expo-doctor 20/20, iOS export ok. Not checked in the Simulator. See [findings](findings.md).
