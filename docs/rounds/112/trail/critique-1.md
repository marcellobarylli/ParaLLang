# Critique 1: an annex on CM-002 and baseLimit (fresh subagent; Codex limited)

- **Dispatched:** 2026-11-06 10:02:30 UTC
- **Returned:** about 10:05:10 UTC (153 s)
- **Model:** a fresh general-purpose Claude subagent, read-only by instruction (Codex at its usage limit until 11-09 17:32 UTC); effort unknown
- **Prompt:** an adversarial read-only design critique of `plan-v1.md` against round 111's records, the service, loader, tests, the two Rift/Fountain encounter files and LORE.md; numbered findings labelled Error / Gap / Minor / Style with fixes, then Optional; under 900 words
- **Reviewed input:** `plan-v1.md`, sha256 47336ffc…, HEAD d2c30ef, working tree: docs/rounds/112/ untracked
- **Findings:** 12 (3 Error, 5 Gap, 3 Minor, 1 Style); 4 Optional

## Raw output (verbatim)

```text
I found 3 Errors, 5 Gaps, 3 Minor and 1 Style finding. The drafted it/es texts leak answers in both packs, including the Rift's own answer.

**Critique of round 112 plan v1** (`/work/ParaLLang/docs/rounds/112/trail/plan-v1.md`)

I ran the drafted texts through `answerLeaks` (`server/test/answer-check.js`, with `ALLOWED.fragments`) and the round-111 English check, using `node -e` without writing any file.

1. **Error: the drafted it/es text leaks answers, including the Rift's own.**
   - it: forms `lingua`, `io`, `sono`, `due`; target words `sono`, `due`.
   - es: forms `lengua`, `dos`, `yo`, `soy`; target words `dos`, `soy`, `tranquilo`. *Transcripción* shares the stem *tran* with *tranquilo* (`mortimer_oath`).
   - *sono* and *soy* are targets of the Rift's `nobody` objective ("Sono Nessuno"). The annex `text` is not hidden during an encounter (`annexSnapshot`: `text: read ? annex.text : null`). So a player who restarts the Rift, or Market Entrance (*io*/*sono*), sees the answer in the Spellbook.
   - Fix: drop first-person *io/sono/yo/soy*, *due/dos*, *lingua/lengua* and *Transcripción*. A replacement that passes `answerLeaks` in both packs (forms, target words and meanings, with a test gloss *rami* "branches"):
     - it: "Trascrizione della fessura. I rami si avvicinano e, dove si toccano, le parole perdono il loro senso. Mi credono un errore. Non è così: quello che vedono è ciò che resta di un idioma quando tutti lo capiscono male. Sotto di me c'è un idioma antico, vicino alla radice dell'albero. Quello non sbaglia mai. Aspetta."
     - es: "Registro de la grieta. Las ramas se acercan y, donde se tocan, las palabras pierden su sentido. Me creen un error. No es así: lo que ven es lo que queda de un idioma cuando todos lo entienden mal. Debajo de mí hay un idioma antiguo, cerca de la raíz del árbol. Ese nunca se equivoca. Espera."
   - The glossary still has to be re-run through the check once it is drafted.

2. **Error: the redaction's English gives away a target in both packs.** "It is the thing talking" hits *it is*, the accepted translation of it `sono_le` and es `son_las`. The plan's rule "allow exactly I/you" would fail the test, or tempt someone to widen the allow-list. Fix: "This is the thing talking, not a file about it." I re-checked it: the hits are then it `i`/`you` and es `i`, as in round 111.

3. **Error: the plan breaks `containment.test.js` and does not say how to fix it.** That test asserts `deepEqual(files.it.the_rift_errata, files.es.the_rift_errata)`, so the whole Errata file must be the same in both packs. An annex whose `text` and glossary differ per pack fails this. It also asserts `Object.hasOwn(filed[1], 'annex') === false`. Fix: compare the file without `annex`, compare the annex's English keys separately, and replace the "no annex" assertion with CM-002's unread annex payload.

4. **Gap: the English translation is never checked.** The plan's translation has "two", "left" (it *sinistra*, es *izquierda*) and "I am". It is withheld during an encounter, but the round-111 English check covers only the title, redaction and exposure note, and any gloss of *due*/"two" is a meaning hit. Fix: add `translation` to the English check, or reword ("The branches draw near", no "left"). Also keep "Nobody" out of the exposure note: it is an accepted translation of *nessuno*/*nadie*, so the tempting "Reader's name on file: Nobody" is a leak.

5. **Gap: two pending annexes not stacking makes the second read free.** The plan's case is real: a player reads CM-001 late, after the Rift. Then both reads together cost one strained conversation, which empties the "cost" of CM-002. Fix, either:
   - spend one read per finished conversation, oldest first: `strainedBy = [oldest pending id]`, and the next conversation is strained again; or
   - stack the −1 per pending read, floor 0 (harsh: 2 → 0).
   The first keeps "a hint fewer for the next conversation" true for each read. Record whichever is chosen as an autonomous decision.

6. **Gap: the cost after the Rift is close to nothing, and the plan only asserts that it is fine.**
   - After the Rift no location encounter is left. The player spends the strain on the easiest party conversation or a restart, or never plays again. This is exactly the open question in round 111's Claim boundary.
   - Fix: at least state it in the claim boundary and add it to the owner's open item on the cost's size.
   - Better: let CM-002's read have a second, lore-fitting cost (e.g. the companion cannot redact, so the *next* annex shows unredacted), or add it to the backlog.

7. **Gap: the `baseLimit` test "strained = limit + 1" is wrong at the floor.** `hintLimit` is `max(0, limit − 1)`. With `hint_limit: 0` (the schema allows non-negative), strained limit and base are both 0. Every objective has 2 today, so it only passes by luck. Fix: assert `baseLimit === objective.hint_limit`, and add a fixture with `hint_limit: 0` or `1`.

8. **Gap: old receipts have no `baseLimit`.** `forReceipt` stores the serialized encounter, so replays and receipts from before round 112 arrive without the key. Fix: mobile shows "; usually N" only when `typeof baseLimit === 'number' && baseLimit > limit`, with a jest test for the missing key.

9. **Minor: the YAML comment in both `the_rift_errata.yaml` files is stale.** It says "Shown once the Rift is visited", but `containmentFiles` files on completion. The plan states this correctly; fix the comment while editing the file.

10. **Minor: grammar and register in the plan's own drafts.**
    - "dove si toccano le parole perdono" (and es "donde se tocan las palabras pierden") reads as "where the words touch". It needs commas around the clause.
    - Capitalised "Lei" reads as the formal "you"; use *Quella* or drop the subject. "Ella … Ella" repeats the subject needlessly.
    - The es pack shows no *vosotros*, so I used the third-person "Me creen" rather than "creéis".
    - None of this has had native review; keep it in the open items.

11. **Minor: the UI line is ambiguous.** "Hints: 1/1 (your companion is recovering; usually 2)" can read as "usually 2 remaining". Fix: "Hints: 1/1 (your companion is recovering: 1 fewer than usual)", or "…; 2 when rested". Test the line both strained-ongoing and strained-resolved; it hides once resolved.

12. **Style: Rift rules the plan should state and test.**
    - The drill (`drill_before`) runs only before the first fight, and reviews never spend the strain. A Rift restart is strained like any other.
    - Errata has no `party_of` conversation, which the plan states correctly.
    - `annexById` and `pendingStrainIds` do generalise. Content loading enforces unique annex ids and glossary words in the text, which is enough.
    - Add a test that reading CM-002 while a Rift restart is under way returns `IN_ENCOUNTER`.

**Optional**
- Make `annex.test.js` loop over every annex in the pack (its `ANNEX` and `annexOf` constants are CM-001-only), so a third annex is covered automatically.
- Add an explicit "no `text` field contains a target of its own encounter" assertion. That is the Rift-specific risk behind finding 1.
- A `NOT_FILED` test for CM-002 with CM-001 already filed, so filing is per file, not global.
- Mobile: render two files with annexes (one read, one unread) in the same Spellbook, to catch key or state mix-ups.
```
