# Round 012 plan v1: NPCs stop offering the answers as a menu (backlog E3)

## Goal

NPCs no longer offer an open objective's passing target words as options to choose from (round 010: Mortimer asks
"Vuoi salame, salsiccia o pollo?" after a wrong request in 3/3 runs; round 011: Flick asks "¿A la izquierda o a la
derecha?" in 1/4), so the player recalls the word instead of picking it from a list. A narration-prompt change only;
verdicts, grading and the app are unchanged.

## Problem

`content/narration/style_guide.yaml` (round 007) forbids telling the player what to say ("say", "try", "add",
"order" followed by a target-language answer, quoted model answers) but adds "Target-language words may appear
naturally in the character's own questions and remarks". An either/or question made of the passing targets is the
character's own question, so it is allowed, and it turns a recall task into recognition. The narration prompt's
learning data lists exactly the open objectives' targets (`targetData` in `server/src/llm/prompt-builder.js`), so
the model has the menu at hand.

## Decisions (autonomous, pending owner review)

1. **Add one style rule** after the no-dictation rule: "Never offer an open objective's target words as options to
   choose from: no list and no either/or question built from them (no 'X, Y or Z?' menu of the targets). Ask an open
   question instead, or name what is wrong without naming the answer." Same mechanism as round 007 (a style-guide
   rule, filled into `prompts/system/base.txt`).
2. **Portia's "Come ti chiami?" stays allowed.** She asks the player's name, then the ask-back objective wants the
   player to ask hers: hearing the question and reusing it is modelled input in the gentlest encounter, not a menu.
   The new rule does not cover it; the owner can still decide otherwise (round 009 open item 3).
3. **Words still appear naturally** (Mortimer's prosciutto, Flick's dopo / domani, Gerald's caffè): only menus of the
   open objective's passing targets are banned.

## Change

- `content/narration/style_guide.yaml`: the rule above.
- Gerald's pinned narration prompts change on purpose: regenerate `server/test/fixtures/gerald-prompts-r007.json`
  as `gerald-prompts-r012.json` (same generator arguments as the test), remove the old file, point the test at it.
- A test that the rule reaches the rendered narration system prompt.

## Tests

1. `node --test server/test/*.test.js` (golden fixture regenerated), `npm run test:mobile`, web client tests and
   build.
2. Live A/B, codex-cli. Baseline: the round 010 after runs (butcher 3/3 menus, same prompt and content) and round 011
   (fountain es 1/1 menu; it 0/3). After: `play-market.js --location butchers_stall` 2× it, 1× es;
   `--location cracked_fountain` 1× es; `--location coffee_cart` 1× it and `--location market_entrance` 1× it
   (regressions: both resolve, no dictation; Portia's question noted). Classify every NPC line by reading it: menu
   of an open objective's targets yes/no, dictation yes/no. Success: menus 0 of the after butcher and fountain runs,
   every run resolves with the same scripted verdicts.
