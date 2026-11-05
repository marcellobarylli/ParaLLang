# Round 016 findings

## Question

Does `npx expo install --fix` bring `mobile/` back to a clean `expo-doctor` without breaking the app's tests, its
iOS bundle, or the server and web client?

## Finding

Yes. The three packages upstream moved on 2026-11-05 are now at the versions SDK 58 expects (`expo` ~58.0.23,
`jest-expo` ~58.0.14, `react-native-safe-area-context` ~5.11.1); `expo-doctor` passes 20/20 (19/20 before), and every
test suite and build passes unchanged. No source file changed.

## Method

- Built to [architecture.md](architecture.md) (plan [v1](trail/plan-v1.md), no critique by decision).
- `cd mobile && npx expo install --fix`, then the round's Tests list, on the Linux compute node (no Simulator).

## Results

| Check | Before | After |
|---|---|---|
| `npx expo-doctor` | 19/20 (3 packages out of date) | 20/20 |
| mobile jest | 22/22 | 22/22 |
| `npx expo export --platform ios` | ok | ok |
| server `node --test` | 101/101 | 101/101 |
| web client vitest, build | 12/12, ok | 12/12, ok |

npm still reports 24 audit advisories (1 low, 23 moderate) in the mobile tree, as before; not addressed here
(`npm audit fix --force` would leave the SDK's versions).

## Decision

Keep the update. Backlog D4 is done apart from the Simulator check.

## Evidence

`mobile/package.json` and `mobile/package-lock.json` in the round's build commit; journal rows 6–7.

## Claim boundary

Tested with jest, expo-doctor and an iOS export on Linux. The updated app has not run on a device or in the iOS
Simulator; `react-native-safe-area-context` 5.11 is a minor update and is the one to watch there.

## Open items

1. Owner, Simulator: open the app after the update (safe-area insets on the map and encounter screens).
2. Upstream will keep releasing patches; expo-doctor can fall to 19/20 again without any repo change.
