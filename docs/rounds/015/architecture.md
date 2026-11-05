# Round 015 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present and not through the round pipeline. Sections marked *pre-run* must not be
edited after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section,
added later. The full record (drafts, raw critiques, timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** [`prototype.md`](../../../prototype.md) §8.2 node 6 (the Rift: "a corrupted being speaking
  çùršęd mixed language", "review of all learned vocabulary"); `parallang_obsidian/LORE.md` (rifts where the two
  branches touch mix both languages; infohazards harm only those who understand them; SCP-style containment voice);
  backlog A7b and B3 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); rounds [009](../009/architecture.md)
  (companion briefing), [013](../013/architecture.md) (the Cyclops trick), [014](../014/architecture.md) (the gate).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `content/` (character, two encounters, the location), `server/src/learning-service.js` and
  `server/src/world.js` (gate on start), `server/scripts/play-market.js`, tests.

## Goal (pre-run)

The Rift has a mini-boss encounter in the Italian and Spanish packs that reviews words from all five earlier
vocabulary files, speaks a corrupted mix of English and the target language, and carries the notes' infohazard
idea. It cannot be started while the Rift is sealed. The five other encounters, their prompts (Gerald's golden
prompts) and the frozen web client are unchanged.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Errata, a Rift-born infohazard** (`content/characters/enemies/rift_errata.yaml`): made of mistranslations
   leaking through the seam where the two branches touch. Its English is glitched (stray diacritics, doubled or
   swapped letters) while its target-language words stay clean, because they are what it wants to steal; it reads
   anyone whose name it learns; it talks in fragments of its own deadpan containment file; it repeats words
   swallowed from the market. Difficulty 4, `base_target_ratio` 0.5, **no escalation** (critique 1.4: a fixed half
   mix; escalation would reach 100% target language after ten turns), `saveable: false`.
2. **Three review objectives over existing vocabulary**, one required group per earlier file, so a passing run
   uses a word from each of the five files (critiques 1.1, 1.2):
   - `order`: "Ask it for a coffee and a meat they sold." it [[caffe, espresso, caffe_nero], [prosciutto, salame,
     salsiccia, pollo]]; es [[cafe, cafe_solo, cafe_negro], [jamon, chorizo, salchicha, pollo]]. A lone coffee does
     not pass yet; ham passes here.
   - `stop_now`: "Tell it to stop, now." it [[fermati, fermo, basta], [adesso, ora]]; es [[quieto, basta], [ahora]].
     "Fermati domani." / "Quieto mañana." fail.
   - `nobody`: "It wants your name so it can read you. Do as Journathan did with the Cyclops: tell it your name is
     Nobody." it [[mi_chiamo, sono], [nessuno]]; es [[me_llamo, soy], [nadie]]. The real name, a statement about
     Journathan, and "Il mio nome è Nessuno." / "Mi nombre es Nadie." fail (the review asks for the Market
     Entrance's introduction; `nome`/`nombre` stay targets but not required).
   Each pack's prompts name its own language (critique 1.3). Vocabulary definitions and content versions are
   unchanged; normal Spellbook discovery and review continue (critique 1.5).
3. **Companion briefing**, three static lines: it is made of both languages and neither; it can only hurt you if
   you understand it, and you understand quite a lot now; everything you learned in the market works here.
4. **Gate on start:** `startEncounter` throws 409 `SEALED` (the move's message, shared as `sealedMessage`) when the
   encounter's location is sealed, after `NOT_HERE`, so a save from rounds 005–013 standing in the Rift cannot
   start the boss early.
5. **World:** `the_rift.yaml` `encounter: the_rift_errata`; `requires_completed` keeps the five.
6. **play-market.js:** a `the_rift` script (it "A coffee, please.", "Vorrei un caffè.", "Vorrei un caffè e del
   salame.", "Fermati domani.", "Basta, adesso!", "Mi chiamo Sam.", "Mi chiamo Nessuno."; es likewise with "Quiero
   un café y chorizo.", "Quieto mañana.", "¡Basta, ahora!", "Me llamo Nadie."); `--location the_rift` seeds the five
   completions in the temporary save (a reported step); `tourOrder` ends with `the_rift` (critique 1.6 rejected: the
   tour is the level's end-to-end check), the SEALED attempt still before the Old Bookshop's encounter.
7. **Resolved message:** "Errata cannot read Nobody. It folds itself up like a letter sent to the wrong address, the
   seam of light narrows to a hairline, and the market sounds like itself again."
8. **Second opinion:** see the table.

## Claim boundary (pre-run)

The round can claim the encounter loads and plays in both packs in-process (fixture grader) and live as reported,
the gate on start, and the corrupted style as observed in the saved lines. It cannot claim how the glitched text
reads on an iPhone or with VoiceOver (no Simulator), learning quality, or the owner's view of Errata and the
infohazard framing.

## Deferred (pre-run)

The pre-boss Spellbook drill (C1), infohazard containment files in the Spellbook (LORE.md), infohazard passages in
the Fountain (rest of B3), the party (A8), Simulator checks.

## Design (pre-run)

- `content/characters/enemies/rift_errata.yaml`; per pack `encounters/the_rift_errata.yaml` (no vocabulary file);
  `content/world/locations/the_rift.yaml` names the encounter.
- `server/src/world.js`: `sealedMessage(name, gate)`, used by `applyMove` and `startEncounter`.
- Test content copies that drop the Butcher's Spanish vocabulary (`server/test/encounters.test.js`) also drop the
  Rift encounter.

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 5eca3ff4…; Codex, effort high, code inlined on stdin;
raw text in [`trail/critique-1.md`](trail/critique-1.md). Dispositions are autonomous decisions by Claude, pending
owner review.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | One coffee-or-meat group lets a run skip the butcher's file | + | Accept: a coffee group and a meat group | **Accepted** (autonomous, pending owner review) | Decision 2, Decision 6 |
| 1.2 | Error | `nome` in the introduction group lets a run skip the entrance file | − | Accept: [mi_chiamo, sono] only; "Il mio nome è Nessuno." becomes a negative | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.3 | Error | The plan's prompts say "in Italian" for the Spanish pack too | 0 | Accept: each pack names its language | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.4 | Error | 0.5 + 0.05 per turn reaches 100% target language after ten turns | − | Accept: escalation 0 | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.5 | Error | "Spellbook unchanged" is false: discovery and review continue | 0 | Accept: narrow the claim | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.6 | Cut | Extending the tour to the boss is unnecessary | − | Reject: the tour with the boss is the whole level end to end, the Phase 3 milestone | **Rejected** (autonomous, pending owner review) | Decision 6 |
| 1.7 | Cut | expo-doctor and the iOS export do not test this change | − | Reject: the run brief requires every suite before a non-wip commit | **Rejected** (autonomous, pending owner review) | Tests |

Net change from plan v1: +1 required group (`order`), −1 accepted alternative (`nome`/`nombre`), escalation 0.05 →
0, +1 scripted line per pack (a lone coffee), the Spellbook claim narrowed.

## Tests (pre-run)

1. `node --test server/test/*.test.js`: new `server/test/rift-boss.test.js` (both packs: Errata at the Rift,
   `saveable: false`, three briefing lines, objectives in order, chips over every authored entry; `NOT_HERE` away
   from the Rift and `SEALED` for a save standing in it at 4 of 5; with the five complete, a test grader rejects
   English, a lone coffee, "tomorrow" and the real name and resolves on the scripted passes; fixed ratio; the map
   marks it complete). Existing tests updated for six encounters and the tour; Gerald's golden prompts unchanged.
2. `npm run test:mobile`, `npx expo-doctor` (D4 only), `npx expo export --platform ios`, web client tests and build.
3. Live, codex-cli: `--location the_rift` in Italian (scripted), in Italian with `--lines 'Vorrei due etti di
   salsiccia e un espresso.|Fermo! Ora!|Sono Nessuno.'` (surface variants), in Spanish, and one Italian `--tour`.
   Findings: the verdict on each line against intent, resolution, the corrupted style (English glitched, target
   words clean), share, menus, dictation, feedback leaks, chips from several files.

## Outcome (2026-11-05)

Built as designed, with no Amendment. Errata, a Rift-born infohazard, reviews all five earlier vocabulary files in
three objectives (a coffee and a meat; stop now; "my name is Nobody") in a fixed 0.50 mix of glitched English and
clean target language, and cannot be started while the Rift is sealed. Live codex-cli: every run that reached the
provider resolved (Italian 3, Spanish 1, plus a Spanish run cut off by Codex's usage limit), every scripted line was
graded as intended, 0 feedback leaks; the Italian tour played all six encounters in one save (27/27 lines, 60 calls).
The script's share measure counts glitched English as target language, so report both numbers. Tests: server
101/101, mobile 22/22, web client 12/12 and build. Live runs spanned two iterations because of the usage limit (rows
12–14). Not checked in the iOS Simulator. See [findings](findings.md).
