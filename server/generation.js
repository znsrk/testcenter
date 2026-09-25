import { z } from 'zod'
import { AppError } from './errors.js'
import { referenceProfile } from './catalog.js'
import { Question, TaskOutput } from './schemas.js'

export const words = (text) => text.trim().split(/\s+/u).filter(Boolean).length
export const normalizeAnswer = (text) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '')

// Evidence may join exact excerpts with an ellipsis. Verify every excerpt in
// source order rather than treating the ellipsis as literal passage text.
export function hasSourceEvidence(source, evidence) {
  const normalize = (text) => normalizeAnswer(text).replace(/[“”]/g, '"')
  const unquote = (text) => text.trim().replace(/^"([\s\S]*)"$/u, '$1')
  const passage = normalize(source)
  const quote = normalize(unquote(normalize(evidence)))
  if (!quote) return false
  if (passage.includes(quote)) return true
  const excerpts = quote
    .split(/(?:\[\s*)?(?:\.{3}|…)(?:\s*\])?/u)
    .map((part) => normalize(unquote(part)))
    .filter(Boolean)
  if (!excerpts.length) return false
  let cursor = 0
  for (const excerpt of excerpts) {
    const index = passage.indexOf(excerpt, cursor)
    if (index === -1) return false
    cursor = index + excerpt.length
  }
  return true
}

export const generationInstructions = `You are an expert English olympiad item writer for students in Kazakhstan, grades 9–11.
Return only the strict structured output. Create original educational material; do not reproduce source papers.
Follow the supplied reference profile and selected skill/format exactly. The profile describes inspected local papers.
Use natural British English; accept legitimate British/American spelling variants in acceptedAnswers.
Every objective item must have ONE defensible answer, nontrivial plausible distractors and specific teaching feedback.
For reading provide all required passages in passage. Refer to clearly labelled passages/sections/gaps.
For missing parts show ___ and include the root word or transformation keyword when relevant. State exact word limits.
For gap_fill questions, choices must be [], maxWords must be an integer from 1 to 12, and correctAnswer must contain no more than maxWords words. Put alternative answers only in acceptedAnswers, not in correctAnswer. Use maxWords=1 for a single-word gap and the stated upper limit for a transformation.
Use type matching for section/speaker/category matching, with explicit labelled options; display the entire correct choice text as correctAnswer.
MCQs have 3–4 distinct options. True/false has exactly True and False; national reading may add Not given.
CorrectAnswer must exactly equal one choice for choice items. acceptedAnswers must include correctAnswer.
For gaps include every reasonable equivalent, but never contradictory alternatives. Avoid questions requiring external knowledge.
For reading and listening evidence must quote the provided passage/script verbatim and explanations must refer to it.
Use one short, continuous, exact excerpt for evidence, without added quotation marks, labels, paraphrases or ellipses. For False statements, quote the text that contradicts them. For Not given, quote the closest relevant text and explain the missing information in explanation, never in evidence. Check every excerpt against the final passage/script.
Never reveal the answers in the title, instructions or writing prompt. Do not mention generation or JSON in student-facing text.
Return exactly count questions for objective tasks, ordered q1, q2, etc. Only use selected format unless mixed is selected.
Mixed grammar: use MCQ and gap-fill as appropriate to the profile; mixed reading/listening: include several referenced formats.
Use age-appropriate, varied topics. Silently check every answer before returning.`

export function taskGenerationContract(options) {
  const writing = options.skill === 'writing'
  const listening = options.skill === 'listening'
  const questionTypes = {
    mcq: Question.extend({ type: z.literal('mcq'), choices: z.array(z.string()).min(3).max(4) }),
    true_false: Question.extend({
      type: z.literal('true_false'),
      choices: z
        .array(z.enum(['True', 'False', 'Not given']))
        .min(2)
        .max(3),
    }),
    gap_fill: Question.extend({
      type: z.literal('gap_fill'),
      choices: z.array(z.string()).max(0),
      maxWords: z.number().int().min(1).max(12),
    }),
    matching: Question.extend({ type: z.literal('matching'), choices: z.array(z.string()).min(2).max(8) }),
  }
  const selectedQuestion =
    options.format === 'mixed'
      ? z.discriminatedUnion(
          'type',
          options.skill === 'grammar' ? [questionTypes.mcq, questionTypes.gap_fill] : Object.values(questionTypes)
        )
      : questionTypes[options.format] || Question
  const schema = TaskOutput.extend({
    questions: z.array(selectedQuestion).length(writing ? 0 : options.count),
    segments: listening ? TaskOutput.shape.segments : TaskOutput.shape.segments.max(0),
    writingPrompt: writing ? z.string() : z.literal(''),
    passage: writing || listening ? z.literal('') : z.string(),
  })
  const instructions = writing
    ? `Generate only a writing assignment. questions=[], segments=[], passage=''. writingPrompt must be a complete, self-contained genre-specific assignment with purpose, audience, and required word range. Include any stimulus, opening sentence or notes needed. The selected format takes priority over the reference paper's usual genre.`
    : listening
      ? `Generate a listening task. passage='', writingPrompt=''. Create a coherent 950–1100-word script over segments. Each segment <=2400 characters; use numbered speaker identities 1–5.
Monologue: only speaker 1, split naturally into chunks. Dialogue: 2–3 distinct recurring speakers. Speakers: five labelled short extracts, one speaker per extract, split if needed.
The recording is 6–8 minutes total, NOT 6–8 minutes per speaker. Include all evidence needed for questions, in listening order, without saying the answers as an answer key. Each speaker has a stable identity. No stage directions or spoken option letters.
Listening questions should ask about details, inference, purpose, attitude and connections. Do not put transcript text in questions except short gap sentences. Check the total script length before returning.`
      : `Generate only a ${options.skill === 'reading' ? 'reading' : 'grammar and vocabulary'} task. segments=[], writingPrompt=''. Put any reading or cloze text in passage. The reference profile describes a whole exam: use only its ${options.skill} section and the selected format. Return exactly ${options.count} questions.`
  return { schema, instructions: `${generationInstructions}\n${instructions}` }
}

function splitLongSegments(segments) {
  return segments.flatMap((segment) => {
    const parts = []
    let current = ''
    for (const word of segment.text.trim().split(/\s+/u)) {
      if (current && current.length + word.length + 1 > 2400) {
        parts.push({ speaker: segment.speaker, text: current })
        current = ''
      }
      current += (current ? ' ' : '') + word
    }
    if (current) parts.push({ speaker: segment.speaker, text: current })
    return parts
  })
}

function normalizeMonologueSpeakers(segments, options) {
  return options.audioMode === 'monologue'
    ? segments.map((segment) => ({ ...segment, speaker: 1 }))
    : segments
}

function trimScript(segments, limit = 1180) {
  const result = []
  let remaining = limit
  for (const segment of segments) {
    if (remaining <= 0) break
    const wordsInSegment = segment.text.trim().split(/\s+/u)
    const selected = wordsInSegment.slice(0, remaining)
    let text = selected.join(' ')
    if (selected.length < wordsInSegment.length) {
      const lastSentenceEnd = Math.max(text.lastIndexOf('.'), text.lastIndexOf('!'), text.lastIndexOf('?'))
      if (lastSentenceEnd > text.length * 0.6) text = text.slice(0, lastSentenceEnd + 1)
    }
    result.push({ speaker: segment.speaker, text })
    remaining -= words(text)
    if (selected.length < wordsInSegment.length) break
  }
  return result
}

function validateListeningScript(data, options) {
  if (data.passage || data.writingPrompt)
    throw new AppError(502, 'The listening task included unexpected text outside its recording.')
  const count = words(data.segments.map((segment) => segment.text).join(' '))
  if (count < 900 || count > 1200) {
    const error = new AppError(502, `The listening script has ${count} words; it needs 900–1200.`)
    error.code = 'listening_script_length'
    error.actualWords = count
    throw error
  }
  const speakers = new Set(data.segments.map((segment) => segment.speaker))
  if (
    data.segments.length > 40 ||
    data.segments.some((segment) => segment.text.length > 2600 || segment.text.trim().length < 10 || segment.speaker < 1 || segment.speaker > 5)
  )
    throw new AppError(502, 'The listening script did not meet the segment limits.')
  if (
    (options.audioMode === 'monologue' && (speakers.size !== 1 || !speakers.has(1))) ||
    (options.audioMode === 'dialogue' && (speakers.size < 2 || speakers.size > 3)) ||
    (options.audioMode === 'speakers' && speakers.size !== 5)
  )
    throw new AppError(502, 'The script did not contain the requested speakers.')
}

export function validateTask(output, options) {
  const data = TaskOutput.parse(output)
  const profile = referenceProfile(options)
  if (!data.title.trim() || !data.instructions.trim())
    throw new AppError(502, 'Generated task is missing its title or instructions.')
  if (options.skill === 'listening') validateListeningScript(data, options)
  if (options.skill === 'writing') {
    if (data.writingPrompt.length < 50 || data.questions.length || data.segments.length)
      throw new AppError(502, 'The writing prompt was incomplete.')
  } else {
    if (data.questions.length !== options.count)
      throw new AppError(502, 'The model returned the wrong number of questions.')
    if (options.skill === 'reading' && data.passage.length < 200)
      throw new AppError(502, 'The reading passage was incomplete.')
    for (const [index, q] of data.questions.entries()) {
      q.id = `q${index + 1}`
      if (!q.text.trim() || !q.explanation.trim() || !q.correctAnswer.trim())
        throw new AppError(502, `Question ${q.id} was incomplete.`)
      if (options.format !== 'mixed' && q.type !== options.format)
        throw new AppError(502, `Question ${q.id} did not match the selected format.`)
      if (q.type === 'gap_fill') {
        if (q.choices.length || q.maxWords < 1 || q.maxWords > 12)
          throw new AppError(
            502,
            `Question ${q.id}: gap-fill requires empty choices and a maxWords limit of 1–12 that fits its correctAnswer.`
          )
        if (words(q.correctAnswer) > q.maxWords)
          throw new AppError(
            502,
            `Question ${q.id}: correctAnswer ${JSON.stringify(q.correctAnswer)} has ${words(q.correctAnswer)} words, exceeding maxWords=${q.maxWords}. Replace this question with a valid gap and an answer of at most ${q.maxWords} words. Do not return the same answer or change only the word limit.`
          )
      } else {
        if (
          !q.choices.includes(q.correctAnswer) ||
          new Set(q.choices.map(normalizeAnswer)).size !== q.choices.length ||
          q.choices.length < 2 ||
          q.choices.length > 8
        )
          throw new AppError(502, `Question ${q.id} had an invalid answer key.`)
        if (q.type === 'mcq' && (q.choices.length < 3 || q.choices.length > 4))
          throw new AppError(502, `Question ${q.id} had invalid multiple-choice options.`)
        if (
          q.type === 'true_false' &&
          (q.choices[0] !== 'True' ||
            q.choices[1] !== 'False' ||
            q.choices.length > 3 ||
            (q.choices.length === 3 && q.choices[2] !== 'Not given'))
        )
          throw new AppError(502, `Question ${q.id} had invalid true/false options.`)
      }
      q.acceptedAnswers = [...new Set([q.correctAnswer, ...q.acceptedAnswers])]
      if (['reading', 'listening'].includes(options.skill)) {
        const source = options.skill === 'reading' ? data.passage : data.segments.map((s) => s.text).join(' ')
        if (!hasSourceEvidence(source, q.evidence))
          throw new AppError(502, `Question ${q.id} could not be verified against its passage or script.`)
      }
      q.points =
        ['starter', 'district'].includes(options.stage) && options.skill !== 'listening'
          ? index < options.count * 0.5
            ? 1
            : index < (options.count * 5) / 6
              ? 2
              : 3
          : 1
    }
  }
  if (options.skill !== 'listening' && data.segments.length)
    throw new AppError(502, 'A non-listening task included unexpected audio.')
  return {
    ...data,
    profile,
    minWords: profile.minWords,
    maxWords: profile.maxWords,
    maxScore: options.skill === 'writing' ? 40 : data.questions.reduce((s, q) => s + q.points, 0),
    suggestedMinutes:
      options.skill === 'writing'
        ? options.grade === 9 && options.stage !== 'national'
          ? 30
          : 40
        : options.skill === 'listening'
          ? 20
          : Math.ceil(options.count * (options.skill === 'reading' ? 1.5 : 1.2)),
  }
}

export async function generateTask(ai, options, { initialDraft = null, onDraft = () => {} } = {}) {
  const profile = referenceProfile(options)
  const { schema, instructions } = taskGenerationContract(options)
  const input = { ...options, profile, variation: globalThis.crypto.randomUUID() }
  const outputTokens = options.skill === 'listening' ? 16000 : 12000
  async function requestStructured(format, name, prompt, context, tokenLimit) {
    try {
      return await ai.json(format, name, prompt, context, tokenLimit)
    } catch (error) {
      if (error?.code !== 'incomplete_max_output_tokens') throw error
      return ai.json(format, name, prompt, context, tokenLimit + 8000)
    }
  }
  let output = initialDraft
    ? schema.parse(initialDraft)
    : await requestStructured(schema, 'olympiad_task', instructions, input, outputTokens)
  if (options.skill === 'listening')
    output.segments = splitLongSegments(normalizeMonologueSpeakers(output.segments, options))
  if (!initialDraft) await onDraft(output)
  const questionRepairs = new Map()
  let totalQuestionRepairs = 0
  let fullRepairs = 0
  let scriptRepairs = 0
  for (;;) {
    try {
      return validateTask(output, options)
    } catch (error) {
      if (!(error instanceof AppError) || error.status !== 502) throw error
      if (error.code === 'listening_script_length' && scriptRepairs < 3) {
        scriptRepairs++
        if (error.actualWords > 1200) {
          output.segments = trimScript(output.segments)
        } else {
          const missing = Math.max(100, 1000 - error.actualWords)
          const continuation = await requestStructured(
            z.object({ segments: TaskOutput.shape.segments.min(1).max(8) }).strict(),
            'olympiad_script_continuation',
            `Continue the listening script with about ${missing} additional words. Return only new segments. Preserve the existing speakers and topic. Do not repeat or contradict earlier statements. Add natural, age-appropriate detail that supports a coherent ending. Keep each segment below 2400 characters.`,
            {
              options,
              existingScript: output.segments,
              targetAdditionalWords: missing,
              speakers: [...new Set(output.segments.map((segment) => segment.speaker))],
            },
            6000
          )
          output.segments = splitLongSegments(
            normalizeMonologueSpeakers([...output.segments, ...continuation.segments], options)
          )
          if (words(output.segments.map((segment) => segment.text).join(' ')) > 1200)
            output.segments = trimScript(output.segments)
        }
        await onDraft(output)
        continue
      }
      const match = /^Question q(\d+)\b/u.exec(error.message)
      const index = match ? Number(match[1]) - 1 : -1
      if (
        index >= 0 &&
        index < output.questions.length &&
        totalQuestionRepairs < 12 &&
        (questionRepairs.get(index) || 0) < 4
      ) {
        questionRepairs.set(index, (questionRepairs.get(index) || 0) + 1)
        totalQuestionRepairs++
        const replacement = await requestStructured(
          z.object({ question: schema.shape.questions.element }).strict(),
          'olympiad_question_repair',
          `You are correcting one English olympiad question. Return only the question object. Fix the reported validation error. If the original question cannot be answered from the source, replace it with a new question grounded in the supplied focusExcerpt. For mixed tasks, a simple MCQ is allowed. The answer must fit the blank and stated word limit. For a gap, show ___ in the question, use a short exact answer, set choices=[], and set maxWords to the actual allowed limit (1 for a single-word gap). For a choice item, make correctAnswer exactly one of the distinct choices. For reading or listening, evidence must be one short, continuous, verbatim excerpt copied from focusExcerpt or the supplied passage. Include specific teaching feedback. Use the selected format and age level.`,
          {
            options,
            profile,
            title: output.title,
            instructions: output.instructions,
            passage: options.skill === 'reading' ? output.passage : '',
            focusExcerpt:
              options.skill === 'listening'
                ? output.segments[Math.min(output.segments.length - 1, Math.floor((index / options.count) * output.segments.length))]?.text || ''
                : options.skill === 'reading'
                  ? output.passage.slice(Math.floor((index / options.count) * output.passage.length), Math.floor((index / options.count) * output.passage.length) + 1300)
                  : '',
            questionNumber: index + 1,
            previousQuestion: output.questions[index],
            validationError: error.message,
          },
          6000
        )
        output.questions[index] = replacement.question
        await onDraft(output)
        continue
      }
      if (fullRepairs > 0) throw error
      fullRepairs++
      output = await requestStructured(
        schema,
        'olympiad_task',
        `${instructions}\nThis is a correction request. Fix the validation error in repair.validationError. Return a complete valid task, checking every answer key, exact evidence excerpt and word limit.`,
        { ...input, repair: { previousTask: output, validationError: error.message } },
        outputTokens
      )
      if (options.skill === 'listening')
        output.segments = splitLongSegments(normalizeMonologueSpeakers(output.segments, options))
      await onDraft(output)
      questionRepairs.clear()
      scriptRepairs = 0
    }
  }
}
