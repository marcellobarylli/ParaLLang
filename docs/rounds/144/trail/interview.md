# Interview: round 144

### Q0 (2026-11-22, 14:10 UTC approx.): the owner's request (no question was asked)
- **Options offered:** none.
- **Answer:** "Time for a big feature so we want a backbone of an infinitely generating landscape using fractal
  algorithms for landscape generation very simple trees and only ever generating the area around the player then we
  need a system for saving progress so that we can write our state and our everything, yeah, our game state then we
  want to include a curriculum. Please look up what the optimal learning for beginners is in a language currently
  it's character based that's fun we can make our characters focused around the curriculum. You can also look at
  Duolingo or other popular learning apps to see how they scale from basic stuff to and very important stuff that you
  need for basic communication all the way up to higher topics and make this curriculum then we need to basically map
  this curriculum to our endlessly generating 3-D landscape and Dott a bunch of random characters he can be
  placeholders for now no assets needed just descriptions. You can sample it based on the conversation. Make a funny
  character out of it make it patch it like and just do them around and basically go through the curriculum like that.
  Also the pacing should be matched with optimum learning so at a certain stage of difficulty you should spend enough
  time on given level also again kind of like how Duolingo does it or how textbooks do it so that we get enough time
  with each but it shouldn't get boring so I'm sure you should be able to progress nicely so in the end the game will
  be unreal. More or less you can think of it as a graph of points as a world map where you can choose where to go
  but more or less it does a graph walk over the endless landscape and the graph that is being walked is also
  calculated from the 3-D landscape that we generate first then generate the graph over it all procedural and there's
  you can go into the map and see where you wanna go or you can just do like random walk and say I wanna go here here
  here so basically do it on on rails so that you don't have to choose anything you just jump from encounter to
  encounter yeah so we wanna have a curriculum we wanna have fun encounters and we want a safe state so that we can
  that's very important to be able to save progress to see where we are in the curriculum go"

The answer reads as dictated speech. Claude's reading, which the owner has not confirmed:

- "Dott a bunch of random characters he can be placeholders" is "dot a bunch of random characters; they can be
  placeholders". "make it patch it like" is "make it Pratchett-like" (the style guide's manner since round 128).
  "a safe state" is "a save state". "the game will be unreal" is praise, not a request for the Unreal engine.
- **The landscape.** An endless landscape made by fractal algorithms, with very simple trees, of which only the area
  around the player exists at any time.
- **The graph.** A graph of points is computed from the generated landscape, also procedurally. It is the world map.
  The player may open the map and choose where to go, or play "on rails": the game walks the graph for them and jumps
  from encounter to encounter.
- **The curriculum.** Looked up, not invented: what is known about how beginners learn a language best, and how
  Duolingo and other popular apps and textbooks go from the basics needed to communicate up to higher topics. The
  characters are built around it.
- **The mapping.** The curriculum is laid over the landscape: the walk over the graph goes through the curriculum.
  Each point has a random character, described in words only (no assets), funny in Pratchett's manner, sampled from
  what the conversation is about.
- **Pacing.** Matched to what is known about learning: enough time at each level of difficulty, without boredom.
- **Saving.** "Very important": the whole game state is saved, and the player can see where they are in the
  curriculum.
- **"go":** build it now, on the most reasonable assumptions. The decisions Claude took are in the architecture
  record's Design and are reported in the findings' Open items.
