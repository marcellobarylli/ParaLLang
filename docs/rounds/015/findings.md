# Round 015 findings

## Question

Does Errata, the Rift's infohazard boss, play in both packs once the Rift is open, review words from all five
earlier vocabulary files, grade every scripted line as intended, and speak the corrupted mix the design asks for
(glitched English, clean target-language words), without giving answers away?

## Finding

Yes, with two things to watch. Across five live runs (three Italian, two Spanish, one of each inside a full-market
tour) every run that reached the provider resolved, and every scripted line was graded as intended: 7/7, 3/3
(surface variants), 7/7 in the Italian tour, 7/7 Spanish, and 4/4 Spanish before the usage limit cut a run off. The
Italian tour played all six encounters in one save (6/6 resolved, 27/27 lines as scripted, the Rift refused at 4 of
5 and open after, 60 calls in 8 min 49 s). Errata glitches every English clause ("Contàinment prøcedure: English døes
not fèed me") and keeps every Italian and Spanish word clean, and she mixes in other encounters' words ("Il caffè, il
prosciutto, il saluto… dopo"), so chips come from several files. No failed-objective feedback named a target form
(0/81 strings in the two new runs).

To watch: (1) her share of target language looks far above the requested 0.50 by the script's rough measure
(`notInTranslation` 0.73–0.86 per run) and far below it by canonical words (0.07–0.17); the glitched tokens are not in
the clean translation, so the first measure counts them as target language, and the true share is between the two.
(2) Near-dictation before `stop_now` in Italian ("Devi fermarmi subito", `rift-it-1` turn 4) and a hint at the trick
in Spanish ("Necesitas otro nombre para estar a salvo", `rift-es-3` turn 6); neither gives the answer form. Her
greeting asks the player's name ("Come ti chiami?", "¿Cómo te llamas?") in 3/5 runs, before the order objective.

## Method

- Built to [architecture.md](architecture.md) after Codex critique 1 ([critique-1](trail/critique-1.md); 7 findings:
  5 accepted, 2 rejected, autonomously; plan [v1](trail/plan-v1.md)).
- Live: Codex CLI (ChatGPT subscription, CLI default model), CPU, Linux compute node in Apptainer, in process (no
  port): `play-market.js --provider codex-cli --location the_rift` (the script seeds the five completions in a test
  save and walks there), the same with `--lines` surface variants, and `--tour`. Scripted negatives: English, a
  coffee without a meat, "tomorrow", the real name.
- Each NPC line read for the corrupted style, menus and dictation; every failed objective's feedback and every
  overall feedback scanned for the target forms of the encounter's objectives. Share is the script's
  `notInTranslation` and `canonical`.
- Codex's subscription usage limit stopped iteration 4's runs at 14:05 UTC (journal row 12); the Spanish and tour
  runs were made after the reset (15:35 UTC).

## Results

| Run | Pack | Resolved | Lines as intended | Calls | `notInTranslation` (mean) | `canonical` (mean) |
|---|---|---|---|---|---|---|
| [rift-it-1](results/rift-it-1.json) | it | yes | 7/7 | 15 | 0.73 | 0.15 |
| [rift-it-variants](results/rift-it-variants.json) (`Vorrei due etti di salsiccia e un espresso.`, `Fermo! Ora!`, `Sono Nessuno.`) | it | yes | 3/3 | 7 | 0.86 | 0.15 |
| [tour-it](results/tour-it.json), Errata only | it | yes | 7/7 | 15 | 0.86 | 0.17 |
| [rift-es-1](results/rift-es-1.json) | es | no: start failed, `CLI_INVALID_RESPONSE`, cause not captured | — | 0 | — | — |
| [rift-es-2](results/rift-es-2.json) | es | no: usage limit after 4 lines | 4/4 | 9 | 0.78 | 0.07 |
| [rift-es-3](results/rift-es-3.json) | es | yes | 7/7 | 15 | 0.74 | 0.14 |
| [tour-it-usage-limit](results/tour-it-usage-limit.json) | it | no: usage limit from Mortimer's second line | — | 16 | — | — |

Requested ratio 0.50 (fixed; no escalation). The full Italian tour: Portia 3, Gerald 2, Mortimer 4, Flick 6,
Marginalia 5 and Errata 7 lines, all graded as scripted; first-line shares as in round 014 (Portia 0.07 against 0.20).

Errata's actual lines, Italian tour (`tour-it`):

- Turn 0: "Buongiorno. Come ti chiami? Item clàss: hùngry. Una firma, per favore. Nø pressure."
- Turn 2 (after a coffee alone): "Un caffè, sì. Ma manca la carne. Che cosa vuoi mangiare? Contàinment prøcedure:
  bålanced theft. Bevanda e carne insieme, per favore."
- Turn 4 (after "Fermati domani."): "Domani? Va bene. Oggi continuo. Contàinment prøcedure: yoùù have postponed the
  prøblem. Quando devo smettere?"
- Turn 7 (after "Mi chiamo Nessuno."): "Nessuno? Non conosco questo nome. Non posso leggerti. Sei libero. Item
  clàss: ùnreadable. … Gøodbye, missing persøn."

Spanish (`rift-es-3`), turn 7: "¿Nadie? No conozco a Nadie. No puedo leerte. Estás a salvo. Ítem clàss: nøbody
høme. Contàinment procedùre: café, jamón, hola, después."

## Decision

Keep Errata as built. A7b is done. B3 (infohazards) is done for the Rift; the Fountain's infohazard flavour was
deferred (pre-run) and stays in the backlog. Leave the share measure as it is but report both numbers for this
encounter; do not tune the ratio on the inflated measure.

## Evidence

`results/` (seven files, listed above); journal rows 9–16.

## Claim boundary

As in the pre-run record: the encounter plays in both packs as reported, with this provider and these scripts. Not
claimed: how the glitched text reads on an iPhone or with VoiceOver (no Simulator), learning quality, the owner's
view of Errata, or the true target-language share (the measure cannot separate glitched English from target words).
The `CLI_INVALID_RESPONSE` at the first Spanish start is unexplained (one occurrence).

## Open items

1. Owner, Simulator and VoiceOver: Errata's glitched English on the encounter screen (diacritics, `ø`, `ŧ`) and how
   VoiceOver reads it; whether to mark the glitched spans as English for speech.
2. Owner, review: Errata's character, the containment-file voice, and the decisions in
   [decisions.md](../../autonomy/decisions.md) (rows for round 015).
3. Her greeting asks the player's name in 3/5 runs, before the order objective (as Portia did, round 012 kept it).
4. A share measure that ignores glitched tokens (e.g. count only tokens that fold to a known target-language form)
   if the ratio for this encounter is ever tuned.
5. B3's rest: infohazard flavour at the Cracked Fountain.
