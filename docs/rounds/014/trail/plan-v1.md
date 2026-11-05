# Round 014 plan v1: the Rift gate (backlog A7, first half)

Autonomous round (no owner present). Backlog A7 (The Rift: a mini-boss gated on the other encounters) is split:
this round builds the gate and a full-market live tour; the boss encounter is the next round (A7b).

## Goal

The Rift cannot be entered until the player has completed the other five encounters (Portia, Gerald, Mortimer,
Flick, Marginalia). The map shows it as sealed, with progress, and the server refuses a move into it. Nothing else
changes: the five encounters play as before, prompts are byte-identical (Gerald's golden prompts unchanged), the
frozen web client (which has no map) is unchanged.

## Decisions

1. **Content field.** A location may name `requires_completed: [encounter ids]` (optional; absent or `[]` means
   open). `the_rift.yaml` lists the five encounter ids explicitly. Alternative: a keyword "all other encounters" —
   rejected, because a future encounter (party, lore fragments) would silently tighten the gate. The loader
   validates per pack: each id is an encounter of the pack, no duplicates, not the location's own encounter.
2. **Snapshot.** Every visible gated location (including `known`, unvisited ones, so the fog shows the seal)
   carries `gate: { sealed, required, completed }` where `required` is the list length and `completed` the number
   of those ids in `completedEncounterIds`. Ungated locations carry no `gate` key. `completedEncounterIds` only
   grows, so once open the Rift stays open.
3. **Move.** `applyMove` checks adjacency first (`NOT_ADJACENT` as today), then the gate: a move into a sealed
   location throws 409 `SEALED`, message "The Rift is sealed. Finish the other encounters first (3 of 5 done)."
   A move to the current location is still a no-op even if it is sealed (an old save may stand in the Rift:
   rounds 005–013 let anyone walk there; it holds no encounter yet, so nothing is gained; A7b's encounter start
   must check the gate too).
4. **App.** `MapPanel`: a sealed node gets a lock mark and its own dot style, its label reads
   "The Rift, sealed: 3 of 5 encounters complete", and it is disabled even when adjacent. The store needs no change
   (a 409 already becomes the error banner). The node's caption shows "Sealed 3/5" under the name.
5. **Live tour.** `play-market.js --tour` plays all five encounters in route order (market_entrance, coffee_cart,
   butchers_stall, cracked_fountain, old_bookshop) with their scripted lines, tries the Rift once before the last
   encounter (expect `SEALED`, 4 of 5) and once after (expect success), and reports per encounter: resolved,
   verdict counts, lines and shares. Single-location runs keep their report shape. Exit code 0 only if every
   encounter resolved and the Rift opened only at the end. ~30 LLM calls, ~5 minutes.
6. **No narration or prompt change**; no Rift encounter yet; no companion line about the seal (A7b may add one).

## Tests

1. Server (`node --test server/test/*.test.js`): world tests for the gate in the snapshot (known and visited,
   sealed and open), `SEALED` from the service and over HTTP, the no-op move while standing in a sealed location,
   loader rejections (unknown id, duplicate, own encounter); existing tests that walk to the Rift adjusted.
2. Mobile jest: a sealed node is disabled with its label; an open gate is not. `npm run test:mobile`,
   `npx expo-doctor`, web client tests and build.
3. Live, codex-cli: one Italian tour and one Spanish tour. Findings: per encounter resolved, verdicts against
   intent, the two Rift attempts, total calls and time, language shares.

## Claim boundary

Can claim: the gate holds in-process and over HTTP, the map data, the app component under jest, and the live
tours as reported. Cannot claim: how the sealed node looks or feels on the iPhone (no Simulator), learning quality.
