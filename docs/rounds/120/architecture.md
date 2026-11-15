# Round 120 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-15 from the owner's request in round 119, not
through the round pipeline. Sections marked *pre-run* must not be edited after the commit that holds them. Changes
go into dated Amendments; results go into the dated Outcome section, added later. The full record (the interview,
the draft as Codex read it, the raw critique, the timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** round 119's [interview](../119/trail/interview.md) (Q3, Q4, Q5) and
  [architecture](../119/architecture.md) (the dungeon's map); rounds [021](../021/architecture.md),
  [022](../022/architecture.md) and [047](../047/architecture.md) (the party on the server and in the app);
  `mobile/src/components/PartyOffer.js` and `PartyPanel.js` (the wording); [`docs/handoff.md`](../../handoff.md).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `client/src/` (store, screen, a Party panel), `server/src/learning-service.js` (one field), the
  tests and `docs/rounds/120/shots/`.

## Goal (pre-run)

In the web client's dungeon, a defeated saveable character can be saved to the player's party and talked to again
outside a conversation, as the iPhone app has it.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md), which copies round 119's answers:

- **Party:** ported as the app has it (round 119, Q3). Offered: port it as built; port it plus a party role in
  other encounters. Chosen: port it as built.
- **Order:** one round per feature, each deployed (round 119, Q4).
- **Autonomy:** the owner is away and said to run on the most reasonable assumption (round 119, Q5). Claude decided
  this round's open points and the critique's findings, and reports them.

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 173c5609…; Codex, effort high; raw text in
[`trail/critique-1.md`](trail/critique-1.md). The owner was away, so every disposition is Claude's.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error, high | The store's site merge keeps only `characterName`, so the new `saveable` field would be dropped and a cleared site's card could not offer the invitation after a reload | 0 | Accept: the merge keeps `saveable` | **Accepted** by Claude; the owner was away | Client, store |
| 1.2 | Error, critical | The draft said a party conversation left unfinished could be resumed, but a site start replaces any conversation in its way (round 115, Decision 2), so the next uncleared site silently discards it | + | Accept the error, not the fix. Codex's fix shows the refusal at the site, which leaves the player at a site that will not start until they finish a chat they chose to leave. The promise is narrowed instead: an unfinished party conversation is kept until another conversation starts, and the sheet's button reads "Leave for now" | **Accepted in part** by Claude; the owner was away | Client, the `party` phase; Claim boundary |
| 1.3 | Error, high | The app's story hint says the story "is in your Spellbook". The web client's Spellbook shows no stories | − | Accept, and cut further: the web panel shows no story hint at all, because a count-down to a story the client cannot show is the same false promise | **Accepted** by Claude; the owner was away | Screen, Party panel; Deferred |
| 1.4 | Error, high | Talk was shut on the title screen, which a player with a party can reach (a new run, then a reload) | 0 | Accept: Talk is allowed on the title screen too | **Accepted** by Claude; the owner was away | Client, the `party` phase |
| 1.5 | Error, high | A party conversation opened from the resolved goal returned to the site card, which has no "Leave the temple" | 0 | Accept: from the resolved goal it returns to the victory screen | **Accepted** by Claude; the owner was away | Client, the `party` phase |
| 1.6 | Error, high | Only a recruit outdated an older party read. A read from before a finished conversation could put back the old count and the old tier's conversation | 0 | Accept: the newest party read or write wins, as for the run | **Accepted** by Claude; the owner was away | Client, store |
| 1.7 | Cut, medium | A read of the party after a recruit, whose reply already holds the party | − | Accept | **Accepted** by Claude; the owner was away | Client, store |
| 1.8 | Cut, medium | Server tests of recruit's rules repeat `party.test.js`, and the contract test covers a recruit after a dungeon clear | − | Accept: the new server tests cover the map's `saveable` and what a party conversation does to moves and site starts | **Accepted** by Claude; the owner was away | Tests |
| 1.9 | Cut, medium | The map was read again after every finished party conversation, which changes nothing on it | − | Accept: a finished party conversation reads the party; a finished site conversation reads the map | **Accepted** by Claude; the owner was away | Client, store |

**Deferred:** none (Codex listed no Optional items).

Net change against draft 1: five corrections, one narrowed promise, four parts removed (the story hint, the read
after a recruit, the repeated server tests, the map read after a party conversation), nothing added.

## Design (pre-run)

### What exists

- **Server** (rounds 021 to 023, 043, 047): the save holds `party: [{ characterId, encounterId, joinedAt,
  conversations }]`. `GET /api/party` returns each member with `name`, `locationName`, `conversations`,
  `conversationId` and `conversationTier` (the conversation Talk starts), `nextStoryAt` and `storiesTold`.
  `POST /api/party/recruit { encounterId }` adds the encounter's character when it is `saveable` and the encounter
  is in `world.completedEncounterIds`; it answers `{ party, joined }`. A party conversation is an encounter with
  `party_of`. `POST /api/encounter/start { encounterId }` starts it wherever the player stands once the member has
  joined, resumes it while it is under way, and refuses a named start while a different conversation is under way
  (`CONVERSATION_UNDER_WAY`). Resolving it raises the member's `conversations`.
- A dungeon resolve writes `world.completedEncounterIds` (round 114), so `recruit` works after a site is cleared.
  Gerald, Mortimer, Flick and Marginalia are saveable; Portia, Bambieshart and Errata are not.
- `serializeEncounter` sends `character.saveable` and `partyConversation`.
- **App** (`mobile/src/components/PartyOffer.js`, `PartyPanel.js`): "{name} could join your party.", "Save
  {name}", "Leave", "{name} is in your party."; the panel "Your party" with "Met at … · Conversations: n", a tier
  note and "Talk to {name}".
- **Web client** (round 119): phases attract, world, overview, approach, walk, encounter, site, victory; the
  overlays Spellbook and review (`view`). It has no party code and its API module has no party calls. A site start
  that meets `CONVERSATION_UNDER_WAY` is sent again with `restart` (round 115, Decision 2).

### Server

One addition: `GET /api/dungeons/:id/map` sends `saveable` on each site (true or false; null while the fog hides
the site), so a cleared site's card can offer the invitation without a conversation loaded. Nothing else changes.

A party conversation started from the dungeon is an ordinary party conversation: its session has no `dungeonId`,
and its scene in the prompt is the market location the save stands at, as in the app. The dungeon's sites already
speak of the market in the same way (round 114).

### Client

- **API module:** `getParty(learnerId)`, `recruit(learnerId, encounterId)`.
- **Store:**
  - The site merge keeps `saveable` beside `characterName` (finding 1.1).
  - `party` (the server's list) is read at startup beside the map, when the Party panel opens, and after a party
    conversation resolves. `recruit(encounterId)` sets it from the reply and reads nothing (finding 1.7). The newest
    party read or write wins: an older reply is dropped (finding 1.6).
  - `view: 'party'` joins the overlays. `openParty()` opens it; the existing `returnToDialogue()` closes it.
  - A new phase `party`: a conversation with a party member. `talkTo(member)` is allowed in the phases attract,
    world, overview, site and victory and in a resolved site conversation (finding 1.4), and not while the store
    holds a site conversation under way. It starts `member.conversationId` (no `dungeonId`, no `restart`),
    remembers where to return (`partyReturn`) and opens the dialogue sheet. A resolved site conversation returns to
    `site`, and the resolved goal's to `victory` (finding 1.5). The server's refusal (a site conversation under way
    that the store no longer holds) is shown in the banner.
  - In `party` the existing `sendMessage`, `revealHelp`, Spellbook and review rules apply unchanged. "Start over"
    restarts the party conversation. A finished party conversation reads the party again; a finished site
    conversation reads the map (finding 1.9).
  - `leaveParty()` returns to `partyReturn` and drops the store's copy. An unfinished party conversation stays on
    the server until another conversation starts: Talk resumes it until then, and the next site start replaces it
    (finding 1.2). The button reads "Leave for now" while it is unfinished.
  - The site actions (`travel`, `openMap`, `start`, `talk`) stay closed in `party` (their guards name their phases).
- **Camera:** the `party` phase leaves the camera where it is. `levelView.setPhase` returns early for it, and the
  conversation does not shape the camera (`setEncounter` is sent only in `encounter`).
- **Screen:**
  - The top bar gets a "Party" button with the member count, beside Spellbook.
  - `PartyPanel` (an overlay like the Spellbook): the app's panel without its story hint (finding 1.3): "Your
    party", "No one has joined you yet. Win someone over who is worth keeping.", and per member the name, "Met at
    {the site's name} · Conversations: n", the tier note and "Talk to {name}". Talk is disabled while the store
    holds a site conversation under way, with "Finish your conversation with {name} first."
  - `PartyOffer`: in a resolved site conversation with a saveable character who is not in the party, above the ways
    on: "{name} could join your party." with "Save {name}" and "Leave". Leave hides the offer in that banner; the
    invitation stays on the site's card ("Invite {name} to your party"). Once joined: "{name} is in your party."
  - The dialogue sheet in `party`: the header names the member and "your party" in place of the site, with "Start
    over" and "Leave for now". When resolved, one button returns: "Back to the temple".
  - From 1100 px the `party` sheet is the side panel, as the dialogue is.

## Claim boundary (pre-run)

Checked with a fixture provider and headless Chromium. No party conversation is played against the live model from
the dungeon in this round, and nothing runs on an iPhone. The party conversations were played live in the app's
rounds (022, 023, 047, 048). An unfinished party conversation does not survive the next site conversation; the app
keeps it until the player finishes or leaves it.

## Deferred (pre-run)

- A party role in other encounters (offered in round 119, Q3, and not chosen).
- The stories a member tells after three conversations (the Journey's fragments). The web client's Spellbook shows
  no fragments, so its Party panel does not announce them (finding 1.3).
- Levels (round 121). Real characters at the sites (after round 121).

## Tests (pre-run)

- **Server** (`dungeon.test.js`): the map names `saveable` per site and hides it under the fog; a move in the
  dungeon is not held by a party conversation under way; a site start while a party conversation is under way is
  refused without `restart` and replaces it with `restart`.
- **Store** (mocked API): the party is read at startup; recruit sets it without a read; Talk from each allowed
  phase returns to it, from the resolved goal to victory; Talk is shut while a site conversation is held; an older
  party read does not undo a recruit or a finished conversation's read; leaving and resuming a party conversation;
  a finished party conversation reads the party and not the map; the round 119 flows unchanged.
- **Screen** (jsdom): the offer, Save, the "is in your party" line, the invitation on a cleared site's card after a
  reload, the Party panel's lines (met at the site, count, tier note, no story hint), Talk and the return.
- **Camera wiring:** the `party` phase sends the view no camera state and no `setEncounter`.
- **Contract** (`server/test/web-client.test.js`): the client's store clears Gerald's site, recruits him, talks to
  him and resolves the conversation against the real server; the count is 1.
- **Playthrough** (`client/scripts/dungeon-shots.mjs`, in a Slurm job): saves Gerald after his site, opens the Party
  panel, talks to him from a site card, and takes pictures at 390×844 and 1440×900.
- Every existing suite passes: root `npm test` (in a Slurm job) and `npm run build -w client`.

## Ship (pre-run)

The work is on the branch `round-120-party`. The round ends with a merge to `main`, which deploys the client and
the server (round 119, Q4). The Render deploy wipes every save on the free plan.
