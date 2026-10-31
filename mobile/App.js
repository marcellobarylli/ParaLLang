import { useEffect } from 'react';
import { KeyboardAvoidingView, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGameStore } from './src/stores/gameStore.js';
import Header from './src/components/Header.js';
import ErrorBanner from './src/components/ErrorBanner.js';
import DialoguePanel from './src/components/DialoguePanel.js';
import InputBar from './src/components/InputBar.js';
import Spellbook from './src/components/Spellbook.js';
import ReviewPanel from './src/components/ReviewPanel.js';
import { colors } from './src/components/ui.js';

export default function App() {
  const state = useGameStore();
  useEffect(() => { state.initialize(); }, [state.initialize]);
  const resolved = state.encounter?.state === 'resolved';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.shell}>
        <StatusBar style="dark" />
        <Header dueCount={state.spellbook.dueCount} isLoading={state.isLoading} onSpellbook={state.openSpellbook} onRestart={state.restartEncounter} />
        {state.error && <ErrorBanner message={state.error} onDismiss={state.clearError} />}

        {state.view === 'spellbook' && <Spellbook spellbook={state.spellbook} language={state.language} isLoading={state.isLoading} onReview={state.startReview} onReturn={state.returnToDialogue} />}
        {state.view === 'review' && <ReviewPanel
          key={state.reviewChallenge?.id ?? 'result'}
          challenge={state.reviewChallenge} result={state.reviewResult} language={state.language} isLoading={state.isLoading}
          onSubmit={state.submitReview} onReveal={state.revealReviewAnswer}
          onContinue={() => state.startReview()} onReturn={state.returnToDialogue}
        />}
        {state.view === 'dialogue' && <KeyboardAvoidingView style={styles.shell} behavior="padding">
          <DialoguePanel encounter={state.encounter} language={state.language} isLoading={state.isLoading} assessment={state.assessment} onHelp={state.revealHelp} />
          <InputBar
            value={state.draft} onChange={state.setDraft} onSend={state.sendMessage}
            loading={state.isLoading} resolved={resolved} disabled={state.isLoading || !state.encounter || resolved}
          />
        </KeyboardAvoidingView>}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
});
