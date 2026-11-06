# Round 091 plan v1: fixes from a review of rounds 017–028

Source: `review-1.md` (2 findings), checked by hand at HEAD 192780b.

## R1.1 (Gap): the map's Talk replaces a conversation under way elsewhere

The Party screen disables Talk for other members while a conversation is under way ("Finish your conversation with
X first.", PartyPanel.js:42–48); the map's "Talk to …" (MapPanel.js:89–92) is disabled only by loading or the drill.
`_startEncounter` replaces any other active session (learning-service.js), so a Flick conversation two objectives in
is lost when the player taps "Talk to Mortimer" on the map. Fix (app, same rule as the Party screen): when `ongoing`
(App passes only an ongoing encounter) is another encounter than the one here, the map card disables Talk and shows
"Finish your conversation with X first." with a "Return to X" button (`onReturnToEncounter`, as the drill note has).
When the drill note already shows (it has its own "Return to X"), the extra line is not added. The same encounter
here: Talk resumes it, unchanged. The server is not changed (the frozen web client starts the default encounter
anywhere and relies on replacement); a 409 is rejected for that reason.

## R1.2 (Minor): the app cannot start against a server without `/api/party`

`initialize` and `_loadSave` put `api.getParty` in a `Promise.all` with no fallback; a server older than round 021
answers 404 and startup fails. Fix: a 404 from `getParty` counts as an empty party in both; other failures still fail
(a transient error must not show an empty party as if it were true).

## Tests

- mobile `MapPanel` test: with an ongoing encounter elsewhere, Talk is disabled, the note and "Return to X" show and
  call `onReturnToEncounter`; with the same encounter ongoing here, Talk is enabled; without `ongoing`, no note; with
  the drill note showing, one "Return to X" only.
- mobile store: `initialize` and a switch with `getParty` rejecting 404 load with `party: []`; with a 500 startup fails
  as before.
- Full suites; each fix removed in turn fails a test.
