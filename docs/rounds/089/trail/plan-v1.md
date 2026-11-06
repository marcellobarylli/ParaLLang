# Round 089 plan v1: fixes from a review of rounds 040–053

Source: `review-1.md` (4 findings), checked by hand at HEAD 8adf0b9.

## R1.1 (Error, atmosphere on): the atmosphere filter's English exemptions are answers

`ATMOSPHERE_ENGLISH` (server/src/learning-service.js:45) lets a line through with *basta*, *pollo*, *cento*, *io*,
*sei*, es *soy*, *once*, *kilo*… Measured (`docs/rounds/089/results/exempt.mjs`): every word of the list that is an
entry of a pack is an objective target in that pack (it 11, es 10), and none of the 72 kept live lines of rounds 053
and 068 used any of them. Fix: drop the list, as round 081 Amendment 2 did for footnotes. The description's own words
stay allowed (the map card shows them already). Cost: an English "once"/"due"/"cafe" now drops an atmosphere line
(null for ten minutes, the description still shows); 0/72 live lines would have been dropped.

## R1.2 (Gap): an atmosphere call holds the CLI slot untracked

`writeAtmosphere` calls `provider.structuredChat` without a signal; encounter calls (greeting, turn, grading,
prefetch) then queue behind it in the CLI runner and their deadlines run meanwhile. Fix: each atmosphere call gets an
AbortController kept with the in-flight entry. `callProvider` (every encounter, grading and prefetch call goes
through it) first aborts every atmosphere call in flight. An aborted atmosphere call: drop reason `aborted`, not
cached as a failure, and the reply carries `retryAfterMs: ATMOSPHERE_BUSY_RETRY_MS` as for `busy` (the app already
asks again on it, at most twice). The signal is passed as `structuredChat(…, { signal })` (round 087: all adapters
honour it).

## R1.3 (Minor, latent): a fragment unlocked by a deeper tier is never announced

`journeyFragments` gives a conversation fragment the first tier's encounter id; the app's `fragmentNote` matches the
resolved encounter's id. Fix: the id of the conversation offered at `after_conversations - 1` conversations (the one
whose resolution reached the count): `partyConversationFor(home, unlockedAt - 1)`. Today all thresholds are 3 and all
deeper tiers start at 3, so nothing changes (pinned by the existing tests); a test with edited content (a fragment at
4, a tier at 3) shows the deeper tier's id.

## R1.4 (Minor): a synchronous throw in `speak` leaves the ambience ducked

`mobile/src/speech.js` `speak`: `duck(true)` then `speech.speak(…, voice.identifier …)`; a throw (no voice, a native
error) never restores. Fix: try/catch around `speech.speak`, `restore()` in the catch, and rethrow nothing (the
button press has no handler).

## Tests

- server `atmosphere.test.js`: an es line with *once* / *kilo* drops (the old test that kept "Once again… a kilo"
  changes to that); an it line with "Basta!" at the Fountain drops; an atmosphere call in flight is aborted by an
  encounter call (`callProvider`), its reply is `{ atmosphere: null, retryAfterMs: 15000 }`, the drop reason
  `aborted`, and the next request makes a new call (not cached).
- server `party-tiers.test.js` (or `lore-fragments`): edited content, fragment at 4 with a tier at 3 → `encounterId`
  is the deeper tier's.
- mobile `speech` test: `speech.speak` throwing restores the duck.
- Full suites; each fix removed in turn fails a test.
