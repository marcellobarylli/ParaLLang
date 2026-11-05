# Round 016 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), journal); it is not needed to implement this round.

- **Design source:** backlog D4 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); round
  [004](../004/architecture.md) (the Expo app).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `mobile/package.json`, `package-lock.json`.

## Goal (pre-run)

`npx expo-doctor` in `mobile/` passes 20/20 again. Since 2026-11-05 it reports 19/20 because upstream released
`expo` 58.0.23, `jest-expo` 58.0.14 and `react-native-safe-area-context` 5.11.x, which the installed SDK now expects.
Nothing in the app changes behaviour.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Use `npx expo install --fix`** (the SDK's expected versions) rather than pinning by hand or excluding the
   packages from the check.
2. **No Codex critique.** Three version bumps dictated by the SDK leave no design choice to pressure-test, and
   Codex's usage limit is reached; its quota goes to round 015's live runs.
3. **No live LLM runs:** no gameplay, prompt or content change.

## Second opinion (pre-run)

None (decision 2).

## Tests (pre-run)

- `cd mobile && npx expo-doctor`: 20/20.
- `npm run test:mobile`: 22/22 as before.
- `cd mobile && npx expo export --platform ios --output-dir /tmp/pl-export`: succeeds.
- `node --test server/test/*.test.js` 101/101 and `npm exec --workspace client -- vitest run` 12/12 plus the
  client build, unchanged (shared root lockfile).
- Not here: the updated app in the iOS Simulator (owner).

## Outcome (2026-11-05)

Built as designed, with no Amendment. `npx expo install --fix` moved `expo`, `jest-expo` and
`react-native-safe-area-context` to SDK 58's expected versions; expo-doctor 20/20, mobile 22/22, iOS export ok,
server 101/101, web client 12/12 and build. Not checked in the iOS Simulator. See [findings](findings.md).
