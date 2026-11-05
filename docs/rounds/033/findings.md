# Round 033 findings

## Question

Can Mortimer, Flick and Marginalia unlock a fragment of *The Journey* the way Gerald does (round 032), with content
and tests only?

## Finding

Yes, in tests, with no server, app or prompt change. After three resolved party conversations each member recites
a fragment, which is filed in the Spellbook under that member's party conversation:
- Mortimer: "The forbidden herd". The sailors roast the Sun's sacred herd against Journathan's word, and since then
  whoever cuts meat asks permission.
- Flick: "The lotus". The sailors ask for "five minutes", then five more, and Journathan drags them to the ships.
- Marginalia: "The old dog". Only the old dog knows the returning beggar.

Flick and Marginalia now each have two fragments, one for completing their encounter (round 030) and one for the
conversations. Each note appears only where it belongs.

The stem check is now wider. It takes every word of 4 letters or more in every party conversation's targets, and
runs over every fragment, since the Spellbook shows all found texts during any conversation. It found a word in
round 030's Spanish "first stitch" ("de una rama a otra", which hits Marginalia's "otra vez"), and that text is
reworded.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 7 findings, all accepted (one as an open item). The Error was the plan's false
  claim that multi-word targets give no live stems (`otra vez` → `otra`).
- The plan's draft content and tests were in the working tree before the freeze (journal row 8).
- Drafting against the tests: the it lotus first used a planted `andarono` as a live check. Flick's stem is `andi`
  (andiamo), not `anda`, so the plant became `Insistevano` (`insi`). "más" / "più" were removed from the herd text
  by hand: they are 3 letters, below the stem length, and part of Mortimer's "un poco más".
- Tests on the Linux compute node. No live LLM runs (nothing reaches a prompt).

## Results

| Check | Before | After |
|---|---|---|
| server `node --test` | 156/156 | 157/157 (new: Mortimer's three resolved tastings; extended: seven fragments, per-pack stem lists, all fragments against all party stems with planted `buon`/`insi`, `buen`/`gust`/`junt`; three new members seeded at 2/2/2, 3/2/2, 3/3/3) |
| mobile jest | 68/68 | 69/69 (Marginalia's and Flick's two notes; none on a 4th conversation) |
| web client vitest, build | 12/12, ok | 12/12, ok |
| `npx expo-doctor` | 20/20 | 20/20 |

The pinned stems: it `buon otti graz mill piac anco andi insi mera nuov`; es `buen deli grac much gust poco vamo junt
prec otra`.

## Decision

Keep it. A12's per-member unlocks are done. Still open: tiers that change the conversation itself, and a Party-screen
hint (owner question).

## Evidence

The round's build commit; journal rows 5–10; `content/languages/{it,es}/lore/fragments.yaml`,
`server/test/lore-fragments.test.js`, `server/test/party-conversation.test.js`, `mobile/src/__tests__/fragments.test.js`.

## Claim boundary

Tests only. The six new texts (and the reworded es stitch) await a native speaker. Three-letter words of multi-word
targets ("más", "vez", "più") are not caught by the stem check; they were checked by hand in the new texts only, and
round 030's es "los más antiguos" stays. The Spellbook lists seven fragments flat in file order, without the member
or place (critique 1.6).

## Open items

1. Owner: review the three new texts in both packs, and the es first stitch rewording ("a la siguiente").
2. Owner, Simulator: the "from Mortimer / Flick / Marginalia" notes on the third conversation; the Spellbook's list of
   seven fragments (order, no grouping by member or place).
