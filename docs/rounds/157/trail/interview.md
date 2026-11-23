# Interview: round 157

### Q0 (2026-11-22): the owner's message in a cloud session (no question was asked)
- **Options offered:** none.
- **Answer:** "Pls implement all open issues one after the other, the dependencies and favourable order should be
  clear. Finish all issues autonomously, I am going to sleep"

Round 153's interview holds Claude's reading of it. This round is issue #5, whose body is:

> ## Goal
> Add a **guidebook** the player can open at any time. Some narration segments are hardcoded and, when first shown,
> are entered into the guidebook for later reference.
>
> ## Example entry
> **Turmeric text**: "Turmeric coloured text cannot be translated. It holds fragments of the truth of the world; to
> understand you must become a proficient speaker."
>
> Note: this example describes a feature that arrives with #4. Build the guidebook mechanism here with a placeholder
> or other entry; the "Turmeric text" entry itself is added in #4.
>
> ## Acceptance
> - Guidebook data lives in the save state (entries unlock when their narration fires).
> - UI to browse unlocked entries.
> - Content authored as data (YAML/JSON), not code.
