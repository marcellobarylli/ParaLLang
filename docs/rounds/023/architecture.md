# Round 023 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog A8c in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); round
  [022](../022/architecture.md) (party conversations, Gerald's coffee break as the template).
- **Findings:** [`findings.md`](findings.md), after the runs.
- **Artifact:** three party conversations and their vocabulary in both packs, tests, `play-market.js --member`.

## Goal (pre-run)

Every saveable character has a party conversation: Mortimer, Flick and Marginalia join Gerald. Content only (no
engine change), in Italian and Spanish.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Scenes and objectives** as below: Mortimer's tasting (like it, ask for more), Flick's slow walk (let's go,
   together), Marginalia's fragment (praise the story, ask her to read it again).
2. **English collisions are avoided by authoring phrases**: Spanish "more" is the phrase *un poco más* (bare *más*
   folds to English "mas", critique 1.1); Spanish "together" is *juntos* only (*juntas* is English, 1.2); Italian
   *ancora* and *insieme* stay bare (they are not English words; 1.3 rejected).
3. **Each scene withholds its answers**: the first objective's intent says the NPC does not use the pending answers
   before the player has (1.8); measured in the live runs.

## Design (pre-run)

Each conversation: `content/languages/<code>/encounters/<id>.yaml` with `party_of: <home encounter>`, the home
encounter's character file, escalation 0.05, two ordered objectives with negative examples (English-only, negated,
quoted, someone else's words, wrong referent or action), and a new vocabulary file `<member>_party.yaml` (own
version; Treccani / RAE and Wiktionary references). The scene, and the instruction not to say the pending answers, is
in the first objective's intent (it reaches the narration prompt, round 022).

| Conversation | party_of | Objective 1 (it / es) | Objective 2 (it / es) |
|---|---|---|---|
| `mortimer_tasting` | `butchers_stall_charcutier` | `like_it`: *mi piace* / *me gusta* (singular only, one slice; 1.5) | `ask_more`: *ancora* (ancora, ancora un po') / *un poco más* |
| `flick_slow_walk` | `cracked_fountain_letharger` | `lets_go`: *andiamo* / *vamos* | `together`: *insieme* / *juntos* |
| `marginalia_fragment` | `old_bookshop_bookworm` | `praise_story`: *meraviglioso* (meraviglioso, meravigliosa) / *precioso* (precioso, preciosa) | `read_again`: *di nuovo* / *otra vez* |

- Marginalia's referent is fixed in the intent: she asks what the player thought of **la storia / la historia**
  (feminine; 1.6), so *meravigliosa* / *preciosa* agree; separate Italian and Spanish agreement constraints (1.4).
  Negative example: "Lo leggo di nuovo" / "Lo leo otra vez" (the player reading, not asking her to read; 1.9).
- Fragment in present tense with explicit nouns (1.7): it "Journathan parla con il mare in due lingue. Il mare
  risponde in una lingua sola: la sua." es "Journathan habla con el mar en dos lenguas. El mar responde en una sola
  lengua: la suya." (*due*, *dos*, *lingua*, *lengua* are known words from earlier encounters.)
- `play-market.js --party --member <home location>`: wins the home encounter with its script, recruits, walks to the
  start (or a neighbour if home is the start) and plays the conversation. Scripts (English first, should fail):
  - Mortimer: it `I like it.`, `Mi piace!`, `Ancora, per favore!`; es `I like it.`, `¡Me gusta!`,
    `¡Un poco más, por favor!`
  - Flick: it `Let's go together.`, `Andiamo!`, `Insieme.`; es `Let's go together.`, `¡Vamos!`, `Juntos.`
  - Marginalia: it `It was wonderful.`, `La storia è meravigliosa!`, `Di nuovo, per favore!`; es
    `It was wonderful.`, `¡La historia es preciosa!`, `¡Otra vez, por favor!`

## Tests (pre-run)

- Both packs load; each saveable character has exactly one party conversation and Portia and Errata none; the
  Rift's review still excludes party vocabulary; aggregate vocabulary versions updated.
- No folded surface form of a party vocabulary entry is in an English blocklist (mas, juntas, rico, rica, bella,
  bonito, lee, piano, chili, soy, due, media, more, go), and none equals or contains as a whole word a form of
  another entry in the same pack (1.10).
- Each member's conversation answers 409 `NOT_IN_PARTY` before recruiting (1.11, in part: progression and counting
  are the engine tests of round 022).
- Gerald's golden prompts unchanged.

## Live data (pre-run)

One it and one es `--party --member` run per member, sequential (6 runs). Record: resolution, verdicts against the
script, share against requested, and every NPC line that uses a pending objective's answer before the player has
passed it (1.8).

## Claim boundary (pre-run)

A smoke check of authored content, one run per member and language; no rates. Reference URLs not opened (no web
access). Not checked in the iOS Simulator; the content needs a native speaker's review (Optional item).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 a2ce0feb…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Spanish *más* folds to English "mas" | 0 | Accept: the phrase *un poco más*; blocklist test | **Accepted** (autonomous) | Decision 2; Design; Tests |
| 1.2 | Error | *juntas* is an English word | 0 | Accept: *juntos* only | **Accepted** (autonomous) | Decision 2 |
| 1.3 | Risk | Italian *ancora*, *insieme* as musical English | − | Reject: neither is an English word (the musical terms are *encore*, *ensemble*); requiring phrases would refuse the natural bare answer | **Rejected** (autonomous) | Decision 2 |
| 1.4 | Error | Spanish agreement rule names Italian *la storia* | + | Accept: separate it / es constraints | **Accepted** (autonomous) | Design |
| 1.5 | Error | Plural *mi piacciono* / *me gustan* contradict one slice | + | Accept: singular forms only | **Accepted** (autonomous) | Design |
| 1.6 | Risk | Feminine praise has no fixed referent | + | Accept: *la storia* / *la historia* in the intent; scripted full sentences | **Accepted** (autonomous) | Design |
| 1.7 | Risk | Past-tense fragment above beginner level | + | Accept: present tense, explicit nouns | **Accepted** (autonomous) | Design |
| 1.8 | Risk | The NPC would naturally say the answers ("Vuoi ancora?") | + | Accept in part: the intent forbids the pending answers; inspected in every live line; the global style rule is unchanged | **Accepted in part** (autonomous) | Decision 3; Live data |
| 1.9 | Risk | Negative examples are not assessment tests | 0 | Accept in part: add the reread negative example; examples are graded live only as scripted (no full sweep of every example through the LLM) | **Accepted in part** (autonomous) | Design; Live data |
| 1.10 | Risk | No test for form overlaps across the pack | + | Accept: overlap and blocklist test | **Accepted** (autonomous) | Tests |
| 1.11 | Risk | Progression untested for the new members | 0 | Accept in part: `NOT_IN_PARTY` per member; ordering and counting are engine behaviour tested in round 022 | **Accepted in part** (autonomous) | Tests |

**Optional, deferred to the owner:** native-speaker review of the encounter text and notes (in Needs owner).

Net change from v1: Spanish *un poco más* and *juntos* only, singular liking, a fixed feminine referent and a
present-tense fragment, an answer-withholding line in each intent, overlap and blocklist tests.
