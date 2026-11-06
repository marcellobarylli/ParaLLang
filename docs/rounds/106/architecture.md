# Round 106 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (journal, review) is in
`trail/`; it is not needed to implement this round.

- **Source:** round 104's review R1.7, deferred there: the server's Spellbook payload carries every card's meanings,
  note and example translation during an encounter and on due cards; only the clients hide them (round 017's rule,
  round 090's waits). Fragments, inscriptions and kept lines are already withheld on the server.
- **Offline round:** no LLM call; server code, client guards, tests.
- **Second opinion:** Codex limited until 2026-11-09 17:32 UTC; a fresh read-only subagent reviews the build.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-service.js` (`spellbookSnapshot`), `server/test/spellbook-withheld.test.js`,
  `mobile/src/components/Spellbook.js`, `client/src/components/Spellbook.jsx`.

## Goal (pre-run)

No Spellbook payload holds an answer the screens would hide: during an encounter no card has meanings, note or an
example translation; a due card has none either; a card whose meaning waits on a due card (round 090) has none.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Same rule as the app, at snapshot time.** For each card: `meaning` is withheld when the learner is in an
   encounter, the card is due, or a card in its `formCardIds` is due; `example` (its English) when `meaning` is, or a
   card in its `exampleCardIds` is due. This is `cardState` + `cardWaits` in `mobile/src/components/Spellbook.js`
   with the server's `due` flags.
2. **Shape kept, values blanked.** A withheld card has `meanings: null` and `note: null`; a withheld example keeps its
   `target` and has `english: null`. A card gets `withheld: { meaning, example }` (booleans), so a test or a client
   can tell a withheld card from content without a note. Every other field (target, class, schedule, id lists) is
   unchanged: the screens show them in these states.
3. **The clients keep their own checks** (the clock can make a card due after the snapshot) and render a `null`
   safely: the app and the web client never call `join` on a null list. A due-by-clock card whose server snapshot
   still had meanings is hidden by them as before.
4. **Reviews are not affected.** The review challenge and its result come from their own routes; the review result
   that shows the answer is unchanged.
5. **No save change.** Only the payload changes; `contentVersion` and the store's guards stay.

## Tests (pre-run)

- `server/test/spellbook-withheld.test.js` (in-process runtime, stub LLM):
  - during an encounter, every card of `GET /api/spellbook` and the dialogue response has `meanings: null`,
    `note: null`, `example.english: null`, `withheld.meaning === true`; after the encounter resolves they come back;
  - outside an encounter, a due card has none and a card not due has them; a card whose `formCardIds` holds a due
    card waits on its meaning, one whose `exampleCardIds` holds one only on its example;
  - the serialized payload (JSON text) during an encounter contains none of the cards' accepted translations.
- `server/test/web-client.test.js`: the card field list still holds `meanings` (now possibly null).
- Mobile and web: a card with `meanings: null` in the reference state does not throw.
- Mutation: dropping the encounter condition fails a test.
- Full suites: server, client, mobile.
