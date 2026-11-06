import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, colors, type, leading, Title } from './ui.js';
import PartyOffer, { inParty } from './PartyOffer.js';
import NarratorButton, { speechText } from './NarratorButton.js';
import { stopSpeech } from '../speech.js';

const NODE = 18;

// A path between two map points, drawn as a thin rotated View (no SVG dependency).
function Path({ from, to, size }) {
  const x1 = from.x * size; const y1 = from.y * size;
  const x2 = to.x * size; const y2 = to.y * size;
  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  return <View
    pointerEvents="none"
    style={[styles.path, { width: length, left: (x1 + x2) / 2 - length / 2, top: (y1 + y2) / 2 - 1, transform: [{ rotate: `${angle}rad` }] }]}
  />;
}

// Round 014: a gated location (The Rift) is sealed until the encounters it requires are complete.
const isSealed = (location) => location.gate?.sealed === true;
const sealNote = (gate) => `sealed: ${gate.completed} of ${gate.required} encounters complete`;

function nodeLabel(location) {
  if (location.state === 'current') return `${location.name}, you are here`;
  if (isSealed(location)) return `${location.name}, ${sealNote(location.gate)}`;
  const done = location.encounter?.completed ? ', encounter complete' : '';
  if (location.adjacent) return `Walk to ${location.name}${location.state === 'known' ? ', unexplored' : done}`;
  return `${location.name}${location.state === 'known' ? ', unexplored' : done}, not reachable from here`;
}

function Node({ location, size, onMove, disabled }) {
  const current = location.state === 'current';
  const sealed = isSealed(location);
  return (
    <View style={[styles.nodeWrap, { left: location.map.x * size - 60, top: location.map.y * size - NODE / 2 }]}>
      <Button
        accessibleName={nodeLabel(location)}
        onPress={() => onMove(location.id)}
        disabled={disabled || current || !location.adjacent || sealed}
        dim={false}
        variant="text"
        style={styles.nodeButton}
      >
        <View style={[styles.dot, current && styles.dotCurrent, location.state === 'known' && styles.dotKnown, location.adjacent && styles.dotAdjacent, sealed && styles.dotSealed]} />
        <Text style={[styles.nodeName, !current && (!location.adjacent || sealed) && styles.nodeNameUnreachable, location.state === 'known' && styles.nodeNameKnown]} numberOfLines={2} maxFontSizeMultiplier={1.5}>
          {location.encounter?.completed ? '✓ ' : ''}{sealed ? '🔒 ' : ''}{location.name}
        </Text>
        {sealed && <Text style={styles.sealCaption} maxFontSizeMultiplier={1.5}>Sealed {location.gate.completed}/{location.gate.required}</Text>}
      </Button>
    </View>
  );
}

// Round 029: `drill` is the server's pending drill (spellbook.drill); `ongoing` an encounter under way elsewhere.
export default function MapPanel({ language = null, atmosphere = null, drill = null, ongoing = null, starting = null, onDrill, onReturnToEncounter, onLeaveForEncounter, world, isLoading, onMove, onEnterEncounter, party = [], onRecruit }) {
  const [size, setSize] = useState(320); // replaced by the measured width on layout
  // Round 062 (critiques 1.1, 1.2): a move or leaving the map stops the narrator; above the early return.
  const currentLocationId = world?.currentLocationId ?? null;
  useEffect(() => () => { stopSpeech(); }, [currentLocationId]);
  if (!world) return <View style={styles.panel}><Text style={styles.muted}>Finding the Crumbling Market…</Text></View>;
  const byId = new Map(world.locations.map((location) => [location.id, location]));
  const here = byId.get(world.currentLocationId);
  const drillHere = drill && here?.encounter?.id === drill.encounterId && !here.encounter.completed ? drill : null;
  // Round 091 (review R1.1 of rounds 017–028): another conversation under way is not replaced by Talk here; the card
  // offers the way back and a way out (a restart start). The drill note has its own way back.
  const elsewhere = here?.encounter && ongoing && ongoing.encounterId !== here.encounter.id ? ongoing : null;
  const otherName = elsewhere?.character?.name ?? null;
  const talkLabel = here?.encounter ? `Talk to ${here.encounter.characterName}${here.encounter.completed ? ' again' : ''}` : '';

  return (
    <ScrollView style={styles.panel} contentContainerStyle={styles.content}>
      <View
        style={styles.map}
        aria-label="Map of the Crumbling Market"
        onLayout={(event) => setSize(event.nativeEvent.layout.width)}
      >
        {world.paths.map(([a, b]) => <Path key={`${a}-${b}`} from={byId.get(a).map} to={byId.get(b).map} size={size} />)}
        {world.locations.map((location) => <Node key={location.id} location={location} size={size} onMove={onMove} disabled={isLoading} />)}
      </View>
      {here && <View style={styles.card} aria-live="polite">
        <View style={styles.titleRow}>
          <Title style={styles.title}>{here.name}</Title>
          {/* Round 062: what the card shows when pressed (decision 1). */}
          <NarratorButton text={speechText([here.name, here.description, atmosphere?.locationId === here.id ? atmosphere.text : null])} label="Hear the place" />
        </View>
        <Text style={styles.body}>{here.description}</Text>
        {atmosphere?.locationId === here.id && atmosphere.text && <Text style={styles.atmosphere}>{atmosphere.text}</Text>}
        {here.vocabularyFocus?.length > 0 && <Text style={styles.focus}>Words here: {here.vocabularyFocus.join(', ')}</Text>}
        {here.inscription && <Inscription key={here.id} inscription={here.inscription} language={language} />}
        {here.encounter && drillHere && <DrillNote drill={drillHere} ongoing={ongoing} isLoading={isLoading} onDrill={onDrill} onReturnToEncounter={onReturnToEncounter} />}
        {here.encounter && elsewhere && !drillHere && <View style={styles.drill} aria-live="polite">
          <Text style={styles.body}>{otherName ? `Finish your conversation with ${otherName} first.` : 'Finish the conversation under way first.'}</Text>
          <Button label={otherName ? `Return to ${otherName}` : 'Return to the conversation'} variant="primary" onPress={onReturnToEncounter} disabled={isLoading} />
          {onLeaveForEncounter && <Button label={`Leave ${otherName ?? 'it'} and talk to ${here.encounter.characterName}`} variant="text" onPress={() => onLeaveForEncounter()} disabled={isLoading} />}
        </View>}
        {here.encounter
          ? <Button
              label={talkLabel}
              accessibleName={elsewhere ? `${talkLabel}, unavailable: finish your conversation with ${otherName ?? 'the one under way'} first` : undefined}
              variant={drillHere || elsewhere ? 'secondary' : 'primary'} onPress={onEnterEncounter} disabled={isLoading || Boolean(drillHere) || Boolean(elsewhere)}
            />
          : <Text style={styles.muted}>Nothing here wants to talk to you yet.</Text>}
        {here.encounter && starting?.encounterId === here.encounter.id
          && <Text role="status" style={styles.starting}>{here.encounter.characterName || 'Someone'} is getting ready to talk…</Text>}
        {here.encounter?.completed && <Text style={styles.done}>✓ Encounter complete</Text>}
        {here.encounter?.completed && here.encounter.saveable && onRecruit && <PartyOffer
          name={here.encounter.characterName} joined={inParty(party, here.encounter.characterId)} isLoading={isLoading}
          onSave={() => onRecruit(here.encounter.id)}
        />}
      </View>}
    </ScrollView>
  );
}

// Round 082: lore hidden in plain sight. Keyed by location, so a move closes it; the map shows only where it is
// written and the text (no answer in it, server test); the translation is in the Spellbook.
function Inscription({ inscription, language }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.inscription}>
      <Button label={open ? 'Look away' : 'Look closer'} expanded={open} onPress={() => setOpen(!open)} style={styles.lookCloser} />
      {open && <>
        <Text style={styles.focus}>{inscription.where}</Text>
        <Text style={styles.inscriptionText} accessibilityLanguage={language?.tag}>{inscription.text}</Text>
        <Text style={styles.focus}>Its translation is in your Spellbook.</Text>
      </>}
    </View>
  );
}

// Round 029 (backlog C1): forced repetition before the Rift. Reviews are closed while another encounter runs, so
// then the note sends the player back to it instead.
function DrillNote({ drill, ongoing, isLoading, onDrill, onReturnToEncounter }) {
  const count = drill.vocabularyIds.length;
  const words = `${count} due ${count === 1 ? 'word' : 'words'}`;
  const other = ongoing?.character?.name ?? null;
  return (
    <View style={styles.drill} aria-live="polite">
      <Text style={styles.body}>{drill.characterName} reviews everything you have learned. {other ? `Finish your conversation with ${other} first, then review ${words}.` : `Review ${words} first.`}</Text>
      {other
        ? <Button label={`Return to ${other}`} onPress={onReturnToEncounter} disabled={isLoading} />
        : <Button label={`Review ${words}`} variant="primary" onPress={() => onDrill(drill.vocabularyIds[0])} disabled={isLoading} />}
    </View>
  );
}

const styles = StyleSheet.create({
  drill: { gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.accent },
  panel: { flex: 1 },
  content: { padding: 16, gap: 16 },
  map: { width: '100%', aspectRatio: 1, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  path: { position: 'absolute', height: 2, backgroundColor: colors.border },
  nodeWrap: { position: 'absolute', width: 120, alignItems: 'center' },
  nodeButton: { alignItems: 'center', paddingVertical: 0, paddingHorizontal: 0 },
  dot: { width: NODE, height: NODE, borderRadius: NODE / 2, backgroundColor: colors.muted, borderWidth: 2, borderColor: colors.surface },
  dotAdjacent: { backgroundColor: colors.accent },
  dotCurrent: { backgroundColor: colors.success, borderColor: colors.ink },
  dotKnown: { backgroundColor: colors.border },
  dotSealed: { backgroundColor: colors.ink, borderColor: colors.border },
  nodeName: { marginTop: 2, fontSize: type.caption1, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  sealCaption: { fontSize: type.caption2, color: colors.muted, textAlign: 'center' },
  nodeNameUnreachable: { color: colors.muted },
  nodeNameKnown: { color: colors.muted, fontStyle: 'italic' },
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  title: { flexGrow: 1, flexShrink: 1, fontSize: type.title3, fontWeight: '800', color: colors.ink },
  body: { fontSize: type.subhead, lineHeight: leading.subhead, color: colors.ink },
  muted: { fontSize: type.subhead, color: colors.muted, padding: 16 },
  starting: { color: colors.muted, fontStyle: 'italic', fontSize: type.subhead }, // round 073
  focus: { fontSize: type.footnote, color: colors.muted, fontStyle: 'italic' },
  atmosphere: { fontSize: type.subhead, color: colors.muted, fontStyle: 'italic' }, // round 053
  inscription: { gap: 6 }, // round 082
  lookCloser: { alignSelf: 'flex-start' },
  inscriptionText: { fontSize: type.callout, lineHeight: leading.callout, color: colors.ink, fontStyle: 'italic' },
  done: { fontSize: type.subhead, fontWeight: '600', color: colors.success },
});
