# Round 020 plan v1: Portia's formalities in the target language (backlog E1, second try)

## Problem

Round 019: giving Portia ambient words (benvenuto, piacere, mercato) did not raise her share of target language
(Italian lines 0.17 → 0.16 against 0.28 requested; greeting 0.08 → 0.12 against 0.20). Every line is built as one
Italian formula plus English bureaucratic humour ("A greeting and your name, please. Manners are load-bearing."),
which her character sheet invites: three of four quirks are about paperwork and manners, in English terms. Other
NPCs' sheets give them target-language habits (Gerald scolds about coffee words; Marginalia reads passages).

## Hypothesis

A quirk that puts her formalities in the target language moves the share towards the request without making her
model the open objectives' answers.

## Change (content only)

`content/characters/enemies/archway_portia.yaml` (shared by both packs), personality quirks: add
"Conducts her formalities in the visitor's language: welcomes, approvals and remarks about the market are in it,
using the words she has been given; only her grumbling asides are in English". Keep the four quirks. No template,
rule or vocabulary change; Gerald's pinned prompts are untouched (his sheet is separate).

Guard: the style rules against dictation and answer menus still apply; "using the words she has been given" points
at ambient vocabulary and her own name, not the objectives' answers.

## Tests

- A test pins that the quirk reaches Portia's narration prompt and that her grading prompt is unchanged.
- All suites green.

## Live runs (codex-cli)

3 Italian + 1 Spanish tutorial runs, measured exactly as round 019 (both measures, per line, tokens, ambient words;
verdicts as scripted; dictation of open targets, i.e. Portia saying ciao/buongiorno/sono/mi chiamo/tu/come ti chiami
as a model before the matching objective is passed; feedback leaks).
Success: Italian line mean (not in translation) ≥ 0.22 and greeting mean ≥ 0.15, verdicts unchanged, no new
dictation. Otherwise revert the quirk and record E1 as a template question.
