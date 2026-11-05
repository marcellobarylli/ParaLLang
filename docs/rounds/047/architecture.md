# Round 047 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog G4 (rounds 032–033 deferred "tiers that change the conversation"). Today each saveable
  member has one party conversation, the same every time.
- **Findings:** [`findings.md`](findings.md), after the build and live runs.
- **Artifact:**
  - `after_conversations` on party conversations (`server/src/content-loader.js`);
  - `partyConversationFor(home, count)`, `conversationOffer`, `NOT_YET`, member matching by home in
    `server/src/learning-service.js`;
  - `gerald_confidence` (encounter and vocabulary file) in both packs;
  - the Party panel's tier line (`mobile/src/components/PartyPanel.js`);
  - `play-market.js --party --tier N`;
  - tests in `server/test/party-tiers.test.js`, updated content pins, a mobile test.
  No prompt template changes.

## Goal (pre-run)

After a member has finished N conversations, Talk starts a deeper, authored conversation instead of the first one.
Gerald is the first, after three coffee breaks (when his Dead Branch fragment is also found).

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Tiers reuse `after_conversations`** (the fragments' name and meaning), on party conversations only. One first
   tier per home; thresholds unique.
2. **Talk offers the deepest unlocked tier, and it repeats** like the first tier does today. Earlier tiers stay
   startable over the API; any tier's resolution counts one conversation.
3. **Gerald's confidence** (`gerald_confidence`, at 3): tell Gerald he is a friend (it *amico*, es *amigo*), then
   make the toast (it *cin cin*, es *salud*). Italian *salute* is left out (an English word, chipped in English
   text). Spanish *amigo* is kept although English borrows it (critique 1.4): a chip on it is a correct meaning,
   and the grader already accepts mixed lines such as "You are my amigo." in the same way as "This is buono.".
4. **The app's line is persistent, not "new"** (critique 1.2): while Talk offers a deeper tier, the member's card says
   "Gerald trusts you with a deeper conversation now." (one generic line, `{name}` filled in).

## Design (pre-run)

1. **Loader.** `after_conversations: int ≥ 1` only with `party_of` ("Only a party conversation can set
   after_conversations"). Per home: at most one conversation without it ("more than one party conversation without
   after_conversations"), unique thresholds ("more than one party conversation at after_conversations N"), and a
   deeper tier needs a first one ("has a deeper party conversation but no first one").
2. **Selection.** `partyConversationFor(home, count = 0)`: the eligible conversation (threshold ≤ count, 0 for the
   first) with the largest threshold, independent of file order. Fragments' `encounterId` uses count 0 (the first
   tier), unchanged.
3. **Member matching** (critique 1.3): starting a party conversation, its threshold check and the count on
   resolution all find the member with `isHomeMember(member, party_of)`, as the snapshot and fragments do.
4. **Start.** A threshold above the member's count: 409 `NOT_YET` ("Gerald is not ready for that conversation
   yet.").
5. **Offer** (critique 1.1): `partySnapshot` gives `conversationId` and `conversationTier` (0 for the first). If the
   learner's in-memory session is an unresolved party conversation of this member, the offer is that session's
   conversation, so Talk resumes it (a base tier started over the API at count ≥ 3, or one left open across the
   count change). Sessions are not saved (since round 001), so no save migration is involved.
6. **App.** `PartyPanel` shows `tierNote(member)` when `conversationTier > 0`. Talk is unchanged.
7. **Content** (critiques 1.5, 1.6): the intents do not assume the player read the fragment: Gerald himself mentions
   a dark drink and a word that died with the Dead Branch, in a line or two, without the targets. Constraints
   name the perspectives: Gerald is the player's friend (*amico* / *amigo*), the player is Gerald's friend (*amico* or
   *amica*, *amigo* or *amiga*, by the player's own gender), or the two are friends (*amici* / *amigos*); negations,
   quotations and definitions fail. The toast must be made, not described; English-only fails.
8. **play-market.** `--party --tier N` writes the member's count N into the save after recruiting (a harness
   shortcut, recorded in the report as `tierCount`) and plays `partyConversationFor(home, N)`. Scripts for
   `gerald_confidence`: an English line (should fail), the friend line, the toast.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 dad5fbb1…; Codex, effort high (a bundle on stdin, no file access); raw
text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | An ongoing earlier tier loses its Talk (resume) button | + | Accept: the snapshot offers the member's ongoing party session first | **Accepted** (autonomous, pending owner review) | Design 5, Tests |
| 1.2 | Error | `conversationNew` does not mean "not played yet" | + | Accept the alternative: drop it; a persistent line while a deeper tier is offered | **Accepted** (autonomous, pending owner review) | Decision 4, Design 6 |
| 1.3 | Risk | Member matched by character for start and counting, by home elsewhere | + | Accept: `isHomeMember` for start, threshold and counting | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.4 | Risk | Spanish *amigo* is borrowed by English | − | Reject the target change: a chip on English "amigo" carries the right meaning, and mixed lines already pass by design; noted in Decision 3 | **Rejected** (autonomous, pending owner review) | Decision 3 |
| 1.5 | Risk | Accepted forms need perspective and agreement rules | + | Accept: constraints and examples name the three perspectives; negation, quotation, definition fail | **Accepted** (autonomous, pending owner review) | Design 7 |
| 1.6 | Risk | The fragment being found does not mean the player read it | + | Accept: Gerald introduces the drink and the dead word himself | **Accepted** (autonomous, pending owner review) | Design 7 |
| 1.7 | Risk | Leak checks must cover every NPC line | + | Accept: `leak-scan.js` over every line of both runs, read by hand | **Accepted** (autonomous, pending owner review) | Live runs |
| 1.8 | Risk | Loader, order and compatibility coverage | 0 | In part: a no-first-tier case and an order-independence test (a tier in a file that sorts first); the resume case is 1.1's test. Per-entry versions are already pinned by existing tests (`entryVersion`), so no new test | **Accepted in part** (autonomous, pending owner review) | Tests |

**Deferred:** Optional "keep `conversationTier` internal": it now has a consumer (the app line, 1.2).

Net change from plan-v1: no `conversationNew` (a persistent tier line), the ongoing session wins the offer, members
matched by home everywhere, tighter content constraints, an intent that stands without the fragment.

## Tests (pre-run)

- Loader (`party-conversation.test.js`): threshold on a location encounter, two first tiers, duplicate thresholds,
  zero, a tier with no first tier are refused; the shipped packs have one first tier per saveable home and only
  `gerald_confidence` (at 3) as a deeper tier; party vocabulary 11 entries with the overlap and English-word checks;
  the fragment stem check's stems (it `amic`, `cinc`; es `amig`, `salu`); vocabulary version pins.
- Service (`party-tiers.test.js`): count 0–2 offers `gerald_coffee_break` (tier 0), count 3 `gerald_confidence`
  (tier 3); `gerald_confidence` at count 2 is 409 `NOT_YET` (HTTP); resolving it counts one; the base started at
  count 3 is what the snapshot offers while it is unresolved; with an extra tier at 5 in a file that sorts first,
  count 4 offers 3 and count 6 offers 5; the Dead Branch fragment's `encounterId` stays `gerald_coffee_break`.
- Mobile: the Party panel shows the tier line only for `conversationTier > 0`.

All other suites, including Gerald's golden prompts, unchanged.

## Live runs (pre-run)

codex-cli: `play-market.js --party --tier 3` in it and es, one run each (~14 calls). The bar: both resolve; the
English line fails; `leak-scan.js` and a reading of every NPC line find no target form (*amico*/*amigo* and
inflections, *cin cin*/*cincin*, *salud*) before its objective is met.

## Amendment 1 (2026-11-05): the deeper opening goes in the greeting

The first live runs resolved as designed, but both greetings opened as a first meeting ("Ciao. Sono Gerald. This
market? Two espresso shots."). The Italian run never mentioned the Dead Branch, and the Spanish run mentioned it only
in turn 2. `prompts/encounter/greeting.txt` asks for a concise greeting and wins over an intent that does not say
"in his greeting" (round 013 trap). So `call_friend`'s intent (it, es) now says that in his greeting Gerald does not
introduce himself or describe the place, and that he mentions the Dead Branch drink there. The change is content
only. Both live runs are repeated with the same bar, plus one more: the greeting is not a first meeting and names
the dead word or drink. Autonomous decision, pending owner review.

## Outcome (2026-11-05)

Built as designed, with Amendment 1. Live in both languages, after three conversations Talk's tier (Gerald's
confidence) resolved with every verdict as scripted. After Amendment 1, both openings greet an old companion and
name the Dead Branch drink. Server 181/181, mobile 124/124, web 12/12, expo-doctor 20/20. See [findings](findings.md).
