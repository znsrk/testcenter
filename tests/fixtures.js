import { randomUUID } from 'node:crypto'
import { now } from '../server/db.js'
import { validateTask } from '../server/generation.js'

export const exampleOptions = {
  grade: 9,
  stage: 'regional',
  skill: 'grammar',
  format: 'mcq',
  count: 10,
  audioMode: 'monologue',
}
export function rawTask(options = exampleOptions) {
  const writing = options.skill === 'writing'
  const text =
    'The community garden opens every Saturday. Students work together to grow vegetables and learn about nature. '
  const type = ['mixed', 'essay'].includes(options.format) ? 'mcq' : options.format
  return {
    title: writing
      ? 'A greener future for our school'
      : options.skill === 'listening'
        ? 'Voices from the community garden'
        : 'Small choices, brighter futures',
    instructions: writing
      ? 'Write a thoughtful response, with clear examples and a conclusion.'
      : 'Read each question carefully and choose the best answer.',
    passage: options.skill === 'reading' ? text.repeat(8) : '',
    writingPrompt: writing
      ? 'Some people think schools should have a community garden. Do you agree? Explain your opinion with examples. Write 150–180 words.'
      : '',
    questions: writing
      ? []
      : Array.from({ length: options.count }, (_, i) => ({
          id: `q${i + 1}`,
          type,
          text:
            type === 'gap_fill'
              ? 'The garden opens every ___. (day of the week)'
              : type === 'true_false'
                ? 'The community garden opens on Saturdays.'
                : `Question ${i + 1}: When does the community garden open?`,
          choices:
            type === 'gap_fill'
              ? []
              : type === 'true_false'
                ? ['True', 'False']
                : ['Saturday', 'Monday', 'Tuesday', 'Friday'],
          correctAnswer: type === 'true_false' ? 'True' : 'Saturday',
          acceptedAnswers: type === 'true_false' ? ['True'] : ['Saturday'],
          explanation: 'The opening sentence tells us that the garden opens every Saturday.',
          evidence: 'The community garden opens every Saturday.',
          maxWords: 1,
        })),
    segments:
      options.skill === 'listening'
        ? Array.from({ length: 10 }, (_, i) => ({
            speaker:
              options.audioMode === 'dialogue' ? (i % 2) + 1 : options.audioMode === 'speakers' ? (i % 5) + 1 : 1,
            text: text.repeat(6),
          }))
        : [],
  }
}
export function rawEssay(essay = 'Schools can help.') {
  const criterion = {
    band: 6.5,
    feedback: 'The position is clear but could use a more developed example.',
    evidence: essay.slice(0, 16),
    nextStep: 'Add one specific example explaining the benefit to students.',
  }
  return {
    taskResponse: { ...criterion },
    coherenceCohesion: { ...criterion },
    lexicalResource: { ...criterion },
    grammaticalRange: { ...criterion },
    summary: 'A clear start with useful ideas. Develop your supporting examples to make the argument more convincing.',
    strengths: ['A clear position is expressed.'],
    improvements: ['Develop supporting examples.'],
    corrections: [],
  }
}
export function fakeAI() {
  return {
    configured: true,
    calls: [],
    async json(_schema, name, _instructions, input) {
      this.calls.push({ name, input })
      return name === 'writing_assessment' ? rawEssay(input.essay) : rawTask(input)
    },
    async speech() {
      throw new Error('Speech should be stubbed explicitly.')
    },
  }
}
export function seedTask(db, userId, options = exampleOptions) {
  const id = randomUUID()
  const content = validateTask(rawTask(options), options)
  db.prepare(
    'INSERT INTO tasks(id,owner_id,grade,stage,skill,format,title,content,created_at) VALUES(?,?,?,?,?,?,?,?,?)'
  ).run(
    id,
    userId,
    options.grade,
    options.stage,
    options.skill,
    options.format,
    content.title,
    JSON.stringify(content),
    now()
  )
  return id
}
