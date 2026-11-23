# The curriculum

The curriculum of The Journey 2: Journathan Returns (again) (round 144; called The Long Way Home until round 152): what is taught, in which order, and how the game paces it. It is
content, played by the endless road in the web client ([round 144's architecture](rounds/144/architecture.md)).

## Where it is

| What | Where |
|---|---|
| The skeleton: stages, units, lessons, what each objective asks, the roles of each unit's characters | `content/curriculum/NN_<stage>.yaml`, one file per stage, shared by every language |
| The words that meet each objective, per language | `content/languages/<code>/curriculum/NN_<stage>.yaml` |
| The loader and its checks | `server/src/road/curriculum.js`; `node server/scripts/check-curriculum.js` |
| The pacing | `server/src/road/pacing.js` (`PACING` holds every number below) |
| The characters | `server/src/road/characters.js` |

A new stage, unit or lesson is content only. The loader refuses a lesson without words, two vocabulary entries that
share a form, and an example the game's own answer check would not accept. A language pack may stop at any stage: the
road then ends its new lessons there and goes on as review.

## Sources, and how far they were checked

The order of the content and the pacing's numbers come from a search of the literature and of what Duolingo and
other courses publish, made for round 144 and kept whole in
[`rounds/144/trail/research.md`](rounds/144/trail/research.md), with its reference list. **No source page could be
opened** from the session (the network refused the hosts), so every quotation there is a web-search extract: probably
verbatim, not verified against the page. Three of them were searched a second time and agreed. The rules below name
the source by its number in that reference list. Where the research found nothing authoritative, the rule says so.

## The scale

Six stages from CEFR A1 to B1, six units a stage, three lessons a unit, three objectives a lesson. A stage also sets
how much of the target language a character speaks in its first line (it rises by 5 points a turn).

| Stage | CEFR | Share of target language | Units |
|---|---|---|---|
| First words (`a1_1`) | A1 | 20 % | Hello and goodbye; Where you are from; Please, thank you, sorry; Numbers and age; Ordering; Likes and dislikes |
| Getting around (`a1_2`) | A1 | 28 % | Family and people; Where things are; Finding the way; Time and days; Daily routine; Shopping |
| What happened (`a2_1`) | A2 | 36 % | What you did; Where you went; Weather and seasons; At the restaurant; Feeling ill; Plans and musts |
| Making arrangements (`a2_2`) | A2 | 44 % | Invitations; Comparing; Travel and lodging; How things used to be; The future; Work and study |
| Having opinions (`b1_1`) | B1 | 54 % | Opinions; Advice; Telling a story; Problems while travelling; Feelings; Polite requests |
| Whatever comes up (`b1_2`) | B1 | 64 % | Hopes and wishes; If; Passing things on; Customs here and there; Persuading; Your story so far |

36 units, 108 lessons and 324 objectives in each language; 493 vocabulary entries in Italian and 487 in Spanish.

The order of functions follows the CEFR levels' descriptors and the A1 to B1 syllabi found [1, 2, 3 to 10]: at A1
greeting and introducing, personal data, getting by when one has not understood, numbers, ordering, likes, then
family, places and directions, time, routine and shopping; at A2 past events, weather, the restaurant, health and
plans, then invitations, comparing, travel, how things used to be, the future and work; at B1 opinions, advice,
telling a story, problems, feelings and polite requests, then hopes, hypotheses, passing on what was said, customs,
persuading and one's own story. The grammar follows the named syllabi: Italian has its perfect past early (passato
prossimo at A1 in the Italian syllabi, here at the start of A2 with Spanish), the imperfect and the future at A2,
the conditional at B1 and the present subjunctive late in B1 [3 to 10]. Each unit has one grammar point, met as
something to say before it is a rule [13].

**This is a spine, not a whole course.** A course to B1 is far larger: Cambridge gives 350 to 400 guided hours to
B1 [34], and Duolingo's Italian course has about 130 units to the end of A2 [15, an unofficial count]. Thirty-six
units of three conversations each are the backbone on which more lessons can be hung.

## A conversation

Every conversation is with a generated character and has objectives: things to say in the target language.

| Kind | What it is | Hints an objective | The character says the words first |
|---|---|---|---|
| **Lesson** (new) | The next lesson of the unit: three objectives, three to five new words or phrases | 3 | Yes: the words are new, so the character uses them in its own lines before asking for them (input before output) |
| **Review** | Three objectives from earlier lessons, from two units when there are two; cards that are due come first | 1 | No: the player recalls them |
| **Again** (repair) | A lesson that went badly, with someone else | 2 | Yes |
| **Gate** (checkpoint) | One objective from each lesson of the unit, one from the unit before; at the end of a stage, from three other units of the stage | 0 | No |

**Streamlined mode** (round 173, Settings, on by default) replaces the four kinds with one, **Unit**: the first
objective of each of the unit's lessons, in one conversation, taught as a lesson is (three hints). Finishing it
completes the unit whatever the score, and every site ahead offers the next unit; there are no reviews, repairs or
gates until the curriculum is finished. The rules below are the pacing with the mode switched off.

A conversation's **score** is the share of its objectives said cleanly; an objective closed by a correction (beginner
mode) or after a hint counts half.

## The pacing rules

| # | Rule | In the game | Source |
|---|---|---|---|
| 1 | Aim at about 85 % success: easier and it bores, harder and it frustrates | The mean score of the last five conversations steers how often a review comes: above 92 % three new lessons between reviews, below 75 % one, otherwise two | The 85 % figure is Wilson et al. 2019 [28], found for simple classification by learning machines: an analogy, not a result about people learning languages. Duolingo states the aim without a number [17]. Mastery learning uses 80 to 90 % [36] |
| 2 | Few new things at a time | A lesson has three objectives and three to five new productive items; a review has none | No authoritative figure for new words a session was found. The budget follows from vocabulary sizes by level and guided hours [27, 34] |
| 3 | New words are met before they are asked for | In a lesson the character models its words; the narration carries a few target-language words too (round 130) | Nation's strands: meaning-focused input beside output [33] |
| 4 | About as much time on what is known as on what is new | A unit is three lessons, one or two reviews and a gate: with reviews, roughly two conversations in five use no new words | Nation: roughly equal time for the four strands, language-focused learning at most a quarter, and fluency as "making the best use of what is already known" [33]. Duolingo places practice levels along its path [11] |
| 5 | Recall in separate sessions beats repetition in one | A word comes back in reviews and gates on later conversations, and as a Spellbook card on later days (SM-2, round 001) | One correct recall in each of three spaced sessions beat three in one session [23]. Retrieval beats restudy [30]. The gap that works best grows with how long the memory should last [31] |
| 6 | Mix what is reviewed | A review takes its objectives from at least two units when two are done | Interleaving gave more errors in training and better results a week later [32]; conditions that look best during practice can fail later [29] |
| 7 | A unit opens at about 80 % on its gate; below it, a corrective lesson and another, different test | The gate opens the next unit at 80 %. After a failed try the unit's weakest lesson is offered again, and the next try asks other objectives | Mastery learning: a criterion "usually in the range of 80-90% correct", then corrective teaching and a parallel retest [36] |
| 8 | Test after a delay, not straight after teaching | The gate comes at least one conversation after the unit's last lesson | Testing after a delay measures what stayed [29, 30] |
| 9 | A gate without help | No hints at a gate | Duolingo's "legendary" level: harder, without hints [11] |
| 10 | A lesson that went badly comes back, later | A lesson that scored under 60 % is offered again once two other conversations have passed | Rules 5 and 7 |

None of the numbers has been tuned by play. They are in one place (`PACING`), and `server/test/road.test.js` pins
the behaviour, not the values.

## The characters

There is no authored cast and there are no assets. A character is drawn from what the conversation is about: its
trade is one of the unit's `roles` in the skeleton (a unit on ordering is met by waiters and landladies; a review by a
Wandering Examiner or a Rememberer; a gate by a Gatekeeper of the Next Bit), and its name, temperament, habits, looks
and voice come from pools in `characters.js`, in the style guide's voice. The same site, step and seed give the same
character. The web client shows the description in words beside a plain cloaked figure.

## What nobody has checked

- **The language.** Every word, form and example was written by Claude (stage A1.1) or by a subagent of the session
  (the other stages) and passes the loader's checks, which are about form, not about Italian or Spanish. A speaker
  has to read them.
- **The model.** Conversations were played with a scripted grader and narrator. What a live model does with a
  generated character, with the instruction to model a lesson's words, and with the higher shares of target language
  of the later stages has not been seen.
- **The pacing**, by anyone learning.
