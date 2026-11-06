# Round 082 findings

## Question

Can each market location carry a short target-language inscription, found by visiting it, shown on the map card and
kept in the Spellbook with an optional translation, without giving any encounter's answer away?

## Finding

**Yes, offline.** Six inscriptions per pack (it, es), one per location, load and reach the map card ("Look closer":
where it is written and the text) and the Spellbook ("Inscriptions": text, pronounce button, glossary and translation
behind a toggle, withheld during an encounter). A move now returns the Spellbook, so a new place's inscription is
there at once.

1. **The fragment checks were not enough.** Plan v1's texts passed the round 030 fragment checks, yet the critique
   found that the Rift text taught "smetti subito" / "deja de … enseguida", a stop-now phrasing the Rift's own
   `stop_now` objective rejects, and that it *Nessuna* (the answer *nessuno*) and *come* / *como* (the first word of
   the tutorial's ask-back answer, at its own place) showed at all times. The new check covers every objective
   target's words (3+ letters) and 4-letter stems, and meanings without parentheses. Over the drafts it caught
   twelve problems in all, each reworded (architecture.md, Content). A later review also checked every objective's accepted examples and found only function words.
   Two false positives are allowed by name (es
   *las*, *quien*).
2. **A stale drill, fixed in passing.** The Spellbook's drill depends on the current location, but the app never
   refreshed the Spellbook after a move, so arriving at the Rift with due cards showed no drill note and "Talk to
   Errata" ended in a 409. The move now carries the Spellbook (tested on the server and in the store).
3. **No LLM sees the inscriptions.** The narration and atmosphere prompts do not read them; Gerald's golden prompts
   are unchanged (golden test passes). So no live run was needed. None was possible anyway: Codex is limited until
   2026-11-09 17:32 UTC.

## Method

As in [architecture.md](architecture.md). Plan v1 was critiqued by a fresh read-only subagent instead of Codex: 8
findings, all accepted. The content was then reworded against the extended check before the freeze. Built and
tested offline. After the build, a second fresh subagent reviewed the commit: three low notes, all fixed with
tests (architecture.md, Amendment 1).

## Results

| Check | Result |
|---|---|
| `server/test/inscriptions.test.js` | 8/8 (with Amendment 1's replay test): same six ids, places and English in both packs; no form, target word or stem, or target meaning (planted *adesso*, *nessuna*, *come*, *ahora*, *otra vez*, "stop (doing something)" caught); loader refusals; map text only on visited nodes, no translation; Spellbook in file order; hidden during an encounter; HTTP move; the Rift drill on arrival and cleared on leaving |
| `mobile/src/__tests__/inscriptions.test.js` | 6/6 (with Amendment 1's late-reply test): "Look closer" / "Look away", closes on a move, no button without one; Spellbook section, toggle, glossary, hidden note, no section without data; the store takes a sent Spellbook (and snapshot), keeps its own otherwise |
| Full suites | server 300/300, client 12/12 (web build passes), mobile 227/227; expo-doctor 20/20; `expo export --platform ios` passes |
| Existing tests changed | `learning-storage.test.js` (a recovered Spellbook now carries the unhidden inscriptions); `font.test.js` (11 section titles) |

## Decision

Keep it (autonomous decision, pending owner review). It is content plus a derived view, with no save change, and it
holds no listed answer.

## Evidence

The two test files, the content files `content/languages/{it,es}/lore/inscriptions.yaml`, and the critique in
[`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Offline and in jest only. The check covers the pack's vocabulary and the objective targets' forms. It does not cover
target-language words outside the pack, or an English translation that could hint at an answer. The translation only
shows outside encounters. Idiom, tone and interest are for a native speaker and the owner; the look of the card is
for the Simulator.

## Open items

- Owner: native-speaker review of the twelve texts and glosses (it, es); are inscriptions wanted, and found by
  visiting (Decision 1)?
- Simulator: "Look closer" on the map card (long text, Dynamic Type, VoiceOver reading the Italian or Spanish text
  with the right voice), the Spellbook's Inscriptions section, and the Rift's drill note right after arriving.
