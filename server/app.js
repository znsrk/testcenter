import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { z, ZodError } from 'zod'
import { AppError } from './config.js'
import { openDatabase, now, transaction } from './db.js'
import { createAuth } from './auth.js'
import { createAI } from './openai.js'
import { catalog } from './catalog.js'
import { GenerationInput, DraftInput, SubmitInput } from './schemas.js'
import { createJobs, publicJob } from './jobs.js'
import { gradeAnswers } from './grading.js'
import { ffmpegAvailable } from './audio.js'
import responsesHandler from '../api/openai/responses.js'

export function createApp(config, dependencies = {}) {
  const app = express()
  const db = dependencies.db || openDatabase(config.dataDir)
  const ai = dependencies.ai || createAI(config)
  const auth = createAuth(db, config)
  const jobs = createJobs(db, config, ai, dependencies)
  const hasAudioEncoder = dependencies.hasAudioEncoder ?? ffmpegAvailable(config.ffmpeg)
  app.disable('x-powered-by')
  if (config.trustProxy) app.set('trust proxy', config.trustProxy)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'"],
          'img-src': ["'self'", 'data:'],
          'media-src': ["'self'"],
          'connect-src': ["'self'"],
          'upgrade-insecure-requests': config.secureCookie ? [] : null,
        },
      },
    })
  )
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })
  app.use(express.json({ limit: '80kb' }))
  app.use(cookieParser())
  app.use('/api', (req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.headers.origin && req.headers.origin !== config.origin)
        return next(new AppError(403, 'This request came from an untrusted origin.'))
      if (!req.is('application/json')) return next(new AppError(415, 'Send a JSON request.'))
      if (req.headers['sec-fetch-site'] === 'cross-site')
        return next(new AppError(403, 'Cross-site requests are not allowed.'))
    }
    next()
  })
  const limited = (limit, windowMs, perProfile = false) =>
    rateLimit({
      windowMs,
      limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      ...(perProfile ? { keyGenerator: (req) => req.user.id } : { skipSuccessfulRequests: true }),
      message: { error: 'Too many requests. Please wait a moment and try again.' },
    })
  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.post('/api/openai/responses', limited(10, 60_000), responsesHandler)
  app.post('/api/login', limited(15, 15 * 60 * 1000), (req, res) => {
    const { code } = z
      .object({ code: z.string().min(1).max(200) })
      .strict()
      .parse(req.body)
    res.json({ user: auth.login(code, res) })
  })
  app.post('/api/logout', (req, res) => {
    auth.logout(req, res)
    res.json({ ok: true })
  })
  app.use('/api', auth.authenticate)
  app.get('/api/session', (req, res) => res.json({ user: req.user }))
  app.get('/api/catalog', (_req, res) => res.json(catalog))
  function taskFor(req) {
    const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id)
    if (!task || (task.owner_id && task.owner_id !== req.user.id)) throw new AppError(404, 'Task not found.')
    return task
  }
  function jobFor(req) {
    const job = db.prepare('SELECT * FROM jobs WHERE id=?').get(req.params.id)
    if (!job || job.owner_id !== req.user.id) throw new AppError(404, 'Job not found.')
    return job
  }
  function attemptJSON(row) {
    return { ...row, answers: JSON.parse(row.answers), result: row.result ? JSON.parse(row.result) : null }
  }
  function draftFor(userId, taskId) {
    const row = db.prepare('SELECT * FROM drafts WHERE user_id=? AND task_id=?').get(userId, taskId)
    return row
      ? {
          answers: JSON.parse(row.answers),
          essay: row.essay,
          seconds: row.seconds,
          revision: row.revision,
          updatedAt: row.updated_at,
        }
      : { answers: {}, essay: '', seconds: 0, revision: 0, updatedAt: null }
  }
  function saveDraft(userId, task, input) {
    const current = draftFor(userId, task.id)
    if (current.revision !== input.revision)
      throw new AppError(
        409,
        'A newer draft was saved in another tab. Reload to get the latest version. Your local draft is retained.'
      )
    const content = JSON.parse(task.content)
    if (Object.keys(input.answers).some((key) => !content.questions.some((q) => q.id === key)))
      throw new AppError(400, 'Unknown question in draft.')
    const seconds = Math.max(input.seconds, current.seconds)
    db.prepare(
      `INSERT INTO drafts(user_id,task_id,answers,essay,seconds,revision,updated_at) VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(user_id,task_id) DO UPDATE SET answers=excluded.answers,essay=excluded.essay,
      seconds=excluded.seconds,revision=excluded.revision,updated_at=excluded.updated_at`
    ).run(userId, task.id, JSON.stringify(input.answers), input.essay, seconds, current.revision + 1, now())
    return draftFor(userId, task.id)
  }
  app.get('/api/tasks', (req, res) => {
    const tasks = db
      .prepare(
        `SELECT t.*,d.seconds,d.updated_at AS draft_updated,
      (SELECT count(*) FROM attempts a WHERE a.task_id=t.id AND a.user_id=?) AS attempts,
      (SELECT result FROM attempts a WHERE a.task_id=t.id AND a.user_id=? AND a.status='completed' ORDER BY a.created_at DESC LIMIT 1) AS last_result
      FROM tasks t LEFT JOIN drafts d ON d.task_id=t.id AND d.user_id=?
      WHERE t.owner_id=? OR t.owner_id IS NULL ORDER BY t.created_at DESC`
      )
      .all(req.user.id, req.user.id, req.user.id, req.user.id)
    res.json(
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        grade: t.grade,
        stage: t.stage,
        skill: t.skill,
        format: t.format,
        shared: t.owner_id === null,
        duration: t.duration,
        createdAt: t.created_at,
        seconds: t.seconds || 0,
        started: Boolean(t.draft_updated),
        attempts: t.attempts,
        result: t.last_result ? JSON.parse(t.last_result) : null,
        maxScore: JSON.parse(t.content).maxScore,
        suggestedMinutes: JSON.parse(t.content).suggestedMinutes,
      }))
    )
  })
  app.get('/api/tasks/:id', (req, res) => {
    const task = taskFor(req)
    const content = JSON.parse(task.content)
    const attempts = db
      .prepare('SELECT * FROM attempts WHERE task_id=? AND user_id=? ORDER BY created_at DESC')
      .all(task.id, req.user.id)
      .map(attemptJSON)
    res.json({
      id: task.id,
      grade: task.grade,
      stage: task.stage,
      skill: task.skill,
      format: task.format,
      shared: !task.owner_id,
      createdAt: task.created_at,
      duration: task.duration,
      audioUrl: task.audio_file ? `/api/tasks/${task.id}/audio` : null,
      ...content,
      questions: content.questions.map(
        ({ correctAnswer, acceptedAnswers, explanation, evidence, ...question }) => question
      ),
      segments: content.segments,
      draft: draftFor(req.user.id, task.id),
      attempts,
    })
  })
  app.get('/api/tasks/:id/audio', (req, res) => {
    const task = taskFor(req)
    if (!task.audio_file) throw new AppError(404, 'Audio is not ready.')
    res.type('audio/wav').sendFile(path.join(config.dataDir, 'audio', task.audio_file))
  })
  app.put('/api/tasks/:id/draft', (req, res) => {
    const task = taskFor(req)
    const input = DraftInput.parse(req.body)
    res.json(transaction(db, () => saveDraft(req.user.id, task, input)))
  })
  app.post('/api/tasks/:id/submit', limited(30, 60_000, true), (req, res) => {
    const task = taskFor(req)
    const input = SubmitInput.parse(req.body)
    const existing = db
      .prepare('SELECT * FROM attempts WHERE user_id=? AND request_id=?')
      .get(req.user.id, input.requestId)
    if (existing) {
      if (existing.task_id !== task.id) throw new AppError(409, 'This request already belongs to another task.')
      return res.json({ attempt: attemptJSON(existing) })
    }
    const writing = task.skill === 'writing'
    if (writing && !input.essay.trim()) throw new AppError(400, 'Write a response before submitting.')
    if (writing && !ai.configured)
      throw new AppError(503, 'Essay assessment is not configured. Your draft is still saved.')
    const id = randomUUID()
    let job
    transaction(db, () => {
      const savedDraft = saveDraft(req.user.id, task, input)
      const spent = db
        .prepare('SELECT coalesce(sum(seconds),0) AS total FROM attempts WHERE user_id=? AND task_id=?')
        .get(req.user.id, task.id).total
      const result = writing ? null : JSON.stringify(gradeAnswers(JSON.parse(task.content), input.answers))
      db.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)').run(
        id,
        req.user.id,
        task.id,
        input.requestId,
        JSON.stringify(input.answers),
        input.essay,
        Math.max(0, savedDraft.seconds - spent),
        writing ? 'grading' : 'completed',
        result,
        now()
      )
      if (writing) job = jobs.create(req.user, 'essay', {}, input.requestId, id, true)
    })
    res.json({
      attempt: attemptJSON(db.prepare('SELECT * FROM attempts WHERE id=?').get(id)),
      job: job ? publicJob(job) : null,
    })
  })
  app.get('/api/jobs', (req, res) =>
    res.json(
      db
        .prepare('SELECT * FROM jobs WHERE owner_id=? ORDER BY created_at DESC LIMIT 100')
        .all(req.user.id)
        .map(publicJob)
    )
  )
  app.get('/api/jobs/:id', (req, res) => res.json(publicJob(jobFor(req))))
  app.get('/api/audio/quota', (req, res) =>
    res.json({
      quota: jobs.quota(req.user),
      configured: ai.configured,
      audioReady: hasAudioEncoder,
    })
  )
  const generateLimit = limited(10, 60_000, true)
  app.post('/api/generate', generateLimit, (req, res) => {
    const { requestId, ...raw } = req.body
    z.string().uuid().parse(requestId)
    const input = GenerationInput.parse(raw)
    if (!ai.configured) throw new AppError(503, 'Generation is not configured. Add OPENAI_API_KEY on the server.')
    if (input.skill === 'listening') {
      if (req.user.role === 'admin')
        throw new AppError(403, 'Use the administrator studio to publish shared audio.')
      if (!hasAudioEncoder)
        throw new AppError(503, 'Audio generation requires FFmpeg on the server.')
    }
    res.status(202).json(publicJob(jobs.create(req.user, input.skill === 'listening' ? 'audio' : 'task', input, requestId)))
  })
  app.post('/api/jobs/:id/retry', generateLimit, (req, res) => {
    const job = jobFor(req)
    if (!ai.configured) throw new AppError(503, 'Add OPENAI_API_KEY before retrying.')
    if (job.kind === 'audio' && !hasAudioEncoder)
      throw new AppError(503, 'Audio generation requires FFmpeg on the server.')
    res.status(202).json(publicJob(jobs.retry(job)))
  })
  app.get('/api/admin', auth.admin, (_req, res) =>
    res.json({
      quota: jobs.quota(),
      configured: ai.configured,
      audioReady: hasAudioEncoder,
      textModel: config.textModel,
      ttsModel: config.ttsModel,
      codes: db.prepare('SELECT id,label,user_id,disabled,created_at FROM codes ORDER BY created_at DESC').all(),
      jobs: db.prepare("SELECT j.* FROM jobs j JOIN users u ON u.id=j.owner_id WHERE j.kind='audio' AND u.role='admin' ORDER BY j.created_at DESC LIMIT 50").all().map(publicJob),
    })
  )
  app.post('/api/admin/codes', auth.admin, (req, res) => {
    const input = z
      .object({
        label: z.string().trim().max(60).default('Student access'),
        count: z.number().int().min(1).max(50).default(1),
      })
      .strict()
      .parse(req.body)
    res
      .status(201)
      .json(
        transaction(db, () =>
          Array.from({ length: input.count }, (_, i) =>
            auth.issueCode(input.count === 1 ? input.label : `${input.label} ${i + 1}`)
          )
        )
      )
  })
  app.post('/api/admin/codes/:id/revoke', auth.admin, (req, res) => {
    auth.revoke(req.params.id)
    res.json({ ok: true })
  })
  app.post('/api/admin/audio', auth.admin, generateLimit, (req, res) => {
    const { requestId, ...raw } = req.body
    z.string().uuid().parse(requestId)
    const input = GenerationInput.parse(raw)
    if (input.skill !== 'listening') throw new AppError(400, 'Choose listening for an audio task.')
    if (!ai.configured || !hasAudioEncoder)
      throw new AppError(503, 'Audio generation requires OPENAI_API_KEY and FFmpeg on the server.')
    res.status(202).json(publicJob(jobs.create(req.user, 'audio', input, requestId)))
  })
  app.use('/api', (_req, _res, next) => next(new AppError(404, 'Endpoint not found.')))
  const dist = path.resolve('dist')
  if (existsSync(dist)) {
    app.use(express.static(dist, { index: false }))
    app.get('/{*path}', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
  }
  app.use((error, _req, res, _next) => {
    if (error instanceof ZodError)
      return res.status(400).json({ error: 'Check your request: ' + error.issues.map((i) => i.message).join('; ') })
    const status =
      error instanceof AppError
        ? error.status
        : error.type === 'entity.too.large'
          ? 413
          : error.type === 'entity.parse.failed'
            ? 400
            : 500
    res.status(status).json({
      error:
        error instanceof AppError
          ? error.message
          : status === 400
            ? 'Invalid JSON request.'
            : status === 413
              ? 'This request is too large.'
              : 'Something went wrong on the server. Your saved work is safe.',
    })
  })
  return { app, db, jobs, auth }
}
