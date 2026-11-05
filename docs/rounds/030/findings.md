# Round 030 findings

## Question

Can the market hide optional passages of *The Journey* in the target language (backlog A9) that the player finds
after an encounter, can read with a glossary and a translation on request, and that never answer what an NPC is
asking?

## Finding

Yes, in tests. Each pack has three fragments: the first stitch (after Marginalia), the Sirens (after Flick) and the
shroud (after Errata). They are filed in the Spellbook when their encounter is completed, including on the
resolving turn itself.
- The texts contain no surface form of any of the pack's 53 (it) or 49 (es) vocabulary entries, with elisions split.
  No glossary meaning is an accepted translation of an objective target.
- While an encounter is under way, the server withholds the translation and the glossary, and the text stays.
- The resolved encounter screen says which fragment from there is in the Spellbook, in words that stay true on
  replays.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 10 findings (3 Errors), 9 accepted and 1 in part. The main change was to hide
  the translation and glossary during encounters and to check the texts against all vocabulary, not only targets.
- The texts were drafted and leak-checked before the app work (critique 1.4). The first drafts hit `anni`
  ("vent'anni", found only once apostrophes split words, critique 1.2) and Flick's `dopo` ("punto dopo punto"). Two
  glosses were "still", which is a meaning of a target. All four were rewritten (Twenty winters; punto per punto /
  puntada a puntada / stitch by stitch; "to this day", "even now, yet").
- **Hand check of inflected target forms** (critique 1.3), done on the final texts against every target lemma:
  - `voleva` (it) and `quería` (es) were replaced by `desiderava` / `deseaba`. *Quería un café* is a correct polite
    order in Spanish, so it could have given Gerald's answer.
  - Remaining forms of target verbs: `fu` and `fue` (essere, ser: "fu suo", "fue suya") and `era` (sirens). None is
    an accepted answer for "I am" (`sono`, `soy`), and none is a phrase the grader asks for.
  - No forms of `casa`, `nessuno`/`nadie`, `nome`/`nombre`, `ora`/`ahora`, `ancora`, `insieme`/`juntos`, `buono`,
    `tu`, `io`/`yo` or the numbers.
- Tests on the Linux compute node. No live LLM runs: nothing reaches a prompt.

## Results

| Check | Before | After |
|---|---|---|
| server `node --test` | 148/148 | 154/154 (`lore-fragments.test.js` ×6: packs equal in English, leak check with planted "adesso"/"un'ora"/"ahora"/"casa" and a planted meaning, `foldWords`, malformed fragments and a pack without `lore/`, completion only through the API, withheld during an encounter; plus fragment asserts in the Bookshop and Rift resolving turns) |
| mobile jest | 51/51 | 56/56 (`fragments.test.js` ×5: toggle with expanded state, withheld note, no section, pronounce label, resolved note) |
| web client vitest, build | 12/12, ok | 12/12, ok |
| `npx expo-doctor`, iOS export | 20/20, ok | 20/20, ok |

## Decision

Keep it. Backlog A9 is done for *The Journey*. More fragments (Gerald's Dead Branch coffee, prototype.md §4.2) can
come with relationship tiers.

## Evidence

The round's build commit; journal rows 6–10; `content/languages/{it,es}/lore/fragments.yaml`,
`server/test/lore-fragments.test.js`, `mobile/src/__tests__/fragments.test.js`.

## Claim boundary

Tests only. The Italian and Spanish texts were written by Claude and have not been read by a native speaker. The
leak check matches listed surface forms. Inflected forms were checked by hand, once, so a later vocabulary entry
whose forms appear in a fragment would be caught only if that form is listed. The test runs on every change, so it
would catch a listed form. Nothing has been seen in the Simulator: not the passage's layout, the VoiceOver reading of
the mixed-language glossary, or the speech voice reading a long passage.

## Open items

1. Owner: native-speaker review of the six texts and glosses, the three English found lines, and the choice of
   episodes. "Twenty winters" replaces the Bookshop passage's "twenty years" to avoid a vocabulary form.
2. Owner, Simulator: the Fragments section (long passage, toggle, VoiceOver on glossary lines), the resolved
   encounter note at the Bookshop, Fountain and Rift, and the pronounce button on a long passage.
