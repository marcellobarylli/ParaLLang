# Round 026: hand counts of target-language words in the tour greetings

Counted by Claude (claude-opus-5-5) by reading each greeting, not blinded. Words are whitespace words. Names
(Gerald, Mortimer, Flick, Marginalia, Journathan) count as total but not as target. Glitched English ("procedùre")
counts as English. "espresso" counts as English (a loanword the line uses in English). Format: target / total = share
(estimate `notInTranslation` in brackets).

## Baseline tours (HEAD f3efed7)

| Encounter | it | es |
|---|---|---|
| Portia (req 0.20) | 3/13 = 0.23 (0.23) | 3/17 = 0.18 (0.18) |
| Gerald (0.25) | 2/15 = 0.13 (0.13) | 3/15 = 0.20 (0.19) |
| Mortimer (0.30) | 8/15 = 0.53 (0.57) | 7/13 = 0.54 (0.54) |
| Flick (0.30) | 5/18 = 0.28 (0.28) | 8/18 = 0.44 (0.39) |
| Marginalia (0.35) | 21/41 = 0.51 (0.49) | 18/41 = 0.44 (0.43) |
| Errata (0.50) | 4/12 = 0.33 (0.67) | 5/11 = 0.45 (0.82) |

The estimate agrees with the hand count within 0.05 everywhere except Errata. Errata's glitched English words are
missing from its clean English translation, so the estimate counts them as target language: 0.67 against 0.33 by
hand (it), 0.82 against 0.45 (es). **Errata's "overshoot" in the tours is mostly an artifact of the estimate.**

## Greeting replays: the cells the keep/revert bar flagged

| Cell | Variant, rep | Estimate | Hand count |
|---|---|---|---|
| it Errata (req 0.50) | old 0 | 0.67 | 4/12 = 0.33 |
| | old 1 | 0.67 | 5/15 = 0.33 |
| | new 0 | 0.83 | 5/12 = 0.42 |
| | new 1 | 0.93 | 8/14 = 0.57 |
| es Errata (0.50) | old 0 | 0.75 | 6/15 = 0.40 |
| | old 1 | 0.75 | 7/15 = 0.47 |
| | new 0 | 0.73 | 5/11 = 0.45 |
| | new 1 | 0.82 | 5/11 = 0.45 |
| es Marginalia, bookshop (0.35) | new 0 | 0.93 | 20/54 = 0.37 (the "translation" was a one-line summary, so almost every word counted as Spanish) |

By hand, Errata's gap falls with the new rule: it 0.17 → 0.08, es 0.07 → 0.05. Marginalia's flagged rep is at 0.37
against 0.35. The estimate's rises in these cells are artifacts. Portia's greetings are short plain lines, and the
hand count matches the estimate there (spot-checked: it new 1 "Buongiorno. Benvenuto al mercato. A greeting and
your name, please. My visitors' book dislikes mysteries." 4/15 = 0.27, estimate 0.27).

## Amendment 2 check (2026-11-05, iteration 12): Errata's greetings in `replay2-*.json`

Target-language words over all words, the names Errata and Rift left out, counted from the lines as printed.

| File | Variant, rep | Estimate | By hand | Line |
|---|---|---|---|---|
| replay2-es | old 0 | 0.82 | 4/10 = 0.40 | Hola. Soy Errata. ¿Qué necesitas? Item clàss: hùngry. Pleàse remàin ùnread. |
| replay2-es | old 1 | 0.73 | 5/15 = 0.33 | Hola. ¿Qué quieres? Tengo hambre. Ítem class: clericçal errror. Pleaše keep yoùr name inside yoù. |
| replay2-es | new 0 | 1.00 | 5/11 = 0.45 | Hola. ¿Qué quieres del mercado? Contàinment procedùre: fèed ŧhe clèrical erròr. |
| replay2-es | new 1 | 0.73 | 7/15 = 0.47 | Hola. ¿Cómo te llamas? Necesito tu nombre. Item clàss: hùngry. Please remain illeggible pending consùmption. |
| replay2-it | old 0 | 0.89 | 12/18 = 0.67 | Benvenuto. Vuoi qualcosa dal mercato? Item clàss: hùngry. Prima il cibo, poi il tuo nome. Plèase remain légible. |
| replay2-it | old 1 | 0.57 | 6/12 = 0.50 | Sono Errata. Benvenuto alla Rift. Che cosa desideri? Containment procèdure: do not ùnderstand me. |
| replay2-it | new 0 | 0.74 | 9/19 = 0.47 | Ciao. Come ti chiami? Il tuo nome, per favore. Item clàss: hùngry. Please sign hëre; I rëad the signatùre. |
| replay2-it | new 1 | 0.86 | 7/14 = 0.50 | Salve. Che cosa vuoi? Ho molta fame. Item clàss: hùngry. Yoùù lòok alarmingly rèadable. |

Errata's gap against 0.50 by hand: es old 0.13, new 0.04; it old 0.085, new 0.015. With Errata by hand, the
three-encounter mean gap is es old 0.083, new 0.027; it old 0.082, new 0.022 (Gerald and Portia by estimate).

## After-build tours (2026-11-05, iteration 12): every greeting by hand

Target-language words over all words, names (Portia, Gerald, Marginalia, Journathan, Errata) left out.

| Encounter (req) | it estimate | it by hand | es estimate | es by hand |
|---|---|---|---|---|
| Portia (0.20) | 0.19 | 3/16 = 0.19 | 0.17 | 3/17 = 0.18 |
| Gerald (0.25) | 0.25 | 4/16 = 0.25 | 0.17 | 3/16 = 0.19 |
| Mortimer (0.30) | 0.33 | 6/18 = 0.33 | 0.30 | 6/20 = 0.30 |
| Flick (0.30) | 0.30 | 6/20 = 0.30 | 0.30 | 7/24 = 0.29 |
| Marginalia (0.35) | 0.38 | 18/43 = 0.42 | 0.92 | 19/47 = 0.40 (the `translation` was again a one-line gloss) |
| Errata (0.50) | 0.64 | 5/10 = 0.50 | 0.91 | 5/11 = 0.45 |

Mean absolute greeting gap by hand: it 0.018, es 0.032.
