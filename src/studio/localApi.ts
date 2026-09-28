import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { catalog } from '../../server/catalog.js'
import { generateTask } from '../../server/generation.js'
import { gradeAnswers, gradeEssay } from '../../server/grading.js'
import { GenerationInput } from '../../server/schemas.js'
import { ApiError } from './api'
import type { Attempt, Draft, Generation, Job, Task, User } from './types'

type LocalJob = Job & { requestId?: string; draftOutput?: unknown }
type LocalAttempt = Attempt & { requestId?: string }
type LocalTask = { task: Task; answerKey: any; attempts: LocalAttempt[] }
type State = { tasks: LocalTask[]; jobs: LocalJob[] }
const empty = (): State => ({ tasks: [], jobs: [] })
const sessionKey = 'testcenter:static-session'
const databaseName = 'testcenter-browser-v1'
const storeName = 'workspace'
const activeJobs = new Set<string>()
const jobLeasePrefix = 'testcenter:active-job:'
const jobLeaseDuration = 180_000
const jobLeaseRefresh = 15_000
const jobOwner = crypto.randomUUID()
const jobHeartbeats = new Map<string, ReturnType<typeof setInterval>>()
let writeQueue: Promise<unknown> = Promise.resolve()
let databasePromise: Promise<IDBDatabase> | null = null

function leaseKey(jobId: string) { return `${jobLeasePrefix}${jobId}` }
function hasLiveLease(jobId: string) {
  try {
    const lease = JSON.parse(localStorage.getItem(leaseKey(jobId)) || 'null')
    return typeof lease?.expiresAt === 'number' && lease.expiresAt > Date.now()
  } catch { return false }
}
function renewLease(jobId: string) {
  try {
    localStorage.setItem(leaseKey(jobId), JSON.stringify({ owner: jobOwner, expiresAt: Date.now() + jobLeaseDuration }))
  } catch { /* generation still runs if browser storage is unavailable */ }
}
function releaseLease(jobId: string) {
  const timer = jobHeartbeats.get(jobId)
  if (timer) clearInterval(timer)
  jobHeartbeats.delete(jobId)
  try {
    const lease = JSON.parse(localStorage.getItem(leaseKey(jobId)) || 'null')
    if (lease?.owner === jobOwner) localStorage.removeItem(leaseKey(jobId))
  } catch { /* an invalid lease will expire without affecting the job */ }
}

function database() {
  databasePromise ||= new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return databasePromise
}
async function readState(): Promise<State> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName).objectStore(storeName).get('state')
    request.onsuccess = () => resolve(request.result || empty())
    request.onerror = () => reject(request.error)
  })
}
async function saveState(state: State) {
  const db = await database()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).put(state, 'state')
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}
function mutate<T>(change: (state: State) => T | Promise<T>): Promise<T> {
  const run = writeQueue.then(async () => {
    const state = await readState()
    const result = await change(state)
    await saveState(state)
    return result
  })
  writeQueue = run.catch(() => {})
  return run
}
async function snapshot() {
  await writeQueue
  return readState()
}
function currentUser(): User {
  const raw = localStorage.getItem(sessionKey)
  let session: { code: string; user: User } | null = null
  try { session = raw ? JSON.parse(raw) : null } catch { /* invalid local data */ }
  if (!session || !import.meta.env.VITE_ACCESS_CODE || session.code !== import.meta.env.VITE_ACCESS_CODE)
    throw new ApiError('Enter the shared access code to open this browser workspace.', 401)
  return session.user
}
function errorText(error: unknown) {
  if (error instanceof Error) {
    if (/invalid api key|incorrect api key/i.test(error.message))
      return 'The generation service rejected its OpenAI key. Check OPENAI_API_KEY on the server.'
    if (/429|quota|rate limit/i.test(error.message))
      return 'OpenAI is rate-limiting this key or its budget is exhausted. Try again later.'
    return error.message
  }
  return 'The request failed. Please try again.'
}
function ai() {
  const apiKey = import.meta.env.VITE_ACCESS_CODE
  const client = new OpenAI({ apiKey, baseURL: `${window.location.origin}/api/openai`, dangerouslyAllowBrowser: true, timeout: 175_000, maxRetries: 0 })
  return {
    async json(schema: any, name: string, instructions: string, input: unknown, maxTokens = 12000) {
      const response = await client.responses.parse({
        model: 'gpt-5-mini',
        store: false,
        instructions,
        input: [{ role: 'user', content: JSON.stringify(input) }],
        text: { format: zodTextFormat(schema, name) },
        reasoning: { effort: 'low' },
        max_output_tokens: maxTokens,
      })
      if (response.status !== 'completed' || !response.output_parsed) {
        const truncated = response.status === 'incomplete' && response.incomplete_details?.reason === 'max_output_tokens'
        const failure = new ApiError(truncated
          ? 'The model ran out of output tokens before finishing.'
          : 'The model could not finish this task. Use Resume to try again.', 502) as ApiError & { code?: string }
        if (truncated) failure.code = 'incomplete_max_output_tokens'
        throw failure
      }
      return schema.parse(response.output_parsed)
    },
  }
}
function summary(entry: LocalTask) {
  const task = entry.task
  const latest = entry.attempts[0]
  return {
    id: task.id, title: task.title, grade: task.grade, stage: task.stage, skill: task.skill,
    format: task.format, shared: false, duration: null, createdAt: task.createdAt,
    seconds: task.draft.seconds, started: task.started, attempts: entry.attempts.length,
    result: latest?.result || null, maxScore: task.maxScore, suggestedMinutes: task.suggestedMinutes,
  }
}
function publicTask(entry: LocalTask): Task {
  return { ...entry.task, attempts: entry.attempts, result: entry.attempts[0]?.result || null }
}
function getTask(state: State, id: string) {
  const entry = state.tasks.find((item) => item.task.id === id)
  if (!entry) throw new ApiError('This task is not in this browser’s library.', 404)
  return entry
}
async function runTask(jobId: string) {
  activeJobs.add(jobId)
  try {
    const job = await mutate((state) => {
      const item = state.jobs.find((j) => j.id === jobId)!
      item.status = 'running'; item.progress = 10; item.error = null
      return { ...item }
    })
    const options = GenerationInput.parse(job.options) as Generation
    const content = await generateTask(ai(), options, {
      initialDraft: job.draftOutput || null,
      onDraft: async (draft: unknown) => {
        await mutate((state) => {
          const item = state.jobs.find((j) => j.id === jobId)!
          item.draftOutput = draft
          item.progress = Math.min(85, item.progress + 5)
        })
      },
    } as any)
    await mutate((state) => {
      const item = state.jobs.find((j) => j.id === jobId)!
      const id = crypto.randomUUID()
      const task: Task = {
        id, title: content.title, grade: options.grade, stage: options.stage, skill: options.skill,
        format: options.format, shared: false, duration: null, createdAt: new Date().toISOString(),
        seconds: 0, started: false, result: null, maxScore: content.maxScore,
        suggestedMinutes: content.suggestedMinutes, instructions: content.instructions,
        passage: content.passage, writingPrompt: content.writingPrompt, segments: [], audioUrl: null,
        questions: content.questions.map((q: any) => ({ id: q.id, type: q.type, text: q.text,
          choices: q.choices, points: q.points, maxWords: q.maxWords })),
        minWords: content.minWords, maxWords: content.maxWords,
        draft: { answers: {}, essay: '', seconds: 0, revision: 0 }, attempts: [],
        profile: content.profile,
      }
      state.tasks.unshift({ task, answerKey: content, attempts: [] })
      item.status = 'completed'; item.progress = 100; item.taskId = id; item.draftOutput = undefined
    })
  } catch (error) {
    await mutate((state) => {
      const job = state.jobs.find((j) => j.id === jobId)!
      job.status = 'failed'; job.error = errorText(error)
    })
  } finally {
    activeJobs.delete(jobId)
    releaseLease(jobId)
    window.dispatchEvent(new Event('testcenter:workspace-changed'))
  }
}
async function runEssay(jobId: string) {
  activeJobs.add(jobId)
  try {
    const work = await mutate((state) => {
      const job = state.jobs.find((j) => j.id === jobId)!
      job.status = 'running'; job.progress = 15; job.error = null
      const entry = getTask(state, job.taskId!)
      const attempt = entry.attempts.find((a) => a.id === job.attemptId)!
      return { content: entry.answerKey, essay: attempt.essay }
    })
    const result = await gradeEssay(ai(), work.content, work.essay)
    await mutate((state) => {
      const job = state.jobs.find((j) => j.id === jobId)!
      const entry = getTask(state, job.taskId!)
      const attempt = entry.attempts.find((a) => a.id === job.attemptId)!
      attempt.result = result; attempt.status = 'completed'
      job.status = 'completed'; job.progress = 100
    })
  } catch (error) {
    await mutate((state) => {
      const job = state.jobs.find((j) => j.id === jobId)!
      job.status = 'failed'; job.error = errorText(error)
      const entry = state.tasks.find((t) => t.task.id === job.taskId)
      const attempt = entry?.attempts.find((a) => a.id === job.attemptId)
      if (attempt) attempt.status = 'failed'
    })
  } finally {
    activeJobs.delete(jobId)
    releaseLease(jobId)
    window.dispatchEvent(new Event('testcenter:workspace-changed'))
  }
}
function start(job: LocalJob) {
  activeJobs.add(job.id)
  renewLease(job.id)
  jobHeartbeats.set(job.id, setInterval(() => renewLease(job.id), jobLeaseRefresh))
  setTimeout(() => { void (job.kind === 'essay' ? runEssay(job.id) : runTask(job.id)) }, 0)
}
function parseBody(options: RequestInit) {
  if (typeof options.body !== 'string') return {}
  try { return JSON.parse(options.body) } catch { throw new ApiError('Invalid request.', 400) }
}
export async function localApi(path: string, options: RequestInit = {}): Promise<unknown> {
  const method = options.method || 'GET'
  if (path === '/login' && method === 'POST') {
    const code = String(parseBody(options).code || '')
    if (!import.meta.env.VITE_ACCESS_CODE) throw new ApiError('The shared access code is not configured for this deployment.', 503)
    if (code !== import.meta.env.VITE_ACCESS_CODE) throw new ApiError('That access code is not correct.', 401)
    let user: User | null = null
    try { user = JSON.parse(localStorage.getItem('testcenter:static-user') || 'null') } catch { /* start fresh */ }
    user ||= { id: crypto.randomUUID(), role: 'student', created_at: new Date().toISOString() }
    localStorage.setItem('testcenter:static-user', JSON.stringify(user))
    localStorage.setItem(sessionKey, JSON.stringify({ code, user }))
    return { user }
  }
  if (path === '/session') return { user: currentUser() }
  currentUser()
  if (path === '/logout' && method === 'POST') { localStorage.removeItem(sessionKey); return { ok: true } }
  if (path === '/catalog') return catalog
  if (path === '/audio/quota') return { configured: false, audioReady: false,
    quota: { day: '', used: 0, remaining: 0, limit: 0, timezone: '' } }
  if (path === '/tasks' && method === 'GET') return (await snapshot()).tasks.map(summary)
  if (path === '/jobs' && method === 'GET') {
    const stopped = (job: LocalJob) =>
      ['queued', 'running'].includes(job.status) && !activeJobs.has(job.id) && !hasLiveLease(job.id)
    if ((await snapshot()).jobs.some(stopped)) {
      await mutate((state) => {
        for (const job of state.jobs) if (stopped(job)) {
          job.status = 'failed'; job.error = 'Generation stopped when this browser page closed. Use Resume to continue.'
        }
      })
    }
    return (await snapshot()).jobs.map(({ draftOutput: _draftOutput, ...job }) => job)
  }
  if (path === '/generate' && method === 'POST') {
    const body = parseBody(options)
    const { requestId, ...input } = body
    const selection = GenerationInput.safeParse(input)
    if (!selection.success) throw new ApiError('Choose a valid class, stage, skill and task format.', 400)
    if (selection.data.skill === 'listening') throw new ApiError('Audio generation is under construction.', 503)
    const job = await mutate((state) => {
      const existing = state.jobs.find((j) => j.requestId === requestId)
      if (existing) return existing
      const created: LocalJob = { id: crypto.randomUUID(), kind: 'task', status: 'queued',
        options: selection.data, taskId: null, attemptId: null, progress: 0, error: null,
        retries: 0, createdAt: new Date().toISOString(), requestId }
      state.jobs.unshift(created)
      return created
    })
    if (job.status === 'queued') start(job)
    return job
  }
  const retry = /^\/jobs\/([^/]+)\/retry$/.exec(path)
  if (retry && method === 'POST') {
    const job = await mutate((state) => {
      const item = state.jobs.find((j) => j.id === retry[1])
      if (!item) throw new ApiError('Generation job not found.', 404)
      if (item.status !== 'failed') throw new ApiError('Only a failed job can be resumed.', 409)
      item.status = 'queued'; item.error = null; item.progress = 0; item.retries++
      return item
    })
    start(job)
    return job
  }
  const match = /^\/tasks\/([^/]+)(?:\/(draft|submit))?$/.exec(path)
  if (match) {
    const id = match[1]
    if (!match[2] && method === 'GET') return publicTask(getTask(await snapshot(), id))
    if (match[2] === 'draft' && method === 'PUT') {
      const input = parseBody(options) as Draft
      return mutate((state) => {
        const entry = getTask(state, id)
        if (input.revision !== entry.task.draft.revision) throw new ApiError('This draft changed in another tab. Reload to see the latest version.', 409)
        entry.task.draft = { answers: input.answers, essay: input.essay, seconds: Math.max(input.seconds, entry.task.draft.seconds),
          revision: input.revision + 1, updatedAt: new Date().toISOString() }
        entry.task.started = true
        return entry.task.draft
      })
    }
    if (match[2] === 'submit' && method === 'POST') {
      const input = parseBody(options) as Draft & { requestId: string }
      const response = await mutate((state) => {
        const entry = getTask(state, id)
        const previous = entry.attempts.find((a) => a.requestId === input.requestId)
        if (previous) return { attempt: previous, job: state.jobs.find((j) => j.attemptId === previous.id) }
        if (input.revision !== entry.task.draft.revision) throw new ApiError('This draft changed in another tab. Reload before submitting.', 409)
        const attempt: LocalAttempt = { id: crypto.randomUUID(), task_id: id, answers: input.answers,
          essay: input.essay, seconds: Math.max(0, input.seconds - entry.attempts.reduce((sum, a) => sum + a.seconds, 0)),
          status: entry.task.skill === 'writing' ? 'grading' : 'completed', result: null,
          created_at: new Date().toISOString(), requestId: input.requestId }
        if (entry.task.skill !== 'writing') attempt.result = gradeAnswers(entry.answerKey, input.answers)
        entry.attempts.unshift(attempt)
        entry.task.draft = { answers: input.answers, essay: input.essay, seconds: Math.max(input.seconds, entry.task.draft.seconds),
          revision: input.revision + 1, updatedAt: new Date().toISOString() }
        entry.task.started = true
        if (entry.task.skill !== 'writing') return { attempt }
        const job: LocalJob = { id: crypto.randomUUID(), kind: 'essay', status: 'queued', options: {},
          taskId: id, attemptId: attempt.id, progress: 0, error: null, retries: 0, createdAt: new Date().toISOString() }
        state.jobs.unshift(job)
        return { attempt, job }
      })
      if (response.job?.status === 'queued') start(response.job)
      return response
    }
  }
  throw new ApiError('This feature is unavailable in the browser-only version.', 404)
}
