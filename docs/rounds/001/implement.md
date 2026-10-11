Implemented round 001’s complete Phase 2 learning loop.

- Added referenced canonical vocabulary and authored Gerald objectives.
- Replaced substring victory with structured, authoritative grading.
- Added learner-scoped encounters, atomic JSON Spellbook persistence, durable receipts, stale-version handling, SM-2 reviews, and assistance limits.
- Added Spellbook/review UI, accessible translation controls, feedback, recovery states, and browser Spanish pronunciation.
- Updated OpenAI/Ollama structured-output contracts, prompts, configuration, and startup documentation.
- Removed `espresso` as an overly broad `café solo` answer after checking [RAE](https://dle.rae.es/caf%C3%A9) and [Cambridge](https://dictionary.cambridge.org/es/diccionario/ingles-espanol/coffee).
- Chose schedule-derived mastery labels: discovered, relearning, learning, and mastered at three successful repetitions. The required top-level `setup = "npm ci"` was already present, so orchestration configuration remained untouched.

Validation:

- `npm ci`: succeeded using an isolated cache.
- Server tests: 22/22 passed.
- Client tests: 8/8 passed.
- Client production build: passed, 40 modules transformed.
- Persisted simulation: a quality-5 `sin leche` review scheduled the expected next-day UTC review and recovered the identical timestamp after service recreation.
- `git diff --check`: clean; round documentation remained unchanged.

Skipped as directed:

- Live OpenAI/Ollama evaluation: no provider, credentials, endpoint, or `.env` was configured.
- Physical pronunciation quality: requires an owner device/browser.
- Broad suites, deployment, and `npm audit`: outside the selected test plan. `npm ci` reported 20 dependency advisories; no automatic dependency rewrites were attempted.
