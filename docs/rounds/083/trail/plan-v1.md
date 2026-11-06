# Round 083 plan v1: fragments under the inscriptions' answer check

Autonomous, offline round (Codex limited until 2026-11-09 17:32 UTC); critic: a fresh read-only subagent.

## Source

Round 082 built a harder answer check for inscriptions (`answerLeaks` in `server/test/inscriptions.test.js`): no
pack form, no word (3+ letters) of any objective target's forms, no shared 4-letter stem, no target meaning in a
glossary (parentheses and "to " stripped). Fragments of *The Journey* (rounds 030–033) have only the older checks:
pack forms, glossary meanings matched whole, and party stems. They show in the Spellbook during every encounter (text
only). A scan with the new check finds:

| Pack | Fragment | Hit | Target it touches |
|---|---|---|---|
| it | journey_sirens | *senza* | Gerald's "senza latte" |
| it | journey_shroud | *giorno* ("di giorno") | "buon giorno" |
| it | journey_lotus | *una* (article) | "È l'una" (time) |
| es | journey_first_stitch | *vez* ("Cada vez"), *más* ("los más antiguos"), *una* | "otra vez", "¿más?", "es la una" |
| es | journey_sirens | *sin* ("sin desviarse", "sin fin"), *las* | "sin leche", "son las" |
| es | journey_shroud | *día* ("de día"), *las* | "buen día" |
| es | journey_dead_branch, journey_forbidden_herd | *quien* (stem of *quieto*, *quiero*), *las* | — (false positive) |
| es | journey_lotus | *una*, *las* | — (articles) |
| es | journey_old_dog | *Solo* ("Solo un perro"), *las* | "café solo" |

Containment files are English (their only hits are "translate" against *tranquillo*): out of scope.

## Decisions (autonomous, pending owner review)

1. **Fragments take the inscriptions' check.** `answerLeaks` and the allowlist move to `server/test/answer-check.js`
   (a module, not a test file), used by both test files.
2. **Allowlist** (shared, per pack, each with its reason): it *una* (article; the target is the time phrase "È
   l'una"); es *una*, *las* (articles; "es la una", "son las"), *quien* (stem false positive against *quieto*,
   *quiero*). An allowed word is still caught when it is a pack form on its own (the pack-form check is separate).
3. **Reword the target-language text only; the shared English stays.** Each change is the smallest that removes
   the hit and keeps the meaning:
   - it sirens: "desiderava ascoltare senza sterzare verso di loro" → "desiderava ascoltare, ma non sterzare verso
     di loro";
   - it shroud: "tesseva un sudario di giorno e lo disfaceva di notte" → "tesseva un sudario dall'alba al tramonto
     e lo disfaceva di notte";
   - es first_stitch: "Cada vez que" → "Siempre que"; "los más antiguos" → "los antiguos";
   - es sirens: "deseaba escuchar sin desviarse hacia ellas" → "deseaba escuchar, pero no desviarse hacia ellas";
     "repetido sin fin" → "repetido para siempre";
   - es shroud: "tejía un sudario de día" → "tejía un sudario del alba al ocaso";
   - es old_dog: "Solo un perro viejo" → "Únicamente un perro viejo".
   The glossaries keep their words (all still in the text); the English translations are unchanged (tested equal
   across packs).

## Tests

- `server/test/lore-fragments.test.js`: every fragment passes `answerLeaks` with the shared allowlist (both packs);
  the round 030–033 checks stay.
- `server/test/inscriptions.test.js` imports the moved module; unchanged behaviour.
- Full suite green; no prompt or app change (fragments reach no LLM prompt; check `prompt-builder.js`).

## Criteria

Offline: all suites green, `round_log_check.py 083`.
