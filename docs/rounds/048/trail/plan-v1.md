# Round 048 plan v1: deeper tiers for Mortimer, Flick and Marginalia (backlog G6)

Autonomous round (no owner). Round 047 built relationship tiers: a party conversation with `after_conversations: N`
is offered by Talk once the member has finished N conversations (deepest wins); Gerald's confidence is the only one
(at 3, when his Dead Branch fragment is found). This round adds one deeper tier at 3 for each other saveable member,
in both packs, content only. Each tier picks up the member's own third-conversation fragment of *The Journey*
(found at the same count), but the intent does not assume the player read it (as round 047, critique 1.6).

## Content (both packs; each: an encounter file with `party_of`, `after_conversations: 3`, and a vocabulary file)

1. **Mortimer's oath** (`mortimer_oath`, party_of `butchers_stall_charcutier`; fragment: the forbidden herd, "whoever
   cuts meat asks permission"). In his greeting Mortimer (no introduction, an old companion) admits, knife shaking,
   that he has never once asked a ham for permission and fears he is no better than Journathan's hungry sailors.
   - `calm_him`: tell him not to worry / to calm down: it *tranquillo* (variants tranquillo, tranquilla, tranquilli),
     es *tranquilo* (tranquilo, tranquila, tranquilos). Mortimer is male: tranquillo / tranquilo.
   - `promise`: he asks the player to promise to never touch the sacred herds (only lesser hams): it *prometto*
     (variants prometto; "lo prometto", "te lo prometto" match through the bare form), es *prometo*.
2. **Flick's lotus** (`flick_lotus`, party_of `cracked_fountain_letharger`; fragment: the lotus eaters, "five
   minutes"). In its greeting Flick (old companion) has lain down in the sand of the fountain's basin, eyes closing,
   murmuring "five minutes" like a lotus eater, and admits it is afraid it will forget the way.
   - `wake_up`: tell it to wake up: it *svegliati* (svegliati), es *despierta* (despierta, despiértate, despiertate).
   - `courage`: Flick, upright, says it cannot do it; encourage it: it *coraggio* (coraggio), es *ánimo* (ánimo,
     animo).
3. **Marginalia's folded page** (`marginalia_folded_page`, party_of `old_bookshop_bookworm`; fragment: the old dog
   who waited and recognised Journathan). In her greeting Marginalia (old companion) has closed the book and her
   eyes, and asks, like the old dog at the door, who is there.
   - `here_i_am`: answer "here I am": it *eccomi* (eccomi), es *aquí estoy* (aquí estoy, aqui estoy).
   - `not_alone`: she admits she has waited for a reader for a very long time, alone among the pages; tell her she is
     not alone: it *sola* in "non sei sola", es *sola* in "no estás sola". The target is *sola*; the negation is
     required (constraint): "Sei sola" / "Estás sola" fail.

Each objective: grammar constraints (who is addressed, gender), accepted examples including a variant form,
negative examples (English-only, quotation, talking about the word, negations where they invert the meaning),
`reference_meaning`, `hint_limit: 2`, an assessment reference URL (Treccani / RAE / Wiktionary). Intents say "in
his/her/its greeting he/she/it does not introduce himself" (round 047 Amendment 1) and that the NPC does not say the
target before the player.

Word checks done before drafting: no fragment of either pack holds a word starting with the new stems (it *tran*,
*prom*, *sveg*, *cora*, *ecco*, *sola*; es *tran*, *prom*, *desp*, *anim*, *aqui*, *esto*, *sola*). Rejected for a
stem clash with a fragment: *sempre*/*siempre* (Sirens), *ricorda* (old dog: *riconobbero*), *aspetto* (old dog),
*resto* (first stitch: *restava*), es *me quedo* (*quedaba*), *ti voglio bene* (lotus: *voglia*), *continua*
(*contento*). Overlap with other entries (party-conversation test): es *sola* vs *café solo* are different whole
words; *estoy* is a common word, but the form is the whole phrase *aquí estoy*.

## Tests

- `party-conversation.test.js`: the deeper tiers are now four (`gerald_confidence`, `mortimer_oath`, `flick_lotus`,
  `marginalia_folded_page`, each at 3 on its home); the conversation id list; party entries 11 → 17 per pack; the
  overlap and English-word checks cover the new forms; the NOT_IN_PARTY loop includes the new ids.
- `lore-fragments.test.js`: the stems list gains the new stems; every fragment still passes.
- `encounters.test.js`, `language-engine.test.js`: encounter key list and aggregate vocabulary version pins.
- `party-tiers.test.js`: for each of the three members, count 2 offers the first tier, count 3 the new one
  (`conversationTier` 3), and a scripted resolution with a fixture grader counts one conversation.
- Gerald's golden prompts unchanged (no template change).

## Live runs

codex-cli, `play-market.js --party --member <home> --tier 3`, it and es for each member (6 runs, about 12 calls
each). Scripts: an English line (should fail), a variant form (it *tranquilla*? no: Mortimer is addressed, so
*Tranquillo, Mortimer.*; Flick: es *¡Despiértate!*; Marginalia: es *¡Aqui estoy!* without accent), then the second
target. The bar: all resolve; the English line fails; the variant passes; each greeting is not a first meeting and
carries the tier's opening; `leak-scan.js` and a reading of every NPC line find no target form before its objective
is met (especially *sola*, which an NPC may say about herself: "sono sola").
