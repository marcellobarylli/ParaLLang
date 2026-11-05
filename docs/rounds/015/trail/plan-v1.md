# Round 015 plan v1: the Rift boss (backlog A7b, with B3)

Autonomous round (no owner present). Round 014 sealed The Rift until the other five encounters are complete; it
holds no encounter yet. This round puts the mini-boss there (prototype.md §8.2 node 6: "a corrupted being speaking
çùršęd mixed language", "review of all learned vocabulary") with infohazard flavour from `parallang_obsidian/LORE.md`.

## Goal

The Rift has a mini-boss encounter in the Italian and Spanish packs that reviews words from all five earlier
vocabulary files, speaks a corrupted mix of English and the target language, and carries the notes' infohazard
idea. It cannot be started while the Rift is sealed. The five other encounters, their prompts (Gerald's golden
prompts) and the frozen web client are unchanged.

## Decisions

1. **Errata**, `content/characters/enemies/rift_errata.yaml`: a being made of mistranslations leaking through the
   seam where the two language branches touch; an infohazard (LORE.md: harms only those who understand it). Quirks:
   its English is glitched with stray diacritics and doubled letters (çùršęd, ŧhe), but its target-language words
   are clean, because they are what it wants to steal; it reads anyone whose name it learns; it talks in fragments of
   a deadpan containment file ("Containment procedure: do not understand this sentence."); it repeats market words
   it has swallowed (coffee, ham, later, the archway's greeting). Difficulty 4, `base_target_ratio` 0.5, +0.05 per
   turn, `saveable: false` (it is a corruption, not a creature to befriend; A8 party unaffected).
2. **No new vocabulary.** Three review objectives target entries already authored, so the Spellbook and its
   versions do not change, and every vocabulary file is targeted by an objective (so narration chips cover all five
   files: `narrationEntries` is the files the objectives target):
   - `order` (Gerald, Mortimer): "The Rift has swallowed the market's stalls. Ask it for something they sold — a
     coffee or a meat — in Italian." it target [vorrei, caffe, espresso, caffe_nero, prosciutto, salame, salsiccia,
     pollo], required [[caffe, espresso, caffe_nero, prosciutto, salame, salsiccia, pollo]]; es [quiero, cafe,
     cafe_solo, cafe_negro, jamon, chorizo, salchicha, pollo], required the same minus `quiero`. Ham is fine here.
     Negatives: English-only ("A coffee, please."), a remark rather than a request ("Gerald vende caffè.").
   - `stop_now` (Flick): "It is pulling the market in. Tell it to stop, now, in Italian." Required [[fermati, fermo,
     basta], [adesso, ora]]; es [[quieto, basta], [ahora]]. Negatives: "Fermati domani." (agrees to later),
     "Stop now!" (English).
   - `nobody` (Portia, Marginalia): "It wants your name so it can read you. Do as Journathan did with the Cyclops:
     tell it your name is Nobody, in Italian." Required [[mi_chiamo, sono, nome], [nessuno]]; es [[me_llamo, soy,
     nombre], [nadie]]. Negatives: "Mi chiamo Sam." (your real name: it reads you), "Journathan si chiama Nessuno."
     (about Journathan, not the player's own introduction), English-only.
   `assessment_reference_ids` reuse the existing references of those entries.
3. **Companion briefing** (static, content only; round 009 mechanism), three lines: it is made of both languages and
   neither; it can only hurt you if you understand it, and you understand quite a lot now; everything you learned in
   the market works here.
4. **Gate on start.** `startEncounter` refuses an encounter whose location is sealed with 409 `SEALED` (same message
   as a move), because saves from rounds 005–013 may already stand in the Rift (round 014 decision 4). Checked after
   `NOT_HERE`.
5. **World:** `the_rift.yaml` `encounter: the_rift_errata`; `requires_completed` keeps the five (the loader rejects
   its own encounter).
6. **play-market.js:** a `the_rift` script, negatives first: it "A coffee, please.", "Vorrei un caffè.", "Fermati
   domani.", "Basta, adesso!", "Mi chiamo Sam.", "Mi chiamo Nessuno."; es "A coffee, please.", "Quiero un café.",
   "Quieto mañana.", "¡Basta, ahora!", "Me llamo Sam.", "Me llamo Nadie.". `tourOrder` gains `the_rift` last (the
   SEALED check moves to before the Old Bookshop's encounter, the last before the Rift). `--location the_rift` seeds
   the five completions in the temporary save first (reported as a step), so the boss can be played alone.
7. **Resolved message:** "Errata cannot read Nobody. It folds itself up like a letter sent to the wrong address, the
   seam of light narrows to a hairline, and the market sounds like itself again."

## Tests

1. Server: new `server/test/rift-boss.test.js`: both packs load the encounter at the Rift with `saveable: false`
   and the briefing; its `narrationEntries` cover all five vocabulary files; start while sealed (a save standing in
   the Rift) is refused with `SEALED`; with the five complete, a test grader plays it to resolution (English, the
   remark, "later", the real name fail; the scripted passes pass) and the map marks it complete. Existing tests
   updated for six encounters; Gerald's golden prompts unchanged; `tourOrder` test updated.
2. `npm run test:mobile`, `npx expo-doctor` (D4 only), iOS export, web client tests and build.
3. Live, codex-cli: `--location the_rift` in Italian (scripted), in Italian with `--lines` using surface variants
   ("Vorrei due etti di salsiccia.", "Fermo! Ora!", "Il mio nome è Nessuno."), in Spanish, and one Italian `--tour`
   (now six encounters). Findings: verdict per line against intent, resolution, the corrupted-English style (does
   it glitch English only, keep target words clean), share, menus, dictation, feedback leaks, the chips' coverage.

## Claim boundary

Can claim: the encounter loads and plays in both packs in-process and live as reported, the gate on start, the
corrupted style as observed. Cannot claim: how the glitched text reads on an iPhone or with VoiceOver (no
Simulator), learning quality, the owner's view of Errata or the infohazard framing.
