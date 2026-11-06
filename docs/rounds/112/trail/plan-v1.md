# Round 112 plan v1: an annex on CM-002 (Errata), and the base hint limit in the hints line

Offline round (no LLM call; Codex limited until 2026-11-09 17:32 UTC). Follows round 111 (an annex on CM-001, read
anyway at the cost of one hint per objective in the next finished conversation).

## Goal

1. **"Annex A: the seam's transcript"** (`cm002_seam_transcript`) on containment file CM-002 (Errata, the Rift's
   boss, filed when the Rift encounter is completed), both packs. Source: LORE.md, Infohazards: "the oldest and most
   dangerous infohazards are fragments of the eldritch root language, closest to the root of the cosmic tree", and
   the branches' collision ("both languages become corrupted and lose their meaning"). Errata speaks in its own voice
   for once, cleanly, in the target language:
   - English (both packs): "Transcript of the seam. Two branches draw near, and where they touch, words lose their
     meaning. I am not a mistake: I am what is left of a language when everyone understands it badly. Beneath me
     there is an ancient language, near the root of the tree. It never makes mistakes. It waits."
   - it: "Trascrizione della fessura. Due rami si avvicinano, e dove si toccano le parole perdono il loro senso. Io
     non sono un errore: sono quello che resta di una lingua quando tutti la capiscono male. Sotto di me c'è una
     lingua antica, vicina alla radice dell'albero. Lei non sbaglia mai. Lei aspetta."
   - es: "Transcripción de la grieta. Dos ramas se acercan, y donde se tocan las palabras pierden su sentido. Yo no
     soy un error: soy lo que queda de una lengua cuando todos la entienden mal. Debajo de mí hay una lengua antigua,
     cerca de la raíz del árbol. Ella nunca se equivoca. Ella espera."
   - Redaction: "Your companion has blacked out every line of it. "Not this one. It is the thing talking, not a file
     about it. If you read it, I will need a while to get over it: a hint fewer for each objective of the next
     conversation you finish.""
   - Exposure note: "Exposure log: read in full by the bearer of this Spellbook. The seam has noted the reader's
     address. Containment of the reader is pending." (Errata "reads anyone whose name it learns"; it folds itself
     up "like a letter sent to the wrong address".)
   - Glossary 4–10 entries, each in the text. All drafts run through the shared answer check until clean; the
     English check allows exactly the companion's "I"/"you" as round 111 does, per pack as the hits fall.
   The mechanic is round 111's, unchanged: the service already handles any annex on any containment file.
2. **Two pending annexes do not stack.** A session started with both pending is strained once (limit − 1), and
   `strainedBy` holds both ids; finishing it spends both. (Today's `hintLimit` behaviour; made explicit and tested.)
3. **`baseLimit` in the hints payload** (round 111's deferred Optional): `hints: { used, remaining, limit,
   baseLimit, strained }`, `baseLimit` = the objective's own `hint_limit`. The app's dialogue line shows "Hints: 1/1
   (your companion is recovering; usually 2)" while a strained session is ongoing, instead of today's "(your
   companion is recovering)". The web client is frozen and ignores the key.

## Where the cost lands

CM-002 is filed at the end of the market (the Rift opens after the other five). The conversations still to finish
are party conversations with saved members and restarts of completed places; round 111's decision 4 (any finished
conversation spends it) applies. That is a smaller cost than CM-001's; accepted: the lore says reading gives lore at
a cost, not that the cost must be large, and the market is the prototype's whole map.

## Tests

- `server/test/annex.test.js`: the CM-002 annex in both packs, same English, answer check and English check
  (generalised over every annex in the pack); NOT_FILED before the Rift; read after; both annexes pending strain a
  session once and are both spent by one finished conversation.
- `server/test/containment.test.js`: CM-002's exact payload now with the unread annex.
- `baseLimit` in the payload (unstrained = limit; strained = limit + 1).
- `mobile`: the dialogue line text with `baseLimit`; the Spellbook renders CM-002's annex (redacted).
- Full suites: server, client, mobile; web build.
