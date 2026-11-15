# Round 120 plan, draft 1: the party in the dungeon

For a Codex critique before the build. The repository is ParaLLang, at `main` (`113f661`, round 119 merged). Read
`docs/rounds/119/architecture.md` for the dungeon's map, which this round builds on, and `docs/handoff.md`.

## Goal

In the web client's dungeon, a defeated saveable character can be saved to the player's party and talked to again
outside a conversation, as the iPhone app has it.

## Owner decisions

- The party is ported as the app has it: SAVE or LEAVE after a saveable character's site, a Party panel in the top
  bar, Talk from anywhere outside a conversation; the app's server rules, nothing new (round 119, Q3). Offered and
  not chosen: a party role in other encounters.
- One round per feature, each deployed (round 119, Q4). The owner is away and said to run on the most reasonable
  assumption (round 119, Q5): Claude decides this round's open points and the critique's findings, and reports them.

## What exists

- **Server** (rounds 021 to 023, 043, 047): the save holds `party: [{ characterId, encounterId, joinedAt,
  conversations }]`. `GET /api/party` returns each member with `name`, `locationName`, `conversations`,
  `conversationId` and `conversationTier` (the conversation Talk starts), `nextStoryAt` and `storiesTold`.
  `POST /api/party/recruit { encounterId }` adds the encounter's character when it is `saveable` and the encounter
  is in `world.completedEncounterIds`; it answers `{ party, joined }`. A party conversation is an encounter with
  `party_of`; `POST /api/encounter/start { encounterId }` starts it wherever the player stands once the member has
  joined, resumes it while it is under way, and refuses another named start while a different conversation is under
  way (`CONVERSATION_UNDER_WAY`). Resolving it raises the member's `conversations`.
- A dungeon resolve already writes `world.completedEncounterIds` (round 114), so `recruit` works after a site is
  cleared. Gerald, Mortimer, Flick and Marginalia are saveable; Portia, Bambieshart and Errata are not.
- `serializeEncounter` sends `character.saveable` and `partyConversation`.
- **App** (`mobile/src/components/PartyOffer.js`, `PartyPanel.js`): the wording this round copies. "{name} could
  join your party.", "Save {name}", "Leave", "{name} is in your party."; the panel "Your party" with "Met at … ·
  Conversations: n", a story hint, a tier note and "Talk to {name}".
- **Web client** (round 119): phases attract, world, overview, approach, walk, encounter, site, victory; the
  overlays Spellbook and review (`view`). It has no party code and its API module has no party calls.

## Design

### Server

One addition: `GET /api/dungeons/:id/map` sends `saveable` on each site (true or false; null while the fog hides
the site), so a cleared site's card can offer the invitation without a conversation loaded. Nothing else changes.

A party conversation started from the dungeon is an ordinary party conversation: its session has no `dungeonId`,
and its scene in the prompt is the market location the save stands at, as in the app. The dungeon's sites already
speak of the market in the same way (round 114).

### Client

- **API module:** `getParty(learnerId)`, `recruit(learnerId, encounterId)`.
- **Store:**
  - `party` (the server's list), read at startup beside the map and again when the Party panel opens, after a
    recruit and after a party conversation resolves. A read that started before a recruit is dropped.
  - `recruit(encounterId)` sets `party` from the reply.
  - `view: 'party'` joins the overlays. `openParty()` opens it; the existing `returnToDialogue()` closes it.
  - A new phase `party`: a conversation with a party member. `talkTo(member)` is allowed in the phases world,
    overview, site, victory and in a resolved site conversation, and not while the store holds a site conversation
    under way. It starts `member.conversationId` (no `dungeonId`), remembers the phase to return to
    (`partyReturn`; a resolved site conversation returns to `site`), and opens the dialogue sheet. The server's
    refusal (a conversation under way elsewhere) is shown in the banner.
  - In `party` the existing `sendMessage`, `revealHelp`, Spellbook and review rules apply unchanged. "Start over"
    restarts the party conversation. `leaveParty()` returns to `partyReturn` and drops the store's copy of the
    conversation; Talk resumes one the server still holds.
  - The site actions (`travel`, `openMap`, `start`, `talk`) stay closed in `party` (their guards name their phases).
- **Camera:** the `party` phase leaves the camera where it is. `levelView.setPhase` returns early for it, and the
  conversation does not shape the camera (`setEncounter` is sent only in `encounter`).
- **Screen:**
  - The top bar gets a "Party" button with the member count, beside Spellbook.
  - `PartyPanel` (an overlay like the Spellbook): the app's panel, with "Met at {the site's name}" when a site of
    the dungeon holds the member's encounter. Talk is disabled while the store holds a conversation under way.
  - `PartyOffer`: in a resolved site conversation with a saveable character who is not in the party, above the ways
    on: "{name} could join your party." with "Save {name}" and "Leave". Leave hides the offer in that banner; the
    invitation stays on the site's card ("Invite {name} to your party"). Once joined: "{name} is in your party."
  - The dialogue sheet in `party`: the header names the member and "your party" in place of the site, with "Start
    over" and "Leave". When resolved, one button returns: "Back to the temple".
  - From 1100 px the `party` sheet is the side panel, as the dialogue is.

## Tests

- **Server** (`dungeon.test.js`): the map names `saveable` per site and hides it under the fog; after a dungeon
  clear of Gerald's site `recruit` succeeds and a second recruit answers `joined: false`; Portia's is refused
  (`NOT_SAVEABLE`); Mortimer's before his site is cleared is refused (`NOT_DEFEATED`); a party conversation starts
  while the player stands in the dungeon, resolves, and counts; a move in the dungeon is not held by a party
  conversation; a site start while a party conversation is under way is refused without `restart`.
- **Store** (mocked API): the party is read at startup; recruit; Talk from each allowed phase returns to it; Talk is
  refused while a site conversation is held; a party read that started before a recruit is dropped; leaving and
  resuming a party conversation; the round 119 flows unchanged.
- **Screen** (jsdom): the offer, Save, the "is in your party" line, the invitation on the site card, the Party
  panel's lines (met at the site, count, story hint, tier note), Talk and the return.
- **Camera wiring:** the `party` phase sends the view no new camera state and no `setEncounter`.
- **Contract** (`server/test/web-client.test.js`): the client's store clears Gerald's site, recruits him, talks to
  him and resolves the conversation against the real server; the count is 1.
- **Playthrough** (`client/scripts/dungeon-shots.mjs`, in a Slurm job): saves Gerald after his site, opens the Party
  panel, talks to him from a site card, and takes pictures at 390×844 and 1440×900.
- Every existing suite passes.

## Claim boundary

Checked with a fixture provider and headless Chromium. No party conversation is played against the live model from
the dungeon in this round, and nothing runs on an iPhone. The party conversations were played live in the app's
rounds (022, 023, 047, 048).

## Deferred

- A party role in other encounters (offered in round 119, Q3, and not chosen).
- The Journey's fragments a member tells (the Spellbook of the web client does not show fragments).
- Levels (round 121). Real characters at the sites (after round 121).

## Ship

The work is on the branch `round-120-party`. The round ends with a merge to `main`, which deploys the client and
the server. The Render deploy wipes every save on the free plan.
