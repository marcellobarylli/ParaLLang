# Round 202 findings

## Question

Can the narrator sound less robotic on an iPhone?

## Finding: not with the phone's voice

A web page on iOS is given only a fixed set of Apple's basic voices. Reports to WebKit and on Apple's developer
forums say the enhanced and premium voices a user downloads in Settings do not appear to a page
([WebKit 290497](https://bugs.webkit.org/show_bug.cgi?id=290497),
[WebKit 250665](https://bugs.webkit.org/show_bug.cgi?id=250665),
[Apple forum 723503](https://developer.apple.com/forums/thread/723503),
[Readium's notes](https://readium.org/speech/docs/WebSpeech.html)); every browser on iOS is Safari's engine. So no
choice of voice name, pitch or rate in the page reaches a natural voice.

## Finding: Gemini's text-to-speech

Read through search summaries, because ai.google.dev is outside the session's network:

- Model `gemini-3.8-flash-tts`, through `v1beta/models/<model>:generateContent`, `responseModalities: ["AUDIO"]`
  and a `prebuiltVoiceConfig` voice name ([Google's page](https://ai.google.dev/gemini-api/docs/generate-content/speech-generation)).
- The answer is base64 16-bit PCM, 24 kHz, mono
  ([Google Cloud's guide](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/text-to-speech/overview)).
- Thirty voices; Charon is listed among the male ones
  ([Cloud TTS](https://cloud.google.com/text-to-speech/docs/gemini-tts)). Their characters were not found.
- Listed free on the free tier, with limits not published; paid, $10.80 per million audio tokens until 2026-12-31
  and $21.60 after ([pricing](https://ai.google.dev/gemini-api/docs/pricing)).

## Results

| Check | Result |
|---|---|
| Root `npm test`, client build | pass |
| A call to Google's model | not made |
| Heard in a browser or on a phone | no |

## Claim boundary

- Everything about Google's API here is from search summaries. If the model's name, the request or the answer
  differs, the narrator reads in the phone's voice as before and `/api/health` shows the reason under `narrator`.
- Charon was chosen by its listing as a male voice, unheard; `NARRATOR_VOICE` in Render changes it.
- A clip takes as long as Google takes; a narration starts later than the phone's voice did (not measured). After
  12 seconds the phone's voice reads it.
- The free allowance's size is not published. When it is spent the phone's voice is back until it renews.
- The characters still speak in the phone's voices.

## Open items

- The owner listens: the voice, the wait, how the Italian words in the English are said.
