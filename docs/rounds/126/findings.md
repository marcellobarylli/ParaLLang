# Round 126 findings

## Question
The owner asked for the characters to be voiced by type, for the player's voice to be recognised as text, in the
cheapest and easiest way, for Sonnet as the default model, and for what a turn spends its time on.

## Finding
Voices and the spoken answer are built in the web dungeon with the browser's own speech, at no cost and with no new
call to the model. They are proven by tests and a real-browser run with recorders, and not heard on a phone. The
Claude CLI provider did not default to Sonnet; it does now. A turn is two model calls in a row, each a new CLI
process, and almost nothing else.

## Method
`client/src/speech.js` wraps the browser's speech synthesis and recognition. The conversation sheet, the reply box
and Settings use it. Each character sheet got a `voice`, which the server validates and passes on with the
encounter. `server/src/config.js` gives `claude-cli` the model `sonnet` when `LLM_MODEL` is blank. Tests ran in the
cloud session's container. `client/scripts/voice-check.mjs` plays the first conversation of the built client in
headless Chromium against the real server code with the tests' fixture provider, recording what the page asks the
browser to say and feeding it what a recogniser would hear. The turn's steps were read from
`server/src/learning-service.js` (`submitDialogue`, `narrate`).

## Results
- **Voices.** A new line of the character is read when it arrives, and each line has a 🔊
  ([picture](shots/01-conversation.jpg)). The sheet's `voice` gives a kind and a pitch and rate:

  | Character | Kind | Pitch | Rate |
  |---|---|---|---|
  | Portia | female | 1.0 | 0.9 |
  | Gerald | creature | 1.7 | 1.15 |
  | Mortimer | male | 0.7 | 0.95 |
  | Flick | funny | 0.6 | 0.6 |
  | Marginalia | creature | 1.45 | 0.85 |
  | Bambieshart | male | 0.9 | 0.9 |
  | Errata | funny | 0.3 | 1.25 |

  The kind picks a system voice of the target language by name (Alice for `female`, Luca for `male`, and so on).
  A phone with one Italian voice gives every character that voice at its own pitch and rate.
- **The spoken answer.** The 🎤 listens in the target language and writes the words into the reply box as they are
  heard ([picture](shots/02-listening.jpg)). The player sends them. A refusal is said under the box with the way
  round it ([picture](shots/03-refused.jpg)).
- **Settings.** "Character voices", on by default, and a line on whether this browser can listen
  ([picture](shots/04-settings.jpg)).
- **Sonnet.** The hosted server set no `LLM_MODEL`, so the Claude CLI used the account's own default model. It now
  gets `--model sonnet`. `LLM_MODEL` overrides it; `LLM_MODEL=default` gives the account's default back.
- **What a turn does.** In order, inside one lock for the learner:
  1. Read the save and check the request (milliseconds).
  2. **Model call 1, the grader:** the objectives' rubric, the conversation so far and the answer; it returns a
     verdict for each open objective.
  3. Check the verdict against the answer and decide which objectives close (milliseconds).
  4. **Model call 2, the character's reply:** the style guide, the character, the conversation, the verdict and the
     share of target language wanted.
  5. Only if that line has no target language at all: **a third call** to write it again, given up after 20 s. It
     flagged 2 of 1,218 recorded lines (round 078).
  6. Match the line's vocabulary, update the review schedule, write the save, answer (milliseconds).

  Each model call starts a new `claude` process, and the two run one after the other. `docs/handoff.md` gives about
  15 s for a conversation's start (one call) and about 25 s for a turn (two calls) on the hosted server.
- **Tests.** Server 438 passing (436 before), client 172 (149 before). The build succeeds. The real-browser run:
  14 checks, 0 problems.

## Decision
Kept on the branch. The kinds' numbers and each character's voice are Claude's first choice.

## Evidence
- The owner's words: [`trail/interview.md`](trail/interview.md).
- Pictures: [`shots/`](shots/), from `client/scripts/voice-check.mjs`.
- Timeline: [`trail/journal.md`](trail/journal.md).
- Sources for the browser's limits:
  [WebKit bug 225298](https://bugs.webkit.org/show_bug.cgi?id=225298) (recognition in home-screen web apps),
  [Claude Code model configuration](https://code.claude.com/docs/en/model-config) (the `sonnet` alias, `default`).

## Claim boundary
Nothing was heard and nothing was said into a microphone. Not known: which Italian voices the owner's iPhone has
and how they sound at these pitches; whether iOS lets the page speak a reply that arrives seconds after the tap;
whether recognition works on the iPhone at all. WebKit's bug tracker and Apple's forum report that Safari's speech
recognition works in a Safari tab and not in a page opened from the home screen, which is how the owner plays; one
source disputes it. A mixed line is read whole by the target language's voice, so its English has that accent.
Sonnet's speed against the account's default is not measured: the session has no subscription token. The mobile
suite and the full playthrough (`dungeon-shots.mjs`) were not run. No Codex critique was made.

## Open items
- **Owner:** merge the branch to `main` to deploy it (the server too: the free plan's saves are wiped), then play a
  conversation on the iPhone, from the home screen and from a Safari tab, and say what the 🎤 does in each.
- **Owner:** tune the voices in `content/characters/enemies/*.yaml`; the kinds' defaults and name lists are
  `VOICE_KINDS` in `client/src/speech.js`.
- **If the iPhone will not listen from the home screen:** the keyboard's own microphone key dictates into the
  reply box today. A recorder that sends audio to a transcription service would work everywhere, and needs a paid
  key; it is not built.
- **If the phone's voices are not good enough:** a text-to-speech service gives real character voices and costs per
  character spoken; it is not built.
- **Speed, not built:** show the grader's verdict in the web client while the reply is written (the server offers
  it and the iPhone app uses it, round 070); `LLM_MODEL=haiku`, or Haiku for the grader alone; the Anthropic API in
  place of the CLI, which saves two process starts a turn and is paid by use; a paid Render plan, which does not
  sleep.
- The narrator's English text is not read aloud in the web dungeon (the iPhone app reads it on demand, round 061).
