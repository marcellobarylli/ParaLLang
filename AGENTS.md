# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

**Start at [STATUS.md](STATUS.md).** It holds the current state, the log protocol and the round index.

## Reading and logging rounds

- **Read the main stream only.** Read the status report's current state, the round's `architecture.md` and its
  `findings.md` (from round 003 on). Open a round's `trail/` only to trace a decision back: the owner disputes a
  decision, a provenance audit, backfilling, or a main record that is wrong or contradicts itself.
- **Log with the `round-log` skill** from round 003 on, as each event happens. A round ends with its close step and
  `python3 tools/round_log_check.py NNN`.

## Project Overview

ParaLLang is an immersive narrative language learning game where players learn a language (Italian by default, Spanish also available) through conversational encounters with absurd characters. The game is currently in the **design/planning phase** — `parallang.md` contains the full vision and lore, and `prototype.md` is the technical blueprint for implementation.

The core mechanic: enemy NPCs speak increasingly more of the target language as encounters escalate. Players must translate words/sentences to "defeat" them. Mechanically, translation generates power — mirroring the in-world lore where language underpins reality itself.

## Planned Stack

- **Frontend:** iPhone-first. An Expo / React Native app in `mobile/` (Zustand for state), run in the iOS Simulator through Expo Go; development is app-first from round 004. The React/Vite web client in `client/` is kept working but frozen
- **Backend:** Node.js with Express (or Fastify)
- **LLM:** Provider-agnostic adapter (OpenAI GPT-4o-mini recommended, Anthropic and Ollama also supported)
- **Content:** YAML files for world/characters/encounters/vocabulary
- **Validation:** Zod for JSON schema validation
- **Spaced repetition:** SM-2 algorithm (custom implementation)

## Architecture

The system is a client-server app with a content layer and external LLM APIs:

```
iPhone app (Expo)    →  Server (Node/Express)  →  LLM Provider (OpenAI/Anthropic/Ollama)
                              ↑
                     Content System (YAML)
```

**Server modules:**
- **LLM Orchestrator** — constructs prompts from templates, manages context window, validates structured JSON output from LLM
- **Language Engine** — translation validation (fuzzy match + LLM-as-judge), SM-2 spaced repetition, difficulty scaling
- **Game Logic** — world state, encounter manager, progression system, companion manager

**All LLM responses must be structured JSON** conforming to a predefined schema — no free-form text parsing. Example response shape:
```json
{
  "narrative": "...",
  "dialogue": { "speaker": "...", "native": "...", "translation": "...", "words": [...] },
  "must_translate": true,
  "difficulty": 2,
  "encounter_state": "ongoing"
}
```

**Difficulty scaling** is the core gameplay loop: each NPC has a `base_target_ratio` (e.g. 0.25) and an `escalation_rate` per turn. The Language Engine adjusts prompt parameters accordingly.

**Content is data:** All game content (locations, characters, encounters, vocabulary) is authored in YAML under `content/`. The server loads and indexes this at startup. Each target language is a pack under `content/languages/<code>/` selected by `TARGET_LANGUAGE`. Character definitions include `language_profile` (target-language ratio, vocabulary focus) and `defeat_condition`.

**Prompt architecture:** Prompts are modular templates combining world lore, location description, NPC character sheet, tone directives, language rules (% target language, grammar constraints), output format schema, summarized + recent conversation history.

## Key Design Documents

- `parallang.md` — vision, lore, world design, character archetypes, game mechanics philosophy
- `prototype.md` — **primary reference for implementation**: full system architecture, component specs, YAML schemas, LLM integration strategy, 4-phase development roadmap, prototype level design ("The Crumbling Market")
- `parallang_obsidian/` — the owner's Obsidian notes (copied 2026-10-31): design choices, lore, characters, locations, plot and quests, game mechanics, development roadmap. `Parallang.md` and `HUB.md` are the entry notes
