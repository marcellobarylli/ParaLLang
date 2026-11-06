# Codex critique 1: atmosphere variety

- **Dispatched:** 2026-11-06 01:55 (approx.; journal row 5)
- **Returned:** 2026-11-06 01:59 (approx.)
- **Model:** codex-cli 0.166.0, `codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, effort high, read-only; bundle on stdin (no file access); session id in the raw log not kept
- **Prompt:** "You are an adversarial reviewer. Do NOT run any commands or read files; everything you need is in the bundle on stdin (a plan for a round of ParaLLang, a language-learning game, plus the relevant prompt, content, code and test excerpts and the 24 baseline live lines). Critique the plan in docs/rounds/068/trail/plan-v1.md. Look for errors in the design, risks (the new rule over-correcting into blandness, banned words appearing in descriptions or character sheets, the Rift's Errata whose lore is containment paperwork, detail kinds that contradict a place, the cache key not including the detail, prompt tests that pin text), and gaps in the tests or the success measure. Number each finding as '1. **Error|Risk|Gap — <severity>: <title>**' followed by evidence (file:line from the bundle) and a concrete recommendation. Then a separate 'Optional' list. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 24ca644d…, HEAD e277751, working tree STATE.md and docs/rounds/068/; bundle (570 lines, sha256 f9be72ecfa7f6118…): plan-v1, prompts/world/atmosphere.txt, content/narration/style_guide.yaml, content/world/locations/*.yaml, server/test/atmosphere.test.js, prompt-builder.js 1–120, learning-service.js 715–785, round 053's 24 live lines, rift_errata.yaml 1–60
- **Findings:** 7

An earlier dispatch without the bundle returned nothing (bwrap could not mount; [critique-0-no-access.txt](critique-0-no-access.txt)).

## Raw output (verbatim)

```text
1. **Risk — High: Blanket ban suppresses legitimate character humour**
   The prohibition covers all paperwork humour (`docs/rounds/068/trail/plan-v1.md:15–17`), including Errata’s canonical containment-file identity (supplied character sheet, unnumbered). Yet atmosphere receives only the character’s name/species, not those traits (`server/src/learning-service.js:755–763`). Prefer “avoid generic office jokes” with narrowly authored, English-only location hooks. Preserve Errata’s containment motif and assess whether humour survives.

2. **Error — Medium: Detail selection requires inputs the builder lacks**
   The selector needs location order and `none/open/complete` (`docs/rounds/068/trail/plan-v1.md:18–22`), but the builder receives neither the world list nor the state enum; `state` is already prose (`server/src/learning-service.js:763`; `server/src/llm/prompt-builder.js:103–109`). Specify the selection formula and interface. Compute from the canonical state and location index, then pass the selected detail explicitly.

3. **Risk — Medium: Forced details can encourage unsupported invention**
   Uniform rotation ignores each place’s affordances. The fountain has stopped running water, and the Rift contains a dead branch (`content/world/locations/cracked_fountain.yaml:4–5`; `content/world/locations/the_rift.yaml:4–6`). No proposed category inherently contradicts these facts, but forced sensory invention can. Require details grounded in existing features, allow a fallback category, and manually check factual consistency across every location/state.

4. **Error — High: The stated baseline does not match the supplied outputs**
   The listed substring scan matches **20/24**, not 23/24 (`docs/rounds/068/trail/plan-v1.md:7–8,35–38`). The four nonmatches are Italian coffee/open and Rift/complete, Spanish butcher/complete and Rift/complete. Likewise, seven lines *contain* smell details; they do not all *open* with them. Recompute the baseline with the actual evaluator and define how openings are classified before setting thresholds.

5. **Gap — High: Success can mean bland prose or renamed bureaucracy**
   Keyword frequency and opening senses (`docs/rounds/068/trail/plan-v1.md:35–38`) cannot distinguish lively, place-specific humour from flat description or bureaucratic synonyms. Add a paired human assessment of humour, grounding and repetition, including Errata. Define whether “≥5/6 kept per pack” applies separately to each state: the runner makes twelve calls per pack. Report drops explicitly so rejected lines cannot improve variety scores.

6. **Risk — Low: Cache correctness depends on an unstated invariant**
   The cache excludes detail (`server/src/learning-service.js:732–734`), while the plan leaves caching unchanged (`docs/rounds/068/trail/plan-v1.md:23`). This is safe **if** detail remains a fixed function of location/state for the server lifetime. Document and test that invariant. If selection can change within a process, include detail or a selector version in cache identity, including failure and in-flight entries.

7. **Gap — Medium: Tests cover prompt presence more than routing or compatibility**
   The proposed checks omit `none`, neighbour differences and repeatability (`docs/rounds/068/trail/plan-v1.md:27–30`). Existing direct builder calls also lack the proposed selector inputs (`server/test/atmosphere.test.js:160–166`). Test the complete mapping and service-to-builder wiring. Scope assertions to the detail instruction and generated-output rule: descriptions or future character hooks may legitimately contain banned terms. Preserve existing context assertions without adding whole-prompt snapshots; the complaint fixture (`server/test/atmosphere.test.js:24,41`) verifies caching, not model compliance.

**Optional**

- Record assigned detail kinds beside live outputs to distinguish selector coverage from model compliance.
- Repeat the live comparison: deterministic prompts do not make generation deterministic (`server/src/learning-service.js:767`).
```
