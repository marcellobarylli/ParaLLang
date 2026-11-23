# Round 168 findings

## Question

Can the people of the road hold the religion's teaching about the place below, each in their own way, without any
of them being told what is truly there?

## Finding

Yes, with what round 155 already built. The teaching is one more thing everybody knows, and a person's stance is
one more thing they may have noticed. Nothing new had to be made for it, and no character is told what is below.

## Method

The lore book written; the knowledge file changed; unit tests. No model was called.

## Results

| Check | Result |
|---|---|
| Server tests | 568 of 568 (567 before) |
| Web client tests | 288 of 288 (unchanged; the client is not touched) |
| The aesthetic package's tests | 95 of 95 |
| The iPhone app's tests | 320 of 320 |

| What every character is told | Before | Now |
|---|---|---|
| "What everybody knows", in words | 206 | 266 (limit 280, was 220) |
| The road's ordinary lines (A levels) | 10 | 14: two afraid, one who goes along, one who has never seen it |
| The road's knowing lines (from B1) | 8 | 10: two that doubt the people who teach it |

| What the owner said | Where it is now |
|---|---|
| A main religion in the world | Lore book, "The religion of the place below"; `knowledge.yaml`: "Most people keep the one faith, more or less" |
| It sort of knows of the gap between the worlds; perhaps its higher-ups know the actual nature of the world | Lore book; "Not settled" keeps the "perhaps". Not in the game |
| Its canon: the place below is hell or Hades | Lore book; `knowledge.yaml`: "the place under the ground is hell" |
| Fear keeps the general population from going there and in the dark | Lore book; `knowledge.yaml`: "nobody should go down looking for it, so caves, wells and deep cellars get a wide berth" |
| Ordinary people are followers ("I don't wanna go to hell") or sceptics ("I'm not sure I've never seen it for myself"), naturally | Six noticed lines on the road; the last sentence of what everybody knows |

## Decision

- **In the game now, not only in the book.** The owner described what encounters "can include" and asked for a
  deploy. The teaching is small, and round 155's layers were made for exactly this.
- **Nothing tells a character to raise it.** The prompt's existing rule (a detail now and then, in passing) governs
  it. A character who preached at a learner would be a worse character.
- **"Hell", not "Hades", in what characters are told.** One word, which the model can render in the language being
  learned. The lore book keeps both of the owner's.
- **Deployed with the server.** The change is in what the server tells the model, so the push to `main` carries no
  `[skip render]`.

## Evidence

- `content/world/knowledge.yaml`, `server/test/world-knowledge.test.js`.
- `docs/lore-book.md`.
- The trail: [`trail/interview.md`](trail/interview.md) (the owner's words).

## Claim boundary

As in the architecture: no live model was called, so how a character speaks of the faith has not been heard; the
target-language wording is the model's and unreviewed; every generated character of the road may now draw a
different noticed line than before.

## Open items

- The five questions added to the lore book's "Not settled".
- The authored characters (the market, Ta Prohm, the mountain) know the teaching but have no line of their own
  about it. Portia or Mortimer with a view on hell would be written by hand.
- The compiler's own book (parts I to XI) has no chapter on the religion. The compiler would know the canon.
