# Round 016 plan v1: Expo patch and minor updates (backlog D4)

**Goal.** `npx expo-doctor` passes 20/20 again in `mobile/`. Since 2026-11-05 it reports 19/20: the installed Expo
SDK 58 wants `expo` ~58.0.23 (has 58.0.22), `jest-expo` ~58.0.14 (has 58.0.13) and
`react-native-safe-area-context` ~5.11.1 (has 5.10.1). Nothing in the repo changed; upstream released.

**Change.** `npx expo install --fix` in `mobile/` (it writes the versions the SDK expects into `mobile/package.json`
and the root lockfile). No source changes expected.

**Checks.** `npx expo-doctor` 20/20; mobile jest 22/22; `npx expo export --platform ios` succeeds; server 101/101 and
web client 12/12 and build unchanged (the lockfile is shared by the workspaces). No gameplay or content change, so
no live LLM runs.

**Not checked here.** The updated app in the iOS Simulator (Needs owner).
