# Round 133 findings

## Question
The owner asked for a minimal Micromort Mountain: one encounter with Eduardo, who sprained his ankle on the hike; the
level starts halfway up the mountain; at the top a snowy area with a wine festival. Is it playable?

## Finding
Yes, as far as scripted replies and a headless browser show. The world map opens the mountain, the camera comes to
Eduardo's ledge, his encounter resolves in both packs and completes the run. Not played against the live model, not
on a phone.

## Method
New content and a new level in the aesthetic package; the client taught to hold more than one dungeon. The server's
passing provider plays Eduardo's accepted examples through the real routes. Pictures: the dev client in headless
Chromium (software WebGL) at 1280×800 and 390×844, driving the level view directly for the ledge, and the aesthetic
demo's camera tour for the festival.

## Results
- **The world map** offers both places ([picture](shots/01-world-map.jpg)); the mountain's button starts its run.
- **From above** the mountain is a grassy valley with firs, a trail of cairns, a rocky middle, and a snowfield on the
  top ([picture](shots/02-mountain-from-above.jpg)).
- **The ledge.** Eduardo sits on a rock with a boot off and his ankle swollen, next to his rucksack and a broken pole,
  with the summit's snow on the horizon ([phone](shots/03-eduardo-phone.jpg), [desktop](shots/04-eduardo-desktop.jpg)).
- **The festival.** A bonfire, marquees, long tables, barrels and bunting, a crowd round the fire, a banner arch
  ([picture](shots/05-festival.jpg), [from above](shots/06-festival-from-above.jpg)).
- **Three problems found by looking**, fixed: the first camera looked into a rock face, so it now comes along the
  ledge from the west; the overview looked at height 0, under the slope; and a second level could not be started on
  the first one's canvas. A check word, *dove*, and the Spanish *vino* collided with the lore texts the answer check
  scans, so the objectives use *cima* and *festa* / *fiesta*.
- **Suites:** server 467 (4 new), client 213 (4 new), aesthetic 54, mobile 320; the client builds.

## Decision
The summit stays scenery and the run has one site, as asked: "minimal". Eduardo's location joins the market's world,
as The High Gate's did, and the tests that list the market were told to leave it out.

## Evidence
[`shots/`](shots/), [`architecture.md`](architecture.md), the new tests named there.

## Claim boundary
No live-model run of Eduardo, so how he speaks at 0.3 target-language share, and whether the model gives *aiuto*,
*cima* or *festa* away, is unseen. Nothing on a phone: the figure's size and the camera's framing under the
conversation panel were judged from headless screenshots. The Italian and Spanish are Claude's, the reference URLs
were not opened, and the pictures from the dev client show a "server returned an unreadable response" card because no
server ran behind it.

## Open items
- The owner reads Eduardo's lines and the three objectives (`content/languages/{it,es}/encounters/micromort_eduardo.yaml`).
- Whether the market map in the iPhone app should show The Micromort Trail, or the location should be hidden from it.
- A second site at the festival, and a way up the mountain to it ([Deferred](architecture.md#deferred)).
