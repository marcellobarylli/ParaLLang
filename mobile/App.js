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
import { colors } from './src/components/ui.js';

export default function App() {
  const state = useGameStore();
  useEffect(() => { state.initialize(); }, [state.initialize]);
  const resolved = state.encounter?.state === 'resolved';
  const here = state.world?.locations.find((location) => location.id === state.world.currentLocationId);
  const returnLabel = state.returnView === 'dialogue' && state.encounter ? `Return to ${state.encounter.character?.name ?? 'the encounter'}` : 'Return to the map';

  return (
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

        {state.view === 'onboarding' && state.onboarding && <OnboardingPanel onboarding={state.onboarding} onBegin={state.finishOnboarding} />}
        {state.view === 'map' && <MapPanel
          drill={state.spellbook.drill ?? null} ongoing={state.encounter?.state === 'ongoing' ? state.encounter : null}
          onDrill={state.startDrill} onReturnToEncounter={state.returnToEncounter}
          world={state.world} isLoading={state.isLoading} onMove={state.moveTo} onEnterEncounter={state.enterEncounter} party={state.party} onRecruit={state.recruit} />}
        {state.view === 'saves' && <SavesPanel
          saves={state.saves} activeId={state.learnerId} place={here?.name} dueCount={state.spellbook.dueCount} isLoading={state.isLoading}
          onContinue={state.switchSave} onNew={state.newSave} onReturn={state.openMap}
        />}
        {state.view === 'party' && <PartyPanel party={state.party} isLoading={state.isLoading} ongoing={state.encounter?.state === 'ongoing' ? state.encounter : null} onTalk={state.talkTo} onReturn={state.returnToDialogue} returnLabel={returnLabel} />}
        {state.view === 'spellbook' && <Spellbook spellbook={state.spellbook} language={state.language} isLoading={state.isLoading} onReview={state.startReview} onReturn={state.returnToDialogue} returnLabel={returnLabel} />}
        {state.view === 'review' && <ReviewPanel
          key={state.reviewChallenge?.id ?? 'result'}
          challenge={state.reviewChallenge} result={state.reviewResult} language={state.language} isLoading={state.isLoading}
          onSubmit={state.submitReview} onReveal={state.revealReviewAnswer}
          onContinue={() => state.startReview()} onReturn={state.returnToDialogue} returnLabel={returnLabel}
        />}
        {state.view === 'dialogue' && <KeyboardAvoidingView style={styles.shell} behavior="padding">
          <DialoguePanel encounter={state.encounter} language={state.language} isLoading={state.isLoading} assessment={state.assessment} onHelp={state.revealHelp} party={state.party} onRecruit={state.recruit} onLeave={state.openMap} fragments={state.spellbook?.journeyFragments} />
          <InputBar
            value={state.draft} onChange={state.setDraft} onSend={state.sendMessage}
            loading={state.isLoading} resolved={resolved} speaker={state.encounter?.character?.name} disabled={state.isLoading || !state.encounter || resolved}
          />
        </KeyboardAvoidingView>}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
  notice: { backgroundColor: '#e7f3e8', color: colors.success, paddingHorizontal: 16, paddingVertical: 8, fontWeight: '600' },
});
