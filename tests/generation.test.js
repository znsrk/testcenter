import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AppError } from '../server/config.js'
import { generateTask, hasSourceEvidence, taskGenerationContract, validateTask, words } from '../server/generation.js'
import { exampleOptions, rawTask } from './fixtures.js'
import { GenerationInput } from '../server/schemas.js'

const options = { ...exampleOptions, grade: 10, skill: 'reading', format: 'true_false', count: 20 }

test('generation input rejects unavailable round combinations', () => {
  assert.equal(GenerationInput.safeParse({ ...options, stage: 'starter' }).success, false)
  assert.equal(GenerationInput.safeParse({ ...options, stage: 'district', skill: 'writing', format: 'essay' }).success, false)
  assert.equal(GenerationInput.safeParse({ ...options, grade: 9, stage: 'national' }).success, false)
  assert.equal(GenerationInput.safeParse({ ...options, stage: 'district', skill: 'grammar', format: 'mcq' }).success, true)
})

test('generation schemas enforce task-specific fields and exact question counts', () => {
  for (const skill of ['grammar', 'reading', 'writing', 'listening']) {
    const selected = { ...options, skill, format: skill === 'writing' ? 'essay' : 'mcq' }
    const { schema, instructions } = taskGenerationContract(selected)
    const task = rawTask(selected)
    assert.ok(schema.safeParse(task).success, skill)
    if (skill !== 'listening') {
      task.segments = [{ speaker: 1, text: 'Unexpected audio script.' }]
      assert.equal(schema.safeParse(task).success, false, skill)
      task.segments = []
      assert.equal(instructions.includes('950–1100-word script'), false)
    } else assert.ok(instructions.includes('950–1100-word script'))
    if (skill !== 'writing') {
      task.writingPrompt = 'Unexpected writing assignment.'
      assert.equal(schema.safeParse(task).success, false)
      task.writingPrompt = ''
      task.questions.pop()
    } else task.questions = rawTask(options).questions
    assert.equal(schema.safeParse(task).success, false, 'wrong question count')
  }
})

test('reading evidence accepts exact excerpts separated by ellipses, including the live failure', () => {
  const task = rawTask(options)
  task.passage =
    'When a group of Year 10 students in a small Kazakh town decided to transform a neglected patch of land behind their school into a community garden, they thought the plan would be straightforward. Lina imagined raised beds and neat rows of vegetables. What she did not expect was how many different skills the project would call for, nor how many members of the wider community would become involved.'
  for (const q of task.questions) {
    q.evidence =
      'they thought the plan would be straightforward. ... What she did not expect was how many different skills the project would call for'
  }
  assert.equal(validateTask(task, options).questions.length, 20)
  assert.ok(
    hasSourceEvidence(task.passage, 'they thought the plan would be straightforward. […] What she did not expect')
  )
  assert.ok(hasSourceEvidence('The garden’s gate is “open”.', '“The garden\'s gate is "open".”'))
  assert.ok(hasSourceEvidence('First sentence.\n\nSecond sentence.', 'First sentence. Second sentence.'))
})

test('grammar output schema prevents malformed gaps and unrelated question types', () => {
  const selected = { ...exampleOptions, format: 'mixed' }
  const { schema } = taskGenerationContract(selected)
  const task = rawTask({ ...selected, format: 'gap_fill' })
  assert.ok(schema.safeParse(task).success)
  task.questions[0].maxWords = 0
  assert.equal(schema.safeParse(task).success, false)
  task.questions[0].maxWords = 1
  task.questions[0].choices = ['Saturday']
  assert.equal(schema.safeParse(task).success, false)
  task.questions[0] = rawTask({ ...selected, format: 'true_false' }).questions[0]
  assert.equal(schema.safeParse(task).success, false)
})

test('gap repair feedback identifies the exact answer and counted word-limit mismatch', () => {
  const selected = { ...exampleOptions, format: 'gap_fill' }
  const task = rawTask(selected)
  task.questions[4].correctAnswer = 'would have been able'
  task.questions[4].maxWords = 3
  assert.throws(
    () => validateTask(task, selected),
    /Question q5: correctAnswer "would have been able" has 4 words, exceeding maxWords=3/
  )
})

test('evidence checks still reject invented, reordered, empty or unrelated excerpts', () => {
  const source = 'The garden opens on Saturday. Students grow vegetables.'
  for (const evidence of [
    '',
    '...',
    '…',
    'The garden opens on Sunday.',
    'The garden opens on Saturday. ... Students grow flowers.',
    'Students grow vegetables. ... The garden opens on Saturday.',
    'The text does not mention opening times.',
  ]) {
    assert.equal(hasSourceEvidence(source, evidence), false, evidence)
  }
  const task = rawTask(options)
  task.questions[5].evidence = 'A fabricated quote about Sunday.'
  assert.throws(() => validateTask(task, options), /Question q6 could not be verified/)
})

test('generation repairs only an invalid question and preserves the rest of the task', async () => {
  let calls = 0
  const ai = {
    async json(_schema, name, _instructions, input) {
      calls++
      if (calls === 1) {
        const task = rawTask(options)
        task.questions[0].evidence = 'Invented evidence.'
        return task
      }
      assert.equal(name, 'olympiad_question_repair')
      assert.equal(input.questionNumber, 1)
      assert.equal(input.previousQuestion.evidence, 'Invented evidence.')
      assert.match(input.validationError, /Question q1/)
      return { question: rawTask(options).questions[0] }
    },
  }
  const result = await generateTask(ai, options)
  assert.equal(calls, 2)
  assert.equal(result.questions.length, 20)
  assert.equal(result.maxScore, 20)
})

test('generation fixes a word-limit failure without asking for a new complete task', async () => {
  const selected = { ...exampleOptions, format: 'gap_fill' }
  const task = rawTask(selected)
  task.questions[4].correctAnswer = 'would have been able'
  task.questions[4].maxWords = 3
  let calls = 0
  const ai = {
    async json(_schema, name, _instructions, input) {
      calls++
      if (calls === 1) return task
      assert.equal(name, 'olympiad_question_repair')
      assert.equal(input.questionNumber, 5)
      assert.match(input.validationError, /exceeding maxWords=3/)
      return { question: rawTask(selected).questions[4] }
    },
  }
  const result = await generateTask(ai, selected)
  assert.equal(calls, 2)
  assert.equal(result.questions[4].correctAnswer, 'Saturday')
  assert.equal(result.questions[3].text, task.questions[3].text)
})

test('valid tasks need one call; failed repairs are bounded and provider errors are not retried', async () => {
  let calls = 0
  const ai = {
    async json() {
      calls++
      return rawTask(options)
    },
  }
  await generateTask(ai, options)
  assert.equal(calls, 1)
  calls = 0
  ai.json = async (_schema, name) => {
    calls++
    const task = rawTask(options)
    task.questions[0].evidence = 'Invented evidence.'
    return name === 'olympiad_question_repair' ? { question: task.questions[0] } : task
  }
  await assert.rejects(generateTask(ai, options), /could not be verified/)
  assert.equal(calls, 10)
  calls = 0
  const failure = new AppError(502, 'Provider unavailable')
  ai.json = async () => {
    calls++
    throw failure
  }
  await assert.rejects(generateTask(ai, options), (error) => error === failure)
  assert.equal(calls, 1)
})

test('a saved unfinished task resumes question repair without regenerating its script', async () => {
  const selected = { ...options, skill: 'listening', format: 'mixed', audioMode: 'monologue' }
  const draft = rawTask(selected)
  draft.questions[18].evidence = 'Invented evidence.'
  let saved = null
  const names = []
  const ai = {
    async json(_schema, name, _instructions, input) {
      names.push(name)
      assert.equal(name, 'olympiad_question_repair')
      assert.equal(input.questionNumber, 19)
      assert.ok(input.focusExcerpt.includes('community garden'))
      return { question: rawTask(selected).questions[18] }
    },
  }
  const result = await generateTask(ai, selected, {
    initialDraft: draft,
    onDraft: (value) => { saved = value },
  })
  assert.deepEqual(names, ['olympiad_question_repair'])
  assert.equal(saved.questions[18].evidence, result.questions[18].evidence)
  assert.equal(result.questions.length, 20)
})

test('an incomplete question repair is retried once with a larger output budget', async () => {
  const selected = { ...options, skill: 'listening', format: 'mixed', audioMode: 'monologue' }
  const draft = rawTask(selected)
  draft.questions[18].evidence = 'Invented evidence.'
  const limits = []
  const ai = {
    async json(_schema, name, _instructions, input, maxTokens) {
      assert.equal(name, 'olympiad_question_repair')
      assert.equal(input.script, undefined)
      limits.push(maxTokens)
      if (limits.length === 1) {
        const error = new AppError(502, 'The model response ran out of output tokens.')
        error.code = 'incomplete_max_output_tokens'
        throw error
      }
      return { question: rawTask(selected).questions[18] }
    },
  }
  const result = await generateTask(ai, selected, { initialDraft: draft })
  assert.deepEqual(limits, [6000, 14000])
  assert.equal(result.questions.length, 20)
})

test('a short listening script is extended while preserving its existing questions', async () => {
  const selected = { ...options, skill: 'listening', format: 'mixed', audioMode: 'monologue' }
  const task = rawTask(selected)
  task.segments = task.segments.slice(0, 8)
  let saved = null
  const names = []
  const ai = {
    async json(_schema, name, _instructions, input) {
      names.push(name)
      if (name === 'olympiad_task') return task
      assert.equal(name, 'olympiad_script_continuation')
      assert.ok(input.targetAdditionalWords > 100)
      return { segments: rawTask(selected).segments.slice(0, 2).map((segment) => ({ ...segment, speaker: 2 })) }
    },
  }
  const result = await generateTask(ai, selected, { onDraft: (value) => { saved = structuredClone(value) } })
  assert.deepEqual(names, ['olympiad_task', 'olympiad_script_continuation'])
  assert.equal(result.questions.length, 20)
  assert.ok(words(result.segments.map((segment) => segment.text).join(' ')) >= 900)
  assert.ok(result.segments.every((segment) => segment.speaker === 1))
  assert.equal(saved.segments.length, result.segments.length)
})

test('an overlong listening script is shortened before checking its answer keys', async () => {
  const selected = { ...options, skill: 'listening', format: 'mixed', audioMode: 'monologue' }
  const task = rawTask(selected)
  task.segments.push(...rawTask(selected).segments.slice(0, 3))
  let calls = 0
  const result = await generateTask({ json: async () => { calls++; return task } }, selected)
  const count = words(result.segments.map((segment) => segment.text).join(' '))
  assert.equal(calls, 1)
  assert.ok(count >= 900 && count <= 1200)
})
