# Round 131 findings

## Question
The owner finds each turn slow and asked that each turn ask for more: an answer of about a paragraph, with the
encounters more conversational from the beginning. Do the turns now ask for that?

## Finding
The prompts, the server's view and the screen now ask for it, and one long answer meets several objectives. What
the model's lines sound like under the new rules is not known. The client half is live; the server half is not
deployed yet.

## Method
A CONVERSATION block in `prompts/system/base.txt`, one line in each grading prompt, `openObjectives` in the
conversation's view, a list on the objective card and a text area for the reply. Server tests play Portia's
tutorial with one paragraph; client tests cover the card and the box.

## Results
- **The character's line.** Two to four sentences, ending in an open question. It asks in one go for everything
  the conversation still wants, as things the character would want to know, and adds one small question of its own
  that the player answers freely. Never a yes-or-no question, never the words of an answer.
- **The card.** "In your answer", the open objectives as a numbered list, and "Answer in a few sentences, and do as
  many of these as you can in one go." ([picture](shots/01-objectives.jpg)). With one objective open it reads as
  before.
- **The reply box.** Two lines to start, growing to about six. Enter sends, Shift+Enter makes a new line.
- **Grading.** One paragraph that greets Portia, gives a name and asks hers closes all three objectives in one turn,
  in strict mode and in beginner mode. A beginner's correction may now be a paragraph (600 characters, 300 before).
- **Time.** A turn is still two model calls. The player's longer answer adds little to what each call reads. The
  character's longer line takes the model longer to write. None of it is measured.
- **Tests.** Server 463 passing (459 before), client 200 (198 before).

## Decision
Kept. No new content was written: see the first open item.

## Evidence
- The owner's words: [`trail/interview.md`](trail/interview.md).
- The prompt as the model gets it: `server/test/fixtures/gerald-prompts-r131.json`.
- Picture: [`shots/01-objectives.jpg`](shots/01-objectives.jpg) (the fixture's stand-in lines, not the model's).
- Timeline: [`trail/journal.md`](trail/journal.md).

## Claim boundary
No line from the model was seen. It may write lines that are long without inviting a long answer, or give an
answer's words away inside a longer question. The free question is not graded, so nothing rewards answering it but
the character's reply. In beginner mode a paragraph with any English in it costs a heart, by the rule of round 129.
The mobile suite and the full playthrough were not run. No Codex critique was made.

## Open items
- **A conversation is now short.** Each has two to four objectives, so one good paragraph can finish it. If the
  conversations should last several paragraph-sized turns, each of the fifteen encounters needs more objectives
  written, in both packs. That is content work for the owner to ask for.
- **Owner:** say when the server may be redeployed; then play a conversation and say whether the characters' lines
  invite a paragraph.
- The iPhone app's reply box and objective card are unchanged.
