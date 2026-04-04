import { z } from 'zod';

export const wordSchema = z.object({
  word: z.string(),
  pos: z.string(),
  root: z.string().optional(),
  meaning: z.string(),
});

export const encounterResponseSchema = z.object({
  narrative: z.string().describe('Atmospheric narrative text describing the scene (always in English)'),
  dialogue: z.object({
    speaker: z.string().describe('Name of the character speaking'),
    native: z.string().describe('The dialogue line, mixing Spanish and English per the Spanish ratio'),
    translation: z.string().describe('Full English translation of the dialogue'),
    words: z.array(wordSchema).describe('Spanish words used in the dialogue with POS and meaning'),
  }),
  must_translate: z.boolean().describe('Whether the player must translate something to proceed'),
  difficulty: z.number().describe('Current difficulty level (1-5)'),
  hints_available: z.boolean().describe('Whether the companion can offer hints'),
  encounter_state: z.enum(['ongoing', 'resolved', 'failed']).describe('Current state of the encounter'),
});
