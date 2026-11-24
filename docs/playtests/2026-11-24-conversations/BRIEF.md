# Playtest brief: NPC conversation quality in ParaLLang

ParaLLang is a language-learning game (Italian). On "the road", the player meets a generated, absurd character and
has a short conversation in Italian. Each conversation has objectives (things the player should say, e.g. "ask for
something and say please"). The conversation is complete on the player's 3rd reply; after that the player can
"keep chatting" (nothing is graded). The curriculum runs A1 -> B1 in units (unit ids below).

The game owner's complaints, which you are testing:
1. Characters keep asking things like "What do you think of my work / my bridge / my hay?" — not conversational; a
   learner has nothing to say to it and it doesn't make them want to keep talking.
2. At the very start (A1, e.g. hello/goodbye) the learner only knows a handful of words. The character should keep
   to the task and to the learner's level (variations on the target words), not drift into long, strange, off-putting
   lines the learner cannot understand or answer.
3. From A2 on the characters should feel alive and conversational: ask the player about themselves (what they like,
   what they think about things, their day...), react to what the player said, keep a thread the player can keep
   following. The owner LIKES: the absurd humour, comments on the weather and what's going on. Keep those.

## How to play (a live model answers; each command takes ~20-40 s, use a Bash timeout of 300000)

    cd /home/user/ParaLLang/server
    node scripts/playtest.js start --port PORT --dir DIR --unit <unitId> [--lesson <lessonId>] [--mode beginner|light] [--immersion 1]
    node scripts/playtest.js say   --port PORT --dir DIR --learner <learnerId> "your line"

`start` prints the learner id, the open objectives, and the character's greeting (Italian + English translation).
`say` prints the open objectives left, "reply N of 3", and the character's answer. After the 3rd reply the state is
"resolved"/complete and further `say` calls are "keep chatting" turns. Transcripts are saved automatically in
DIR/transcripts/<learnerId>.jsonl. Run commands one at a time (the server answers one call at a time).

Play the player as a REAL learner at that level: write short, plausible learner Italian with the occasional slip or
English word, using only what someone at that point of the curriculum would know (at A1 unit 1: ciao, buongiorno,
come stai, bene, grazie, arrivederci, mi chiamo... and little else). Respond to what the character actually asked,
as a real learner would; when a question is unanswerable at your level, do what a learner would (answer badly, say
"non capisco", or ignore it) and note it. Also pursue the objectives so the conversation progresses.

Do NOT read the game's source code or prompt files, and do not modify anything in the repository: judge the
conversation as a player would. Only use the two commands above (and reading the transcripts in DIR).

## What to record — write your report to REPORT (markdown)

For each conversation: unit, character name/role, then every character line (greeting and each reply, including
keep-chatting replies) quoted in Italian + its English, each scored 1-5 on:
- Level fit: vocabulary/grammar/length suit a learner at this point of the curriculum.
- Answerable: the question(s) it ends with can be answered by this learner with what they know.
- Conversational pull: makes you want to reply; asks about YOU or picks up what you said, like a real person.
- Natural: sounds like a person talking, not a quiz or an odd non-sequitur.
- Task focus: steers toward the lesson's objectives without breaking the flow.
- Charm: humour, character, the world (weather, what's going on).
Flag each line with any of: SELF-CENTRED-QUESTION ("what do you think of my X"), DOUBLE-QUESTION (two questions at
once), OFF-LEVEL (words/grammar beyond level), TOO-LONG, IGNORES-PLAYER, REPETITIVE (same move as an earlier line),
DRIFT (strange off-putting tangent), ENGLISH-HEAVY / ITALIAN-HEAVY, GIVES-ANSWER-AWAY. Also note anything about the
narration lines, corrections and objectives.

End the report with: (a) the top 5 problems you saw, each with 2-3 verbatim examples and how often it happened
(count it); (b) the best lines you saw and why they worked; (c) concrete suggestions for what the character should do
instead at this level. Your final message back should be a ~200-word summary of the report plus its path.
