import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import PronounceButton from './PronounceButton.js';
import { Button, colors, type, leading, Title, wordClassStyle } from './ui.js';
import { wordClassText } from '../wordClass.js';
import { stopSpeech } from '../speech.js';

export default function Spellbook({ spellbook, language, isLoading, onReview, onReadAnnex = () => {}, appInEncounter = false, onReturn, returnLabel = 'Return to the map', now = Date.now() }) {
  // Round 063 (backlog C10c): a word, fragment or line still being read stops when the Spellbook goes.
  useEffect(() => () => { stopSpeech(); }, []);
  const inEncounter = Boolean(spellbook.inEncounter);
  return (
    <ScrollView aria-label="Spellbook" contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View style={styles.headingText}><Title style={styles.title}>Spellbook</Title><Text style={styles.muted}>{spellbook.dueCount} due for review</Text></View>
        <Button label={returnLabel} onPress={onReturn} />
      </View>
      {inEncounter && spellbook.cards.length > 0 && <Text style={styles.hidden}>Meanings are hidden and reviews wait while an encounter is under way. Ask your companion for a hint instead.</Text>}
      {spellbook.cards.length === 0 ? (
        <View style={styles.card}><Text style={styles.cardTitle}>No vocabulary yet</Text><Text style={styles.body}>Words and phrases appear here after you encounter them.</Text></View>
      ) : spellbook.cards.map((card) => <Card key={card.vocabularyId} card={card} state={cardState(card, { inEncounter, now })} waits={cardWaits(card, spellbook, now)} language={language} isLoading={isLoading} onReview={onReview} />)}
      {!inEncounter && spellbook.cards.length > 0 && spellbook.dueCount === 0 && <Text style={styles.muted}>Nothing is due. Your next review times are shown on each card.</Text>}
      {spellbook.lines?.length > 0 && <>
        <Title style={styles.section}>Lines you translated</Title>
        {spellbook.lines.map((line) => <KeptLine key={line.id} line={line} hiddenBy={lineHiddenBy(line, spellbook, now)} language={language} />)}
      </>}
      {spellbook.containmentFiles?.length > 0 && <>
        <Title style={styles.section}>Containment files</Title>
        {spellbook.containmentFiles.map((file) => <ContainmentFile key={file.designation} file={file} language={language} inEncounter={inEncounter || appInEncounter} isLoading={isLoading} onReadAnnex={onReadAnnex} />)}
      </>}
      {spellbook.journeyFragments?.length > 0 && <>
        <Title style={styles.section}>Fragments of The Journey</Title>
        {spellbook.journeyFragments.map((fragment) => <Fragment key={fragment.id} fragment={fragment} language={language} />)}
      </>}
      {spellbook.inscriptions?.length > 0 && <>
        <Title style={styles.section}>Inscriptions</Title>
        {spellbook.inscriptions.map((inscription) => <InscriptionCard key={inscription.id} inscription={inscription} language={language} />)}
      </>}
    </ScrollView>
  );
}

// Round 017: a card never shows the answer the game is asking for. While an encounter is under way no card shows a
// meaning, note or translated example (any of them could answer the NPC's protected line) and reviews wait; a due
// card hides its meaning until its review. Due is checked against the clock, so a card that falls due while the
// snapshot is old is hidden too.
export function cardState(card, { inEncounter = false, now = Date.now() } = {}) {
  if (inEncounter) return 'inEncounter';
  return card.due || new Date(card.nextReviewAt).getTime() <= now ? 'due' : 'reference';
}

// Round 090 (review R1.2 of rounds 029–039): a readable card must not answer a due one. Its meaning waits while a card
// in its own form is due (a phrase's word), its example's English while a card in the form or the example is due.
// Checked by the clock, like the cards themselves; an older server sends no lists, so nothing more waits.
export function cardWaits(card, spellbook, now = Date.now()) {
  const due = new Set((spellbook.cards ?? []).filter((other) => cardState(other, { now }) === 'due').map((other) => other.vocabularyId));
  // Round 106 (review R1.4): what the server withheld waits too, so the card says why instead of a blank.
  const meaning = (card.formCardIds ?? []).some((id) => due.has(id)) || card.withheld?.meaning === true;
  return { meaning, example: meaning || (card.exampleCardIds ?? []).some((id) => due.has(id)) || card.withheld?.example === true };
}

// Round 060 (backlog C9): why a kept line's translation is withheld, or null. The server withholds it during an
// encounter and while a card in the line is due; the app checks the cards by the clock too, for a stale snapshot.
export function lineHiddenBy(line, spellbook, now = Date.now()) {
  if (spellbook.inEncounter) return 'encounter';
  const ids = new Set(line.cardIds ?? line.vocabularyIds ?? []); // round 088: every card in the line (older servers: its chips)
  if (line.hidden || !line.translation) return 'review';
  return spellbook.cards.some((card) => ids.has(card.vocabularyId) && cardState(card, { now }) === 'due') ? 'review' : null;
}

const LINE_WAIT = {
  encounter: 'The translation waits until the encounter is over.',
  review: 'The translation waits until you review its words.',
};

function KeptLine({ line, hiddenBy, language }) {
  const [open, setOpen] = useState(false);
  const name = language?.name ?? 'the target language';
  const source = [line.speaker, line.locationName].filter(Boolean).join(', at ');
  return (
    <View style={styles.card} aria-label={`Line from ${line.speaker}`}>
      <Text style={styles.source}>{source}</Text>
      <View style={styles.cardRow}>
        <Text style={[styles.passage, styles.lineText]} accessibilityLanguage={language?.tag}>{line.native}</Text>
        <PronounceButton text={line.native} language={language} label={`Hear the line in ${name}`} />
      </View>
      {hiddenBy ? <Text style={styles.hidden}>{LINE_WAIT[hiddenBy]}</Text> : <>
        <Button label={open ? 'Hide translation' : 'Show translation'} expanded={open} onPress={() => setOpen(!open)} style={styles.review} />
        {open && <Text style={styles.example}>{line.translation}</Text>}
      </>}
    </View>
  );
}

// Round 028 (backlog B4): the deadpan file for each infohazard met (LORE.md). No file holds an objective's answer
// (server test), so files show during encounters too.
const PROPERTIES = [['virulence', 'Virulence'], ['harm', 'Harm'], ['incubation', 'Incubation'], ['vector', 'Vector'], ['containment', 'Containment']];
function ContainmentFile({ file, language, inEncounter, isLoading, onReadAnnex }) {
  return (
    <View style={styles.card} aria-label={`Containment file ${file.designation}`}>
      <Text role="heading" style={styles.cardTitle}>{file.designation}: <Text accessibilityLanguage={language?.tag}>{file.name}</Text></Text>
      <Text style={styles.small}>Class: {file.class} · Recovered at {file.locationName}</Text>
      {PROPERTIES.map(([key, label]) => <Text key={key} style={styles.body}><Text style={styles.strong}>{label}: </Text>{file.properties[key]}</Text>)}
      {file.notes.map((note) => <Text key={note} style={styles.small}>{note}</Text>)}
      {file.annex && <Annex annex={file.annex} language={language} inEncounter={inEncounter} isLoading={isLoading} onRead={onReadAnnex} />}
    </View>
  );
}

// Round 111 (backlog B8): a passage the companion blacked out (LORE.md, Infohazards). Unread, the payload holds no
// text: black bars stand in for it, with the companion's line, which states the cost. Reading asks first, through
// the system alert, and waits while an encounter is under way. Read, it is shown as a fragment is.
const REDACTED_BARS = [0.92, 0.78, 0.86, 0.55];
function Annex({ annex, language, inEncounter, isLoading, onRead }) {
  const [open, setOpen] = useState(false);
  const name = language?.name ?? 'the target language';
  const confirmRead = () => Alert.alert(
    `Read ${annex.title}?`,
    'Your companion will need a while to recover: a hint fewer for each task of the next conversation you finish.',
    [{ text: 'Leave it redacted', style: 'cancel' }, { text: 'Read it', style: 'destructive', onPress: () => onRead(annex.id) }],
  );
  if (!annex.read || !annex.text) {
    return (
      <View style={styles.annex} aria-label={`${annex.title}, redacted`}>
        <Text role="heading" style={styles.annexTitle}>{annex.title}</Text>
        <View accessible aria-label="Redacted text" style={styles.bars}>
          {REDACTED_BARS.map((width) => <View key={width} style={[styles.bar, { width: `${width * 100}%` }]} />)}
        </View>
        <Text style={styles.body}>{annex.redaction}</Text>
        {inEncounter ? <Text style={styles.hidden}>Your companion keeps it redacted while a conversation is under way.</Text>
          : <Button label="Read it anyway" disabled={isLoading} onPress={confirmRead} style={styles.review} />}
      </View>
    );
  }
  return (
    <View style={styles.annex} aria-label={annex.title}>
      <View style={styles.cardRow}>
        <Text role="heading" style={styles.annexTitle}>{annex.title}</Text>
        <PronounceButton text={annex.text} language={language} label={`Hear the annex in ${name}`} />
      </View>
      <Text style={styles.passage} accessibilityLanguage={language?.tag}>{annex.text}</Text>
      {annex.hidden || !annex.translation ? <Text style={styles.hidden}>The translation waits until the encounter is over.</Text> : <>
        <Button label={open ? 'Hide translation' : 'Show translation'} expanded={open} onPress={() => setOpen(!open)} style={styles.review} />
        {open && <View style={styles.translation}>
          {(annex.glossary ?? []).map((entry) => (
            <Text key={entry.word} style={styles.body}><Text style={styles.strong} accessibilityLanguage={language?.tag}>{entry.word}</Text>: {entry.meaning}</Text>
          ))}
          <Text style={styles.example}>{annex.translation}</Text>
        </View>}
      </>}
      {annex.exposureNote && <Text style={styles.small}>{annex.exposureNote}</Text>}
      {annex.strainPending && <Text style={styles.hidden}>Your companion is still recovering: a hint fewer for each task of your next conversation.</Text>}
    </View>
  );
}

// Round 030 (backlog A9): a passage of The Journey in the target language. Optional to translate: the glossary and
// translation stay behind a toggle, and the server withholds them during an encounter (`hidden`).
// Round 036: where a fragment came from: the member who told it, or the place it was found. An older server sends
// no `toldBy`, and its conversation fragments carry their member's home as `locationName`: no line then (critique 1.1).
export function fragmentSource(fragment) {
  if (fragment.toldBy) return `Told by ${fragment.toldBy}`;
  if (fragment.unlockedAt !== undefined) return null;
  if (fragment.locationName) return `Found at ${fragment.locationName}`;
  return null;
}

function Fragment({ fragment, language }) {
  const [open, setOpen] = useState(false);
  const name = language?.name ?? 'the target language';
  const source = fragmentSource(fragment);
  return (
    <View style={styles.card} aria-label={source ? `Fragment: ${fragment.title}, ${source[0].toLowerCase()}${source.slice(1)}` : `Fragment: ${fragment.title}`}>
      <View style={styles.cardRow}>
        <Text role="heading" style={styles.cardTitle}>{fragment.title}</Text>
        <PronounceButton text={fragment.text} language={language} label={`Hear the fragment in ${name}`} />
      </View>
      {source && <Text style={styles.source}>{source}</Text>}
      <Text style={styles.small}>{fragment.found}</Text>
      <Text style={styles.passage} accessibilityLanguage={language?.tag}>{fragment.text}</Text>
      {fragment.hidden ? <Text style={styles.hidden}>The translation waits until the encounter is over.</Text> : <>
        <Button
          label={open ? 'Hide translation' : 'Show translation'} expanded={open}
          onPress={() => setOpen(!open)} style={styles.review}
        />
        {open && <View style={styles.translation}>
          {fragment.glossary.map((entry) => (
            <Text key={entry.word} style={styles.body}><Text style={styles.strong} accessibilityLanguage={language?.tag}>{entry.word}</Text>: {entry.meaning}</Text>
          ))}
          <Text style={styles.example}>{fragment.translation}</Text>
        </View>}
      </>}
    </View>
  );
}

// Round 082: an inscription found at a visited place. Optional to translate, as a fragment: the glossary and
// translation stay behind a toggle and the server withholds them during an encounter (`hidden`).
function InscriptionCard({ inscription, language }) {
  const [open, setOpen] = useState(false);
  const name = language?.name ?? 'the target language';
  return (
    <View style={styles.card} aria-label={`Inscription at ${inscription.locationName}`}>
      <View style={styles.cardRow}>
        <Text role="heading" style={styles.cardTitle}>{inscription.locationName}</Text>
        <PronounceButton text={inscription.text} language={language} label={`Hear the inscription in ${name}`} />
      </View>
      <Text style={styles.small}>{inscription.where}</Text>
      <Text style={styles.passage} accessibilityLanguage={language?.tag}>{inscription.text}</Text>
      {inscription.hidden ? <Text style={styles.hidden}>The translation waits until the encounter is over.</Text> : <>
        <Button label={open ? 'Hide translation' : 'Show translation'} expanded={open} onPress={() => setOpen(!open)} style={styles.review} />
        {open && <View style={styles.translation}>
          {inscription.glossary.map((entry) => (
            <Text key={entry.word} style={styles.body}><Text style={styles.strong} accessibilityLanguage={language?.tag}>{entry.word}</Text>: {entry.meaning}</Text>
          ))}
          <Text style={styles.example}>{inscription.translation}</Text>
        </View>}
      </>}
    </View>
  );
}

// Round 059 (backlog C8): the card's class in the chip's colour (noun, verb, adjective), muted text otherwise; the
// card's frame stays neutral (decision 2). Shown in every state: the class is not the meaning.
function ClassWord({ partOfSpeech }) {
  const label = wordClassText(partOfSpeech);
  if (!label) return null;
  return <><Text style={label.cls ? [styles.classWord, wordClassStyle(label.cls).label] : null}>{label.text}</Text>{' · '}</>;
}

function Card({ card, state, waits = { meaning: false, example: false }, language, isLoading, onReview }) {
  return (
    <View style={styles.card} aria-label={`Card ${card.target}`}>
      <View style={styles.cardRow}><Text role="heading" style={styles.cardTitle} accessibilityLanguage={language?.tag}>{card.target}</Text><PronounceButton text={card.target} language={language} /></View>
      {state === 'reference' && !waits.meaning && card.meanings && <Text style={styles.body}>{card.meanings.join(' · ')}</Text>}
      {state === 'reference' && waits.meaning && <Text style={styles.hidden}>Meaning hidden until you review its words.</Text>}
      {state === 'due' && <Text style={styles.hidden}>Meaning hidden until you review it.</Text>}
      {state !== 'inEncounter' && card.example && (
        <Text style={styles.example} accessibilityLanguage={language?.tag}>{card.example.target}{state === 'reference' && !waits.example && card.example.english != null && <Text style={styles.small}>{` (${card.example.english})`}</Text>}</Text>
      )}
      {state === 'reference' && !waits.meaning && card.note && <Text style={styles.small}>{card.note}</Text>}
      <Text style={styles.small}><ClassWord partOfSpeech={card.partOfSpeech} />Mastery: <Text style={styles.strong}>{card.mastery}</Text></Text>
      {state !== 'inEncounter' && <Text style={styles.small}>{state === 'due' ? 'Due now' : `Next review: ${new Date(card.nextReviewAt).toLocaleString()}`}</Text>}
      {state === 'due' && <Button label="Review" variant="primary" disabled={isLoading} onPress={() => onReview(card.vocabularyId)} style={styles.review} />}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headingText: { flexShrink: 1 }, // round 042 (critique 1.6): a wider serif title wraps instead of pushing the button
  title: { fontSize: type.title1, fontWeight: '700', color: colors.ink },
  section: { fontSize: type.title3, fontWeight: '700', color: colors.ink, marginTop: 8 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: type.title3, fontWeight: '600', color: colors.ink },
  review: { alignSelf: 'flex-start', marginTop: 6 },
  body: { color: colors.ink, fontSize: type.subhead },
  hidden: { color: colors.muted, fontSize: type.subhead, fontStyle: 'italic' },
  example: { color: colors.ink, fontSize: type.subhead },
  source: { color: colors.accent, fontSize: type.footnote, fontWeight: '600' },
  // Round 111: a redacted annex inside its containment file.
  annex: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 8, paddingTop: 8, gap: 4 },
  annexTitle: { fontSize: type.subhead, fontWeight: '700', color: colors.ink },
  bars: { gap: 6, marginVertical: 4 },
  bar: { height: 12, borderRadius: 2, backgroundColor: colors.ink },
  passage: { color: colors.ink, fontSize: type.callout, lineHeight: leading.callout, fontStyle: 'italic' },
  translation: { gap: 4, marginTop: 4 },
  lineText: { flexShrink: 1 },
  strong: { fontWeight: '700' },
  classWord: { fontWeight: '600' },
  small: { color: colors.muted, fontSize: type.footnote },
  muted: { color: colors.muted, fontSize: type.subhead },
});
