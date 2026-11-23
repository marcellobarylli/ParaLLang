# Interview: round 171

Round 170 (a local setup for friends: `PLAY.md`, `npm run setup`, a Gemini provider) was built, merged and then
withdrawn by the owner ("I think we should get rid of this whole update and reconceive from scratch"); it was reverted
with `456a521`. This round is the reconceived version. The questions that led to it are kept here.

### Q1 (2026-11-23): what the owner wanted from round 170
- **Answer:**

> the goal of this was to allow for Friends to have access to my build as I'm building it always get the newest
> updates and always just have to enter the same way.

> if somebody clicks on the link to this site that is hosted why can't they just play the latest version?

- **Read as:** friends play the hosted link, which always carries the latest build.

### Q2 (2026-11-23): whose model
- **Question (Claude's answer to "Why can't my friends use their own subscription?"):** Anthropic's documentation and
  news reports say consumer subscription tokens may not be used in third-party tools; a friend's subscription can be
  used only on their own computer.
- **Answer:**

> Okay, is there any other version where we could for example get free LLM usage no API costs

- **Options offered:** free API tiers (Gemini, Cerebras, Groq, OpenRouter); a model in the browser (WebLLM, Chrome's
  Gemini Nano); Ollama on the friend's computer.

### Q3 (2026-11-23): Gemini, and the owner's key
- **Answer:**

> if these are all equally simple for a new user to test my game in the way we want to test it then let's go with
> Gemini so we want as close to the following behaviour as possible. I sent this link to a friend they open it if
> there is no available AI model attached they are asked to follow the steps in a clear and straightforward fashion
> since it is only a handful of friends, can I just give them my Gemini Key?

- **Proposed:** the key on the server as a secret, not sent to friends; a friend code; friends' turns on Gemini, the
  owner's on Claude as before; when no model is available, a screen with three steps for a free key of their own.
- **Answer:**

> Hell yeah, let's go

- **Not asked, and decided here:** the friend's key kept in their browser and sent per request, never stored; the
  default model; the codes the page answers; the friend code accepted by the same token check.
