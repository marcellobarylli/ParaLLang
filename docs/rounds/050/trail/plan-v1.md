# Round 050 plan v1: telling the time at the Cracked Fountain (backlog G5)

Autonomous round (no owner present). Round 011 built Flick the Letharger at the Fountain with three ordered
objectives (stop, direction, now) and deferred "telling the time" (prototype.md §8.2 gives the Fountain "time,
directions, commands"; round 011 architecture: "No telling the time (numbers would need their own objective)").

## Goal

The player tells Flick the time, in the target language, as a fourth objective of the Fountain encounter, in both
packs, with live runs that show the grader accepts a time and rejects non-times.

## Design

1. **Objective `time`**, inserted between `direction` and `now` (ordered encounter, `now` stays last because its
   intent carries the jingle, which must reach every narration line: round 025 trap). `direction.next_objective`
   becomes `time`, `time.next_objective` is `now`.
   - Prompt: "Flick swears it is far too early to do anything. Tell it what time it is, in Italian." (es: Spanish)
   - Intent: "The fountain's clock stopped long ago and Flick says it is always too early. The player tells Flick
     the time, any hour, in Italian (it is one o'clock, it is three, midday, midnight). Flick may ask what time it
     is, but never says a time itself."
   - Passes: any hour stated as the player's own statement of the time, minutes optional. Fails: "now" alone
     (adesso / ahora: that is the next objective), a question back ("Che ore sono?"), English, "later/tomorrow".
2. **Vocabulary** (added to `fountain_riddles.yaml`, version `-v2`, no new file so the Rift's chip coverage and the
   aggregate stay one file per encounter):
   - it targets: `sono_le` phrase *sono le* ("it is … o'clock", plural hours), `luna` phrase *l'una* (surfaces
     *è l'una*, *l'una*), `mezzogiorno` (midday, noon), `mezzanotte` (midnight).
   - it non-target (chips for Flick's question): `che_ore_sono` phrase *che ore sono* (also *che ora è*).
   - es targets: `son_las` phrase *son las*, `la_una` phrase *la una* (surfaces *es la una*, *la una*), `mediodia`
     (*mediodía*), `medianoche`.
   - es non-target: `que_hora_es` phrase *qué hora es*.
   - Required group: all four targets (one of them must be matched as evidence; any hour then follows them).
3. **No number vocabulary.** Hour numbers are not authored: English collisions (it *due*, es *once*), twelve
   entries per pack, and the Rift would review them. The grader accepts any hour; the midday/midnight path needs no
   number. The hint path reveals *sono le* / *son las*. Open item for the owner: a numbers lesson.
4. **Flick's character file is unchanged** (shared with its party conversations, which would change otherwise);
   the encounter's `defeat_condition.description` names the time.
5. **Tests:** `fountain.test.js` scripts become 8 answers (adds a now-only answer that fails `time` and a variant
   time that passes); the verdict table grows by `time`. `encounters.test.js` / `language-engine.test.js` pins move
   to `fountain-riddles-*-v2`. Lore-fragment, containment, party-overlap and stem tests must pass unchanged (a
   fragment holding a new form is rewritten, not the test).
6. **play-market.js** `cracked_fountain` script: it `['Guarda!', 'Fermati!', 'Left.', 'A sinistra!', 'Adesso!',
   "È l'una, Flick.", 'Domani.', 'No, adesso!']`; es `['¡Mira!', '¡Quieto!', 'Left.', '¡A la izquierda!',
   '¡Ahora!', 'Es la una, Flick.', 'Mañana.', '¡No, ahora!']`. The Rift's scripts are unchanged.

## Live runs (codex-cli)

- 2 × it and 2 × es `--location cracked_fountain` (~17 calls each). Run 2 of each language uses `--lines` with a
  question back (*Che ore sono?* / *¿Qué hora es?*, should fail) and the plural form (*Sono le tre.* / *Son las
  tres.*) or midday (*È mezzogiorno!* / *¡Es mediodía!*).
- Then one `--tour` (it) if Codex has budget, as the end-to-end regression.
- Measure: verdicts vs scripted, Flick saying a time itself (a leak of the open objective), the language share of
  Flick's lines (round 011: near the requested share), the jingle still present, and `leak-scan.js` on every report.

## Success

All server, mobile and client tests pass; every live verdict matches the script, or a mismatch is explained; Flick
does not state the time in ≥ 3 of 4 runs.
