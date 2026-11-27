# Round 197 findings

## Question

Why did a character end its reply on "How is your Italian tonight?", and what makes the replies after the greeting
feel like a conversation?

## Finding: the cause

The unit "Where you are from" has three objectives (from, live, speak). The player's first answer met two; round
177's rule "steer toward the next one only" then asked for the third with no tie to what the player had said, and
round 189 put the world remark ("my register wrote a town nobody knows") in the same reply. So the reply answered
the player in half a sentence and then changed the subject twice.

## Finding: what was looked up

| Source | What it says | Rule taken from it |
|---|---|---|
| Huang, Yeomans, Brooks, Minson and Gino 2017, *JPSP* 113(3), "It doesn't hurt to ask" ([HKS](https://www.hks.harvard.edu/centers/cpl/publications/it-doesnt-hurt-ask-question-asking-increases-liking), [HBS summary](https://www.library.hbs.edu/working-knowledge/elements-of-meaningful-conversation-fewer-mirror-questions-more-follow-ups)) | Of the question types, follow-up questions (more about what the partner just said) predict liking; opening ("How are you?"), mirror and full-switch questions do not. The mechanism is felt responsiveness. Disputed and defended in 2019 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/31714109/)); the settings are chats between strangers and speed dates. | The closing question is a follow-up on what was just said; no opening or general question; no change of subject. |
| Brooks and Yeomans 2025, *JEP: General* 154(3), "Boomerasking" ([BPS digest](https://www.bps.org.uk/research-digest/improve-your-conversation-skills-ditch-boomerasking), [HBS](https://www.library.hbs.edu/working-knowledge/boomerasking-the-annoying-habit-ruining-your-office-conversations)) | Asking a question and then answering it oneself reads as insincere; people prefer a plain disclosure. | The character's own remark is a statement before the question; never a question it goes on to answer. |
| Mastroianni, "Good conversations have lots of doorknobs" ([essay](https://www.experimental-history.com/p/good-conversations-have-lots-of-doorknobs)) | A turn should leave something to take hold of: a bold claim, a confession, a question that opens. | The character's remarks are "short statements that give the player something to answer". |
| Display and referential questions: Long and Sato 1983, Brock 1986 ([Wikipedia](https://en.wikipedia.org/wiki/Display_and_referential_questions), [Brock's paper](https://scholarspace.manoa.hawaii.edu/items/4936c229-5e35-4578-948e-7a21e155b4d1/full)) | Questions whose answer the teacher does not know were expected to, and in several studies did, draw longer and more complex learner answers; not every study agrees. | Never a question the character knows the answer to. |
| Schegloff and Sacks 1973, "Opening up closings" ([paper](https://conversationanalysis.org/mp-files/opening-up-closings.pdf)) | A conversation's end is prepared, and a summing-up remark can close it. | The last reply brings back one thing the player said, then says goodbye. |

All were read as search summaries and abstracts; no paper's full text was opened.

## Results: the playtest

Four conversations against the live model (claude-cli, Sonnet), three replies and one or two keep-chatting turns
each; transcripts in [`docs/playtests/2026-11-27-follow-ups`](../../playtests/2026-11-27-follow-ups/README.md).

| Conversation | Player said | The character's question or close |
|---|---|---|
| A1 origins, reply 1 | "Sono di Austria e abito a Copenaghen." | "In Copenaghen, what language do you speak?" (the bridge to the open objective) |
| A1 origins, last | "Parlo inglese e un po' di danese…" | "Safe travels back to Copenaghen, and my regards to Austria. Buon viaggio e arrivederci!" |
| A1 likes, reply 1 | "Mi piace il caffè e adoro i gatti." | "Io preferisco il tè… And you, caffè o tè?" |
| A2 past_went, reply 1 | "Sono andato a Vienna con mia sorella." | "Quando sei partito per Vienna?" |
| A2 past_went, reply 2 | "Sono partito lunedì mattina, molto presto." | "Ti piace partire così presto?" |
| A2 past_went, last | "…il treno era alle sei." | "Buon viaggio a te e a tua sorella. Arrivederci!" |
| B1 opinions, reply 1 | "…bello ma un po' strano." | "Cosa trovi di strano qui?" |
| B1 opinions, chat | "Abito a Copenaghen, là il cielo è sempre grigio." | "…dopo il mercato ho visto una luce strana, like a seam in the air. Ti piace abitare a Copenaghen, con tutto quel grigio?" |

| Check | Result |
|---|---|
| Replies before the end whose question follows up the player's answer | 6 of 6 |
| Opening or general questions, questions about the character's work | 0 of 20 lines |
| Last replies with a callback and no question | 3 of 4 (A1 likes closed "Il tè è noioso? Va bene. Buonanotte!"; the A1 rule was tightened after it and not replayed) |
| World detail before the conversation was complete | 0 |
| Keep-chatting replies that tell a secret | 4 of 4 first chat turns; the first (a dog that keeps off the road) had no tie to the player, the three played after the wording change led in from the player's thing (cats, Vienna's cellars, the grey sky) |
| Server tests | 614 of 614 |
| Client tests, build | 337 of 337; passes |

## Claim boundary

- Four conversations, played by Claude as the learner; the owner has not played it, and nothing was seen on a phone.
- With strict or beginner checking a conversation still ends as soon as every objective is met, so a player who
  answers the whole greeting at once gets fewer than three replies (A1 origins and A1 likes ended on the second).
- Two lines' Italian was shorter than their English translation (A1 origins chat 2; A2 last reply): the model wrote
  more in `translation` than in the line. Seen, not changed.
- The secret is as good as the character's noticed line; at A1 these are plain things (a dog, a cat).
- French and Spanish share the rules; neither was played.

## Open items

- Whether a strict conversation should run to the third reply when everything is met sooner (the owner's "default
  three turns").
- The translation longer than its line.
