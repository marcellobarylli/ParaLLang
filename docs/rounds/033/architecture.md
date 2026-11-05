# Round 033 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog A12 follow-up, round [032](../032/architecture.md) open item ("unlocks for Mortimer,
  Flick, Marginalia"); `prototype.md` §4.2 (`relationship_unlocks`); round [030](../030/architecture.md) (fragments).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** both packs' `lore/fragments.yaml`; tests (`lore-fragments.test.js`, `party-conversation.test.js`,
  `encounters.test.js` fixture, mobile `fragments.test.js`). No server, app or prompt code changes.

## Goal (pre-run)

After three resolved party conversations, Mortimer, Flick and Marginalia each recite a fragment of *The Journey*,
filed in the Spellbook as Gerald's has been since round 032. Deterministic: no LLM call, no prompt change.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Three conversations for every member**, as for Gerald.
2. **Odyssey episodes fitted to each member:** Mortimer, the charcutier, gets the Sun's forbidden herd. Flick, who
   wants "five more minutes", gets the lotus. Marginalia gets the old dog who alone knows Journathan on his return.
3. **Critique by a Claude subagent** (Codex at its usage limit until about 20:35 UTC).

## Design (pre-run)

1. **Content, both packs**, appended after `journey_dead_branch`. Each has `after_conversations: 3`, and its
   English (`title`, `found`, `translation`) and N are the same in both packs:
   - `journey_forbidden_herd` "The forbidden herd" (`found_after: butchers_stall_charcutier`);
   - `journey_lotus` "The lotus" (`cracked_fountain_letharger`);
   - `journey_old_dog` "The old dog" (`old_bookshop_bookworm`).
   Flick and Marginalia already have a fragment for completing their encounter (round 030) with the same
   `found_after`. The snapshot keeps the two apart by `encounterId`: the location encounter for the completion
   fragment, the party conversation for the new one. `fragmentNote` keys on `encounterId`, so each note stays in
   its own place.
2. **No server or app change.** The critique confirmed this. `journeyFragments` already matches the member by
   encounter and character, and `fragmentNote` already says "from <name>".
3. **Stem check, widened** (critique 1.1–1.3). A stem is the first 4 folded letters of a word, and every word of 4
   letters or more in a target form gives one. Multi-word forms are split into words, so `otra vez` gives `otra`
   and `me gusta` gives `gust`. The stems come from the targets of every party conversation. The check runs over
   every fragment's text and glossary words, since the Spellbook shows all found texts during any conversation.
   Applying it found round 030's es "de una rama a otra" (`otra`, Marginalia's "otra vez"), now "a la siguiente".
   The herd text also drops "más" / "più" (Mortimer's "un poco más", 3 letters, which the stems miss): "venció al
   juramento" / "vinse il giuramento".

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 e85ec1b5…; Claude subagent (general-purpose, claude-opus-5-5),
read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | `otra vez` gives a live stem `otra`; the plan's claim is false | + | Accept | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.2 | Risk | Multi-word targets make the stem check nearly empty for Mortimer; "más"/"più" in his text | + | Accept: stem every word of 4+ letters; plant "Le gustaba."; remove más/più by hand | **Accepted** (autonomous, pending owner review) | Design 3, Tests |
| 1.3 | Risk | Fragments checked only against their own conversation | + | Accept: all fragments against all party conversations | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.4 | Risk | No end-to-end test through real resolutions for the new members | + | Accept: Mortimer's three tastings | **Accepted** (autonomous, pending owner review) | Tests |
| 1.5 | Suggestion | Mobile: both fragments in one array, 4th conversation, Flick too | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.6 | Suggestion | Spellbook lists seven fragments flat, file order | 0 | Accept as an open item (Simulator check, owner) | **Accepted as open item** (autonomous, pending owner review) | Findings, open items |
| 1.7 | Risk | Drafts were in the tree before the freeze | 0 | Accept: order noted in the journal; freeze commit holds only the record | **Accepted** (autonomous, pending owner review) | Journal row 8 |

**Deferred / optional:** exact-match meaning check (kept); rerun the form check when vocabulary grows (the test does
it on every run).

Net change from plan-v1: a wider stem check (every word, every fragment, every party conversation), Mortimer's
end-to-end test, two texts adjusted.

## Tests (pre-run)

- `lore-fragments.test.js`: seven ids, `found_after` and N lists, same English in both packs; the stem list per
  pack pinned (10 stems each); no fragment holds a stem; planted `buon`/`insi` (it), `buen`/`gust`/`junt` (es);
  the API test seeds the three new members at 2/2/2, 3/2/2, 3/3/3 and checks ids, `encounterId`, `locationName`,
  `unlockedAt`, `conversations`.
- `party-conversation.test.js`: three resolved tastings give `[], [], [journey_forbidden_herd]` under
  `mortimer_tasting`.
- `encounters.test.js`: the fixture pack drops Mortimer's fragment with his stall.
- Mobile: Marginalia's two fragments and Flick's two each noted in the right place; none on a 4th conversation.
- All suites, web build, expo-doctor.

## Outcome (2026-11-05)

Built as designed, with no Amendments. The three fragments are filed after three resolved party conversations, each
under its member's conversation. The widened stem check passes on every fragment in both packs, after round 030's
es stitch was reworded. Server 157/157, mobile 69/69, web client 12/12 and build, expo-doctor 20/20. See
[findings](findings.md).
