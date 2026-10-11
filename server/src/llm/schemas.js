import { z } from 'zod';

export const generatedWordSchema = z.object({
  word: z.string(),
  pos: z.string(),
  root: z.string().nullable().optional(),
  meaning: z.string(),
}).strict();

export const encounterResponseSchema = z.object({
  narrative: z.string().min(1).describe('Atmospheric scene narration, always in English'),
  dialogue: z.object({
    speaker: z.string().min(1),
    native: z.string().min(1),
    translation: z.string().min(1),
    words: z.array(generatedWordSchema),
  }).strict(),
  must_translate: z.boolean(),
  difficulty: z.number(),
  hints_available: z.boolean(),
  encounter_state: z.enum(['ongoing', 'resolved', 'failed']),
}).strict();

export const gradingResponseSchema = z.object({
  objective_results: z.array(z.object({
    objective_id: z.string().min(1),
    passed: z.boolean(),
    feedback: z.string().min(1),
    vocabulary_evidence: z.array(z.object({
      vocabulary_id: z.string().min(1),
      evidence: z.string().min(1),
      quality: z.number().int().min(0).max(5),
    }).strict()),
  }).strict()).min(1),
  overall_feedback: z.string().min(1),
}).strict();
