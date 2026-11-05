# Round 027 plan v1: onboarding (backlog C2)

## Goal
The app greets a first-time player with the game's philosophy statement (parallang.md, Hub: "The players should be
greeted by the game's philosophy"), before the map and the Market Entrance tutorial (prototype.md §Phase 4 table:
"Onboarding | Philosophy statement, tutorial encounter at Market Entrance"). The tutorial exists (round 009); this
round adds the statement screen. No LLM, no prompt or encounter change.

## Design
1. **Content** `content/narration/onboarding.yaml` (shared by all packs, English):
   - `title: "Before you enter"`
   - `paragraphs`: (a) the owner's statement verbatim: "We believe that language learning shouldn't be too rigid or
     even necessarily structured. Learning should happen organically, with the learner picking up knowledge almost
     passively and accumulating it over time. Immersion is important for engagement and retention. This is how
     children learn their mother tongue, by being thrown into scenarios and exposed to the language passively."
     (b) from the owner's sub-note "Repetition should still be a structured element": "One thing stays structured:
     repetition. Words you meet go into your Spellbook, and it brings them back for review when they are due."
     (c) one sentence in the game's tone that hands over to the map: "The Crumbling Market is just through the
     archway. The archway has opinions."
   - `begin_label: "Enter the market"`.
   Zod schema (strict): title, paragraphs (1..6 non-empty strings), begin_label; loaded by `loadGameContent` as
   `onboarding`; a missing or invalid file stops the load (like the style guide).
2. **Server** `GET /api/onboarding` → `{ onboarding: { title, paragraphs, beginLabel } }`. No learner header needed;
   PARALLANG_TOKEN applies as to every /api route. `service.getOnboarding()`.
3. **Mobile**
   - `api.getOnboarding()`.
   - Store: on `initialize`, after the learner and world load, read AsyncStorage `parallang.onboardingSeen`. If it is
     absent, call `getOnboarding()`; on success set `onboarding` and `view: 'onboarding'`; on failure stay on the map
     (the statement must never block play). `finishOnboarding()` writes the flag ("1") and sets `view: 'map'`.
     Fetch onboarding in parallel with world/spellbook/party but tolerate its failure separately.
   - `OnboardingPanel` component: heading, paragraphs, one primary button (`beginLabel`), scrollable; in App.js shown
     when `view === 'onboarding'`; the Header's Map/Party/Spellbook actions are hidden on that view (Spellbook button
     gets `onSpellbook=null` → Header renders it only when a handler is given).
   - Seen flag is per device, not per learner and not in the server save (no schema change). A reinstall shows it
     again; that is acceptable.
4. **Web client**: frozen, unchanged (no onboarding).

## Tests
- Server: the loader parses onboarding.yaml; invalid shape (empty paragraphs) rejects; `GET /api/onboarding`
  through `api()` returns the content; with PARALLANG_TOKEN set, it is 401 without the header.
- Mobile: first launch (no flag) shows the panel with the statement and the button; pressing it writes the flag and
  shows the map; with the flag set, initialize goes straight to the map and never calls `getOnboarding`; a failing
  `getOnboarding` lands on the map with no error banner; header actions hidden on the onboarding view.
- Full suites: server, mobile, web client and build; expo-doctor; iOS export.

## Not here
Simulator check of the screen (layout, scrolling, VoiceOver) → owner. A way to re-open the statement later
(deferred). Translating the statement into the target language (deferred; the owner's text is English).
