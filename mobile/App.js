import { useEffect } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGameStore } from './src/stores/gameStore.js';
import Header from './src/components/Header.js';
import ErrorBanner from './src/components/ErrorBanner.js';
import DialoguePanel from './src/components/DialoguePanel.js';
import InputBar from './src/components/InputBar.js';
import Spellbook from './src/components/Spellbook.js';
import ReviewPanel from './src/components/ReviewPanel.js';
import MapPanel from './src/components/MapPanel.js';
import PartyPanel from './src/components/PartyPanel.js';
import OnboardingPanel from './src/components/OnboardingPanel.js';
import SavesPanel from './src/components/SavesPanel.js';
import { DisplayFont, colors, type, useDisplayFont } from './src/components/ui.js';
import { FadeIn } from './src/motion.js';

export default function App() {
  const state = useGameStore();
  const fontReady = useDisplayFont(); // round 042: titles switch to Literata once it loads; nothing waits for it
  useEffect(() => { state.initialize(); }, [state.initialize]);
  const resolved = state.encounter?.state === 'resolved';
  const here = state.world?.locations.find((location) => location.id === state.world.currentLocationId);
  const returnLabel = state.returnView === 'dialogue' && state.encounter ? `Return to ${state.encounter.character?.name ?? 'the encounter'}` : 'Return to the map';

  return (
    <DisplayFont.Provider value={fontReady}>
    <SafeAreaProvider>
      <SafeAreaView style={styles.shell}>
        <StatusBar style="dark" />
        <Header
          hideNav={state.view === 'onboarding'}
          place={here?.name} dueCount={state.spellbook.dueCount} partyCount={state.party.length} isLoading={state.isLoading}
          onSpellbook={state.openSpellbook} onParty={state.view === 'party' ? null : state.openParty} onMap={state.view === 'map' ? null : state.openMap}
          onRestart={state.view === 'dialogue' ? state.restartEncounter : null}
          onSaves={state.view === 'map' && state.learnerId ? state.openSaves : null}
        />
        {state.error && <ErrorBanner message={state.error} onDismiss={state.clearError} />}
        {state.notice && <Text role="status" style={styles.notice}>{state.notice}</Text>}

        {/* Round 035: a screen change fades the new screen in (Reduce Motion: no fade). */}
        <FadeIn key={state.view} style={styles.shell}>
        {state.view === 'onboarding' && state.onboarding && <OnboardingPanel onboarding={state.onboarding} onBegin={state.finishOnboarding} />}
        {state.view === 'map' && <MapPanel atmosphere={state.atmosphere}
          drill={state.spellbook.drill ?? null} ongoing={state.encounter?.state === 'ongoing' ? state.encounter : null}
          onDrill={state.startDrill} onReturnToEncounter={state.returnToEncounter}
          world={state.world} isLoading={state.isLoading} onMove={state.moveTo} onEnterEncounter={state.enterEncounter} party={state.party} onRecruit={state.recruit} />}
        {state.view === 'saves' && <SavesPanel
          saves={state.saves} activeId={state.learnerId} place={here?.name} dueCount={state.spellbook.dueCount} isLoading={state.isLoading}
          onContinue={state.switchSave} onNew={state.newSave} onReturn={state.openMap}
          soundsOn={state.soundsOn} onToggleSounds={state.setSoundsOn} onRemove={state.removeSave}
        />}
        {state.view === 'party' && <PartyPanel party={state.party} isLoading={state.isLoading} ongoing={state.encounter?.state === 'ongoing' ? state.encounter : null} onTalk={state.talkTo} onReturn={state.returnToDialogue} returnLabel={returnLabel} />}
        {state.view === 'spellbook' && <Spellbook spellbook={state.spellbook} language={state.language} isLoading={state.isLoading} onReview={state.startReview} onReturn={state.returnToDialogue} returnLabel={returnLabel} />}
        {state.view === 'review' && <ReviewPanel
          key={state.reviewChallenge?.id ?? 'result'}
          challenge={state.reviewChallenge} partOfSpeech={reviewPartOfSpeech(state)} result={state.reviewResult} language={state.language} isLoading={state.isLoading} error={state.error}
          onSubmit={state.submitReview} onReveal={state.revealReviewAnswer}
          onContinue={() => state.startReview()} onReturn={state.returnToDialogue} returnLabel={returnLabel}
        />}
        {state.view === 'dialogue' && <KeyboardAvoidingView style={styles.shell} behavior="padding">
          <DialoguePanel encounter={state.encounter} language={state.language} isLoading={state.isLoading} assessment={state.assessment} earlyAssessment={state.earlyAssessment} pendingInput={state.pendingInput} onHelp={state.revealHelp} party={state.party} onRecruit={state.recruit} onLeave={state.openMap} fragments={state.spellbook?.journeyFragments} />
          <InputBar
            value={state.draft} onChange={state.setDraft} onSend={state.sendMessage}
            loading={state.isLoading} resolved={resolved} speaker={state.encounter?.character?.name} disabled={state.isLoading || !state.encounter || resolved}
          />
        </KeyboardAvoidingView>}
        </FadeIn>
      </SafeAreaView>
    </SafeAreaProvider>
    </DisplayFont.Provider>
  );
}

// Round 059 (critique 1.1): the review's word class, from the Spellbook card the server sent with the challenge.
export function reviewPartOfSpeech(state) {
  const id = state.reviewChallenge?.vocabularyId;
  return id ? state.spellbook?.cards?.find((card) => card.vocabularyId === id)?.partOfSpeech ?? null : null;
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
  notice: { backgroundColor: colors.successSurface, color: colors.success, paddingHorizontal: 16, paddingVertical: 8, fontWeight: '600', fontSize: type.subhead },
});
