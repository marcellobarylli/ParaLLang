# Round 126 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-19 by the owner's reply to round 125's
report in a Claude Code cloud session, not through the round pipeline. Sections marked *pre-run* must not be edited
after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section,
added later. The full record (the owner's words, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** rounds 055 and 061 (speech in the iPhone app), round 115 (the dungeon's conversation sheet),
  round 002 (the CLI providers).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `client/src/speech.js` (new), `client/src/components/` (`InputBar`, `DialoguePanel`,
  `DungeonScreen`, `SettingsSheet`), `client/src/display.js`, `content/characters/enemies/*.yaml`,
  `server/src/content-loader.js`, `server/src/learning-service.js`, `server/src/config.js`.

## Goal (pre-run)

1. The dungeon's characters speak their lines aloud, each in a voice of its own type.
2. The player can speak an answer and have it written into the reply box.
3. The Claude CLI provider uses Sonnet unless told otherwise.
4. The owner is told what a turn spends its time on.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md) (Q0):

- "The characters need to be voiced, and the users voice needs to be recognised as text."
- "the cheapest and easiest way to wire it into the existing LLMs".
- Voices "that can change type (male, female, miscellaneous for non-humans, funny etc)", "if possible".
- "standard models should default to sonnet if not yet".

Claude's decisions:

- **Decision 1: both directions run in the browser, at no cost.** The existing model is Claude through the owner's
  subscription CLI, which takes and gives text only. So speech is added at the two ends of the text, in the web
  client: the browser's speech synthesis reads a line (the word buttons already use it) and the browser's speech
  recognition writes the answer. Nothing changes on the server's path to the model, no key is needed and no call is
  added to a turn. A paid speech service is the alternative when the browser's is not good enough; it is not built.
- **Decision 2: the web dungeon.** It is what the owner plays on the iPhone. The Expo app already speaks word chips
  and the narrator (rounds 055, 061) and is not changed.
- **Decision 3: the voice type is content.** A character's sheet may carry `voice: { kind, pitch, rate }`. The
  kinds are `female`, `male`, `creature` (non-humans) and `funny`. The server passes the sheet's voice on with the
  encounter; the client turns it into a system voice, a pitch and a rate.
- **Decision 4: the spoken answer is written, not sent.** Recognition fills the reply box and the player sends it.
  A misheard word would otherwise be graded.
- **Decision 5: the recogniser listens in the target language.** The answers are in it.
- **Decision 6: voices are on by default, with a switch in Settings.** The owner said the characters need to be
  voiced.
- **Decision 7: Sonnet by default for `claude-cli` only.** With no `LLM_MODEL` the CLI used the account's own
  default. It now gets `--model sonnet`. `LLM_MODEL` still overrides, and `LLM_MODEL=default` gives the account's
  default back. The Codex CLI keeps its own default: Sonnet is not its model.

## Design (pre-run)

### Speaking (`client/src/speech.js`)

- `voiceProfile(voice)` gives a kind's pitch and rate, with the sheet's own `pitch` and `rate` over them:
  `female` 1.1 / 0.95, `male` 0.8 / 0.95, `creature` 1.6 / 1.05, `funny` 0.5 / 0.8. No voice on the sheet is pitch 1,
  rate 1.
- `pickVoice(voices, tag, profile)` takes the system's voices of the target language and prefers, in order, a name
  the kind lists (Apple's and Google's Italian and Spanish voices by gender), then a voice marked enhanced or
  premium, then the first. A device with one Italian voice gives every character that voice, told apart by pitch
  and rate.
- A line is spoken whole in the target language's voice. The English in a mixed line comes out with that accent.
- **When.** A new line of the character is spoken when it arrives, and each line has a 🔊 to hear it again. The
  voice stops when the player sends, starts the microphone, leaves the conversation or switches voices off.
- **iOS.** Safari lets a page speak on its own only after it has spoken once from inside a tap. The first tap on
  the page speaks an empty utterance.

### Listening

- `createListener` wraps `SpeechRecognition` (`webkitSpeechRecognition` in Safari), in the target language's tag,
  with interim results. The reply box gets a 🎤 where the browser has it. A tap starts it, the words appear in the
  box as they are heard, and a second tap or a pause ends it.
- A refusal (no permission, no service) is said in one line under the box, with the way round it: the keyboard's
  own dictation key.
- Where the browser has no recognition the button is absent, and Settings says so.

### Voices in the content

Each of the seven character sheets gets a `voice`. Portia: `female`, a little slow. Gerald: `creature`, quick.
Mortimer: `male`, deep. Flick: `funny`, very slow. Marginalia: `creature`, soft and slow. Bambieshart: `male`.
Errata: `funny`, fast and low.

### Sonnet

`resolveLLMConfig` gives `claude-cli` the model `sonnet` when `LLM_MODEL` is blank.

## Claim boundary (pre-run)

The session has no phone, no loudspeaker and no microphone. Headless Chromium has no installed voices and no
recognition service. So the tests prove the choosing of voices, the wiring and the text that would be spoken, with
fakes of the two browser interfaces. How the voices sound, which Italian voices the owner's iPhone has, and whether
recognition works at all on the iPhone are the owner's observation. Reports say Safari's recognition does not work
in a page opened from the home screen, which is how the owner plays; the round cannot check it. The speed of
Sonnet against the account's default is not measured: the session has no subscription token.

## Tests (pre-run)

- **Speech:** a kind's pitch and rate and the sheet's overrides; the voice chosen for each kind from a list like an
  iPhone's and from a list with one voice; no voice of the language gives none; the speaker cancels the line before,
  speaks with the chosen voice, pitch and rate, and stops; the listener reports interim and final words, an error
  and its end.
- **Screen:** a character's new line is spoken once with its sheet's voice; the 🔊 repeats it; sending stops the
  voice; with voices off nothing is spoken; the 🎤 writes heard words into the box and does not send; a refusal
  shows the line.
- **Settings and display:** `voices` loads on, saves, and the box switches it.
- **Server:** a sheet's voice is validated and comes with the encounter; all seven sheets carry one; `claude-cli`
  without `LLM_MODEL` resolves to `sonnet`, with it to its value, and the other providers are as before.
- All server and client suites and the build keep passing.

## Outcome (2026-11-19)

Built as designed on the branch `claude/inspiring-hypatia-xoybb3` as `c9a2ce7`. It is not merged to `main`, so it
is not deployed. In the web dungeon each character reads its new lines aloud in the voice its sheet names, each line
has a 🔊, and a 🎤 beside the reply box writes what the player says where the browser can listen. All seven sheets
carry a voice. The Claude CLI provider asks for Sonnet unless `LLM_MODEL` is set. Server 438 and client 172 tests
pass, and a real-browser run of the first conversation passes with recorders in place of the browser's speech. The
claim boundary held: nothing was heard, no phone was used, and Sonnet's speed is not measured. What a turn spends
its time on is in [`findings.md`](findings.md); the owner's words are in [`trail/interview.md`](trail/interview.md).
