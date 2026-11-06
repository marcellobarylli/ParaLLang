import { useEffect, useRef } from 'react';
import { AccessibilityInfo, FlatList, StyleSheet, Text, View } from 'react-native';
import BilingualText from './BilingualText.js';
import PartyOffer, { inParty } from './PartyOffer.js';
import { colors, type } from './ui.js';
import { FadeIn, useReduceMotion } from '../motion.js';
import { stopSpeech } from '../speech.js';
import NarratorButton, { speechText } from './NarratorButton.js';

// Round 111: while a strained conversation is ongoing. Round 112: how many fewer, when the server sent the objective's
// own limit (`baseLimit`; a receipt from before round 112 has none, critique 1.8).
export function recoveringNote(encounter) {
  const { strained, limit, baseLimit } = encounter.hints ?? {};
  if (!strained || encounter.state !== 'ongoing') return '';
  const fewer = typeof baseLimit === 'number' && typeof limit === 'number' ? baseLimit - limit : 0;
  return fewer > 0 ? ` (your companion is recovering: ${fewer} fewer than usual)` : ' (your companion is recovering)';
}

export default function DialoguePanel({ encounter, language, isLoading, assessment, assessmentCounted = false, earlyAssessment = null, pendingInput = null, onHelp, party = [], onRecruit, onLeave, fragments = [] }) {
  const listRef = useRef(null);
  const reduced = useReduceMotion();
  // Round 055 (critique 1.8): a word still being spoken stops when the encounter screen goes.
  useEffect(() => () => { stopSpeech(); }, []);
  // Round 075 (critique 1.2): iOS has no live regions, so the switch from provisional to counted is announced, once
  // per committed verdict. Amendment 1: remembered outside the component, so a return from the map does not repeat it.
  const counted = Boolean(assessment && assessmentCounted && !isLoading);
  useEffect(() => {
    if (!counted || announcedVerdict === assessment) return;
    announcedVerdict = assessment;
    AccessibilityInfo.announceForAccessibility?.(COUNTED);
  }, [counted, assessment]);
  // Round 035: lines already there when this encounter session is first shown (opening line, a resumed transcript,
  // a restart) appear as they are; a line that arrives later fades in on its first render only, so a recycled
  // FlatList cell does not fade again (critique 1.2, 1.3).
  const shown = useRef({ sessionId: null, ids: new Set() });
  if (encounter && shown.current.sessionId !== encounter.id) shown.current = { sessionId: encounter.id, ids: new Set(encounter.transcript.map((m) => m.id)) };
  const firstShowing = (id) => { const first = !shown.current.ids.has(id); shown.current.ids.add(id); return first; };
  if (!encounter) return <View style={styles.panel}><Text style={styles.muted}>Preparing the encounter…</Text></View>;
  const resolved = encounter.state === 'resolved';
  const name = encounter.character?.name ?? 'Your opponent';

  const briefing = encounter.companionBriefing?.length ? (
    <View style={styles.companion} aria-label="Your companion">
      <View style={styles.narrationRow}><Text style={[styles.strong, styles.narrationText]}>Your companion</Text><NarratorButton text={speechText(encounter.companionBriefing)} label="Hear the briefing" /></View>
      {encounter.companionBriefing.map((line) => <Text style={styles.body} key={line}>{line}</Text>)}
    </View>
  ) : null;
  const objective = (
    <>{briefing}<View style={styles.objective} aria-live="polite">
      {encounter.currentObjective
        ? <><Text style={styles.strong}>Current objective</Text><Text style={styles.body}>{encounter.currentObjective.prompt}</Text></>
        : <Text style={styles.strong}>Encounter complete</Text>}
      <Text style={styles.small}>{language?.name ?? 'Target-language'} target: {Math.round(encounter.difficulty * 100)}% · Hints: {encounter.hints.remaining}/{encounter.hints.limit}{recoveringNote(encounter)}</Text>
    </View></>
  );
  // Round 070 (backlog I1): while the reply is written, the grader's verdict shows as provisional under the pending
  // answer, in place of the previous turn's assessment (critique 1.5).
  const early = Boolean(isLoading && pendingInput && earlyAssessment);
  const verdict = early ? earlyAssessment : assessment;
  const footer = (
    <View style={styles.footer}>
      {isLoading && <Text role="status" style={styles.thinking}>{early ? `${name} is replying…` : `${name} is considering the linguistic implications…`}</Text>}
      {verdict && <FadeIn key={assessmentKey(verdict, early ? 'provisional' : counted ? 'counted' : 'final')} style={styles.assessment} aria-live="polite">
        <Text style={styles.strong}>Assessment</Text>
        {early && <Text style={styles.body}>Your answer: “{pendingInput}”</Text>}
        <Text style={styles.body}>{verdict.overallFeedback}</Text>
        {verdict.objectiveResults.map((result) => <Text style={styles.body} key={result.objectiveId}>{resultMark(result)} {result.feedback}{result.held ? HELD_SUFFIX : ''}</Text>)}
        {early && <Text style={styles.small}>Not counted until {name} replies.</Text>}
        {!early && counted && <Text role="status" style={styles.small}>{COUNTED}</Text>}
      </FadeIn>}
      {resolved && <FadeIn><Text role="status" style={styles.victory}>{encounter.resolvedMessage ?? `${name} is satisfied. Encounter complete.`}{fragmentNote(fragments, encounter)}</Text></FadeIn>}
      {resolved && encounter.character?.saveable && !encounter.partyConversation && onRecruit && <PartyOffer
        name={name} joined={inParty(party, encounter.character.id)} isLoading={isLoading}
        onSave={() => onRecruit(encounter.encounterId)} onLeave={onLeave}
      />}
    </View>
  );

  return (
    <FlatList
      ref={listRef}
      aria-label={`Conversation with ${name}`}
      style={styles.panel}
      contentContainerStyle={styles.content}
      data={encounter.transcript}
      keyExtractor={(message) => message.id}
      ListHeaderComponent={objective}
      ListFooterComponent={footer}
      // Round 009: the first screen (briefing, objective, opening line) stays at the top; later turns scroll down.
      onContentSizeChange={() => { if (encounter.transcript.length > 1) listRef.current?.scrollToEnd?.({ animated: !reduced }); }}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item: message }) => <FadeIn animate={firstShowing(message.id)}>{message.role === 'npc' ? (
        <View style={styles.npc}>
          <Narration text={message.narrative} footnote={message.footnote} />
          <Text style={styles.speaker}>{message.dialogue.speaker}</Text>
          <BilingualText message={message} language={language} onHelp={onHelp} disabled={isLoading || (message.protected && !encounter.hints_available)} />
        </View>
      ) : (
        <Text style={styles.player}>{message.text}</Text>
      )}</FadeIn>}
    />
  );
}

// Round 061 (backlog C10): the narration with a 🔊 that reads it in English, on demand (decision 1). A missing or
// blank narration renders nothing (critique 1.3); no voice, no button (critique 1.7).
// Round 081 (backlog B5): the narrator's footnote, marked "*" at the end of the narration and read after it.
function Narration({ text, footnote }) {
  const hasText = typeof text === 'string' && Boolean(text.trim());
  const note = typeof footnote === 'string' && footnote.trim() ? footnote.trim() : null;
  if (!hasText && !note) return null;
  return (
    <View style={styles.narrationRow}>
      <View style={styles.narrationText}>
        {hasText && <Text style={styles.narrative}>{note ? `${text.trim()}*` : text}</Text>}
        {note && <Text style={styles.footnote} aria-label={`Footnote: ${note}`}>{`* ${note}`}</Text>}
      </View>
      <NarratorButton text={note ? speechText([text, note]) : text} label="Hear the narrator" />
    </View>
  );
}

// Round 035 (critique 1.4): a new assessment replaces the old one in place, so the box is keyed by its content.
// Round 075: the phase is part of the key, so the counted box mounts anew (and fades in) after the provisional one.
export const COUNTED = 'Counted.';
let announcedVerdict = null; // the store's assessment object last announced as counted
export const assessmentKey = (assessment, phase = 'final') => [phase, assessment.overallFeedback, ...assessment.objectiveResults.map((r) => `${r.objectiveId}:${r.passed}:${r.held === true}:${r.feedback}`)].join('|');
// Round 051 (backlog H1): a held result (passed, but an earlier objective comes first) is not a success. It is not
// banked either, so the player must say it again.
export const HELD_SUFFIX = ' (say it again after the earlier objective)';
export const resultMark = (result) => (result.held ? '…' : result.passed ? '✓' : '→');

// Round 030 (backlog A9): a fragment of The Journey that this encounter's completion filed. Worded to stay true on
// replays (critique 1.6); part of the victory status so it is announced with it. Round 032: a fragment unlocked by
// party conversations is noted only on the resolution that reached its count, and named after the member.
export function fragmentNote(fragments, encounter) {
  const fragment = (fragments ?? []).find((f) => f.encounterId === encounter.encounterId
    && (f.unlockedAt === undefined || f.conversations === f.unlockedAt));
  if (!fragment) return '';
  const source = encounter.partyConversation ? `from ${encounter.character?.name ?? 'your companion'}` : 'from here';
  return ` A fragment of The Journey ${source} is in your Spellbook: ${fragment.title}.`;
}

const styles = StyleSheet.create({
  panel: { flex: 1 },
  content: { padding: 16, gap: 12 },
  companion: { backgroundColor: colors.surface, borderColor: colors.accent, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  objective: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  npc: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 6 },
  narrationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  narrationText: { flexGrow: 1, flexShrink: 1 },
  narrative: { color: colors.muted, fontStyle: 'italic', fontSize: type.subhead },
  footnote: { color: colors.muted, fontSize: type.footnote, marginTop: 4 },
  speaker: { color: colors.accent, fontWeight: '700', fontSize: type.subhead },
  player: { alignSelf: 'flex-end', backgroundColor: colors.accent, color: colors.accentInk, borderRadius: 12, padding: 10, maxWidth: '85%', overflow: 'hidden', fontSize: type.callout },
  footer: { gap: 12, paddingBottom: 8 },
  thinking: { color: colors.muted, fontStyle: 'italic', fontSize: type.subhead },
  assessment: { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.accent, borderRadius: 8, padding: 12, gap: 4 },
  victory: { backgroundColor: colors.successSurface, color: colors.success, borderRadius: 8, padding: 12, fontWeight: '600', fontSize: type.subhead },
  strong: { fontWeight: '700', color: colors.ink, fontSize: type.subhead },
  body: { color: colors.ink, fontSize: type.subhead },
  small: { color: colors.muted, fontSize: type.caption1 },
  muted: { color: colors.muted, padding: 16, fontSize: type.subhead },
});
