# Round 042 findings

## Question

Can the app's titles get a typeface of their own (the C3 remainder, "a custom font, asset and licence check") that
is licensed for bundling, works in Expo Go, and never delays or breaks the app?

## Finding

Yes, in tests and in the iOS bundle. The nine screen and section titles render in Literata Bold once it has loaded.
The font is under the SIL Open Font License 1.1, and only that one 256 KB face is bundled. Everything else stays on
the system font, and so do the titles until the font has loaded, or if it fails.

The critique found two errors in the first plan:
- its weight-800 fallback would have changed the four titles that use 700 today;
- the `expo-font` plugin entry added by `npx expo install` did nothing, since it had no `fonts` and Expo Go ignores
  plugins.

Both were fixed before the build.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 9 findings, 8 accepted and 1 in part.
- A draft was in the working tree before the critique returned (journal row 5).
- Installed `expo-font` ~58.0.11 and `@expo-google-fonts/literata` ^0.4.3 with `npx expo install`, then removed
  the plugin entry it added.
- The iOS export holds exactly one font file, with an md5 equal to `Literata_700Bold.ttf`.
- Linux compute node, no LLM calls. The font has not been seen on screen (no Simulator).

## Results

| Check | Before | After |
|---|---|---|
| mobile jest | 105/105 | 110/110 (font 5) |
| server, web vitest, web build | 163/163, 12/12, ok | unchanged |
| `npx expo-doctor` | 20/20 | 20/20 |
| iOS export | ok | ok, one font file (260 884 B) bundled |

## Decision

Keep it. C3 is done.

## Evidence

The round's build commit; journal rows 4–8. Files: `mobile/src/components/ui.js` (`Title`, `useDisplayFont`),
`mobile/src/__tests__/font.test.js`, `mobile/THIRD_PARTY_NOTICES.md`.

## Claim boundary

Tests and bundle only. Nobody has seen the font on screen, at large Dynamic Type sizes, or in VoiceOver. The glyph
coverage figure comes from the critic's parse of the font file. It was not re-checked here, because the repo has no
font parser.

## Open items

1. Owner, Simulator: look at every title in Literata (Header, statement, Map, Party, Saves, Spellbook and its two
   sections, Review). Check them at the largest accessibility text size and with the longest location name ("The
   Butcher's Stall"). Check that the Spellbook and Saves titles wrap rather than push the Return button.
2. Owner: keep Literata or choose another face. Decide whether the app needs an in-app credits line for the font
   (the OFL notice is in `mobile/THIRD_PARTY_NOTICES.md`).
