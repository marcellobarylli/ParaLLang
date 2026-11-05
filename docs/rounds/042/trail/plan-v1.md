# Round 042 plan v1: a display font for titles (C3 remainder)

C3 (rounds 034–035) left one item: "a custom font (asset and licence check)". Codex is at its usage limit; no live
LLM call is needed (app only).

## Decisions (autonomous, pending owner review)

1. **Literata Bold** (Google Fonts, SIL Open Font License 1.1, via `@expo-google-fonts/literata` from npm) for
   screen and section titles only: a bookish serif for a game about *The Journey*, a bookworm and words. Body text,
   dialogue, buttons, inputs and the target-language word in reviews stay on the system font (legibility, Dynamic
   Type behaviour unchanged). Only the 700 weight is bundled (subpath import, ~360 KB), not the 18-file family.
2. **Loaded at runtime with `expo-font`** (`useFonts`), since Expo Go ignores config plugins. The app never waits
   for it: until it is loaded, or if loading fails, titles render in the system font at weight 800, as today.

## Design

1. `ui.js`: `fonts.display = 'Literata_700Bold'`; a `<Title style>` component that applies `fontFamily` only when
   the font is ready, and otherwise `fontWeight: '800'`. Readiness comes from a tiny module flag set by
   `useDisplayFont()` (a hook App calls once: `useFonts({ Literata_700Bold })`), plus a subscription so mounted
   titles re-render when it flips. (An unregistered `fontFamily` on iOS logs "Unrecognized font family" in dev.)
2. Titles moved to `<Title>`: Header (app title), Onboarding title, Spellbook / Saves / Review screen titles, Map and
   Party titles, Spellbook section headings. With a custom family, `fontWeight` is dropped (iOS would synthesize or
   ignore it).
3. Theme test: `Title` styles are sized like every other text style; the font name appears only in `ui.js`.

## Tests

- `<Title>` without the font: system font, weight 800; after `setDisplayFontReadyForTests(true)`: `fontFamily`
  Literata_700Bold and no `fontWeight`; a mounted title re-renders when the flag flips.
- `useDisplayFont` maps `useFonts` → ready on load; an error leaves it false.
- The ttf is the OFL font (licence file present in the package), and only the 700 file is required in `src/`.
- All suites; expo-doctor; the iOS export bundles exactly one `.ttf` (Literata_700Bold).
