# Round 027 findings

## Question

Can the app greet a first-time player with the game's philosophy statement (backlog C2, `parallang.md` Hub), once,
without ever blocking startup, and with the owner's text kept apart from authored lines?

## Finding

Yes, as far as jest can show. The statement is content (`content/narration/onboarding.yaml`), served by
`GET /api/onboarding`, and shown by the app's `OnboardingPanel` on first launch, over the map, with the header's
actions hidden. "Enter the market" opens the map and writes `parallang.onboardingSeen`. A returning player never
fetches it; a failed fetch skips it silently; a failed flag write still reaches the map; a screen opened during
startup is not replaced. The owner's statement matches `parallang.md` byte for byte (tested).

## Method

- Planned in [plan-v1](trail/plan-v1.md); critiqued by a fresh Claude subagent instead of Codex (at its usage limit;
  [critique 1](trail/critique-1.md), 10 findings, 3 Errors, all accepted or accepted in part); built to
  [architecture.md](architecture.md).
- Tests on the Linux compute node: `node --test server/test/*.test.js`, `npm run test:mobile`, the web client's
  vitest and build, `npx expo-doctor`, `npx expo export --platform ios`. No live LLM runs (decision 4): nothing the
  LLM sees changed.

## Results

| Check | Before | After |
|---|---|---|
| server `node --test` | 135/135 | 138/138 (`onboarding.test.js`: content, loader rejections incl. a missing file, route and 401) |
| mobile jest | 37/37 | 45/45 (`onboarding.test.js`: 7 store cases, 1 App case) |
| web client vitest, build | 12/12, ok | 12/12, ok (unchanged, frozen) |
| `npx expo-doctor` | 20/20 | 20/20 |
| `npx expo export --platform ios` | ok | ok |

Critique 1.3 mattered: before the existing fakes were changed, the 37 old tests passed with the new store while
every one of them silently took the failure path (no `getOnboarding` in the fakes, an empty AsyncStorage). They now
seed the flag (returning players) and the success path has its own tests.

## Decision

Keep it. Backlog C2 is done apart from the Simulator check.

## Evidence

The round's build commit; journal rows 6–7; `server/test/onboarding.test.js`, `mobile/src/__tests__/onboarding.test.js`.

## Claim boundary

Tested with jest and an iOS export on Linux. Layout, scrolling, VoiceOver focus and Dynamic Type were not seen. The
two notes are authored text, not the owner's. The mobile client sends no `X-ParaLLang-Token` (true of every route),
so against a token-protected server the statement is skipped like any failed fetch.

## Open items

1. Owner, Simulator: first launch (delete the app or clear its storage): the statement screen, its scrolling, the
   button, the map after it, and no statement on the next launch. VoiceOver: whether focus starts on the heading
   (critique 1.8; no focus call was added).
2. Owner: review the two authored notes in `content/narration/onboarding.yaml` and the title "Before you enter".
3. Deferred: a way to reopen the statement (e.g. from the map); translating it into the target language.
