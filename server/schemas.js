import { z } from 'zod'
import { skills } from './catalog.js'

export const GenerationInput = z
  .object({
    grade: z.number().int().min(9).max(11),
    stage: z.enum(['starter', 'district', 'regional', 'national']),
    skill: z.enum(['grammar', 'reading', 'writing', 'listening']),
    format: z.enum([
      'mixed',
      'mcq',
      'true_false',
      'gap_fill',
      'matching',
      'essay',
      'story',
      'article',
      'review',
      'report',
      'proposal',
      'letter',
    ]),
    count: z.union([z.literal(10), z.literal(20), z.literal(30)]).default(10),
    audioMode: z.enum(['monologue', 'dialogue', 'speakers']).default('monologue'),
  })
  .strict()
  .refine(
    (value) => skills.find((s) => s.id === value.skill).formats.includes(value.format),
    'Choose an available format for this skill.'
  )
  .refine(
    (value) => !['starter', 'district'].includes(value.stage) || value.skill === 'grammar',
    'Starting and district rounds only have Use of English tasks.'
  )
  .refine(
    (value) => value.grade !== 9 || value.stage !== 'national',
    'Class 9 does not have a national round.'
  )

export const Question = z
  .object({
    id: z.string(),
    type: z.enum(['mcq', 'true_false', 'gap_fill', 'matching']),
    text: z.string(),
    choices: z.array(z.string()),
    correctAnswer: z.string(),
    acceptedAnswers: z.array(z.string()),
    explanation: z.string(),
    evidence: z.string(),
    maxWords: z.number().int(),
  })
  .strict()

export const TaskOutput = z
  .object({
    title: z.string(),
    instructions: z.string(),
    passage: z.string(),
    writingPrompt: z.string(),
    questions: z.array(Question),
    segments: z.array(z.object({ speaker: z.number().int(), text: z.string() }).strict()),
  })
  .strict()

const Criterion = z
  .object({ band: z.number(), feedback: z.string(), evidence: z.string(), nextStep: z.string() })
  .strict()
export const EssayOutput = z
  .object({
    taskResponse: Criterion,
    coherenceCohesion: Criterion,
    lexicalResource: Criterion,
    grammaticalRange: Criterion,
    summary: z.string(),
    strengths: z.array(z.string()),
    improvements: z.array(z.string()),
    corrections: z.array(z.object({ original: z.string(), improved: z.string(), explanation: z.string() }).strict()),
  })
  .strict()

export const DraftInput = z
  .object({
    answers: z.record(z.string().max(3000)).refine((a) => Object.keys(a).length <= 40),
    essay: z.string().max(18000),
    seconds: z.number().int().min(0).max(604800),
    revision: z.number().int().min(0),
  })
  .strict()
export const SubmitInput = DraftInput.extend({ requestId: z.string().uuid() })
