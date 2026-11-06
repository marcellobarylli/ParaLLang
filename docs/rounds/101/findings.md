# Round 101 findings

## Question

The leak scan counted 98 Italian and 29 Spanish NPC lines that hold a whole form of an answer the player still has to
give. How many of these really give the answer away, and how many are optional words or English?

## Finding

**About half are not leaks. Since round 051, six real ones remain, all Italian.**

- **Moved to a new kind, `soft`: 65 lines** (it 48, es 17).
  - **Gerald's English "five espresso shots", 32 lines.** *espresso* is an Italian coffee form, but here it is
    the English word.
  - **Errata's *nome* / *nombre*, 33 lines** ("Tu nombre, por favor"). The word is an optional target of the
    "my name is Nobody" objective. The key answer, *nessuno* / *nadie*, never appears in those lines.
- **The other optional words** (*vorrei* / *quiero*, *io* / *yo*) are listed too, but none appears in a committed
  line.
- **Leaks now, with the old count beside them:**
  - it: 50 (+48 soft = 98);
  - es: 12 (+17 soft = 29);
  - from round 051: it 6 leaks and 9 soft, es 0 leaks and 8 soft.
- **The six leaks since round 051:**
  - Flick's *ora* meaning "hour", three times ("Non hai detto l'ora!"). *Ora* is also the answer "now". It is a
    homonym and stays a leak: the player can repeat it and pass.
  - Errata's *sono*, twice ("Sono Errata"). *Sono* is one way to build the introduction, so it is in a required
    group.
  - Errata's "Non basta", once. *basta* answers the stop objective.
- **Not soft, on purpose** (critique):
  - Mortimer's numbers. The quantity objective needs a number or a half.
  - English-looking forms that are real answers in NPC lines: *basta*, *ciao*, *hola*.
- **Round 044's open item 2 is half closed.** Errata's *nome* / *nombre* is counted apart now, but its *sono* /
  *soy* is part of a required answer and stays a leak.
- **`leak` was redefined in round 101.** Earlier rounds' published leak counts equal today's leak plus soft. The
  scan prints both.

## Method

As in [architecture.md](architecture.md).
- **Frame words:** listed by entry id. Each one is outside every required group and is not needed by its
  objective's grammar constraints. A content test checks the groups and the surface forms.
- **Lines:** `soft` when their only fresh whole-form hits are frame words or the English *espresso*. Order:
  `leak` > `near` > `soft` > `quoted` > `echo`.
- **Word hits:** a frame hit no longer suppresses word hits of a required form in the same objective.
- **Critique:** a fresh read-only subagent in place of Codex. 6 findings, all accepted. Two were Errors: round 100's
  English set would have hidden *basta* / *ciao* / *hola*, and Mortimer's numbers are needed.
- Offline; every committed report was rescanned.

## Results

| Check | Result |
|---|---|
| Rescan of 149 committed reports | 65 lines `leak` → `soft`; no other kind changes, by report, scene and line ([before](results/scan-before.txt), [after](results/scan-after.txt)) |
| Totals | it leak 50, soft 48 (old 98); es leak 12, soft 17 (old 29); near, quoted, echo and foreign unchanged |
| By era | it: before 051 leak 44 / soft 39, from 051 leak 6 / soft 9; es: before 051 leak 12 / soft 9, from 051 leak 0 / soft 8 |
| New tests (`server/test/leak-scan.test.js`) | 4 new, 24/24 in the file: Errata's frame word soft and the key leak; frame + word near; *basta*, *ciao* and Mortimer's *tre* stay leaks; *espresso* and *vorrei* soft, *caffè* a leak; echo; `softLines`; the content check over both packs |
| Mutations | 6 of 6 fail a test (the suppression rule, `isFrame`, the English list swapped or removed, Mortimer listed, the kind order) |
| Full suites | server 382/382, client 12/12, mobile 292/292 |

## Decision

Keep the `soft` kind (autonomous decision, pending owner review). Make no content change: the six remaining leaks are
a homonym and parts of Errata's own lines that round 044 already read.

## Evidence

`server/scripts/leak-scan.js` (`FRAME_TARGETS`, `isFrame`, `NPC_ENGLISH_FORMS`, `scanLine`'s `soft`), the
[after scan](results/scan-after.txt) (`soft` lines listed), [`trail/critique-1.md`](trail/critique-1.md) and round
044's [findings](../044/findings.md).

## Claim boundary

This covers committed reports only, read against today's content. `soft` is a judgement about give-aways, not about
grading. The frame list is hand-made, and a new encounter's optional words are not soft until they are listed.

## Open items

- **Owner question:** does the frame of an answer (Errata's "Sono Errata", the *sono* of "Sono Nessuno") give it
  away? Today it is a leak. This is carried over from round 044.
- **Flick's *ora* as "hour":** the next live tour could check how often it happens after round 050's telling-the-time
  objective. A content change (Flick avoiding *l'ora*) waits for live data.
