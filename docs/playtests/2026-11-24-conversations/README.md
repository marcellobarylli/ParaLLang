# Playtest 2026-11-24: NPC conversations on the road, A1 to B1

Six subagents played 32 road conversations against the live model (claude-cli, Sonnet) through
`server/scripts/playtest.js`, as learners at the level of each unit, and scored every character line (218 lines).
The brief is [BRIEF.md](BRIEF.md); the reports are `a1.md` to `a6.md`; the raw turns are in `transcripts/`.

| Report | Level | Units | Lines |
|---|---|---|---|
| [a1](a1.md) | A1, first units | greetings (immersion 1 and 0.2), greetings_hello lesson, origins, courtesy | 30 |
| [a2](a2.md) | A1, later units | numbers, cafe, likes, family, directions | 30 |
| [a3](a3.md) | A1.2 to A2.1 | time, routine, shopping, past_did, weather | 35 |
| [a4](a4.md) | A2 | restaurant, health, plans, invitations, used_to, work | 42 |
| [a5](a5.md) | B1 | opinions, advice, stories, feelings, hypotheses, customs | 36 |
| [a6](a6.md) | light mode, 8 turns each | greetings, likes, past_went, travel, opinions | 45 |

## What was found, with counts

1. **"What do you think of / what do you want to know about my work"** ends most lines at every level: a1 ~23/30,
   a2 22/30, a3 22/35, a4 all 18 keep-chatting lines and 13/24 others, a5 28/36, a6 31/40 (78 %). In keep-chatting
   turns it is a fixed tail.
2. **Stacked questions**: two or more questions in almost every line (a1 29/30, a2 29/30, a3 34/35, a4 39/42,
   a5 33/36, a6 40/40), often three or four.
3. **A1 off level and off task**: once the objectives are met, every follow-up question at A1.1 needed words the
   learner did not have (a1: 18/18). Lines are 4-5 sentences.
4. **Goodbye refused** in the hello-and-goodbye unit (a1: refused 5 of 7 times; a6 likewise).
5. **Target phrases given away** before the player says them (a2 9, a3 6, a4 repeated, a5 10, a6), so some
   conversations finish their objectives by reply 2.
6. **Template feel**: "Che bello!" opener (a4 ~24/36), one catchphrase per reply (a3 6/6), shared traits across
   characters (ledgers, pencils, two Gideons), the same narration image repeated.
7. **Continuity**: the weather or time of day changes mid-conversation (a2, a4, a5, a6); a character contradicts the
   player's "piove ancora"; gender of a character flips.
8. **Grading**: hearts lost for correct or trivially different answers (a1, a2, a3, a5); `INVALID_GRADING` errors on
   "che cosa c'è che non va?" (a5, three times); unstable objective ticks (a1).
9. **Formatting**: raw markdown (`**word**`) in the narration (a1, a5).

What works and should be kept: the absurd premises and humour, the weather and world remarks, reacting in character
to what the player said and remembering it for several turns (strong at A2 and B1), and lines that answer the player,
add one absurd detail and end on one concrete question about the player.

## Causes in the prompts

- `prompts/system/base.txt`, CONVERSATION, sent identically at every level:
  "Add one small question of {name}'s own, about the player, their day or what they make of {name}'s trade" (1);
  "Ask in one go for everything the learning data below still wants" (2); "two to four sentences … a good answer is
  several sentences long, about a paragraph" and "Never a question that yes or no would answer" (3).
- `prompts/encounter/light_turn.txt`: "Invite the player to ask something back: {name} is someone with a trade, a
  place and opinions, and is glad to be asked about them" (1, in keep-chatting and light turns).
- The client's default immersion is 1, which makes the line wholly Italian whatever the stage's share (20 % at A1.1):
  `ratioFor` returns the immersion when one is sent.
