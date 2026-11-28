# Journal: round 223

Append only. Times are UTC.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-28 14:45 approx. | 15:20 | round-opened | Owner | Japanese and Chinese, in rōmaji and pinyin only (no Japanese or Chinese script); deploy | `interview.md` |
| 2 | 2026-11-28 15:00 approx. | 15:20 | decision | Claude | Two packs like the French of round 181 (`ja`, `zh`); a pack's new `writing` field tells every prompt that writes or grades the language to use Latin letters only (`- WRITING:` after LANGUAGE RULES and in both grading prompts); the road's region acts as Nagano and Jiangnan; the hosted server plays `it,fr,es,ja,zh` | `../architecture.md` |
| 3 | 2026-11-28 15:05 approx. | 15:20 | decision | Claude | `tools/check_pack.mjs`: a pack checked while it is written, its missing files (or all but `--only` files) taken from Italian in a copy of `content/`, with stand-ins for the Rift's Errata, cited references and curriculum stages | `../architecture.md` |
| 4 | 2026-11-28 15:10 approx. | 15:20 | delegated | Claude | The two packs, mirrored from the Italian, written by fourteen subagents (per language: the entrance and Gerald; Mortimer with Flick's slow walk; the fountain, the lotus and Eduardo; the bookshop and the lore; curriculum A1, A2, B1), then one per language for Errata and the merge of the curriculum stages | `../architecture.md` |
| 5 | 2026-11-28 15:15 approx. | 15:20 | decision | Claude | The microphone listens in English only for a pack with `writing` (the browser would write Japanese or Chinese speech in kana, kanji or hanzi); the language switch is hidden | `../architecture.md` |
| 6 | 2026-11-28 16:00 approx. | 17:00 | run | Claude | Each group checked alone (`--only`); Errata written per language with the whole market checked; cross-file reference ids and lore texts holding answers fixed | `../findings.md` |
| 7 | 2026-11-28 16:40 approx. | 17:00 | run | Claude | Curriculum stages merged per language (earliest definition kept); both packs load whole with no shared form | `../findings.md` |
| 8 | 2026-11-28 16:55 approx. | 17:00 | run | Claude | All suites pass (server 640, client 394, aesthetic 96, mobile 320); client build; the title in headless Chromium offers five languages | `../findings.md` |
| 9 | 2026-11-28 17:00 | 17:00 | closed | Claude | Records, status addendum; merged to `main` and pushed on the owner's word ("Then deploy") | `../architecture.md` |
