# Critique 1 (substitute for Codex): inscriptions

- **Dispatched:** 2026-11-06 04:32:40 UTC
- **Returned:** 2026-11-06 04:37 UTC (notification; 263 s run)
- **Model:** a fresh general-purpose subagent (Claude, claude-opus-5-5), read-only by instruction, file access to the
  repo; Codex was unavailable (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** an adversarial review of `plan-v1.md` naming the relevant files (content loader, world, learning
  service, routes, fragments test, MapPanel, Spellbook, store, App) and asking for answer leaks, stale app state,
  broken tests, content errors in it/es, and cuts; at most 12 numbered findings with type and fix
- **Reviewed input:** `plan-v1.md`, sha256 89166f52…, HEAD d94e860, working tree: docs/rounds/082/ new and the draft
  `content/languages/{it,es}/lore/inscriptions.yaml` (untracked, written while the critique ran)
- **Findings:** 8 (2 Errors, 4 Gaps, 1 Optional, 1 Cut)

## Raw output (verbatim)

```text
I found 8 problems with plan v1. The two most serious are in the content: the Rift inscription teaches a wrong answer to the Rift boss's own objective, and two inscriptions show near-forms of answers the player has to produce. Neither is caught by the leak checks the plan copies from the fragments test.

The inscription files already exist as untracked drafts (`content/languages/{it,es}/lore/inscriptions.yaml`), and their texts differ from the plan's Content section. I checked the files. The only thing I wrote was a throwaway script, `/tmp/inscheck.mjs`, outside the repo; nothing in the repo changed.

1. **Error: the Rift inscription teaches an answer the Rift boss will reject.** The `seam` text glosses "smetti" / "deja de" as "stop (doing something)" and "subito" / "enseguida" as "at once". It sits on the Rift's own map card. At that same location the `stop_now` objective says "Tell it to stop, now, in Italian" (it `the_rift_errata.yaml:65-71`, es `:68-71`). Its required groups are fermati/fermo/basta (es quieto/basta) plus adesso/ora (es ahora), and they are enforced without the model (`learning-service.js:747`). So "Smetti subito!", which this inscription just taught, always fails. The fountain's "Tell it to stop" (`cracked_fountain_letharger.yaml:38`) has the same trap.
   - The meanings check misses it because it compares whole strings split only on `[,;]` (`lore-fragments.test.js:22`), so "stop (doing something)" is not equal to "stop".
   - **Fix:** rewrite the last clause without a stop or now synonym, e.g. it "poi tappati le orecchie", es "y luego tápate los oídos" (neither contains a pack form). In the inscription meaning check, strip parentheses and a leading "to " before comparing.

2. **Error: near-forms of answers the player must produce appear at all times.**
   - it `chopping_block`: "Nessuna scusa…" is the feminine of "nessuno". The player must produce "Nessuno" in Italian at the Bookshop (`old_bookshop_bookworm.yaml:52-54`) and the Rift (`the_rift_errata.yaml:91-94`).
   - it/es `keystone`: "come" / "como" is the first word of the tutorial answer "come ti chiami" / "cómo te llamas", and it sits at `market_entrance`, the tutorial's own location.
   - The project's own leak scanner already counts "come" as a near hit (`leak-scan.test.js:26`). The plan's stem check covers only party conversations (`lore-fragments.test.js:55-60`), but inscription text shows on the map and unhidden in the Spellbook during every location encounter.
   - **Fix:** for inscriptions, check against all objective targets: every word of a multi-word form (as `scanLine` does), plus a same-stem check for gender and number variants. Keep an explicit allowlist for false positives (es "quien" vs quiero/quieto). Go back to the plan's "parla la lingua del ramo" / "habla la lengua de la rama", and rephrase "Nessuna scusa" (e.g. "Non esiste scusa che abbia mai pesato…"), re-checked with the extended test.

3. **Gap: returning the Spellbook from a move also changes the drill.** `pendingDrill` depends on the current location (`learning-service.js:222-230`).
   - Today the store's `moveTo` sets only `world` (`gameStore.js:133-135`) and `openSpellbook` does not refetch (`:340`). So after walking to the Rift, `spellbook.drill` is stale: the DrillNote (`MapPanel.js:66,87`) does not show, and "Talk to" ends in a 409 DRILL_REQUIRED error.
   - The plan quietly fixes this. Record it as an intended change and add tests: arriving at the Rift with due cards shows the note and disables Talk; walking away shows no stale note.
   - On a changed move, the plan must build the Spellbook from `stagedEnvelope`, not `envelope` (`learning-service.js:927-931`). Otherwise the newly visited inscription is missing, which is the feature.
   - Also update `snapshots` in the store's `moveTo` (`gameStore.js:103,497`), or `switchLearnerForTest` brings back an old Spellbook.

4. **Gap: `visitedSet` is not exported.** It is private at `world.js:15`, but design step 3 needs "visited ids plus current, as `visitedSet`". **Fix:** export it, rather than writing a second copy that could drift (e.g. on unknown ids).

5. **Gap: the plan's Content section no longer matches the files.**
   - The plan's es draft uses "Aquí" twice. "aqui" is a party stem (`lore-fragments.test.js:66`), so the draft fails its own test. The files already say "En este puesto" / "En este lugar".
   - The it keystone, menu_board and chopping_block texts and their English were also rewritten ("will be served last month", "at this stall", "what it claimed").
   - **Fix:** update plan v2's Content section to the file texts and record why each changed. Decision 4's "same English" test will hold; I checked that `where` and `translation` match across the two files.

6. **Gap: the app code will break on current fixtures and the rules of hooks.**
   - Spellbook fixtures and `emptySpellbook` have no `inscriptions` (`fragments.test.js:13`, `kept-lines.test.js:15`, `gameStore.js:13`). Guard with `spellbook.inscriptions?.length`.
   - `MapPanel` returns early at `MapPanel.js:63`, so a `useState` for the toggle added below it breaks the rules of hooks. Put the toggle in an `<Inscription key={here.id} …/>` subcomponent. The `key` also gives "closes on a move" for free.

7. **Optional: the Spanish is inconsistent and one gloss is wrong.**
   - Italian uses voi ("Restituitelo… potreste"). Spanish mixes tú ("Devuélvelo… estés") with ustedes ("Disculpen"). Suggest "Devuélvanlo con cuidado: puede que estén dentro."
   - The gloss "disculpen: we apologise (literally: excuse us)" is inaccurate: "disculpen" is "(you all) excuse", with no "us" in it. Gloss it "please excuse (us)".
   - Otherwise the Italian and Spanish read correctly. They still need a native speaker's review, as the plan says.

8. **Cut: the pronounce button on the map card and the shared Fragment card.**
   - The map card already has the English "Hear the place" narrator. The Spellbook card holds the same text with its own pronounce button, so drop the map one; the map stays a teaser.
   - Threading a `kind` prop through `Fragment` (`Spellbook.js:106-118`) mixes two different sets of fields: title/found/source vs locationName/where. A small separate `InscriptionCard` is simpler.

**Things I checked that need no change:**
- No current inscription text or glossary contains a pack vocabulary form or a party stem in either pack.
- `worldSnapshot` has only three callers (`learning-service.js:919,926,931`), so no other `world` response would drop the inscriptions.
- No server test checks the keys of a whole world or move response, so the extra fields break nothing there.
- The mobile `moveTo` mocks return `{ world }` only, which the plan's fallback handles.
```
