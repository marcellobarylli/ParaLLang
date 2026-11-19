# Round 131 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-19 by the owner's instruction in a Claude
Code cloud session, not through the round pipeline. Sections marked *pre-run* must not be edited after the commit
that holds them. Changes go into dated Amendments; results go into the dated Outcome section, added later. The full
record (the owner's words, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** round 051's [architecture](../051/architecture.md) (ordered objectives, the leading run),
  round 129's (beginner mode), round 126's findings (what a turn spends its time on).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `prompts/`, `server/src/learning-service.js`, `client/src/components/DialoguePanel.jsx`,
  `client/src/components/InputBar.jsx`.

## Goal (pre-run)

A turn asks for an answer of about a paragraph, and the character talks like someone in a conversation from the
first line, so that the wait for a reply is worth what was said.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md) (Q0):

- "Each response question turn takes a while. It would be nice for each thing we have to answer to be longer,
  around a paragraph."
- "The encounters should be more conversational from the beginning on."
- "One can think a bit and answer fully, justifying a longer wait."

The owner's assumption, "longer user responses won't make the processing that much longer", holds as far as the
code shows: a turn is two model calls whatever the answer's length, and the answer is a small part of what each
call reads. A longer line from the character takes the model a little longer to write. Not measured.

Claude's decisions:

- **Decision 1: the character asks for everything still open at once.** A conversation has two to four authored
  objectives, and the server already lets one answer meet several. What kept answers short was the character asking
  for one thing at a time and the screen showing one objective. The character's line now invites all of it in one
  answer.
- **Decision 2: and one question of its own.** A paragraph needs more to talk about than two objectives. The
  character also asks one small thing it would want to know (about the player, their day, their view of its
  trade), which the player answers freely. That part is not graded; the character answers it in its next line. In
  beginner mode it is part of the corrected sentence, like the rest.
- **Decision 3: the screen shows every open objective.** The card lists them, with one line: answer in a few
  sentences and do as many as you can in one go.
- **Decision 4: the reply box is a box for a paragraph.** Several lines, growing with the text. Enter sends and
  Shift+Enter makes a new line; the Send button is always there.
- **Decision 5: no new content this round.** The objectives and vocabulary are as authored. A conversation is
  therefore finished in fewer turns, often one or two. More to say in each conversation would need more objectives
  written for each of the fifteen encounters in both packs; that is for the owner to ask for.

## Design (pre-run)

- **The narration prompt** gains a CONVERSATION block: each line is two to four sentences and ends with an open
  question; it asks in one go for everything the learning data still wants, as things the character would naturally
  want to know, and adds one small question of its own; never a question that yes or no would answer, and still
  never the words of an answer. The greeting's "keep it concise" becomes the same invitation.
- **Both grading prompts** say that an answer may be several sentences long, may cover several objectives with
  small talk between, and that each objective is marked on what the answer says for it. In beginner mode the
  correction may be a short paragraph, and its limit goes from 300 to 600 characters.
- **The server's view** of a conversation gains `openObjectives`: the id and prompt of each objective still open,
  in order.
- **The client** lists them on the objective card and turns the reply box into a growing text area.

## Claim boundary (pre-run)

The session cannot call the model. Tests prove the prompts' wording, the list of open objectives, and that one long
answer closes several objectives, with scripted replies. Whether the model's lines really invite a paragraph, stay
in character at that length, and keep the answers out of longer questions is seen only in the owner's play. A
conversation finished in one answer may feel short: that is Decision 5's cost.

## Tests (pre-run)

- **Prompts:** the CONVERSATION block and the greeting's invitation; both grading prompts carry the paragraph line;
  Gerald's pinned prompts are regenerated.
- **Server:** the view lists the open objectives and shortens as they close; one long answer meets all of Portia's
  objectives in strict mode and in beginner mode; a correction of 500 characters is kept whole.
- **Client:** the card lists every open objective with its line of advice, and one objective alone reads as
  before; the reply box takes several lines, Enter sends, Shift+Enter does not.
- All server and client suites and the build keep passing.

## Outcome (2026-11-19)

Built as designed, as `5af7179`. The client half is deployed; the server half is on `main` and waits for the owner's
word, because a server deploy on the free plan wipes the run the owner is playing. The narration prompt has a
CONVERSATION block: lines of two to four sentences that ask in one go for everything still open and add a question
of the character's own. Both graders are told an answer may be a paragraph over several objectives. The view lists
every open objective; the card shows the list with a line of advice; the reply box is a growing text area. Server
463 and client 200 tests pass. The claim boundary held: the model has not been run with the new prompts. See
[`findings.md`](findings.md); the owner's words are in [`trail/interview.md`](trail/interview.md).
