/**
 * In-memory encounter state for Phase 1 (single global encounter).
 */
class EncounterState {
  constructor() {
    this.reset();
  }

  reset() {
    this.conversationHistory = [];
    this.turnNumber = 0;
    this.isResolved = false;
    this.character = null;
    this.encounterConfig = null;
  }

  get currentSpanishRatio() {
    if (!this.character) return 0.25;
    const base = this.character.language_profile.base_spanish_ratio;
    const rate = this.encounterConfig?.escalation?.spanish_ratio_increase_per_turn || 0;
    return Math.min(1, base + rate * this.turnNumber);
  }

  addPlayerMessage(text) {
    this.conversationHistory.push({ role: 'user', content: text });
    this.turnNumber++;
  }

  addAssistantMessage(text) {
    this.conversationHistory.push({ role: 'assistant', content: text });
  }

  checkDefeatCondition(playerInput) {
    const triggers = this.encounterConfig?.defeat_condition?.trigger_phrases || [];
    const normalised = playerInput.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return triggers.some((phrase) => {
      const normPhrase = phrase.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalised.includes(normPhrase);
    });
  }
}

// Singleton for Phase 1
export const encounterState = new EncounterState();
