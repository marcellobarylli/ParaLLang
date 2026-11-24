# Journal: round 177

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-24 morning | afternoon | round-opened | Owner | Playtest the NPC conversations at every level with subagents; no "what do you think of my work"; A1 kept to the task, conversational from A2 | `interview.md` |
| 2 | morning | afternoon | built | Claude | `server/scripts/playtest.js`: a local server on claude-cli that places a learner at any unit or lesson, and a client to play it | `../../../../server/scripts/playtest.js` |
| 3 | morning | afternoon | run | Claude | Six subagents, 32 conversations, 218 character lines scored; causes traced to `system/base.txt` and `encounter/light_turn.txt` | `../../../playtests/2026-11-24-conversations/README.md` |
| 4 | afternoon | afternoon | decision | Owner | "Yes!" to conversation rules by level and a re-test | `interview.md` |
| 5 | afternoon | afternoon | built | Claude | `system/conversation_a1/a2/b1/shared.txt` chosen by the stage's CEFR; light and greeting prompts changed | `../architecture.md` |
| 6 | afternoon | afternoon | run | Claude | Four subagents re-test (128 lines); goodbye, opener, modelling and grading fixes made from their reports | `../findings.md` |
| 7 | afternoon | afternoon | run | Claude | Final check by two subagents (36 lines); server tests 589 pass | `../findings.md` |
| 8 | afternoon | afternoon | decision | Owner | Words said first only when never met; go ahead on grading, immersion and repetition; merge and deploy | `interview.md` |
| 9 | afternoon | evening | built | Claude | Known objectives asked as recall; unverifiable evidence dropped; accent-only corrections free; Follow my level; quirks reworded | `../architecture.md` |
| 10 | evening | evening | run | Claude | Server 592, client 305, aesthetic 95 pass; build; one live A1 conversation at the new default | `../findings.md` |
| 11 | evening | evening | closed | Claude | Records, status row; merged to `main` and pushed on the owner's word ("merge and deploy") | `../architecture.md` |
