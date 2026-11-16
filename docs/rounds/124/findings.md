# Round 124 findings

## Question
The owner saw dark discs on the temple map on the iPhone and asked what they are. Does the map now say so, and are
the discs a bit less dark?

## Finding
Yes to both in a headless browser at the phone's size. The map's card carries one legend line while a site is
hidden, and each disc of a patch is drawn at 0.3 in place of 0.42. Whether the new darkness is right on the iPhone
is the owner's to say.

## Method
The legend is one line in `OverviewCard` and three style rules; the darkness is one number in
`client/src/scene/levelView.js`. The component test and the playthrough gained checks for the legend. Tests ran in
Slurm jobs on node dada (CPU). The build was pushed to `main` with `[skip render]`, which deploys the client only.

## Results
- **The legend.** Under the list of sites: a dark octagon and "Dark patches cover places you have not found. One
  lifts when you reach a site next to it." It is shown while at least one site is hidden and absent on a finished
  run. On the phone it takes two lines of the card ([picture](shots/03-map-start-phone.jpg)).
- **The darkness.** A patch is three stacked discs. At 0.3 a disc its rim covers 30 % of the ground under it (42 %
  before), its middle ring 51 % (66 %) and its centre 66 % (80 %). Where the patches over The Sanctuary and the site
  before it overlap, the centre covers 88 % (96 %). In the picture the temple's roofs show through every patch; in
  the owner's screenshot the middle of each patch was close to black.
- **Tests.** Server 436, client 120, aesthetic 43, mobile 320, all passing (jobs 5537, 5539, 5540). The playthrough
  passes at 390×844 and 1440×900 with 0 problems (job 5538), including the legend lying inside the card and the
  window, and no legend on the finished run's map.
- **Deploy.** Pushed as `77cdf04` at 10:44:14 UTC. CI run 43851506313 and Pages run 43851506304 both succeeded by
  10:46:52. The live `version.json` reads `0.1.0+mwj51535`, and the live stylesheet and script hold the swatch's
  rule and the legend's text. Render was not deployed; `/api/health` answers 200.

## Decision
Kept. The wording and the value 0.3 are Claude's; the owner asked for "a little legend" and "a bit less dark".

## Evidence
- The owner's words: [`trail/interview.md`](trail/interview.md).
- Pictures: [`shots/03-map-start-phone.jpg`](shots/03-map-start-phone.jpg) (four sites hidden),
  [`shots/03-map-start-desktop.jpg`](shots/03-map-start-desktop.jpg),
  [`shots/07-map-middle-phone.jpg`](shots/07-map-middle-phone.jpg) (later in the run, with five sites listed).
- Job logs in `~/workspace/r124-jobs/` on the cluster (outside the repository).

## Claim boundary
Headless Chromium on the cluster, scripted replies. The darkness of a translucent patch depends on the screen, and
the iPhone's was not seen. The legend's two lines add about 50 px to the card; with seven sites listed the list
scrolls inside the card as before.

## Open items
- **Owner:** look at the patches on the phone. The value is `FOG_PATCH.opacity` in
  `client/src/scene/levelView.js`; lower is lighter.
- The world map has no dark patch (a place under the fog is left out), so it has no legend.
- Three rows of this round's journal and one of round 123's carried times written without reading the clock. Each
  journal has a correction row.
