# Round 175 findings

## Question

Does the page open on the road's landscape from above the clouds, turning, with the weather and one way in, and does
that way zoom down into a world already loaded? Are the map and a menu at hand everywhere, a conversation included,
and can a conversation be left unfinished?

## Finding

Yes, in headless Chromium (SwiftShader WebGL) at phone and desktop size. Not seen on a real phone, where the far land
(about 80,000 triangles) and the high clouds have not been timed.

## Method

Unit, component and store tests; `client/scripts/title-check.mjs` against a production build and the real server
logic, at 390 × 844 and 1440 × 900, with pictures.

## Results

| Check | Result |
|---|---|
| Web client tests | 300 of 300 (295 before; 5 new: the title's landscape and start, a road made elsewhere and an unreadable kept title, walking off a conversation, the camera's title and descent, the screen's title, menu and map in a conversation). 55 earlier tests changed: the old title's Enter and the top bar's buttons are in the menu, and a reload resumes a dungeon from the world map |
| Server tests | 579 of 579 (1 new: the proposed seed; 3 changed for the reload) |
| Aesthetic package tests | 95 of 95 |
| Title on the screen | 154 to 293 ms after the page was asked for; its one button is The Journey 2; no Enter Ta Prohm or The Kiln |
| From above | 64 far-land tiles and the ground round the site built; 38 to 56 clouds below the camera ([phone](shots/02-title.jpg), [desktop](shots/desktop-02-title.jpg), [later](shots/03-title-later.jpg), [another weather](shots/04-title-storm-night.jpg)) |
| Turning | 0.101 to 0.105 rad in 6 s (one turn in 360 s) |
| Loaded behind the title | the road read and kept (`parallang.title`), made on the title's seed |
| The zoom down | mode `descend`, then `hold`; the far land thrown away ([coming down](shots/05-zooming-down.jpg), [arrived](shots/06-arrived.jpg)) |
| In a conversation | Map in the top bar; the map over the conversation with "Leave the conversation and walk here" ([map](shots/07-map-in-conversation.jpg)); the menu inside the screen ([phone](shots/08-menu-in-conversation.jpg), [desktop](shots/desktop-08-menu-in-conversation.jpg)) |

Seen and fixed on the way: the built ground showed as a dark textured square in the far land (now hidden while
high); clouds lit by the sun went dark purple at dusk (now painted in the sky's cloud colours); the site's card hid
the descent on a phone (now a one-line caption until the camera is there); the menu's rows overflowed their box.

## Claim boundary

- "Twice as far" is read as twice the map's width (decision 2); on a phone held upright the camera's far limit gives
  about 1.4 km across.
- The weather in the pictures is the clock's at the time of the run, and one held still; the "storm at night" picture
  is a held weather, whose phase did not give night.
- The older browser scripts (`layout-check`, `music-check`, `voice-check`, `narrator-check`, `road-shots` and others)
  were not run; those that click the old title's Enter or the top bar's gear need the menu now. `lib/play.mjs`'s
  `toRoad` and `toPortia` were updated.
- The mobile app (`mobile/`) is unchanged and its tests were not run.

## Open items

- The owner looks at the title on a phone: the distance, the speed of the turn, the clouds, and how long the far land
  takes to come up.
- Whether Ta Prohm and The Kiln should stay under "Other places" or go.
- The older browser scripts to be brought to the menu.
