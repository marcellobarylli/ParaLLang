# Round 116 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-14 by the owner's reply to round 115's
report, not through the round pipeline. Sections marked *pre-run* must not be edited after the commit that holds
them. Changes go into dated Amendments; results go into the dated Outcome section, added later. The full record (the
owner's reply, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** round 115's [architecture](../115/architecture.md) and [findings](../115/findings.md);
  [`docs/handoff.md`](../../handoff.md) (how a change ships).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `client/src/scene/`, `client/src/stores/gameStore.js`, `client/src/components/`,
  `client/scripts/dungeon-shots.mjs`.

## Goal (pre-run)

1. The gameplay drives the camera inside an encounter as well as between encounters, and tests prove the coupling
   in CI and in a real browser.
2. The dungeon is live: `round-115-dungeon` is merged to `main`, and the deploy is checked.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md):

- **Open questions:** "go ahead with the most reasonable solution" (Q0). Claude decides them and reports.
- **Request:** "make sure the gameplay integrates with the camera transitions" (Q0).

Claude's decisions under that mandate:

- **Decision 1: deploy.** Round 115's report asked whether to merge and push, and the owner answered that Claude
  should decide. Merging is the reasonable choice: the owner asked for the feature "in its entirety", the server side
  has been live since round 114, the only saves on the free Render plan are wiped by every push anyway, and a failed
  build leaves the old site and the old server running. The merge happens after this round's build is green.
- **Decision 2: the walk keeps its button.** Round 114 says the camera moves "when the encounter resolves". An
  automatic walk would take the last reply away while the player reads it, or would play the walk in the strip the
  bottom sheet leaves on a phone. So the resolve itself moves the camera (below), and the walk starts on "Walk on".

## Design (pre-run)

Round 115 coupled the camera to the phase: a phase change starts a camera state, and the dialogue opens when the
camera has arrived. Inside an encounter the camera only drifted. This round adds three couplings.

### The camera follows the conversation

- **A closed objective steps the camera in.** While the camera holds at a site, each objective the player closes
  moves it a step along the line to the site, eased. At a resolved encounter it stands 35% of the way in.
- **A verdict is a beat.** A turn that closes an objective pushes the camera in briefly and flares the beacon. A turn
  that closes none pulls it back briefly. Both decay within a second.
- **A resolved site releases the camera.** The beacon's crystal rises and fades, its ring turns from gold to green,
  and the camera turns from the site to the way on: the gate ahead on the route, or the sanctuary at the last site.
  "Walk on" starts the walk from that pose, so the turn and the walk are one movement.

The director stays pure. It gains `engage(level)`, `onward(on)` and `beat(kind)`, which shape the hold of the
approach and walk states. A new state resets them. The store counts the objectives closed in the conversation and
numbers each verdict; `DungeonView` hands both to the level view.

### Proof of the coupling

- **Wiring test** (jsdom, the level view mocked): the screen sends the level view the phases in order with the right
  sites, the dialogue opens only after the mocked camera reports its arrival, and verdicts and the resolve reach it.
- **Playthrough assertions** (`client/scripts/dungeon-shots.mjs`, real browser): no dialogue sheet while the camera
  travels; when the dialogue opens the camera is in its hold within 4.5 m of the site; after a closing answer the
  camera is nearer the site; after the resolve it looks away from the site; the walk starts without a jump.

### Deploy

Merge `round-115-dungeon` into `main` with a merge commit and push. Then read the Actions runs through the public
API, check `/api/health` on Render, and load the Pages URL in headless Chromium inside a Slurm job (no token: the
title and the route must render, and "Start" must name the missing token).

## Claim boundary (pre-run)

The camera's reactions are judged by tests and by pictures from software WebGL. Whether they read well on a phone is
the owner's judgment. The live check has no access token, so it stops at the route screen: a conversation against
the live model stays unplayed unless the owner plays it.

## Deferred (pre-run)

- Prefetching the next site's greeting when a site resolves, to hide the hosted server's 15 s start.
- Characters and props at the sites; free camera control during a conversation.

## Tests (pre-run)

- **Director:** stepping in is smooth and bounded (never nearer than 2 m to the site, never off the line to it); a
  beat decays to nothing; the onward turn keeps the camera's position; a walk that starts from a stepped-in, turned
  camera has no jump; a new state resets all three.
- **Store:** the count of closed objectives (a held pass does not count), the verdict number, and their reset on a
  new conversation, a new run and new settings.
- **Wiring** and **playthrough** as above.
- All suites and the build keep passing.

## Amendment 2026-11-14: two corrections to the Design's numbers (Claude, during the build)

- The playthrough's "within 4.5 m of the site" holds for sites 2 and 3. At site 1 the approach ends 9.5 m back on
  the route (round 115), so the assertion there is 10.5 m.
- "The sanctuary at the last site" is looked at at eye level, through the inner gate's door. The first build looked
  up at the tower and met the gate's wall (journal rows 4 and 5).

## Outcome (2026-11-14)

Built as designed, with the Amendment above, and deployed. Inside a conversation the camera steps in for each closed
objective, answers each verdict with a brief push or pull, and turns to the way on at a resolve, where the beacon
lets go. The director, the wiring between the screen and the camera, and the real-browser playthrough each test the
coupling. `round-115-dungeon` is merged to `main` as `d01c8a0`; CI, the Pages deploy and Render's build succeeded,
and the live site renders the title and the route. The claim boundary held: no conversation against the live model.
See [`findings.md`](findings.md).
