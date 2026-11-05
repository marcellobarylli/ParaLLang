# Round 042 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** `prototype.md` Phase 4 (visual polish). Backlog C3 left one item after rounds 034–035: "a
  custom font (asset and licence check)".
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** the following, plus tests. No server, content or prompt change.
  - `expo-font` ~58.0.11 and `@expo-google-fonts/literata` ^0.4.3 (`mobile/package.json`);
  - `fonts`, `DisplayFont`, `useDisplayFont` and `Title` in `mobile/src/components/ui.js`; `App.js`;
  - the nine screen and section titles in seven components; `jest.setup.js`; `mobile/THIRD_PARTY_NOTICES.md`.

## Goal (pre-run)

Give the app's screen and section titles a typeface of their own, with a licence that allows bundling, while body
text stays as legible as before.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The font is Literata Bold** (Google Fonts, from the npm package `@expo-google-fonts/literata`). The font is
   under the SIL Open Font License 1.1 and the package code is MIT. It is a bookish serif for a game about *The
   Journey*, a bookworm and words.
   - **Where it is used:** screen and section titles only. Those are the Header, the statement screen, the Map
     location, Party, Saves, Spellbook, Review, and the two Spellbook sections.
   - **Where it is not:** body text, dialogue, buttons, inputs, card titles and the review word stay on the system
     font.
   - **Size:** only the 700 face is bundled (subpath import, 256 KB). The 700 face covers every Italian and Spanish
     accented letter, ñ, ¿, ¡, curly quotes, the em dash and the ellipsis (critique 1.9, by the critic's parse of
     the file).
2. **Loaded at runtime with `expo-font`** (`useFonts`), because Expo Go ignores config plugins. The `expo-font`
   plugin entry that `npx expo install` added to `app.json` is removed: without `fonts` it does nothing (critique
   1.2). The app never waits for the font. Until it loads, or if it fails, each title keeps the system font at its
   own weight (critique 1.1).
3. **Licence notice.** `mobile/THIRD_PARTY_NOTICES.md` carries the font's copyright and the OFL text (critique 1.8).
   An in-app credits line is left to the owner.
4. **Critique by a Claude subagent** (Codex at its usage limit until 20:35 UTC).

## Design (pre-run)

1. **`ui.js`.** `fonts.display = 'Literata_700Bold'`. `useDisplayFont()` wraps `useFonts({ Literata_700Bold })` and
   returns true once the font has loaded. Readiness reaches the titles through React context (`DisplayFont`), set
   by App, so there is no module state and no test hook (critique 1.4). Outside a provider, a title uses the system
   font. `<Title style>` renders a `Text` with role `heading` (overridable; other props passed through). Once the
   font is ready it appends `{ fontFamily, fontWeight: 'normal', fontStyle: 'normal' }`, since only one upright
   face is loaded.
2. **Titles.** Each title keeps its own style (size, colour, its weight today: 800 or 700). The Spellbook heading
   block and the Saves title shrink and wrap, rather than push the Return button out (critique 1.6). No
   `numberOfLines` and no `lineHeight` on titles.
3. **Jest.** `expo-font` is mocked in `jest.setup.js` (`useFonts` → `[false, null]`), so no App test loads a font
   (critique 1.3).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 4df600a3…; Claude subagent (general-purpose, claude-opus-5-5), read-only;
raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A blanket weight-800 fallback changes the 700 titles | + | Accept: titles keep their weights; Title only drops the weight with Literata | **Accepted** (autonomous, pending owner review) | Decision 2, Design 1–2 |
| 1.2 | Error | The `expo-font` plugin entry does nothing | + | Accept: removed from app.json | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.3 | Risk | `useFonts` loads asynchronously in every App test | + | Accept: mocked in jest.setup | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.4 | Risk | A module flag leaks between tests and ships a test hook | + | Accept: React context | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.5 | Risk | Importing the package root bundles all faces | + | Accept: the test fails on any other import; the export bundles exactly one font file | **Accepted** (autonomous, pending owner review) | Tests |
| 1.6 | Risk | A wider serif may wrap or push buttons with Dynamic Type | + | Accept: shrink and wrap on Spellbook and Saves; Simulator open item | **Accepted** (autonomous, pending owner review) | Design 2, open items |
| 1.7 | Suggestion | Keep `role="heading"` and pass props | + | Accept: default role, props passed, `getByRole('heading')` tested | **Accepted** (autonomous, pending owner review) | Design 1, Tests |
| 1.8 | Suggestion | Record the OFL obligations | + | Accept: THIRD_PARTY_NOTICES.md; in-app credits to the owner | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.9 | Suggestion | Glyph coverage is fine; write it down, maybe test it | 0 | In part: recorded from the critic's parse; no coverage test (no font parser in the repo; two Latin packs) | **Accepted in part** (autonomous, pending owner review) | Decision 1 |

**Deferred / optional:** no `fontStyle: 'italic'` reaches a Title (`fontStyle: 'normal'` added); no `lineHeight` on
titles (kept); card titles stay on the system font (stated in Decision 1 and tested); the Expo Go reason sits next
to Decision 2.

Net change from plan-v1: per-title weights kept, the plugin entry removed, React context instead of a module flag,
expo-font mocked under jest, wrapping titles, a licence notice.

## Tests (pre-run)

- `font.test.js`:
  - a Title outside the provider keeps its own style;
  - inside a ready provider, a Title gets Literata, weight `normal` and style `normal`; it is found by
    `getByRole('heading')`;
  - `useDisplayFont` asks for the 700 face only; titles switch on load and stay on the system font on failure;
  - `LICENSE_FONT` and `THIRD_PARTY_NOTICES.md` name OFL 1.1; the only `@expo-google-fonts` import in `src/` and
    `App.js` is `literata/700Bold`; the font name appears only in `ui.js`;
  - nine titles go through Title, and the only `role="heading"` Texts left are the card titles and the review word.
- Theme test: `ui.js:display` is a modifier.
- All suites, expo-doctor, and the iOS export bundles exactly one font file (md5 of the 700 ttf).

## Outcome (2026-11-05)

Built as designed, with no Amendments. The nine titles use Literata Bold once it has loaded, and keep the system
font until then. Mobile 110/110, server 163/163, web client 12/12 and build, expo-doctor 20/20, and the iOS export
holds one font file. See [findings](findings.md).
