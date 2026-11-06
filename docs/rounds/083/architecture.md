# Round 083 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Source:** [round 082](../082/architecture.md) built a harder answer check for inscriptions. The fragments of
  *The Journey* (rounds 030–033) show in the Spellbook during every encounter (text only) but have only the older
  checks (pack forms, whole glossary meanings, party stems). A scan with the new check found target words in them.
- **Offline round:** Codex is limited until 2026-11-09 17:32 UTC; fragments reach no prompt
  (`server/src/llm/prompt-builder.js` does not read them). Critic: a fresh read-only subagent.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/test/answer-check.js`, `server/test/lore-fragments.test.js`,
  `server/test/inscriptions.test.js`, `content/languages/{it,es}/lore/fragments.yaml`.

## Goal (pre-run)

Every fragment passes the inscriptions' answer check, with the fewest and smallest rewrites of the target-language
text, the shared English unchanged.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Fragments take the inscriptions' check.** `answerLeaks` moves to `server/test/answer-check.js` (a module; the
   test script runs only `*.test.js`), used by both test files.
2. **One allowlist per surface** (critique 1.3), each word with its reason:
   - inscriptions as in round 082: es *las*, *quien*;
   - fragments: it *una*; es *una*, *las*, *quien*. *una* and *las* are articles (the targets are the time phrases
     "È l'una", "es la una", "son las"); *quien* is a stem false positive against *quieto* and *quiero*.
   A test plants each allowed word with no allowlist and expects a hit, so every allowed word matters. A second test
   plants "È l'una", "a la una" and "son las" with the allowlist on and expects the pack forms `luna`, `es_la_una`
   and `son_las`: the phrases stay caught (critique 1.4).
3. **The old fragment checks stay** (critique 1.6 rejected): they are cheap, their pinned stem lists catch content
   drift, and removing them is not this round's work.
4. **Rewrites** (target-language text only; glossary words all stay in the text; English unchanged):
   - it sirens: "desiderava ascoltare senza sterzare verso di loro" → "desiderava ascoltare, ma non sterzare verso
     di loro" (*senza*, Gerald's "senza latte");
   - it shroud: "tesseva un sudario di giorno e lo disfaceva di notte" → "tesseva un sudario dall'alba al tramonto e
     lo disfaceva di notte" (*giorno*, "buon giorno");
   - es first_stitch: "Cada vez que" → "Siempre que" (*vez*, "otra vez"); "los más antiguos" → "los primeros hilos"
     (*más*; critique 1.1: "los antiguos" alone reads as people). This supersedes round 033's note that "los más
     antiguos" stays;
   - es sirens: "deseaba escuchar sin desviarse hacia ellas" → "deseaba escuchar, pero no desviarse hacia ellas";
     "repetido sin fin" → "repetido hasta el infinito" (*sin*, "sin leche"; critique 1.2);
   - es shroud: "tejía un sudario de día" → "tejía un sudario del alba al ocaso" (*día*, "buen día");
   - es old_dog: "Solo un perro viejo" → "Únicamente un perro viejo" (*solo*, "café solo"; more formal, flagged for
     the native-speaker review, critique 1.5).
5. **Claim scope** (critique 1.8): the claim covers fragments and inscriptions. Kept lines and card targets still
   show target-language text during encounters by design (words and lines the player already found).

## Design (pre-run)

1. `server/test/answer-check.js` exports `answerLeaks(content, item, allowed)` (round 082's function, unchanged) and
   `ALLOWED = { inscriptions: { it: [], es: ['las', 'quien'] }, fragments: { it: ['una'], es: ['una', 'las', 'quien'] } }`.
2. `inscriptions.test.js` imports both (behaviour unchanged).
3. `lore-fragments.test.js`: a test that every fragment passes `answerLeaks(content, fragment, ALLOWED.fragments[code])`,
   the planted allowlist tests (Decision 2), and an updated header comment (critique 1.7).
4. The fragments' YAML: the rewrites and an updated header comment naming the new check.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 14afd369…; a fresh general-purpose subagent (claude-opus-5-5),
read-only, in place of Codex; raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | es "los antiguos" reads as "the ancients" (people); reverses round 033's note silently | + | Accept: "los primeros hilos", noted as superseding | **Accepted** (autonomous decision, pending owner review) | Decision 4 |
| 1.2 | Error | es "siempre … para siempre" is clumsy | + | Accept: "hasta el infinito", as the Italian | **Accepted** (autonomous, pending owner review) | Decision 4 |
| 1.3 | Gap | A shared allowlist widens the inscriptions' check | + | Accept: one list per surface, each allowed word tested to matter | **Accepted** (autonomous, pending owner review) | Decision 2, Design 1 |
| 1.4 | Gap | Allowing *una*/*las* blinds the word check to the time targets | + | Accept: pin that the pack-form check still catches the phrases | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.5 | Optional | "Únicamente" is formal; "Solamente" and "Sólo" would fail | 0 | Accept: keep it, flag for review | **Accepted** (autonomous, pending owner review) | Decision 4, Open items |
| 1.6 | Cut | The old checks are covered by the new one | − | Reject: cheap, pinned stem lists catch drift; out of scope | **Rejected** (autonomous, pending owner review) | Decision 3 |
| 1.7 | Gap | Stale header comments; prompt-builder path | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design 3–4 |
| 1.8 | Gap | Kept lines and card targets still show target text during encounters | 0 | Accept: scope the claim | **Accepted** (autonomous, pending owner review) | Decision 5 |

Net change: two better Spanish rewrites, per-surface allowlists with tests that they matter, a narrower claim.

## Tests (pre-run)

- Every fragment of both packs passes `answerLeaks` with `ALLOWED.fragments`; each allowed word, planted, is a hit
  with no allowlist; "È l'una" / "a la una" / "son las", planted, stay pack-form hits with it.
- The round 030–033 fragment tests and all of `inscriptions.test.js` pass unchanged in behaviour.
- Full suite (`npm test`).

## Claim boundary (pre-run)

Shows that no fragment or inscription holds a word or stem of any objective target's forms (bar the named allowlist)
or a pack form. It does not cover target-language words outside the pack, kept lines or cards, or whether the
reworded texts read naturally (native speaker).

## Outcome (2026-11-06)

Built as designed. The six rewrites cleared the check in both packs, and every allowed word is tested to matter.
Inscriptions behave as before. No amendment was needed ([findings](findings.md)).
