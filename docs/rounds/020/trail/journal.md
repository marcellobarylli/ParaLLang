# Journal: round 020

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-05 16:20:30 | 16:21:17 | round-opened | Claude (claude-opus-5-5), autonomous | Backlog E1, second try after round 019 refuted the vocabulary-scarcity hypothesis. Occurred approximate | `../../019/findings.md` |
| 2 | 16:21:09 | 16:21:17 | plan-drafted | Claude (claude-opus-5-5), autonomous | Draft v1: one quirk in Portia's sheet puts her formalities in the target language; 3 it + 1 es runs | `plan-v1.md` |
| 3 | 16:21:25 | 16:21:28 | critique-dispatched | Claude (claude-opus-5-5), autonomous | Critique 1 on `plan-v1.md` sha256 83f92471…, HEAD 6b9a35f, working tree `docs/rounds/020/` untracked; bundle `/tmp/r020-bundle.txt` sha256 cbda9831… (plan, round 019 findings, base.txt, style_guide.yaml, archway_portia.yaml, imp_coffee.yaml, it market_entrance_tutorial.yaml). Occurred approximate | `plan-v1.md` |
| 4 | 16:22:08 | 16:22:28 | critique-returned | Codex, effort high | 9 findings: 1 Error (no real answer guard in the wording), 3 Risks, 5 Gaps | `critique-1.md` |
| 5 | 16:22:58 | 16:22:58 | disposition | Claude (claude-opus-5-5), autonomous | Critique 1: 1.1, 1.2, 1.4, 1.9 accepted, 1.3, 1.5–1.8 in part; quirk wording and runs revised. Autonomous decisions, pending owner review | `../architecture.md` |
| 6 | 16:22:58 | 16:22:58 | freeze | Claude (claude-opus-5-5), autonomous | Pre-run record committed: `architecture.md`, trail, decisions rows, status index row | `../architecture.md` |
| 7 | 16:23:35 | 16:23:35 | built | Claude (claude-opus-5-5), autonomous | Quirk added to `archway_portia.yaml`; test in `ambient-vocabulary.test.js`; server 115/115, mobile 25/25, web client 12/12 and build | `../../../content/characters/enemies/archway_portia.yaml` |
| 8 | 16:25:10 | 16:28:49 | run | Claude (claude-opus-5-5), autonomous | 3 it, 1 es, 1 it variant (`--lines 'Hello!|Ciao!|Mi chiamo Robin.|E tu?'`) tutorial runs, sequential, codex-cli; 37 calls, ended 16:28:32. Occurred approximate | `../results/` |
| 9 | 16:28:32 | 16:28:49 | result | Claude (claude-opus-5-5), autonomous | 5/5 resolved, 17/17 lines graded as scripted, 0 leaks, 0 lines over requested + 0.15. Italian lines 0.17 (0.16 in round 019), greeting 0.13 (0.12); Spanish lines 0.17 (0.18). Success criterion not met | `../findings.md` |
| 10 | 16:29:28 | 16:29:28 | amended | Claude (claude-opus-5-5), autonomous | Quirk and its test removed (pre-run decision 2); `content/` and `server/` equal the freeze commit; server 114/114 | `../architecture.md` |
| 11 | 16:29:28 | 16:29:28 | outcome | Claude (claude-opus-5-5), autonomous | Outcome and findings written; round 019 re-read: open-answer lines 5/12 → 0/12 | `../findings.md` |
| 12 | 16:29:28 | 16:29:28 | closed | Claude (claude-opus-5-5), autonomous | Round closed; STATUS addendum and index row, decisions row | `../findings.md` |
