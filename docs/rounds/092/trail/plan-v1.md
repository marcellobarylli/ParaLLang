# Round 092 plan v1: fixes from a review of the core server paths (rounds 001–016)

Source: `review-1.md` (7 findings), checked by hand at HEAD 326da97.

## R1.1 (Error): the PARALLANG_TOKEN check is bypassed by the URL's case

`requireToken` (server/src/app.js:14) skips unless `req.path.startsWith('/api/')`, case-sensitively; Express 5
(5.2.1) routes case-insensitively, so `/API/world` reaches the handler without the token (reproduced by the
reviewer). Fix: the token is required for every request except the health check, matched as the router matches it:
`req.path.toLowerCase().replace(/\/+$/, '') === '/api/health'`. Non-API paths have no handlers (404 either way); CORS
preflights are answered by `cors()` before the check (registered first), unchanged.

## R1.2 (Gap): grader evidence is checked out of context

`submitDialogue` (learning-service.js:870–873) requires the evidence text as a folded substring of the answer and
the excerpt alone to match the entry, but never that the entry matches the answer at word boundaries: "pane" quoted
from "vorrei un panettone" passes. Fix: also require `matchCanonicalVocabulary(playerInput, [entry])` to find the
entry (the entry alone, so a longer overlapping entry such as *caffè nero* does not hide *caffè*). A failure is
INVALID_GRADING as today (the turn is retried, nothing changes).

## R1.6 (Minor): a reveal caps only the current objective in an ordered encounter

`learning-service.js:946`: in an ordered encounter a sentence reveal on the active message caps the quality of its own
objective only; when one turn closes the current objective and the next, the next is scheduled at full quality
though the revealed line helped. Fix: in an ordered encounter, a reveal for the objective that was current at the turn
caps every objective graded that turn (as unordered encounters already do).

## Rejected or deferred

- **R1.3** (the review response's Spellbook carries the challenged card's meanings): by design since round 017, the
  server sends meanings and the app hides them; the app shows no Spellbook during a review. Rejected.
- **R1.4** (an earlier NPC line's translation shows while its objective is still open): round 001's design ("completed
  dialogue retains easy translation access"); the NPC lines never dictate the answer (rounds 007, 012). Rejected;
  owner question.
- **R1.5** (dialogue receipts never pruned, the save grows): real, but pruning changes replay safety (a resend of a
  pruned attempt); deferred to a backlog item that measures save sizes first.
- **R1.7** (a review reveal records quality 0, a wrong answer 2): SM-2's scale (0 blackout, 2 incorrect); rejected,
  owner question.

## Tests

- server `token` test (in an existing file using the token): `/API/world`, `/Api/onboarding`, `/api/world/` without
  the token are 401; `/API/HEALTH` and `/api/health/` are 200; with the token all pass.
- server: a grader quoting "pane" from "panettone" (it) is INVALID_GRADING; "caffè" quoted from "un caffè nero" still
  passes for *caffe*; existing evidence tests unchanged.
- server: an ordered encounter, a sentence reveal on objective 1, one turn closing objectives 1 and 2: both
  evidences capped at 2.
- Full suites; each fix removed in turn fails a test.
