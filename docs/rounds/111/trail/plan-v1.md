# Round 111 plan v1: a redacted infohazard annex (backlog B8)

Autonomous round, offline (no LLM call; Codex limited until 2026-11-09 17:32 UTC). Source: LORE.md, Infohazards,
"Gameplay hooks": "some untranslated passages are infohazards. Translating them gives juicy lore, but at a cost";
"the companion can redact or blur a hazard, but it is limited during certain events". The notes are not edited.

## Goal

One redacted passage, attached to containment file CM-001 (the Cracked Fountain's jingle, filed when Flick's
encounter is completed, mid-game). The Spellbook shows it blacked out with the companion's line ("I have blacked this
one out. Trust me."). The player may read it anyway; then the target-language text shows (translation and glossary
behind the usual toggle), the file gains an exposure note naming the reader, and the cost applies: **the companion
needs to recover, so the next conversation the player finishes has one hint fewer for each objective** (floor 0).

## Design

1. **Content.** `containment_file.annex` (optional, location encounters only via the existing rule), strict schema:
   `id`, `title` (English), `redaction` (English, the companion's line, states the cost), `text` (target language),
   `translation` (English), `glossary` (4–10 `{ word, meaning }`), `exposure_note` (English). Both packs, the same
   English. Annex ids unique across encounters.
2. **Text rules.** The annex text passes the shared answer check (`server/test/answer-check.js`: no pack form, no
   party-conversation stem), as inscriptions and fragments do, so it may show at any time once read. Its English
   (title, redaction, exposure note) holds no accepted translation of an objective target (round 110's English check).
3. **Save.** `envelope.annexes`: optional array of `{ id, readAt, strainSpentOn }` (`strainSpentOn`: null or the
   encounter id whose resolution spent the strain). Storage validation as for `lines`: container strict, invalid
   entries dropped, unknown ids kept harmlessly. No schema version bump (optional field, older saves have none).
4. **Route.** `POST /api/spellbook/annex/read` `{ annexId }` → `{ spellbook, charged }`. 404 `NOT_FOUND` for an
   unknown id; 409 `NOT_FILED` before its containment file is filed; 409 `IN_ENCOUNTER` while an encounter is ongoing
   (the redaction holds during events; also keeps the strain from landing mid-conversation). A second read is
   `charged: false` and changes nothing. Serialized per learner like other writes.
5. **Strain.** Pending while any read annex has `strainSpentOn: null`. A session started while it is pending carries
   `strained: true` (decided at start; a resumed session keeps what it had). Effective hint limit per objective:
   `max(0, hint_limit − 1)` in a strained session, used by both `serializeEncounter` (hints, `hints_available`) and
   `revealHelp` (`HINTS_EXHAUSTED`). When a strained session resolves (location or party conversation), every pending
   annex gets `strainSpentOn = encounter id` in the same staged save. A restart or a server restart does not spend it
   (the next session is strained again). `hints.strained` in the encounter payload.
6. **Snapshot.** Each containment file gets `annex` (or none): `{ id, title, redaction, read, readAt, strainPending,
   text: read ? text : null, translation/glossary: read && !inEncounter ? … : null, hidden: inEncounter,
   exposureNote: read ? note : null }`. Unread: no text in the payload.
7. **App (mobile).** `ContainmentFile` shows the annex: title, a redacted block (black bars, no text), the redaction
   line, and "Read it anyway" (disabled with a note during an encounter). It asks first (`Alert.alert`, "Read it" /
   "Leave it redacted"). Store action `readAnnex(annexId)` (api `readAnnex`), applies the returned Spellbook
   (isLoading, error shown). Once read: the text with a pronounce button, translation toggle, exposure note, and "Your
   companion is still recovering" while the strain is pending. Dialogue panel: "Hints: n/m" gains "(your companion is
   recovering)" when `hints.strained`.
8. **Web client.** Frozen; it ignores the new fields. The contract test is unchanged.

## Tests

- Server: schema accepts the annex and rejects extras; annex text answer check (both packs) and the English check;
  read route: 404, 409 NOT_FILED, 409 IN_ENCOUNTER, first read charged, second not; snapshot unread has no text;
  strained session: hint limits minus one in payload and `HINTS_EXHAUSTED` earlier; resume keeps it; restart still
  strained; resolution spends it (next session not strained); storage drops malformed annex entries.
- Mobile: Spellbook redacted vs read rendering, confirm before calling, disabled during encounters; store `readAnnex`
  applies the Spellbook and shows an error; dialogue strained hint line; api path.
- Full suites: server, client, mobile; `expo-doctor` not needed (no dependency change).

## Not in scope

More annexes; a cost that uses SM-2 (an earworm); companion redaction during specific events beyond encounters.
