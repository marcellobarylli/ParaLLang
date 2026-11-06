# Round 082 plan v1: inscriptions, lore hidden in plain sight

Autonomous round (no owner), offline: Codex (game provider and usual critic) is at its usage limit until
2026-11-09 17:32 UTC, so this round needs no live LLM call. Critic: a fresh read-only subagent instead of Codex.

## Source

- prototype.md Phase 3, "Lore fragments | Hidden text passages with advanced vocabulary, discoverable items". Round
  030 built fragments of *The Journey*, found when an encounter is **completed**; nothing is found by exploring.
- `parallang_obsidian/GAME MECHANICS.md`: "Dark souls-like storytelling. Ie the lore is hidden in plain sight. There
  will be entire sections that are potentially more complex language-wise, which do not need to be translated to
  progress but which give juicy details about the world."

## Goal

Each of the six market locations carries one short authored inscription in the target language (carved, chalked,
stitched…), visible on the map card of a visited location behind "Look closer", and kept in the Spellbook once the
location was visited, with its translation and glossary behind a toggle. Optional: no objective, no grading, no
LLM call.

## Decisions (autonomous, pending owner review)

1. **Found by visiting**, not by completion or a search action: the place is the discovery (hidden in plain sight).
   Derived from `visitedLocationIds` (plus the current location), no save change.
2. **The map card shows only the text** (and where it is written); the translation and glossary live in the
   Spellbook, withheld during an encounter as fragments are (round 030). The world snapshot never carries English
   translations, so it needs no encounter check.
3. **No pack vocabulary in an inscription** (same rule and test as fragments: no vocabulary form of the pack, no
   glossary meaning that is a target's accepted translation, no stem of a party conversation's targets), so the text
   may show at any time, including on the map while an encounter is under way elsewhere.
4. **One inscription per location, all six, both packs**, with the same `where` and `translation` English in it
   and es (tested). Pending a native speaker's review.
5. **The move returns the Spellbook too** (`{ world, spellbook }`), so a newly visited place's inscription is in
   the Spellbook without another request; the app takes `spellbook` when present (older servers send none).

## Design

1. Content `content/languages/<code>/lore/inscriptions.yaml` (optional file):
   `inscriptions: [{ id, location, where, text, translation, glossary: [{ word, meaning }] (1–8) }]`.
   Loader (`loadInscriptions`): zod strict schema; unique ids; `location` must exist in the world; at most one per
   location; each glossary word occurs in the text (`foldWords`, as fragments). Exposed as `content.inscriptions`
   (frozen, file order) and `content.inscriptionsByLocation` (Map).
2. `worldSnapshot(world, progress, encounters, inscriptions = new Map())`: a visited or current node with an
   inscription gains `inscription: { id, where, text }`; known (unvisited) nodes never do. `getWorld` and `moveTo`
   pass `content.inscriptionsByLocation`. Existing deepEqual tests that compare whole snapshots compare two snapshots
   from the same code and stay valid.
3. `LearningService.inscriptions(envelope, inEncounter)`: the inscriptions of visited locations (visited ids plus
   current, as `visitedSet`), in file order: `{ id, locationId, locationName, where, text, hidden, translation,
   glossary }`, with `translation` and `glossary` null and `hidden` true during an encounter. In the spellbook
   snapshot as `inscriptions`.
4. `moveTo` returns `{ world, spellbook }` (both on a changed and an unchanged move); the HTTP route passes it
   through.
5. App:
   - `MapPanel`: when `here.inscription`, a "Look closer" toggle button (`expanded`), which shows `where` (small),
     the text (italic, `accessibilityLanguage` from the pack tag) with a PronounceButton "Hear the inscription in
     <language>", and "Its translation is in your Spellbook." The toggle closes on a move (state keyed by location).
   - Store `moveTo`: `set({ world, ...(spellbook ? { spellbook } : {}) })`.
   - `Spellbook`: an "Inscriptions" section after the fragments, one card per inscription: the place name as title,
     `where`, the text with a pronounce button, and the same translation toggle as a fragment (hidden note during an
     encounter). Reuses the Fragment card with a `kind` prop for the labels.
6. The web client (frozen) ignores the new fields; it keeps building.

## Content (draft, it / es; English shared)

| Location | Where | Translation |
|---|---|---|
| market_entrance | Carved on the keystone of the archway, half worn away by people looking up. | Whoever enters speaks the language of the branch they stand in. Whoever leaves, if they leave, takes some of it away under their fingernails. |
| coffee_cart | Chalked in a corner of the menu board, the one line nobody ever wipes off. | Yesterday's orders were served tomorrow. We apologise for the temporal inconvenience. |
| butchers_stall | Burned into the chopping block, under a century of knife marks. | Everything is weighed here, even excuses. No excuse has ever weighed what it promised. |
| cracked_fountain | On the back of the brass plaque, in letters someone has tried to file away. | Reading to the end is not advised. The refrain begins where the sentence ends, and the sentence never ends. |
| old_bookshop | Pencilled on the flyleaf of a book that will not let itself be opened. | Every book in this shop was written by whoever read it last. Return it with care: you may be inside it. |
| the_rift | Stitched along the seam of light, in thread that hums when you lean close. | Here the branch is dead, yet its roots keep talking. Listen until you understand, then stop listening at once. |

it: "Chi entra parla la lingua del ramo in cui si trova. Chi esce, se esce, ne porta via qualcosa sotto le unghie." /
"Le ordinazioni di ieri sono state servite domani. Ci scusiamo per il disagio temporale." / "Qui si pesa tutto,
perfino le scuse. Nessuna scusa ha mai pesato quanto prometteva." / "Si sconsiglia di leggere fino in fondo. Il
ritornello comincia dove finisce la frase, e la frase non finisce mai." / "Ogni libro di questa bottega è stato
scritto da chi l'ha letto per ultimo. Restituitelo con cura: potreste esserci dentro." / "Qui il ramo è morto, eppure
le radici continuano a parlare. Ascoltale finché non capisci, poi smetti subito di ascoltare."

es: "Quien entra habla la lengua de la rama en la que está. Quien sale, si sale, se lleva algo de ella bajo las
uñas." / "Los pedidos de ayer se sirvieron mañana. Disculpen las molestias temporales." / "Aquí se pesa todo, incluso
las excusas. Ninguna excusa ha pesado nunca lo que prometía." / "Se desaconseja leer hasta el final. El estribillo
empieza donde acaba la frase, y la frase nunca acaba." / "Cada libro de esta tienda lo escribió quien lo leyó por
última vez. Devuélvelo con cuidado: puede que estés dentro." / "Aquí la rama está muerta, pero sus raíces siguen
hablando. Escúchalas hasta entender, y luego deja de escuchar enseguida."

Words the leak test rejects get replaced before the build is committed (recorded in the Outcome).

## Tests

- Server `server/test/inscriptions.test.js`: both packs load six inscriptions, one per location, same ids,
  locations, `where` and `translation`; no pack form, no target meaning in a glossary, no party stem (the check is
  live: planted words are caught); loader rejects an unknown location, two at one location, a glossary word not in
  the text; world snapshot: current/visited nodes carry `{ id, where, text }` and no translation, known nodes none;
  spellbook lists visited ones only, in file order, hidden during an encounter; `moveTo` returns the spellbook with
  the new inscription; HTTP `POST /api/world/move` returns it too.
- Mobile: MapPanel's "Look closer" reveals the text and the Spellbook note, closes on a move; the Spellbook
  section renders an inscription with the toggle, and the hidden note during an encounter; store `moveTo` takes the
  spellbook when present and keeps the old one when absent.
- All server, client and mobile suites green; expo-doctor; client build.

## Criteria

Offline only: all suites green, the new tests, `round_log_check.py 082`. No live run (nothing an LLM sees changes:
the narration and atmosphere prompts do not read inscriptions; Gerald's golden prompts must stay unchanged).
