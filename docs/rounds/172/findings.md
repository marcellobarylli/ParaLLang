# Round 172 findings

## Question

Is the rain a background sound, does it fall 15 % of the time, and does Settings have an Audio category with Master,
Music, Effects and Voice volumes?

## Finding

Yes. Not yet heard by ear: the levels are set by numbers, and the owner's listening is the check.

## Method

Unit and component tests; a production build of the page in headless Chromium at 390 × 844, Settings opened.

## Results

| Check | Result |
|---|---|
| Web client tests | 295 of 295 (292 before; 3 new: the categories and sliders, the volume buses, the rain under the music) |
| Server tests | 578 of 578; the weather test now holds rain to 15 % ± 3 % over 600 cycles on three seeds |
| Aesthetic package tests | 95 of 95 |
| Settings at phone width | Audio open with four sliders and the two switches; the other categories closed ([shot](shots/settings-audio.png)) |

## Open items

- The owner listens to the rain at the new level and says whether 0.035 is right.
- The sheet's title sits under the top bar's buttons at phone width (seen in the shot; not changed this round).
