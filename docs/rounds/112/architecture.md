# Round 112 architecture

**Autonomous round, recorded before the build was committed.** Designed on 2026-11-06 by Claude (claude-opus-5-5)
during the autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that
holds them. Changes go into dated Amendments; results go into the dated Outcome section. The trail (journal, plan,
critique) is in `trail/`; it is not needed to implement this round.

- **Source:** round 111's open items: an annex on CM-002 (Errata) and `baseLimit` in the hints line. Lore: LORE.md,
  Infohazards ("the oldest and most dangerous infohazards are fragments of the eldritch root language, closest to the
  root of the cosmic tree") and the branches' collision ("both languages become corrupted and lose their meaning").
  The notes are not edited.
- **Offline round:** no LLM call. Codex is limited until 2026-11-09 17:32 UTC, so the design critique came from a
  fresh read-only subagent ([`trail/plan-v1.md`](trail/plan-v1.md), [`trail/critique-1.md`](trail/critique-1.md)).
- **Findings:** [`findings.md`](findings.md).

## Goal (pre-run)

1. **"Annex A: minutes of the seam"** (`cm002_seam_minutes`) on containment file CM-002 (Errata, filed when the
   Rift encounter is completed), both packs, with round 111's mechanic unchanged (read anyway from the Spellbook
   after the system alert; the next finished conversation has a hint fewer per objective). Errata speaks cleanly,
   once, in the target language:
   - English (both packs): "Minutes of the seam. When the branches draw near, words lose their meaning where they
     touch. A mistake? No. What remains of a tongue, when everyone understands it badly, has this shape. Beneath
     lies an ancient voice, near the root of the tree. That one never makes mistakes. It waits."
   - it: "Verbale della fessura. Quando i rami si avvicinano, le parole perdono il loro senso là dove si toccano.
     Errore? No. Quello che rimane di una favella, quando tutti la capiscono male, ha questa forma. Sotto c'è una
     voce antica, vicina alla radice dell'albero. Quella non sbaglia mai. Aspetta."
   - es: "Acta de la grieta. Cuando las ramas se acercan, las palabras pierden su sentido allí donde se tocan. ¿Error?
     No. Lo que queda de un habla, cuando todos la entienden mal, tiene esta forma. Debajo hay una voz antigua, cerca
     de la raíz del árbol. Esa nunca se equivoca. Espera."
   - Redaction: "Your companion has blacked out every line of it. "Not this one. This is the thing itself talking,
     not a file about it. If you read it, I will need a while to get over it: a hint fewer for each objective of the
     next conversation you finish.""
   - Exposure note: "Exposure log: read in full by the bearer of this Spellbook. The seam has noted the reader's
     address. Containment of the reader is pending." (No "Nobody": it is an accepted translation of a Rift target.)
   - Ten glossary entries per pack. A scratch run of the shared answer check: clean in both packs (forms, target
     words and stems, meanings); the English of title, redaction and exposure note hits only "I" (it, es) and "you"
     (it); the translation hits nothing.
2. **One read per finished conversation** (critique 1.5): with two reads pending, a session is strained once
   (limit − 1, no stacking) and `strainedBy` holds only the oldest pending read; finishing it spends that read, and
   the next conversation is strained again by the other. Each read costs one conversation. This narrows round 111's
   `strainedBy` (all pending reads) to the oldest; with one annex read nothing changes.
3. **`baseLimit` in the hints payload:** `hints: { used, remaining, limit, baseLimit, strained }`, `baseLimit` =
   the objective's own `hint_limit` (critique 1.7: not limit + 1). The app's dialogue line, while a strained
   conversation is ongoing and `baseLimit` is a number above `limit`: "Hints: 1/1 (your companion is recovering:
   1 fewer than usual)"; with no `baseLimit` (a receipt from before this round, critique 1.8) or none fewer, the
   round 111 wording "(your companion is recovering)". The frozen web client ignores the key.
4. **Comment fix:** both Rift files say CM-002 is "shown once the Rift is visited"; it is filed on completion
   (critique 1.9).

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **A second annex, on CM-002**, in Errata's own voice about the collision and the root language. Alternatives: a
   third containment file; a fragment. Errata is the market's one other infohazard, and its file is the place.
2. **One read per finished conversation, oldest first** (critique 1.5, its first option). Alternatives: stack the
   strain (2 → 0 with both read, harsh: no help at all); one strain for both (the second read free).
3. **A small cost after the Rift is accepted** (critique 1.6): CM-002 is filed at the end of the market, so its
   strain falls on a party conversation or a restart. Stated in the claim boundary and added to round 111's owner
   question on the cost's size; a second, lore-fitting cost (the companion cannot redact the next hazard) goes to
   the backlog.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 47336ffc…; a fresh read-only Claude subagent (Codex limited); raw text
in `trail/critique-1.md`. Each disposition is an **autonomous decision, pending owner review**.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The drafted texts leak answers (*io/sono*, *due*, *lingua*; *yo/soy*, *dos*, *lengua*, *Transcripción*), *sono*/*soy* the Rift's own | 0 | Accept: my own rewrite (found in a scratch check while the critique ran), clean in both packs | **Accepted** (autonomous, pending owner review) | Goal 1 |
| 1.2 | Error | "It is" in the redaction hits *sono le*/*son las* | 0 | Accept: "This is the thing itself talking" | **Accepted** (autonomous, pending owner review) | Goal 1 |
| 1.3 | Error | `containment.test.js` deepEquals the whole Errata file across packs and asserts it has no annex | 0 | Accept: compare without the annex, its English keys apart; CM-002's unread payload | **Accepted** (autonomous, pending owner review) | Tests |
| 1.4 | Gap | The translation is never checked against target meanings | + | Accept: the English check covers the translation of every annex | **Accepted** (autonomous, pending owner review) | Tests |
| 1.5 | Gap | Two pending reads strained once make the second read free | + | Accept: one read per finished conversation, oldest first | **Accepted** (autonomous, pending owner review) | Goal 2, decision 2 |
| 1.6 | Gap | The cost after the Rift is close to nothing | 0 | Accept in part: claim boundary, owner question, a second cost to the backlog | **Accepted** in part (autonomous, pending owner review) | Decision 3 |
| 1.7 | Gap | "strained = limit + 1" is wrong at the floor | + | Accept: `baseLimit === hint_limit`, tested at the floor | **Accepted** (autonomous, pending owner review) | Goal 3, tests |
| 1.8 | Gap | Old receipts have no `baseLimit` | + | Accept: the app falls back to round 111's wording | **Accepted** (autonomous, pending owner review) | Goal 3, tests |
| 1.9 | Minor | The Rift files' comment says "visited" | + | Accept | **Accepted** (autonomous, pending owner review) | Goal 4 |
| 1.10 | Minor | Commas, capitalised "Lei", "Ella … Ella" | + | Accept: rewritten ("Quella", "Esa"; the clause moved) | **Accepted** (autonomous, pending owner review) | Goal 1 |
| 1.11 | Minor | "usually 2" reads as two remaining | + | Accept: "N fewer than usual" | **Accepted** (autonomous, pending owner review) | Goal 3 |
| 1.12 | Style | State the Rift rules; test IN_ENCOUNTER during a Rift restart | + | Accept: test | **Accepted** (autonomous, pending owner review) | Tests |

**Deferred** (Optional): none; all four taken into the tests (annex tests loop over every annex; no annex text holds
a target of its own encounter, covered by the answer check over all targets; CM-002 NOT_FILED with CM-001 filed; two
annexes in one rendered Spellbook).

## Tests (pre-run)

- `server/test/annex.test.js`: over every annex in each pack: same English across packs, the answer check, the
  English check over title, redaction, exposure note and translation (only the companion's "I"/"you" allowed, by
  name). CM-002: NOT_FILED with only the Fountain filed; IN_ENCOUNTER during a Rift restart; read after. Two reads:
  one session strained once with `strainedBy` the oldest, finished spends it; the next session is strained by the
  other; the third is not. `baseLimit` equals the objective's `hint_limit`, strained or not, and at the floor.
- `server/test/containment.test.js`: the Errata file equal across packs without its annex; CM-002's unread payload.
- `mobile/src/__tests__/annex.test.js`: the line with "1 fewer than usual", the fallback without `baseLimit`,
  hidden once resolved; a Spellbook with two annexed files (one read, one unread).
- Full suites: server, client, mobile; the web client builds.
