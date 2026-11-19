# Round 142 findings

## Question
Do a line and its translation pair up sentence by sentence, with matching colours?

## Finding
Client suite: 228 tests pass, 5 of them new. The owner's screenshot line pairs four sentences to four. Pairing is
skipped when counts differ. Not seen in a browser or on the iPhone.

## Open items
- An abbreviation with a full stop ("Sig. Rossi") splits a sentence in two; if both sides split alike the pairing
  still holds, if not, that line shows plain.
