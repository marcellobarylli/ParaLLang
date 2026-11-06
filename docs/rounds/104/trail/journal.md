# Journal: round 104

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 08:38:28 | 08:38:28 | round-opened | Claude (claude-opus-5-5), autonomous | Round 104 opened (iteration 30): a review of rounds 100–103's code (leak scan, the replay after a restart, the web client) | — |
| 2 | 08:38:28 | 08:38:28 | review-dispatched | Claude (claude-opus-5-5), autonomous | A fresh general-purpose subagent, read-only, reviews the code diff a8f01e8^..770aa11 (server/scripts/leak-scan.js and its tests, mobile gameStore and send-retry tests, server/test/web-client.test.js, client Spellbook) | `review-1.md` |
| 3 | before 08:41:14 | 08:41:14 | review-returned | Claude (general-purpose subagent, claude-opus-5-5), read-only | 8 findings (5 Gap: *espresso* soft as a required Italian answer; old leak ≠ leak + soft when a word hit makes the line near; an echoed frame word hides a fresh word hit; scanText keeps one form per objective; espresso still suppresses word hits; 3 Minor) | `review-1.md` |
| 4 | 08:42:30 | 08:42:38 | result | Claude (claude-opus-5-5), autonomous | Before: rescan of the committed reports at HEAD 770aa11 (`scan-before.txt`, equal to round 101's after); all 32 soft *espresso* lines hold "espresso shot(s)" | `../results/scan-before.txt` |
| 5 | 08:42:38 | 08:42:38 | disposition | Claude (claude-opus-5-5), autonomous | R1.1–R1.6 and R1.8 accepted, R1.7 in part (wording; the server change deferred) | `../architecture.md` |
| 6 | 08:42:38 | 08:42:38 | freeze | Claude (claude-opus-5-5), autonomous | Freeze commit: architecture.md pre-run sections, decisions row, index row | `../architecture.md` |
| 7 | 08:42:48 | 08:42:48 | amended | Claude (claude-opus-5-5), autonomous | Correction: row 4's Occurred was estimated; the file's mtime is 08:41:48 | `../results/scan-before.txt` |
| 8 | 08:45:16 | 08:45:16 | built | Claude (claude-opus-5-5), autonomous | Built: the *espresso* context, one soft predicate, the `near` rule, `oldLeak` counted, every form per objective in English texts, the web Spellbook's time check, the race tests' read assertion; 5 of 5 scan mutations fail a test (after tightening the R1.5 test); server 389/389, client 14/14, mobile 301/301 | `../architecture.md` |
| 9 | 08:45:16 | 08:45:16 | result | Claude (claude-opus-5-5), autonomous | After: no NPC-line kind change; six extra-feedback hit lists gain *caffè nero*; totals unchanged | `../results/scan-after.txt` |
| 10 | 08:45:16 | 08:45:16 | outcome | Claude (claude-opus-5-5), autonomous | The committed numbers stand; the scan counts correctly on new reports | `../findings.md` |
| 11 | 08:45:16 | 08:45:16 | closed | Claude (claude-opus-5-5), autonomous | Round 104 closed; status addendum and index row | `../architecture.md` |
