# Round 155 architecture

**Conversational round, recorded with the build.** The third of the owner's eleven issues (see
[`trail/interview.md`](trail/interview.md)); the owner was asleep. No pre-run commit; nothing here is frozen.

- **Design source:** GitHub issue #3, "Characters belong to the world: regional + global knowledge, lore sprinkled in
  (minimal design)" (step 5 of the build order); [`docs/lore-book.md`](../../lore-book.md), parts VII and VIII and
  "What the book does not say" (round 151).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `content/world/knowledge.yaml`, `prompts/system/world.txt`, `prompts/system/base.txt`,
  `content/characters/enemies/*.yaml` (`world`), `server/src/content-loader.js` (`worldFor`),
  `server/src/llm/prompt-builder.js`, `server/src/learning-service.js` (`sceneExtras`),
  `server/src/road/encounters.js` (`roadWorld`), `server/test/world-knowledge.test.js`.

## Goal

A character drops small hints that it lives in this world, and answers "what do you mean by this?" with something,
even if incomplete. The conversation stays the curriculum exercise.

## Design

**Three short layers, as the issue proposes**, in one new content file, `content/world/knowledge.yaml`:

| Layer | What it holds | Where |
|---|---|---|
| `global` | what everybody knows: one language, the roads as part VIII of the lore book lets them be seen, *The Journey*, the things at the corner of the eye, the odd things of the last few years | one blurb, about 190 words |
| `regions.<id>.lore` | a region's land, news and history | one blurb a region: the road, the dead branch (the market and Ta Prohm), Micromort Mountain |
| noticed | one thing this character has noticed | an authored character's sheet (`world: { region, noticed }`); for a generated character of the road, a draw from the region's pools |

**A levels are ordinary people; B levels know more.** The road's region has two pools of things noticed, `plain`
(ten lines) and `knowing` (eight). A generated character draws from `plain` while the conversation's stage is A1 or
A2 and from `knowing` from B1 on. The draw is a hash of the seed, the site and the step, like the rest of the
character, so the same conversation always has the same line. The curriculum has no C level yet.

**Fish do not know they are in water.** Every line in the file is something that can be seen or is said. The truth
of the lore book's last part (the roads are threads, the world is a web stitched to others) is in none of it; a test
holds that. A `knowing` line may use a sewing word where a road word is expected ("my mother called the crossroads
the knot"), which is the lore book's own rule for a hint.

**The road acts as Tuscany, with no text about Tuscany.** The road's region has `acts_as: { it: Tuscany, es:
Castile }`. The prompt then says: "This region is this world's Tuscany. You know Tuscany well: its land, food,
weather, towns and habits are this region's, as ordinary life. Never say "Tuscany" or name its country: nobody here
has heard of either." Castile for the Spanish pack is Claude's choice.

**One block in the prompt.** `prompts/system/world.txt` is filled with the three layers and placed after the
character's line of `prompts/system/base.txt`. Its rules:

- about one reply in three, and never more than once in a reply, let one small detail show in passing, never as an
  explanation;
- the character knows only what can be seen and what people say, and has no theory;
- asked what it means, it answers in character with something concrete and partial, possibly mistaken, and a little
  more than before; never a refusal and never the nature of the world;
- such a detail is never an objective's answer.

It goes into every narrator call of a conversation: the greeting, a strict reply and a light turn (`sceneExtras`).
The grader's prompt does not have it.

**Nothing else changes.** No new call, no new field in a reply, nothing on the screen. A prompt built without the
layers is byte for byte what it was (Gerald's pinned prompts pass unchanged).

## Tests

`server/test/world-knowledge.test.js` (6 tests): the three layers exist and every character has a region and a line;
the layers are short and state none of what no character knows; Tuscany is named once and nothing of it is written;
the block's place and wording, and the prompt without it; the greeting, a strict reply and a light turn all carry it;
a road character's draw by level, its determinism, and the road's narrator being told.

## Claim boundary

**No model was called**, and this issue is about what a model then does: whether characters mention the world
naturally, how often, and how they answer "what do you mean?" has not been seen. The cloud session's `claude` CLI is
not signed in (`npm run check:provider` answers `CLI_AUTH_REQUIRED`). The prompt grew by about 350 words a call.

## Outcome

See [`findings.md`](findings.md).
