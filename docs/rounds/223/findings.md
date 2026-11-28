# Round 223 findings

## Question

Can Japanese and Chinese be played, in rōmaji and pinyin only, on the hosted game?

## Finding

Yes, in tests and in headless Chromium against a local server playing five languages. Not yet seen on the hosted page
or played with a model, and neither pack has been read by a native speaker.

## Method

Each pack written by eight subagents (four groups of encounters and lore, three curriculum stages, then Errata), each
group checked alone with `tools/check_pack.mjs --only`; one subagent per language merged the curriculum stages. Then
the whole pack through the server's own loader, the market's form-conflict check over market and curriculum, the test
suites, and the production build in headless Chromium.

## Results

| Check | Result |
|---|---|
| Japanese pack | 16 encounters, 83 market entries, 496 curriculum entries (36 units, 108 lessons), 10 fragments, 6 inscriptions, 13 truths; no shared form |
| Chinese pack | 16 encounters, 84 market entries, 495 curriculum entries, 10 fragments, 6 inscriptions, 13 truths; no shared form |
| Script | no kana, kanji, hanzi or CJK punctuation in either pack (test) |
| Prompts | the `WRITING` rule in the narration and both grading prompts of ja and zh; none in it, es, fr (test) |
| Tests | server 640, client 394, aesthetic 96, mobile 320, all pass |
| In the browser | the title offers Italian, French, Spanish, Japanese, Chinese; Japanese pressed asks "How much Japanese do you speak?" (`parallang.language` = ja) ([shot](shots/title-japanese.png)) |
| Curriculum merge | ja: 26 later definitions removed (18 ids defined twice, 7 words under two ids); zh: 26 removed, 2 words under two ids merged |

## Claim boundary

- Deployed: the Pages client (run 120, success). Render's auto-deploy of the server from `main` was not seen: this
  session cannot reach Render (network policy).

- Authored by Claude, not checked by a native speaker; dictionary URLs follow the sites' patterns and were not opened.
  "Daredemonai" and "Wúrén" as the Odyssey's Nobody were not checked against a translation.
- No conversation was played with a model in either language: whether the model keeps to rōmaji and pinyin is
  untested.
- Speech: a character's line is read by the device's Japanese or Chinese voice, which may read rōmaji and pinyin
  badly. Not heard.
- The lore answer checks (`annex`, `lore-fragments`, `inscriptions`) and the encounter-specific tests run on Italian and
  Spanish only (as for French); subagents ran the same checks on ja and zh by script. Their four-letter-stem rule
  cannot hold for pinyin, built from the same short syllables; Japanese leaves `nijū` (as Italian `venti`) and the
  English "is" and "me".
- Pinyin without tones: a few one-syllable forms are also other words (`shí` ten and `shì` to be; `yú` fish and `yǔ`
  rain); the grader decides. In the Japanese curriculum some spellings now count as a later word (`dochira` is
  "which", `Hontō ni?` is "really").
- The iPhone app sends no language and plays the server's default. The truths are not in
  `parallang_obsidian/Understood Later.md`.

## Open items

- A native speaker reads both packs, starting with the curriculum and the lore.
- The owner plays a Japanese and a Chinese game on the hosted page.
- Decide how the lore answer checks treat pinyin before ja and zh join them.
