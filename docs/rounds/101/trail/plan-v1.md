# Round 101 plan v1: leaks, frame words and English forms in NPC lines

Source: round 044 open item 2 ("weight a target by its required group, so Errata's *sono* / *nombre* stop counting
as leaks") and round 100's English forms. Over the 149 committed reports, 23 NPC `leak` lines come from round 051 on
(it 98 / es 29 in all); read by hand they are Errata's *nombre* / *nome* (an optional target of `nobody`; the key is
*nadie* / *nessuno*), Gerald's English "five espresso shots", Errata's *sono* and *basta*, and Flick's *ora* used as
"hour" (`now` accepts *ora*). Offline.

## Decisions

1. **Frame targets.** A target id of an objective that is in none of its `required_target_groups` is optional: it
   is graded as evidence but never needed to pass (`learning-service.js:898`). Today: it *tre, cento, mezzo*
   (Mortimer's quantity), *vorrei* (Gerald, Errata), *io* (Portia), *nome* (Errata); es *dos, tres, cien, medio*,
   *quiero*, *yo*, *nombre*. A hit on such a form is marked `frame`.
2. **English forms.** Round 100's `ENGLISH_FORMS`; a whole-form hit on one in an NPC line is marked `english`
   (Gerald's "espresso shots"). Errata's existing `ENGLISH_SPEAKERS` handling of word hits is unchanged.
3. **A fifth kind, `soft`.** A line is `leak` only with a fresh exact hit that is neither frame nor English. A line
   whose fresh exact hits are all frame or English is `soft`. Order: `leak` > `soft` > `near` > `quoted` > `echo`,
   so a line with a frame hit and a word hit is `soft`. Totals add `softLines`; the printed line adds `soft N`.
4. **Word hits** (`near`) are unchanged: a word of a multi-word form, whatever its target.
5. **Homonyms** (*ora* as "hour") stay leaks: the word is the answer form, whatever the NPC means by it.
6. **Measure:** the per-kind totals before and after over every committed report, split by era (before and from
   round 051), and the remaining `leak` lines from round 051 on listed.

## Tests

A frame hit (*nombre* in Errata es) is `soft`, not `leak`; *nadie* in the same line is `leak`; Gerald's
"espresso shots" is `soft`; Mortimer's *tre* with the unit open is `soft`, the unit (*etto*) is `leak`; a soft hit
the player wrote earlier is echo as before; summarize counts `softLines`; every committed report's lines change only
from `leak` to `soft` (a before/after diff by line key).
