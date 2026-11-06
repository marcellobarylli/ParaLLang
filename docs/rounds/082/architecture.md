# Round 082 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Design source:** prototype.md Phase 3, "Lore fragments | Hidden text passages with advanced vocabulary,
  discoverable items" (round 030 built fragments found on an encounter's completion; nothing is found by
  exploring), and `parallang_obsidian/GAME MECHANICS.md`: "Dark souls-like storytelling. Ie the lore is hidden in
  plain sight. There will be entire sections that are potentially more complex language-wise, which do not need to
  be translated to progress but which give juicy details about the world." Backlog A13, seeded this round.
- **Offline round:** Codex (game provider and usual critic) is at its usage limit until 2026-11-09 17:32 UTC.
  Nothing an LLM sees changes, so no live run is needed; the critic was a fresh read-only subagent.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `content/languages/{it,es}/lore/inscriptions.yaml`, `server/src/content-loader.js`
  (`loadInscriptions`), `server/src/world.js`, `server/src/learning-service.js`, `server/test/inscriptions.test.js`,
  `mobile/src/components/MapPanel.js`, `mobile/src/components/Spellbook.js`, `mobile/src/stores/gameStore.js`,
  `mobile/App.js`, `mobile/src/__tests__/inscriptions.test.js`.

## Goal (pre-run)

Each of the six market locations carries one short authored inscription in the target language, shown on the map
card of a visited location behind "Look closer", and kept in the Spellbook once the location was visited, with its
translation and glossary behind a toggle. Optional: no objective, no grading, no LLM call.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Found by visiting**, not by completion or a search action: the place is the discovery. Derived from the
   visited set (`visitedLocationIds` plus the current location), no save change.
2. **The map card shows only where it is written and the text**; translation and glossary are in the Spellbook,
   withheld during an encounter as fragments are (round 030). The world snapshot carries no English translation.
3. **No answers in an inscription, checked harder than fragments** (critique 1.1, 1.2): an inscription shows on the
   map and in the Spellbook during every location encounter, so besides the fragment checks (no pack vocabulary form,
   no party stem) no word of 3+ letters may equal a word of any objective target's forms, and no word of 4+ letters may
   share its first four letters with one; an explicit allowlist holds checked false positives (es *las*, an article
   in *son las*; es *quien* against *quieto*/*quiero*). A glossary meaning, stripped of parentheses and a leading
   "to ", may not be a target's accepted translation.
4. **One inscription per location, all six, both packs**, the same `where` and `translation` English in it and es
   (tested). Pending a native speaker's review.
5. **A move returns the Spellbook too** (`{ world, spellbook }`, built from the staged save), so a new place's
   inscription is in the Spellbook at once. This also refreshes the Rift's drill, which depends on the current
   location and was stale after a move (critique 1.3): an intended fix, tested.

## Design (pre-run)

1. `content/languages/<code>/lore/inscriptions.yaml` (optional): `inscriptions: [{ id, location, where, text,
   translation, glossary: [{ word, meaning }] (1–8) }]`. `loadInscriptions` (zod strict): unique ids; `location` must
   be a world location; at most one per location; each glossary word occurs in the text (`foldWords`). Exposed as
   `content.inscriptions` (frozen, file order) and `content.inscriptionsByLocation` (Map).
2. `world.js` exports `visitedSet` (critique 1.4). `worldSnapshot(world, progress, encounters, inscriptions = new
   Map())`: a current or visited node with an inscription gains `inscription: { id, where, text }`; known nodes never.
   The three callers in `LearningService` pass `content.inscriptionsByLocation`.
3. `LearningService.inscriptions(envelope, inEncounter)`: those of visited locations, file order, `{ id, locationId,
   locationName, where, text, hidden, translation, glossary }`, translation and glossary null and `hidden` true
   during an encounter. In the spellbook snapshot as `inscriptions`.
4. `moveTo` returns `{ world, spellbook }`: on a changed move the spellbook from the staged envelope (critique 1.3),
   otherwise from the loaded one. The HTTP route passes it through.
5. App:
   - `MapPanel`: an `Inscription` subcomponent keyed by location (`key={here.id}`; no hook below the early return,
     and a move closes it; critique 1.6): a "Look closer" toggle button (`expanded`) showing `where` (small) and the
     text (italic, `accessibilityLanguage` from the pack tag, so `language` is passed from App) and "Its translation
     is in your Spellbook." No pronounce button on the map (critique 1.8).
   - Store `moveTo`: `set({ world, ...(spellbook ? { spellbook } : {}) })` and the per-learner `snapshots` entry
     updated with the new spellbook (critique 1.3).
   - `Spellbook`: an "Inscriptions" section after the fragments (`spellbook.inscriptions?.length`), one
     `InscriptionCard` (separate from `Fragment`, critique 1.8): the place name as title, a pronounce button, `where`,
     the text, and the translation toggle with glossary, or the waiting note while hidden.
6. The web client (frozen) does not read the world; it keeps building.

## Content (pre-run)

The files as frozen (texts changed from plan v1 for leak checks and critique 1.1, 1.2, 1.7):

| Location | Where | Translation |
|---|---|---|
| market_entrance | Carved on the keystone of the archway, half worn away by people looking up. | Whoever enters takes on the voice of the branch they stand in. Whoever leaves, if they leave, takes some of it away under their fingernails. |
| coffee_cart | Chalked in a corner of the menu board, the one line nobody ever wipes off. | Yesterday's orders will be served last month. We apologise for the temporal inconvenience. |
| butchers_stall | Burned into the chopping block, under a century of knife marks. | Everything is weighed at this stall, even excuses. There is no excuse that ever weighed what it claimed. |
| cracked_fountain | On the back of the brass plaque, in letters someone has tried to file away. | Reading to the end is not advised. The refrain begins where the sentence ends, and the sentence never ends. |
| old_bookshop | Pencilled on the flyleaf of a book that will not let itself be opened. | Every book in this shop was written by whoever read it last. Return it with care: you may be inside it. |
| the_rift | Stitched along the seam of light, in thread that hums when you lean close. | Here the branch is dead, yet its roots keep talking. Listen until you understand, then cover your ears. |

Changes from plan v1, each found by the checks: *lingua*/*lengua* (pack form), *come*/*como* (first word of the
tutorial's ask-back answer, at its own location; critique 1.2) → "prende la voce" / "toma la voz"; *sono*, *domani*,
*mañana* (forms), *settimana* (stem of *sette*) → "il mese scorso" / "el mes pasado"; *prometteva*/*prometía* (stem
*prom*), *Aquí* (stem *aqui*), *Nessuna* (near-form of the answer *nessuno*; critique 1.2) → "Non esiste scusa che…",
"En este puesto / lugar"; "smetti subito" / "deja de … enseguida" (a stop-now phrasing that the Rift's own `stop_now`
objective rejects; critique 1.1) → "tappati le orecchie" / "tápate los oídos"; *vez* (word of *otra vez*) → "el último
que lo leyó"; es "Devuélvelo … estés" → "Devuélvanlo … estén" and the gloss of *disculpen* (critique 1.7).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 89166f52…; a fresh general-purpose subagent (claude-opus-5-5),
read-only, in place of Codex (usage limit); raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The Rift inscription teaches "smetti subito" / "deja de … enseguida", which the Rift's `stop_now` rejects; the meaning check misses "stop (doing something)" | + | Accept: rewrite the clause; strip parentheses and "to " in the meaning check | **Accepted** (autonomous decision, pending owner review) | Decision 3, Content |
| 1.2 | Error | Near-forms of answers (it *Nessuna*, *come*/*como* at the tutorial's place); the party-stem check is too narrow | + | Accept: check every objective target word and stem, with an explicit allowlist | **Accepted** (autonomous, pending owner review) | Decision 3, Content, Tests |
| 1.3 | Gap | Returning the Spellbook from a move changes the drill; build it from the staged save; update the store's snapshots | + | Accept: an intended drill fix with tests | **Accepted** (autonomous, pending owner review) | Decision 5, Design 4–5 |
| 1.4 | Gap | `visitedSet` is private | 0 | Accept: export it | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.5 | Gap | The plan's Content no longer matches the files | 0 | Accept: the frozen texts and each change are in Content | **Accepted** (autonomous, pending owner review) | Content |
| 1.6 | Gap | Fixtures without `inscriptions`; a hook below MapPanel's early return | + | Accept: optional chaining; a keyed subcomponent | **Accepted** (autonomous, pending owner review) | Design 5 |
| 1.7 | Optional | es mixes tú and ustedes in one text; the *disculpen* gloss is wrong | + | Accept: "Devuélvanlo … estén", "please excuse (us)" | **Accepted** (autonomous, pending owner review) | Content |
| 1.8 | Cut | No pronounce button on the map; a separate Spellbook card instead of a `kind` prop | − | Accept both | **Accepted** (autonomous, pending owner review) | Design 5 |

Net change: +a harder answer check over all targets, +the drill refresh on a move, −the map's pronounce button.

## Tests (pre-run)

- `server/test/inscriptions.test.js`:
  - both packs load six inscriptions, one per location, the same ids, locations, `where` and `translation`;
  - no pack form, party stem, target word or target stem (allowlist only as listed), no target meaning in a glossary;
    the checks are live (planted *adesso*, *nessuno*, *come*, *ahora*, "stop (doing something)" are caught);
  - the loader rejects an unknown location, two at one place, a glossary word not in the text;
  - world snapshot: the current and visited nodes carry `{ id, where, text }` and no translation, known nodes none;
  - the spellbook lists visited ones only, file order, hidden during an encounter;
  - `moveTo` returns the spellbook with the new place's inscription (staged), and over HTTP `POST /api/world/move`;
  - arriving at the Rift with a pending drill returns it in the move's spellbook; walking away clears it.
- `mobile/src/__tests__/inscriptions.test.js`: "Look closer" shows where and the text and the Spellbook note, and
  closes when the location changes; no inscription, no button; the Spellbook section with toggle and glossary, the
  hidden note during an encounter, no section without `inscriptions`; the store's `moveTo` takes the spellbook (and
  its drill) when sent and keeps the old one when not.
- Full suite (`npm test`), expo-doctor, client build; Gerald's golden prompts unchanged.

## Claim boundary (pre-run)

Shows that the content loads, holds no listed answer form or stem, reaches the map and the Spellbook as designed, and
renders in jest. It does not show that the Italian and Spanish are idiomatic (native speaker), that the inscriptions
are interesting (owner, playtesters), or how the card looks on an iPhone (Simulator).

## Amendment 1 (2026-11-06, after the build): three low notes from the post-build review

A read-only review of commit 5eaa705 by a fresh general-purpose subagent (claude-opus-5-5), in place of Codex, found
no high or medium bug and no route by which a translation reaches the player during an encounter. Raw text in
[`trail/review-1.md`](trail/review-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Low | The "file order, not visit order" test visits in file order, so it would pass on visit order | 0 | Accept: a second learner visits the butcher's before the cart and expects file order | **Accepted** (autonomous decision, pending owner review) | `server/test/inscriptions.test.js` |
| R1.2 | Low | Receipts store the inscriptions (with translations); a replay brings back the Spellbook of its time, so after a move the new place's inscription is gone and an old drill returns | + | Accept: `withoutLines` strips `inscriptions`; `replayWithLines` takes `lines`, `inscriptions` and `drill` from the current snapshot; a replay test that fails without the fix | **Accepted** (autonomous, pending owner review) | `server/src/learning-service.js`, test |
| R1.3 | Low | The store's move success checks the learner, not the request epoch: a late reply after a switch away and back overwrites the Spellbook and its snapshot | + | Accept: the epoch check, as on the failure path; a store test that fails without the fix | **Accepted** (autonomous, pending owner review) | `mobile/src/stores/gameStore.js`, test |

After it: server 300/300, client 12/12, mobile 227/227.

## Outcome (2026-11-06)

Built as designed, with Amendment 1 (three low review notes, fixed and tested). Each pack has six inscriptions, one
per location. Each is found by visiting the place, shown on the map card behind "Look closer" and kept in the
Spellbook with its translation behind a toggle. The extended answer check caught twelve problems in the drafts
before the freeze. Moves now return the Spellbook, which also fixes the Rift's stale drill note. Offline only:
nothing an LLM sees changed and Codex was limited ([findings](findings.md)).
