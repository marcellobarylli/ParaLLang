# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ParaLLang is an immersive narrative language learning game where players learn Spanish through conversational encounters with absurd characters. The game is currently in the **design/planning phase** — `parallang.md` contains the full vision and lore, and `prototype.md` is the technical blueprint for implementation.

The core mechanic: enemy NPCs speak increasingly more Spanish as encounters escalate. Players must translate words/sentences to "defeat" them. Mechanically, translation generates power — mirroring the in-world lore where language underpins reality itself.

## Planned Stack

- **Frontend:** React 18+ with Vite, Zustand for state
- **Backend:** Node.js with Express (or Fastify)
- **LLM:** Provider-agnostic adapter (OpenAI GPT-4o-mini recommended, Anthropic and Ollama also supported)
- **Content:** YAML files for world/characters/encounters/vocabulary
- **Validation:** Zod for JSON schema validation
- **Spaced repetition:** SM-2 algorithm (custom implementation)

## Architecture

The system is a client-server app with a content layer and external LLM APIs:

```
Client (React/Vite)  →  Server (Node/Express)  →  LLM Provider (OpenAI/Anthropic/Ollama)
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

**Difficulty scaling** is the core gameplay loop: each NPC has a `base_spanish_ratio` (e.g. 0.25) and an `escalation_rate` per turn. The Language Engine adjusts prompt parameters accordingly.

**Content is data:** All game content (locations, characters, encounters, vocabulary) is authored in YAML under `content/`. The server loads and indexes this at startup. Character definitions include `language_profile` (Spanish ratio, vocabulary focus) and `defeat_condition`.

**Prompt architecture:** Prompts are modular templates combining world lore, location description, NPC character sheet, tone directives, language rules (% Spanish, grammar constraints), output format schema, summarized + recent conversation history.

## Key Design Documents

- `parallang.md` — vision, lore, world design, character archetypes, game mechanics philosophy
- `prototype.md` — **primary reference for implementation**: full system architecture, component specs, YAML schemas, LLM integration strategy, 4-phase development roadmap, prototype level design ("The Crumbling Market")
