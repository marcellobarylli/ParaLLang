# Round 205 findings

## Question

What happened to the trees in the owner's recording, and can it be kept behind a switch?

## Finding

Round 204 caused it. The road's weather effects set a sway on the leaves' material, and the shader moves each
corner of a leaf by the sway times the square of its texture coordinate ("weighted towards the tip": on the road's
crowns the coordinate runs 0 at the base to 1 at the tip). A dungeon's canopy uses the same material with a sway of
0 and is textured in metres, so its coordinates run far past 1; given the road's sway, each corner is thrown several
metres on its own sine, and the crown comes apart into shards. Round 204's check looked at the sky, the light and
the rain and did not look at a tree in wind.

## Results

| Check | Result |
|---|---|
| Leaves' sway in five weathers, three levels, Glitch off | 0 in all fifteen |
| The same with Glitch on | above 0, larger in a storm than on a clear day |
| Pictures of The Buttress Tree in light wind | [off](shots/glitch-off.jpg): whole crowns; [on](shots/glitch-on.jpg): shards, as in [the owner's recording](shots/00-the-owners-recording.jpg) |
| Client tests, build | 350 of 350; passes |
| On a phone | not checked |

## Claim boundary

- The glitch was live for every player in the legacy dungeons from round 204's deploy (23:13 UTC) until this one.
- With Glitch on, the strength follows the wind up to the cap; on a still day it is slight.
- The Kiln's trees are bare and Micromort's few: the effect shows mostly in Ta Prohm.
