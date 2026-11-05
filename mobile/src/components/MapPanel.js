import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, colors } from './ui.js';

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

function nodeLabel(location) {
  if (location.state === 'current') return `${location.name}, you are here`;
  const done = location.encounter?.completed ? ', encounter complete' : '';
  if (location.adjacent) return `Walk to ${location.name}${location.state === 'known' ? ', unexplored' : done}`;
  return `${location.name}${location.state === 'known' ? ', unexplored' : done}, not reachable from here`;
}

function Node({ location, size, onMove, disabled }) {
  const current = location.state === 'current';
  return (
    <View style={[styles.nodeWrap, { left: location.map.x * size - 60, top: location.map.y * size - NODE / 2 }]}>
      <Button
        accessibleName={nodeLabel(location)}
        onPress={() => onMove(location.id)}
        disabled={disabled || current || !location.adjacent}
        variant="text"
        style={styles.nodeButton}
      >
        <View style={[styles.dot, current && styles.dotCurrent, location.state === 'known' && styles.dotKnown, location.adjacent && styles.dotAdjacent]} />
        <Text style={[styles.nodeName, location.state === 'known' && styles.nodeNameKnown]} numberOfLines={2}>
          {location.encounter?.completed ? '✓ ' : ''}{location.name}
        </Text>
      </Button>
    </View>
  );
}

export default function MapPanel({ world, isLoading, onMove, onEnterEncounter }) {
  const [size, setSize] = useState(320); // replaced by the measured width on layout
  if (!world) return <View style={styles.panel}><Text style={styles.muted}>Finding the Crumbling Market…</Text></View>;
  const byId = new Map(world.locations.map((location) => [location.id, location]));
  const here = byId.get(world.currentLocationId);

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
        <Text role="heading" style={styles.title}>{here.name}</Text>
        <Text style={styles.body}>{here.description}</Text>
        {here.vocabularyFocus?.length > 0 && <Text style={styles.focus}>Words here: {here.vocabularyFocus.join(', ')}</Text>}
        {here.encounter
          ? <Button
              label={`Talk to ${here.encounter.characterName}${here.encounter.completed ? ' again' : ''}`}
              variant="primary" onPress={onEnterEncounter} disabled={isLoading}
            />
          : <Text style={styles.muted}>Nothing here wants to talk to you yet.</Text>}
        {here.encounter?.completed && <Text style={styles.done}>✓ Encounter complete</Text>}
      </View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  nodeName: { marginTop: 2, fontSize: 12, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  nodeNameKnown: { color: colors.muted, fontStyle: 'italic' },
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  body: { fontSize: 15, lineHeight: 21, color: colors.ink },
  muted: { fontSize: 14, color: colors.muted, padding: 16 },
  focus: { fontSize: 13, color: colors.muted, fontStyle: 'italic' },
  done: { fontSize: 14, fontWeight: '600', color: colors.success },
});
