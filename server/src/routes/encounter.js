import { Router } from 'express';
import { encounterState } from '../encounter-state.js';
import { loadCharacter, loadEncounter } from '../content-loader.js';
import { buildEncounterPrompt } from '../llm/prompt-builder.js';
import { encounterResponseSchema } from '../llm/schemas.js';

export function createEncounterRouter(llmAdapter) {
  const router = Router();

  router.post('/start', async (req, res) => {
    try {
      encounterState.reset();

      const encounter = loadEncounter('encounters/imp_coffee_greeting.yaml');
      const character = loadCharacter(encounter.character);

      encounterState.character = character;
      encounterState.encounterConfig = encounter;

      const messages = buildEncounterPrompt(character, encounter, [], null);
      const response = await llmAdapter.structuredChat(messages, encounterResponseSchema);

      encounterState.addAssistantMessage(JSON.stringify(response));

      res.json(response);
    } catch (err) {
      console.error('Error starting encounter:', err);
      res.status(500).json({ error: 'Failed to start encounter' });
    }
  });

  router.post('/dialogue', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      if (encounterState.isResolved) {
        return res.status(400).json({ error: 'Encounter already resolved' });
      }

      if (!encounterState.character) {
        return res.status(400).json({ error: 'No active encounter. Call /api/encounter/start first.' });
      }

      encounterState.addPlayerMessage(message);

      // Check defeat condition before LLM call
      const defeated = encounterState.checkDefeatCondition(message);

      const messages = buildEncounterPrompt(
        encounterState.character,
        encounterState.encounterConfig,
        encounterState.conversationHistory,
        message
      );

      const response = await llmAdapter.structuredChat(messages, encounterResponseSchema);

      // Override encounter_state if defeat condition met
      if (defeated) {
        response.encounter_state = 'resolved';
        encounterState.isResolved = true;
      }

      encounterState.addAssistantMessage(JSON.stringify(response));

      res.json(response);
    } catch (err) {
      console.error('Error in dialogue:', err);
      res.status(500).json({ error: 'Failed to process dialogue' });
    }
  });

  return router;
}
