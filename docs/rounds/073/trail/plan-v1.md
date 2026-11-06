# Round 073 plan v1: a waiting line while an encounter starts (backlog I3)

## Problem
Starting an encounter (map "Talk to {name}", or Party "Talk to {member}") makes one LLM call for the NPC's greeting:
median 8.6 s, up to ~15 s in round 067's tours (codex-cli). During that wait the app shows the same screen with the
button disabled (`isLoading`) and no status text, so it can look frozen. The dialogue screen already has a waiting
line for turns ("{name} is considering the linguistic implications…", round 070 "{name} is replying…").

## Design
1. Store: `starting: null | { encounterId, name }`. `_startNamed(encounterId)` sets it before `api.startEncounter`
   (name from the map's current location encounter `characterName`, or the party member whose `conversationId`
   matches; `null` name falls back to "Someone"), and clears it on every exit (success, failure, an epoch or learner
   change), only if it still holds this call's encounterId. Resets that clear the encounter (save switch) clear it.
2. MapPanel: when `starting?.encounterId === here.encounter.id`, a line under the Talk button with `role="status"`:
   "{name} is getting ready to talk…" (muted, italic, the dialogue's `thinking` style kind).
3. PartyPanel: the same line under that member's Talk button when `starting?.encounterId === member.conversationId`.
4. Nothing on the server; the web client unchanged. Returning to an ongoing encounter answers at once and the line
   only flashes (acceptable).

## Tests (mobile)
- Store: during a pending `startEncounter` `starting` holds the id and name; cleared after success and after failure;
  a save switch during the start clears it and the late reply does not set it back.
- MapPanel: the line shows for the current location's encounter while starting, not otherwise; PartyPanel likewise
  for the right member only.
- Theme test passes (no literal sizes/colours outside ui.js).
