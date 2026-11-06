# Round 083 findings

## Question

Do the fragments of *The Journey*, which show in the Spellbook during every encounter, pass the answer check that
round 082 built for inscriptions, and what does it take to make them pass?

## Finding

**They did not, and six small rewrites fixed it.** Before this round, seven of the fourteen fragment texts held a word
of an objective target's forms. The four that touched real answers are now reworded, with the shared English
unchanged:

- it: *senza*, the key word of Gerald's "senza latte", in the Sirens; *giorno*, from "buon giorno", in the shroud.
- es: *sin* (from "sin leche") twice in the Sirens; *día* (from "buen día") in the shroud; *Solo* (from "café
  solo") in the old dog; *vez* and *más* (from "otra vez" and "¿más?") in the first stitch.

The other hits were articles (it/es *una*, es *las*) and one stem false positive (es *quien*). They are let through by
name, one allowlist per surface. A test shows that each allowed word would be a hit without its list, and that
"È l'una", "a la una" and "son las" are still caught as pack forms.

The round 030–033 checks never saw these words: they look for whole pack forms (*senza latte*, *sin leche*, *café
solo*) and party stems only.

## Method

As in [architecture.md](architecture.md). The plan was critiqued by a fresh read-only subagent in place of Codex: 8
findings, 7 accepted, 1 rejected. Two of the accepted findings changed the Spanish wording. Offline; fragments
reach no prompt.

## Results

| Check | Result |
|---|---|
| New fragment test (`lore-fragments.test.js`) | passes: 14 fragments, 0 hits; each allowed word matters; time phrases caught |
| `inscriptions.test.js` (check moved to `answer-check.js`) | 8/8, unchanged |
| Full suites | server 301/301, client 12/12, mobile 227/227 |

## Decision

Keep the rewrites and the check (autonomous decision, pending owner review).

## Evidence

The diff of `content/languages/{it,es}/lore/fragments.yaml` in this round's build commit, `server/test/answer-check.js`,
and the critique in [`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

No fragment or inscription holds a pack form, or a word or 4-letter stem of an objective target's forms, other than
the named allowlist. This does not cover target-language words outside the pack, or kept lines and cards, which show
target text during encounters by design. Whether the reworded texts read naturally is for a native speaker.

## Open items

- Owner: native-speaker review of the six rewrites, in particular es "Únicamente un perro viejo" (more formal than
  "Solo", which is the café-solo answer) and "los primeros hilos" (superseding round 033's note that "los más
  antiguos" stays).
