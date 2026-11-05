# Round 049 plan v1: foreign targets in the leak scan (backlog G7, measurement part)

Autonomous round (no owner), no live LLM calls. Round 048 found NPCs saying other party conversations' targets:
Flick (it) "Eccomi, sono sveglio!" (Marginalia's folded-page target), Mortimer "amico mio" in nearly every line
(Gerald's confidence target), Marginalia "Possiamo leggere insieme" (Flick's slow-walk target). The player hears a
word before the conversation that teaches it. Before deciding on a content or prompt rule, measure how often it
happens across every live report so far.

## Design

1. `server/scripts/leak-scan.js` gains `foreignFormsFor(content, encounterId)`: the whole surface forms (target and
   `surface_variants`) of every vocabulary entry targeted by a **party conversation** objective, minus the entries
   targeted by any objective of the scene's own encounter. Each form carries its owner conversation id and entry id.
2. `scanReport` adds, per scene, `foreign: [{ line, hits: [{ owner, id, form }] }]` and `foreignLines`, from exact
   whole-form matches (the same `fold` / `holds` as today). Word-inside-phrase hits are not counted (exact only).
   Echo: a form the player said earlier in the scene is marked `echo` and not counted in `foreignLines`.
3. Foreign hits are **separate from the four exclusive kinds** (leak, near, quoted, echo): existing counts,
   totals and outputs do not change; `summarize` adds `foreignLines` per language; `main` prints `foreign` rows and
   adds "foreign N" to the summary line.
4. Scope: every scene (home encounters too: Gerald's home lines may say "grazie", a coffee-break target). Content is
   today's (as for the other kinds), so a report from before a conversation existed is still scanned against
   today's party targets: the measure is "how often would this line teach a party word early today".
5. A results script `docs/rounds/049/results/measure.mjs` runs the scan over every `docs/rounds/*/results/*.json`
   and tabulates foreign lines by scene encounter and by owner, per language.

## Tests (`server/test/leak-scan.test.js`)

- A flick_lotus scene whose line says "Eccomi" gives one foreign hit, owner `marginalia_folded_page`; its own
  "coraggio" is not foreign; the leak/near/quoted/echo counts are unchanged by foreign hits.
- An `imp_coffee_greeting` scene line with "Grazie!" is foreign (owner `gerald_coffee_break`); a gerald_coffee_break
  scene with the same line is not (its own target).
- A foreign form the player said earlier is echo and not counted.
- `summarize` carries `foreignLines`.

## Decision rule for the next step (recorded now)

If foreign lines are under 5% of party-conversation lines, close G7 with no content change. Otherwise a follow-up
round adds a narration rule (in content: a party conversation's intents list the other members' targets to avoid,
or in the shared template) and measures it live.
