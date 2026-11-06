# Round 111 architecture

**Autonomous round, recorded before the build was committed.** Designed on 2026-11-06 by Claude (claude-opus-5-5)
during the autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that
holds them. Changes go into dated Amendments; results go into the dated Outcome section. The trail (journal, plan,
critique) is in `trail/`; it is not needed to implement this round.

- **Source:** backlog B8 (seeded in iteration 34): LORE.md, Infohazards, "Gameplay hooks": "some untranslated
  passages are infohazards. Translating them gives juicy lore, but at a cost"; "the companion can redact or blur a
  hazard, but it is limited during certain events"; and "you can't be harmed by an infohazard you can't understand".
  The notes are not edited.
- **Offline round:** no LLM call. Authored content shown verbatim and a small mechanic. Codex is limited until
  2026-11-09 17:32 UTC, so the design critique came from a fresh read-only subagent
  ([`trail/plan-v1.md`](trail/plan-v1.md), [`trail/critique-1.md`](trail/critique-1.md)).
- **Protocol slip:** the build began while the critique ran (about 09:47 UTC, before the critique returned at about
  09:50). The critic saw the half-built tree and said so. The freeze commit holds only these records; the build is
  committed after it, with every accepted finding applied.
- **Findings:** [`findings.md`](findings.md).

## Goal (pre-run)

One redacted passage, "Annex A: the second verse" (`cm001_second_verse`), attached to containment file CM-001 (the
Cracked Fountain's jingle, filed when Flick's encounter is completed). In the Spellbook it is black bars and the
companion's line: "Your companion has blacked out every line of it. "Trust me on this. If you read it, I will need a
while to get over it: a hint fewer for each task of the next conversation you finish."" The player may read it
anyway (the system alert asks first). Then the target-language text shows (it holds no answer, so at any time), the
translation and glossary sit behind the usual toggle (withheld during encounters), the file gains an exposure note
("read in full by the bearer of this Spellbook, who has been added to the list of hosts"), and the **cost** applies:
the next conversation the player finishes has one hint fewer per objective (floor 0). Every objective's
`hint_limit` is 2 today, so the cost is half the help.

The text, the jingle's second verse (the same English in both packs): "Second verse, not to be sung. Whoever reads it
hums it; whoever hums it teaches it; whoever teaches it forgets it, and finds it again that same night on the lips of
a stranger. This verse has no end: it only has a return." Reading the target-language text is the exposure (LORE.md:
an infohazard harms only those who understand it), so the cost is charged on reading, not on the translation toggle.

## Design (pre-run)

1. **Content.** `containment_file.annex`, strict: `id` (`[a-z0-9_]+`), `title`, `redaction`, `text`,
   `translation`, `glossary` (4–10, each word in the text), `exposure_note`. Annex ids unique across the pack. Both
   Fountain encounter files (it, es).
2. **Payload.** `containmentFiles` takes `annex` out of `properties` (critique 1.1: else every Spellbook payload
   carries the text) and adds `annex: { id, title, redaction, read, readAt, strainPending, hidden, text, translation,
   glossary, exposureNote }`. Unread: `text`, `translation`, `glossary`, `exposureNote` are null. Read: `text` always;
   translation and glossary null during an encounter (`hidden`).
3. **Save.** Optional `envelope.annexes: [{ id, readAt, strainSpentOn }]` (null while the strain is pending, then the
   encounter id that spent it), at most 20. As for kept lines, only the container is strict: invalid or repeated
   entries are dropped and the save kept (critique 1.10: a dropped entry makes the annex unread and lifts the strain,
   accepted). No schema version bump.
4. **Route.** `POST /api/spellbook/annex/read { annexId }` → `{ charged, spellbook }`. 404 `NOT_FOUND` (unknown or
   not a string); 409 `NOT_FILED` before the Fountain encounter is completed; 409 `IN_ENCOUNTER` while the server
   holds an ongoing encounter (the cost must not land mid-conversation, and the session's strain is decided at its
   start; critique 1.8: this is a mechanic, not the lore's "limited during events"). A second read: `charged: false`,
   nothing changes. Serialized per learner.
5. **Strain.** Pending ids: read annexes with `strainSpentOn: null` whose id the content still holds (critique 1.6:
   an unknown id neither strains nor is spent). A session started while any is pending gets `strained: true` and
   `strainedBy: [ids]` (decided at the start; a resume keeps the session, a restart is a new session and is strained
   again). `hintLimit(session, objective) = max(0, hint_limit − 1)` when strained, used by the payload
   (`hints.limit`, `remaining`, `hints_available`) and by help (`HINTS_EXHAUSTED`). `hints.strained` in the payload.
   When a strained session resolves, the annexes in its `strainedBy` get `strainSpentOn = encounter id`, in the same
   staged save as the resolution and its receipt (critique 1.7: only the reads that strained it). A replay returns
   the receipt and spends nothing again; a failed save spends nothing.
6. **App.** The file's annex block: title, four black bars (`Redacted text`), the redaction line, and "Read it
   anyway" → `Alert.alert` ("Leave it redacted" / "Read it"). No button while the server's Spellbook or the app's
   held encounter says a conversation is under way (critique 1.4). Store `readAnnex(annexId)`: refused locally during
   an ongoing encounter; applies the reply's Spellbook only for the same learner and epoch and not when it would show
   meanings (`leaksMeanings`); updates the save's snapshot; an older refresh is dropped by the existing rule. Read:
   text with a pronounce button, translation toggle, exposure note, "Your companion is still recovering" while
   pending. The dialogue panel's hint line adds "(your companion is recovering)" only while a strained session is
   ongoing (critique 1.9).
7. **Web client.** Frozen; it ignores `annex` and `hints.strained` (its contract test reads named keys only).

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **An annex to a containment file**, not a second inscription or a fragment: the lore's hook is about hazards, and
   CM-001 is filed mid-game, so the cost can bite in the conversations left.
2. **The cost is one hint per objective in the next finished conversation.** Alternatives: an earworm (the words
   become due cards, reusing SM-2), a deadpan entry only (no real cost). The lore asks for a cost, and the companion
   is the one who redacted it.
3. **Reading is refused during a conversation**, and the strain is fixed at a session's start.
4. **Any finished conversation spends the strain** (critique 1.3, rejected): a replayed party conversation or a
   restart of a completed place spends it too. The cost is "the next conversation you finish", and the player
   chooses which; narrowing it to first completions would make the rule harder to state and the cost could stay
   pending for good after the market is done.
5. **"I" and "you" in the redaction** (the companion speaking) are allowed by name in the English check: they name
   the accepted translations of *io*/*tu* (*yo*), but the line gives no target form.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 7c380eee…; a fresh read-only Claude subagent (Codex limited); raw text
in `trail/critique-1.md`. Each disposition is an **autonomous decision, pending owner review**.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The annex leaks through `properties` | 0 | Accept: take it out; keep the containment test's exact deepEqual | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.2 | Error | The English check hits "I" and "you" in the redaction | 0 | Accept: an allowlist by name, each hit required | **Accepted** (autonomous, pending owner review) | Decision 5 |
| 1.3 | Gap | Any resolution spends the strain, so an easy replay dodges it | − | Reject: the player picks the conversation by design | **Rejected** (autonomous, pending owner review) | Decision 4 |
| 1.4 | Gap | The store must follow the Spellbook rules (epoch, leaks, snapshots, app-held encounter) | + | Accept | **Accepted** (autonomous, pending owner review) | Design 6 |
| 1.5 | Gap | Replay and failed-save spends untested | + | Accept: tests | **Accepted** (autonomous, pending owner review) | Tests |
| 1.6 | Gap | Unknown annex ids could strain for good | + | Accept: rule and test | **Accepted** (autonomous, pending owner review) | Design 5 |
| 1.7 | Gap | Spend only the reads that strained the session | + | Accept: `strainedBy` | **Accepted** (autonomous, pending owner review) | Design 5 |
| 1.8 | Minor | The lore cited the wrong way round; charge on reading or on translating | 0 | Accept: reworded; reading the text is the exposure | **Accepted** (autonomous, pending owner review) | Goal, Design 4 |
| 1.9 | Minor | The recovering note outlives the strain | + | Accept: ongoing only | **Accepted** (autonomous, pending owner review) | Design 6 |
| 1.10 | Minor | A dropped save entry lifts the strain; the app must not phrase on `charged` | 0 | Accept: documented; the app ignores `charged` | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.11 | Minor | The floor of 0 untested | + | Accept: a test with an objective at 1 | **Accepted** (autonomous, pending owner review) | Tests |

**Deferred** (Optional): `baseLimit` in `hints`; never straining the Entrance tutorial (it teaches hints; it comes
before CM-001 and is only met strained by a restart); the answer check at load time, not only in tests; the web
contract note (taken into Design 7).

## Tests (pre-run)

- `server/test/annex.test.js`: both packs, same English, answer check and English check; loader rejections; read
  route (NOT_FILED, IN_ENCOUNTER, NOT_FOUND, charged once, no text before); the strain (limit − 1 in the payload and
  in help, resume, restart, spend on resolution, the next session full); a failed resolving save and a replay; an
  unknown id; the floor at 0; storage drops malformed and repeated records and refuses a non-array.
- `server/test/containment.test.js`: CM-001's exact payload with the unread annex; CM-002 has none.
- `mobile/src/__tests__/annex.test.js` and `api.test.js`: redacted and read rendering, the alert, no button during
  an encounter (both signals), the store action (applies, drops an older refresh, error, refused locally, another
  save), the dialogue note.
- Full suites: server, client, mobile.
