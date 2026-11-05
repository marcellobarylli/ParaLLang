# Round 028 findings

## Question

Can the Spellbook keep a deadpan containment file for each infohazard the player has dealt with (backlog B4,
LORE.md), without the file ever explaining a hazard before it is met or answering what the game is asking?

## Finding

Yes, as far as tests can show. The two hazards, Flick's jingle (CM-001) and Errata (CM-002), are filed when their
encounter is completed. The resolving turn's spellbook already carries the file, and the app lists it under
"Containment files" below the vocabulary cards. Building it exposed an ordering bug: a resolving turn returned
progress that was one step stale (Amendment 1). It is fixed.

## Method

- Planned in [plan-v1](trail/plan-v1.md). It was critiqued by a fresh Claude subagent ([critique 1](trail/critique-1.md);
  Codex was at its usage limit). The critique had 9 findings, including 2 Errors: a background refresh could show
  card meanings during an encounter, and a visit is not a meeting. Both were accepted and changed the design to
  filing on completion with no refresh. The build follows [architecture.md](architecture.md).
- Tests on the Linux compute node. No live LLM runs: the files never reach a prompt, and Gerald's golden prompts
  are unchanged.

## Results

| Check | Before | After |
|---|---|---|
| server `node --test` | 138/138 | 142/142 (`containment.test.js` ×4; the Fountain flow asserts no file at start, CM-001 on the resolving turn only) |
| mobile jest | 45/45 | 47/47 |
| web client vitest, build | 12/12, ok | 12/12, ok |
| `npx expo-doctor`, iOS export | 20/20, ok | 20/20, ok |

The leak check covers every objective target in the pack and every word of the file's own encounter. The jingle's
own words are allowed in its name only. The check finds nothing in either pack, and it catches a planted
`adesso` / `ahora`.

## Decision

Keep it. Backlog B4 is done apart from the Simulator check and review of the texts.

## Evidence

The round's build commit; journal rows 6–7; `server/test/containment.test.js`, `server/test/fountain.test.js`,
`mobile/src/__tests__/spellbook.test.js`.

## Claim boundary

Tests only; the screen was not seen. The leak check is lexical: it cannot catch an English paraphrase of an answer.
By hand, the files name no answer in English either, although "Do not tell it who you are" alludes to the Rift's
Nobody objective, whose prompt states the trick outright anyway. Saves that already completed the Fountain or the
Rift show the files at once.

## Open items

1. Owner, Simulator: the Containment files section below a long card list, during an encounter and between
   encounters, and VoiceOver's reading order of the label/value lines (critique 1.9).
2. Owner: review both files' texts (`containment_file` in both packs' `cracked_fountain_letharger.yaml` and
   `the_rift_errata.yaml`), and the designations CM-001 and CM-002.
3. Deferred: companion redaction of hazards (LORE.md), and files for future hazards.
