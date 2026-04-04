# Parallang — Prototype Technical Report

## 1. Executive Summary

This report defines the technical architecture and development roadmap for the Parallang prototype: a self-contained, text-based language learning game where the player converses with absurd enemies to defeat them, progressively acquiring Spanish vocabulary and grammar through immersion in a richly lored fictional world.

The prototype is a single "Painted World"-style level — bounded, explorable, and complete in itself — built as a React + Node.js web application backed by a provider-agnostic LLM layer. Everything built at this stage is designed to slot into the broader Parallang vision without throwaway work.

---

## 2. Prototype Scope

### 2.1 What the Prototype Is

A playable web-based level where the player:

1. Arrives in a self-contained location (e.g. a crumbling market square on the edge of a dead branch).
2. Navigates between points of interest via a simple map/node interface.
3. Encounters enemies and NPCs, each of whom must be engaged through conversation.
4. Defeats enemies by successfully translating, comprehending, and generating Spanish phrases within dialogue.
5. Can optionally save defeated enemies to their party (Pokémon-style), unlocking deeper conversations over time.
6. Interacts with a Companion character who provides translations, hints, and narrative context.
7. Discovers lore fragments hidden in more advanced language passages (Dark Souls-style environmental storytelling).

### 2.2 What the Prototype Is Not

- Not a mobile app (web-first, responsive layout is sufficient).
- Not a full open world — one level, clear boundaries, 5–8 points of interest.
- Not multiplayer.
- Not voice-first (voice is a stretch goal; text input is the baseline).

### 2.3 Core Gameplay Loop

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   EXPLORE  ──►  ENCOUNTER  ──►  CONVERSE/TRANSLATE  │
│      ▲                              │               │
│      │                              ▼               │
│      │                         RESOLVE ENCOUNTER    │
│      │                          (defeat / save)     │
│      │                              │               │
│      │                              ▼               │
│      └─────────  REWARD  ◄──  SPELLBOOK UPDATE      │
│            (lore, new area,     (new words learned,  │
│             item, party member)  spaced repetition   │
│                                  queue updated)      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

An **encounter** plays out as a multi-turn conversation. The enemy speaks (partly or fully in Spanish, depending on difficulty). The player must understand and respond, ideally in the foreign language, or in a mix of foreign and native if necessary. The Companion assists with translation but is progressively limited as the player advances. Encounters are resolved when the player demonstrates comprehension or produces correct translations — not by picking the right multiple-choice answer, but by engaging with the language.

The tone is Terry Pratchett absurdist: you're negotiating with an Imp about his coffee preferences, or debating philosophy with a Trepanner who's inflating his brain through a hole in his skull.

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENT (React)                    │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐  │
│  │ Game UI  │  │ Dialogue │  │ Spellbook │  │  Map   │  │
│  │ Renderer │  │  Panel   │  │   Panel   │  │  View  │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └───┬────┘  │
│       │              │              │             │       │
│       └──────────────┴──────┬───────┴─────────────┘       │
│                             │                            │
│                    ┌────────┴────────┐                    │
│                    │  Game State     │                    │
│                    │  Manager        │                    │
│                    │  (Zustand /     │                    │
│                    │   Context)      │                    │
│                    └────────┬────────┘                    │
│                             │                            │
│                    ┌────────┴────────┐                    │
│                    │  API Client     │                    │
│                    └────────┬────────┘                    │
└─────────────────────────────┼────────────────────────────┘
                              │ HTTP / WebSocket
┌─────────────────────────────┼────────────────────────────┐
│                      SERVER (Node.js / Express)          │
│                             │                            │
│          ┌──────────────────┼──────────────────┐         │
│          │                  │                  │         │
│  ┌───────┴──────┐  ┌───────┴──────┐  ┌───────┴──────┐  │
│  │  Game Logic  │  │  LLM         │  │  Persistence │  │
│  │  Engine      │  │  Orchestrator│  │  Layer       │  │
│  │              │  │              │  │  (JSON/DB)   │  │
│  └───────┬──────┘  └───────┬──────┘  └──────────────┘  │
│          │                 │                            │
│          │         ┌───────┴──────┐                     │
│          │         │  LLM Adapter │                     │
│          │         │  (Provider   │                     │
│          │         │   Agnostic)  │                     │
│          │         └───────┬──────┘                     │
│          │                 │                            │
└──────────┼─────────────────┼────────────────────────────┘
           │                 │
   ┌───────┴──────┐  ┌──────┴───────┐
   │  Content     │  │  LLM APIs    │
   │  Files       │  │  (OpenAI /   │
   │  (JSON/YAML) │  │   Anthropic /│
   │              │  │   Ollama /   │
   │              │  │   etc.)      │
   └──────────────┘  └──────────────┘
```

### 3.2 Client (React)

**Framework:** React 18+ with Vite as the build tool (fast HMR, minimal config).

**State management:** Zustand. It's lightweight, doesn't require providers/context wrappers, and serializes cleanly to JSON — which matters because game state needs to be saveable.

**Key UI components:**

| Component | Purpose |
|---|---|
| `GameRenderer` | Main viewport. Renders narrative text, location descriptions, and atmospheric prose. Handles the bilingual text display with colour-coded word classes (nouns/verbs/adjectives). |
| `DialoguePanel` | The conversation interface for encounters. Shows enemy speech, player input field, translation assists. Multi-turn chat-style layout. |
| `SpellbookPanel` | The player's learned vocabulary. Displays words as "spells" with their translation, mastery level, and next review date. Doubles as a practice/revision interface. |
| `MapView` | Node-based navigation between points of interest. Fog of war that clears as areas are explored. Simple SVG or canvas-based. |
| `CompanionOverlay` | The Companion's speech bubbles, translation tooltips, and contextual hints. |
| `TranslationInterface` | The core interaction widget. Provides "Translate Word" and "Translate Sentence" modes. Highlights words by class (colour-coded). Tap-to-hear pronunciation (TTS). |

**Bilingual text rendering** is a first-class concern. Every narrative paragraph needs to support:

- Inline word-level annotations (hover/tap to reveal translation).
- Sentence-level highlights for "must-translate" passages.
- Colour coding by part of speech (noun = blue, verb = red, adjective = green — configurable).
- A toggleable dual-language view.

This should be implemented as a custom `<BilingualText>` React component that takes structured data (not raw strings) from the server.

### 3.3 Server (Node.js / Express)

**Framework:** Express.js (or Fastify for performance). REST API with optional WebSocket upgrade for streaming LLM responses.

**Key server modules:**

#### 3.3.1 Game Logic Engine

Manages world state, encounter state, progression, and event triggers. This is the authoritative source of truth for what the player can do.

```
game-engine/
├── world-state.js        # Current location, explored areas, world events
├── encounter-manager.js  # Active encounter state, turn tracking
├── progression.js        # XP, level, unlocked areas, story flags
├── companion.js          # Companion availability, hint budget
└── events.js             # Scripted triggers (inflection point, collision)
```

World state is defined declaratively in content files (see §4) and mutated by player actions. The engine does not generate narrative — it decides *what should happen* and delegates *how to say it* to the LLM Orchestrator.

#### 3.3.2 LLM Orchestrator

The brain of the narrative system. Responsible for:

- Constructing prompts from game state + content templates + conversation history.
- Managing conversation context windows (summarising old turns to stay within token limits).
- Enforcing narrative consistency via system prompts and structured output schemas.
- Routing requests to the appropriate LLM adapter.

**Prompt architecture** (critical for quality):

```
SYSTEM PROMPT (persistent)
├── World lore summary (condensed)
├── Current location description
├── Character sheet for the active NPC/enemy
├── Tone directive ("Terry Pratchett absurdist humour")
├── Language rules (what % Spanish, which structures to use)
└── Output format schema (JSON with narrative + translation metadata)

CONVERSATION HISTORY
├── Summarised earlier turns (if long conversation)
└── Recent turns verbatim

USER MESSAGE
└── Player's input (possibly in Spanish)
```

**Structured output** is essential. The LLM should return JSON, not free text:

```json
{
  "narrative": "The Imp squints at you suspiciously over the rim of a tiny espresso cup.",
  "dialogue": {
    "speaker": "Imp",
    "native": "¿Y tú? ¿Qué quieres? No tengo tiempo para turistas.",
    "translation": "And you? What do you want? I don't have time for tourists.",
    "words": [
      { "word": "quieres", "pos": "verb", "root": "querer", "meaning": "you want" },
      { "word": "tiempo", "pos": "noun", "meaning": "time" },
      { "word": "turistas", "pos": "noun", "meaning": "tourists" }
    ]
  },
  "must_translate": true,
  "difficulty": 2,
  "hints_available": true,
  "encounter_state": "ongoing"
}
```

This separation means the client never has to parse natural language to figure out what to display. The LLM generates; the schema enforces structure.

#### 3.3.3 LLM Adapter (Provider-Agnostic)

An abstraction layer that normalises the interface across LLM providers:

```javascript
// llm-adapter/index.js
class LLMAdapter {
  constructor(provider, config) { /* ... */ }

  async chat(messages, options = {}) {
    // options: { temperature, maxTokens, responseFormat, stream }
    // Returns normalised response regardless of provider
  }

  async structuredChat(messages, schema, options = {}) {
    // Forces JSON output conforming to schema
    // Uses provider-specific features (OpenAI JSON mode,
    // Anthropic tool_use, Ollama grammar constraints)
  }
}

// Adapters for each provider
// llm-adapter/providers/openai.js
// llm-adapter/providers/anthropic.js
// llm-adapter/providers/ollama.js   (for local/self-hosted models)
```

**Why this matters:** You explicitly want flexibility here. This adapter means you can start with whichever API is cheapest/fastest for prototyping, then swap or A/B test providers without touching game logic. For the prototype, I'd recommend starting with OpenAI's API (widest structured output support, good TTS) and having Ollama as a local fallback for development without API costs.

#### 3.3.4 Persistence Layer

For the prototype, flat JSON files are sufficient. Each save is a single JSON blob:

```json
{
  "player": {
    "name": "...",
    "level": 3,
    "nativeLanguage": "en",
    "targetLanguage": "es",
    "xp": 450
  },
  "worldState": {
    "currentLocation": "market_square",
    "exploredLocations": ["market_square", "bone_dome_entrance"],
    "storyFlags": { "met_imp": true, "coffee_debate_won": false },
    "encounterStates": { /* ... */ }
  },
  "party": [
    { "id": "imp_001", "name": "Gerald the Imp", "relationship": 12, "conversations": 4 }
  ],
  "spellbook": {
    "words": [
      { "word": "querer", "translations": ["to want"], "pos": "verb",
        "sm2": { "interval": 4, "repetition": 3, "efactor": 2.5 },
        "nextReview": "2026-04-08", "timesReviewed": 5 }
    ],
    "sentences": [ /* ... */ ]
  }
}
```

Upgrade path: when you need multi-user support or server-side saves, migrate to SQLite (via `better-sqlite3`) or PostgreSQL. The JSON structure maps directly to a relational schema.

---

## 4. Content System

Content is authored separately from code. This is crucial for the long-term vision (multiple stories, community content, grant demos).

### 4.1 Content File Structure

```
content/
├── world/
│   ├── locations/
│   │   ├── market_square.yaml
│   │   ├── bone_dome.yaml
│   │   └── temple_ruins.yaml
│   ├── connections.yaml          # Which locations connect to which
│   └── world_events.yaml         # Triggered narrative events
├── characters/
│   ├── enemies/
│   │   ├── imp_coffee.yaml       # The coffee-obsessed Imp
│   │   ├── trepanner_phil.yaml   # Philosophy-spouting Trepanner
│   │   └── letharger_scout.yaml  # A distracting Letharger
│   ├── npcs/
│   │   └── companion.yaml
│   └── templates/
│       └── enemy_base.yaml       # Shared schema for enemies
├── encounters/
│   ├── imp_coffee_debate.yaml    # Scripted encounter flow
│   └── trepanner_brain.yaml
├── lore/
│   ├── inscriptions/             # Ancient text fragments (advanced)
│   ├── books/                    # In-world books the player can find
│   └── environmental.yaml        # Descriptions with hidden lore
├── language/
│   ├── vocabulary/
│   │   ├── level_1_basics.yaml   # Core nouns, verbs, adjectives
│   │   ├── level_2_market.yaml   # Market/food/commerce vocabulary
│   │   └── level_3_abstract.yaml # Abstract concepts, philosophy
│   ├── grammar/
│   │   ├── present_tense.yaml
│   │   └── basic_questions.yaml
│   └── difficulty_curves.yaml    # How language mix changes over time
└── narration/
    ├── style_guide.yaml          # Pratchett-esque tone rules for LLM
    └── narrator_voice.yaml       # Narrator personality definition
```

### 4.2 Character Definition Example

```yaml
# characters/enemies/imp_coffee.yaml
id: imp_coffee_001
name: Gerald
species: Imp
personality:
  tone: "snippy, pretentious, deeply invested in coffee culture"
  quirks:
    - "Rates everything on a scale of espresso shots (1-5)"
    - "Believes milk in coffee is a war crime"
    - "Speaks in increasingly complex Spanish when agitated"
  humour_style: "dry, Pratchett-esque, fourth-wall-adjacent"
appearance: >
  A foot-tall creature with skin the colour of over-roasted beans,
  wearing a tiny barista apron. He clutches an espresso cup that
  appears to be surgically attached to his hand.
combat_style: "verbal jousting about coffee"
difficulty: 1
language_profile:
  base_spanish_ratio: 0.25   # 25% of speech in Spanish
  escalation_rate: 0.05      # +5% per turn when agitated
  vocabulary_focus: ["food", "drinks", "opinions", "insults"]
  grammar_focus: ["present_tense", "basic_questions", "negation"]
defeat_condition:
  type: "comprehension_and_response"
  description: >
    Player must correctly order a coffee in Spanish,
    including specifying that they want it black (sin leche).
    Gerald respects anyone who takes coffee seriously.
saveable: true
relationship_unlocks:
  - at: 5   # After 5 conversations
    unlock: "Gerald teaches you coffee-related insults"
  - at: 10
    unlock: "Gerald reveals he was once a barista in the Dead Branch"
lore_fragments:
  - trigger: "relationship >= 10"
    content: >
      Gerald mutters something about 'the old tongue' — the language
      of the branch before it died. He says the coffee there was
      indescribable, literally: the word for it no longer exists.
```

### 4.3 Why YAML Over a Database

For the prototype: human-readable, version-controllable, easy to edit without tooling. Content authors (including yourself) can write characters and encounters in a text editor. The game engine loads these at startup and indexes them in memory. When the content library grows large enough to warrant a database, the YAML files become the seed data.

---

## 5. Translation & Language Engine

This is the pedagogical heart of the game.

### 5.1 Translation Pipeline

```
Player encounters text
        │
        ▼
┌───────────────────┐
│  Is it tagged as   │──── No ───► Display in English only
│  "must-translate"? │
└────────┬──────────┘
         │ Yes
         ▼
┌───────────────────┐
│  Display bilingual │
│  text with colour  │
│  coding            │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐     ┌──────────────────┐
│  Player taps       │────►│  Show word-level  │
│  sentence          │     │  breakdown with   │
│                    │     │  POS colours       │
└────────┬──────────┘     └──────────────────┘
         │
         ▼
┌───────────────────┐     ┌──────────────────┐
│  Player taps       │────►│  Show translation │
│  individual word   │     │  + pronunciation  │
│                    │     │  (TTS)            │
└────────┬──────────┘     └──────────────────┘
         │
         ▼
┌───────────────────┐
│  Word/sentence     │
│  added to          │
│  Spellbook         │
│  (SRS queue)       │
└───────────────────┘
```

### 5.2 Difficulty Scaling

The language mix is controlled by a single parameter: the **Spanish ratio**. This is the fraction of narrative/dialogue text that appears in Spanish.

| Stage | Spanish Ratio | What's in Spanish | Player Action |
|---|---|---|---|
| Beginner (prototype default) | 0.10–0.25 | Individual words, simple nouns, greetings | Translate Spanish → English |
| Intermediate | 0.25–0.50 | Full phrases, simple sentences | Translate both directions |
| Advanced | 0.50–0.75 | Most dialogue in Spanish, narrative mixed | Generate Spanish responses |
| Post-Inflection | 0.75–1.00 | Nearly everything in Spanish | Translate Spanish → English to maintain reality |
| Collision | 1.00 | Entire narrative in Spanish | Full comprehension required |

For the prototype, target the **Beginner** stage with hooks for scaling up. The LLM prompt includes the current Spanish ratio as a parameter, and the content files define vocabulary/grammar constraints per difficulty level.

### 5.3 Spaced Repetition System (Spellbook)

Every word and phrase the player encounters is tracked using a modified SM-2 algorithm (the algorithm behind Anki). Implementation options:

- **`dolphinsr`** — npm package implementing Anki's SM-2 variant. Drop-in solution.
- **`spaced-repetition.js`** — supports SM-2, SM-4, SM-5 variants.
- **Custom implementation** — SM-2 is simple enough (~50 lines) to implement directly, giving full control over the "gamification" layer.

**Recommendation:** Implement SM-2 directly. It's small, you'll want to customise the intervals to fit gameplay rhythm (e.g., a review might be triggered before a boss encounter rather than on a strict time schedule), and it avoids a dependency for minimal code.

The Spellbook UI frames this as magic: words are "spells" with power levels. Reviewing a word increases its power. Neglecting it lets it fade. This maps directly to the lore — the tension of holding two languages in mind is what generates power.

### 5.4 Translation Validation

When the player attempts a translation, how do we check correctness?

**Option A: LLM-as-judge.** Send the player's attempt to the LLM along with the reference translation and ask it to evaluate. Flexible, handles synonyms and paraphrasing, but adds latency and API cost per interaction.

**Option B: Fuzzy string matching + dictionary lookup.** Pre-compute acceptable translations for key phrases. Use Levenshtein distance and synonym sets. Fast and free, but brittle for open-ended responses.

**Option C: Hybrid (recommended).** Use Option B for word-level translations (cheap, instant feedback). Use Option A for sentence-level and open-ended dialogue responses (worth the latency for richer interaction). Cache LLM judgments for repeated phrases.

---

## 6. LLM Integration Strategy

### 6.1 Prompt Templates

Prompts are not hardcoded. They're assembled from templates stored alongside content:

```
prompts/
├── system/
│   ├── base.txt              # Core world rules, tone, format
│   ├── narrator.txt          # Narrator personality
│   └── language_rules.txt    # How to mix languages
├── encounter/
│   ├── greeting.txt          # First contact with an enemy
│   ├── dialogue_turn.txt     # Ongoing conversation
│   ├── defeat.txt            # Enemy defeated
│   └── save_to_party.txt     # Player saves enemy
├── companion/
│   ├── translate_word.txt
│   ├── translate_sentence.txt
│   └── hint.txt
└── narration/
    ├── location_enter.txt
    ├── lore_reveal.txt
    └── world_event.txt
```

Each template uses placeholder variables filled by the Game Logic Engine:

```
You are narrating a scene in the world of Parallang.

LOCATION: {{location.name}}
DESCRIPTION: {{location.description}}
CURRENT ENEMY: {{enemy.name}} — {{enemy.personality.tone}}
PLAYER LEVEL: {{player.level}}
SPANISH RATIO: {{difficulty.spanishRatio}}
VOCABULARY CONSTRAINTS: Only use words from: {{difficulty.allowedVocabulary}}
GRAMMAR CONSTRAINTS: {{difficulty.allowedGrammar}}

The player has just entered this area. Describe what they see and
initiate the encounter with {{enemy.name}}.

Respond in the following JSON format:
{ "narrative": "...", "dialogue": { ... }, ... }
```

### 6.2 Context Window Management

LLM context windows are finite. For a conversation-heavy game, this matters.

**Strategy:**

1. **System prompt** (~800 tokens): Always present. Contains world rules, tone, format.
2. **Character context** (~400 tokens): Active character sheet, condensed.
3. **Conversation history** (~2000 tokens): Last 6–8 turns verbatim.
4. **Summarised history** (~300 tokens): If conversation exceeds 8 turns, older turns are summarised by the LLM into a paragraph and prepended.
5. **Player context** (~200 tokens): Level, known vocabulary, story flags.

Total budget: ~3700 tokens of context, leaving ample room for generation in a 8K+ context window. This is conservative and works with even smaller models.

### 6.3 Provider Comparison for Prototype

| Provider | Strengths | Weaknesses | Prototype Cost (est.) |
|---|---|---|---|
| **OpenAI (GPT-4o-mini)** | Excellent structured output (JSON mode), good TTS API, fast | Paid, rate limits | ~$5–15/month for dev |
| **Anthropic (Claude Sonnet)** | Strong at roleplay and tone, tool_use for structured output | Paid, no native TTS | ~$5–15/month for dev |
| **Ollama (Llama 3, Mistral)** | Free, local, no rate limits, good for development | Weaker structured output, no TTS, needs decent GPU | $0 (hardware cost) |
| **DeepSeek** | Very cheap, surprisingly good at multilingual tasks | Less reliable structured output, latency variable | ~$1–5/month |

**Recommendation:** Develop against OpenAI's GPT-4o-mini (best structured output, built-in TTS for pronunciation). Use Ollama locally for rapid iteration without API costs. The adapter layer means switching is a config change.

---

## 7. Audio & Speech

### 7.1 Text-to-Speech (Narrator & Pronunciation)

The game spec calls for voiced narration and tap-to-hear pronunciation. Options:

**Option A: Browser Web Speech API (`speechSynthesis`).** Free, no server needed, works offline. Quality varies by OS/browser. Spanish voices are generally decent on modern systems. Good enough for pronunciation of individual words.

**Option B: LLM provider TTS (OpenAI TTS, ElevenLabs).** High quality, consistent, multiple voice styles (quirky narrator voice). Costs per character. Latency for generation.

**Option C: Hybrid (recommended).** Use Web Speech API for instant word-level pronunciation (tap a word, hear it immediately). Use provider TTS for narrator passages and key dialogue lines where quality and character matter. Cache generated audio aggressively.

### 7.2 Speech Recognition (Stretch Goal)

The spec mentions voice input for translation. The Web Speech API's `SpeechRecognition` interface works in Chromium browsers and supports Spanish. For the prototype, this is a stretch goal — text input is the baseline, with a microphone button that activates speech-to-text as an alternative input method. Do not build the core loop around it, since browser support is inconsistent (Chrome/Edge only, requires internet connection for cloud recognition).

---

## 8. Prototype Level Design: "The Crumbling Market"

A concrete level spec to build against.

### 8.1 Setting

A market square in a reality that's mid-collision. Spanish and English text literally coexist in the environment — shop signs are half-translated, merchants switch languages mid-sentence. The architecture is cracking, with glowing "strings" visible in the fissures (the dimensional stitches). Roots from a nearby dead branch are creeping through the cobblestones.

### 8.2 Points of Interest (6 nodes)

| Node | Name | Encounter | Vocabulary Focus |
|---|---|---|---|
| 1 | Market Entrance | Tutorial — Companion introduces mechanics | Greetings, pronouns |
| 2 | The Coffee Cart | Gerald the Imp (coffee debate) | Food, drinks, opinions |
| 3 | The Butcher's Stall | A Charcutier who insists everything is "jamón" | Meats, quantities, numbers |
| 4 | The Cracked Fountain | A Letharger trying to distract you with riddles | Time, directions, commands |
| 5 | The Old Bookshop | Lore-heavy NPC, advanced text passages | Abstract nouns, reading comprehension |
| 6 | The Rift | Mini-boss — a corrupted being speaking çùršęd mixed language | Review of all learned vocabulary |

### 8.3 Encounter Flow (Gerald the Imp)

```
TURN 1 — Gerald speaks (75% English, 25% Spanish)
  "Ah, another one. ¿Quieres café? No, wait, don't answer that.
   Everyone wants coffee. The question is whether you DESERVE coffee."
  [Player sees bilingual text, can tap Spanish words for translation]

TURN 2 — Player must respond
  [Companion hints: "He asked if you want coffee. Try responding in Spanish."]
  Player types: "Sí, quiero café"
  [Validation: correct ✓ — "quiero" and "café" added to Spellbook]

TURN 3 — Gerald escalates (60% English, 40% Spanish)
  "¿Con leche? Dime que no. DIME QUE NO."
  [Player must figure out he's asking about milk]

TURN 4 — Player responds
  Player types: "Sin leche"
  [Gerald is impressed. Encounter resolved.]

RESOLUTION — Gerald offers to join the party
  "Hmph. Maybe you're not completely hopeless. ¿Quieres que te
   acompañe? I know where the good beans are."
  [SAVE / LEAVE choice]
```

---

## 9. Project Structure

```
parallang/
├── client/                        # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GameRenderer.jsx
│   │   │   ├── DialoguePanel.jsx
│   │   │   ├── SpellbookPanel.jsx
│   │   │   ├── MapView.jsx
│   │   │   ├── CompanionOverlay.jsx
│   │   │   ├── TranslationInterface.jsx
│   │   │   └── BilingualText.jsx
│   │   ├── stores/
│   │   │   ├── gameStore.js       # Zustand store
│   │   │   └── spellbookStore.js
│   │   ├── hooks/
│   │   │   ├── useEncounter.js
│   │   │   ├── useTranslation.js
│   │   │   └── useSpeech.js
│   │   ├── utils/
│   │   │   ├── sm2.js             # Spaced repetition algorithm
│   │   │   └── textParser.js      # Bilingual text processing
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── game.js            # Game state endpoints
│   │   │   ├── encounter.js       # Encounter/dialogue endpoints
│   │   │   └── spellbook.js       # Vocabulary endpoints
│   │   ├── engine/
│   │   │   ├── world-state.js
│   │   │   ├── encounter-manager.js
│   │   │   ├── progression.js
│   │   │   └── companion.js
│   │   ├── llm/
│   │   │   ├── orchestrator.js
│   │   │   ├── prompt-builder.js
│   │   │   └── adapters/
│   │   │       ├── openai.js
│   │   │       ├── anthropic.js
│   │   │       └── ollama.js
│   │   ├── language/
│   │   │   ├── translator.js      # Translation validation
│   │   │   ├── sm2.js             # Server-side SRS
│   │   │   └── difficulty.js      # Difficulty scaling logic
│   │   └── persistence/
│   │       └── save-manager.js
│   ├── package.json
│   └── server.js
├── content/                       # Game content (YAML)
│   ├── world/
│   ├── characters/
│   ├── encounters/
│   ├── language/
│   ├── lore/
│   └── narration/
├── prompts/                       # LLM prompt templates
│   ├── system/
│   ├── encounter/
│   ├── companion/
│   └── narration/
├── package.json                   # Monorepo root
└── README.md
```

---

## 10. Development Roadmap

### Phase 1: Foundation (Weeks 1–2)

**Goal:** Skeleton app running with a single hardcoded encounter.

| Task | Details |
|---|---|
| Scaffold monorepo | Vite + React client, Express server, shared content directory |
| Implement LLM adapter | OpenAI adapter + Ollama adapter, with the provider-agnostic interface |
| Build prompt builder | Template loading, variable substitution, JSON schema enforcement |
| Create Gerald the Imp | Write character YAML, encounter YAML, and prompt templates |
| Basic dialogue UI | Text display, input field, send button, response rendering |
| Wire it end-to-end | Player types → server → LLM → structured response → rendered in UI |

**Milestone:** You can have a conversation with Gerald the Imp in a browser window.

### Phase 2: Language Engine (Weeks 3–4)

**Goal:** Translation mechanics are functional and pedagogically sound.

| Task | Details |
|---|---|
| BilingualText component | Colour-coded POS rendering, tap-to-translate, tap-to-hear |
| Translation validation | Hybrid validator (fuzzy match for words, LLM-as-judge for sentences) |
| Spellbook system | SM-2 implementation, word storage, review scheduling |
| Spellbook UI | Card-based vocabulary viewer with mastery indicators |
| Difficulty scaling | Spanish ratio parameter, vocabulary/grammar constraints in prompts |
| Companion translation | "Translate Word" / "Translate Sentence" buttons wired to LLM |

**Milestone:** Player can learn, review, and be tested on vocabulary through gameplay.

### Phase 3: World & Navigation (Weeks 5–6)

**Goal:** The full Crumbling Market level is explorable.

| Task | Details |
|---|---|
| Map system | Node graph from `connections.yaml`, SVG map rendering, fog of war |
| Location rendering | Load location descriptions from YAML, LLM-enhanced atmosphere |
| All 6 encounters | Gerald (done), Charcutier, Letharger, Bookshop NPC, Rift boss |
| Save/load system | JSON persistence, save slots |
| Party system | Save defeated enemies, load party members for revisit conversations |
| Lore fragments | Hidden text passages with advanced vocabulary, discoverable items |

**Milestone:** Complete playable prototype level.

### Phase 4: Polish & Audio (Weeks 7–8)

**Goal:** The prototype feels good to use.

| Task | Details |
|---|---|
| TTS integration | Web Speech API for words, provider TTS for narrator (if budget allows) |
| Sound design | Ambient audio, UI sounds (minimal — even a few sounds add a lot) |
| Visual polish | Typography, colour palette, transition animations |
| Forced repetition | Pre-encounter vocabulary review (Spellbook drill before boss fights) |
| Onboarding | Philosophy statement, tutorial encounter at Market Entrance |
| Playtesting | 3–5 external testers, iterate on pacing and difficulty |

**Milestone:** Demo-ready prototype suitable for grant applications or user testing.

---

## 11. Technical Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **LLM output inconsistency** — LLM ignores Spanish ratio or generates incorrect Spanish | High | Structured JSON output with schema validation. Post-processing layer that checks Spanish ratio and rejects/retries non-conforming responses. Include few-shot examples in prompts. |
| **Latency** — LLM response time breaks conversational flow | Medium | Stream responses via WebSocket (show text appearing word-by-word). Pre-generate likely responses for scripted encounters. Cache repeated interactions. |
| **Translation accuracy** — LLM generates incorrect Spanish | High | For the prototype vocabulary set, pre-validate all target translations and store them in content files. LLM generates context and framing; actual translation pairs are sourced from vetted content. |
| **Cost scaling** — API costs grow with usage | Medium | Use smaller models (GPT-4o-mini, Haiku) for routine interactions. Reserve larger models for complex generation. Aggressive caching. Ollama for development. |
| **Scope creep** — Trying to build too much lore/world into the prototype | Medium | The content system is designed for expansion, but the prototype level is strictly scoped to 6 nodes. Resist adding more until the core loop is proven. |

---

## 12. Long-Term Alignment

Every technical choice above is made with the full Parallang vision in mind:

- **Content-as-data (YAML)** scales to multiple levels, worlds, and languages. Community content becomes possible. New "stories" are new content packs, not new code.
- **Provider-agnostic LLM layer** means you can switch to cheaper/better models as the landscape evolves, or self-host for cost control at scale.
- **Structured prompts** enforce the narrative style and language rules regardless of which LLM is powering it. The game's identity lives in the content and templates, not in model-specific tuning.
- **The Spellbook (SRS)** is portable — it works whether the player is in the Crumbling Market, Angkor Wat, or the Bone Dome.
- **The encounter system** generalises: Gerald the Imp and a corrupted chaos being use the same underlying dialogue engine with different character sheets.
- **The difficulty curve** (Spanish ratio) applies to the entire game. The Inflection Point and Collision are just specific ratio thresholds with narrative triggers, not separate systems.

The prototype proves the core thesis: that conversational encounters within an immersive narrative can teach a language. Everything else — more levels, more languages, voice input, mobile app, survival mechanics — is expansion, not rearchitecture.

---

## Appendix A: Key Dependencies

| Package | Purpose | Notes |
|---|---|---|
| `react` + `vite` | Frontend framework + build tool | |
| `zustand` | State management | Serialisable, minimal boilerplate |
| `express` | Server framework | Or `fastify` for performance |
| `openai` | OpenAI API client | Via LLM adapter |
| `@anthropic-ai/sdk` | Anthropic API client | Via LLM adapter |
| `ollama` | Local LLM client | For development |
| `js-yaml` | YAML parsing for content files | |
| `zod` | Schema validation for LLM outputs | |
| `ws` | WebSocket server for streaming | |
| `better-sqlite3` | Future persistence upgrade | Not needed for prototype |

## Appendix B: Reference Reading

- Ian Bicking's design notes on *Intra*, an LLM-driven text adventure — covers prompt architecture pitfalls, LLM fixation, and the importance of authorial intent in generated narratives
- Microsoft's TALE Suite (Text Adventure Learning Environment) — academic framework for LLM game agents
- SuperMemo SM-2 algorithm documentation — the spaced repetition algorithm underlying the Spellbook system
- *Deflanderization for Game Dialogue* — research on maintaining character voice consistency in LLM-generated dialogue
