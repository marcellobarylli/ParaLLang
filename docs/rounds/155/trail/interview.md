# Interview: round 155

### Q0 (2026-11-22): the owner's message in a cloud session (no question was asked)
- **Options offered:** none.
- **Answer:** "Pls implement all open issues one after the other, the dependencies and favourable order should be
  clear. Finish all issues autonomously, I am going to sleep"

Round 153's interview holds Claude's reading of it. This round is issue #3, whose body is:

> ## Goal
> Bring encounter characters to life. The primary encounter stays the curriculum exercise, but characters drop small
> hints that they live in this world, and answer follow-up questions ("what do you mean by this?") with something,
> even if incomplete.
>
> ## Design principles
> - Characters are sampled from the world: they grew up there while the phenomena from the lore book were just
>   starting. They know only what they can observe. **Fish don't know they're in water.**
> - The truth unfolds slowly, Dark Souls 1 style (bits and pieces the player assembles). **A levels = normal-like
>   characters; B/C levels = characters who know more.**
> - **Regions**: each region has its own lore/story and the background its characters know (like local news and
>   history). Plus a **global knowledge** layer everyone shares (the "world is round" analogue: the fantasy world's
>   events and history).
> - Prototype: the one generated region acts as Tuscany. The LLM already knows Italy and Tuscany, so **no hardcoded
>   Italy text**.
>
> ## Constraint: minimal
> No bloat. Reuse the existing JSON character card system. Likely shape: one short `global` lore blurb + one short
> `region` lore blurb injected into the character prompt, plus a per-character "what they've noticed" line. Find the
> smallest change that works.
>
> ## Done when
> - Characters mention world details naturally and answer "what do you mean?" in character.
> - **Deployed.**
>
> Depends on the lorebook being settled (#12).
