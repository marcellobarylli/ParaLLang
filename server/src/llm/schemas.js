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
  // Round 081 (backlog B5): the narrator's footnote. The server keeps it or drops it (keptFootnote).
  footnote: z.string().nullable().optional().describe('An optional English narrator footnote, one dry aside; null on most replies'),
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

// Round 129: beginner mode. The grader also says which objectives the learner tried, and gives the learner's answer
// in correct target language when anything in it is wrong. Every field is required (the CLIs' structured output).
export const beginnerGradingResponseSchema = z.object({
  objective_results: z.array(z.object({
    objective_id: z.string().min(1),
    passed: z.boolean(),
    attempted: z.boolean(),
    feedback: z.string().min(1),
    vocabulary_evidence: z.array(z.object({
      vocabulary_id: z.string().min(1),
      evidence: z.string().min(1),
      quality: z.number().int().min(0).max(5),
    }).strict()),
  }).strict()).min(1),
  overall_feedback: z.string().min(1),
  correction: z.string().nullable(),
  correction_translation: z.string().nullable(),
}).strict();

// Round 053 (backlog A10): the map card's atmosphere line. Length is checked by the service, not the schema.
export const locationAtmosphereSchema = z.object({
  atmosphere: z.string().min(1),
}).strict();
