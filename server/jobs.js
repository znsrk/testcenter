import { randomUUID } from 'node:crypto'
import { AppError } from './config.js'
import { now, transaction } from './db.js'
import { generateTask } from './generation.js'
import { gradeEssay } from './grading.js'
import { buildAudio } from './audio.js'

export function calendarDay(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  return ['year', 'month', 'day'].map((key) => parts.find((p) => p.type === key).value).join('-')
}

export function publicJob(job) {
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    options: JSON.parse(job.options),
    taskId: job.task_id,
    attemptId: job.attempt_id,
    error: job.error,
    progress: job.progress,
    retries: job.retries,
    createdAt: job.created_at,
    day: job.day,
  }
}

export function createJobs(db, config, ai, { audioBuilder = buildAudio, autoRun = true } = {}) {
  let working = false
  let stopped = false
  db.prepare("UPDATE jobs SET status='queued' WHERE status='running'").run()
  function quota(user = null) {
    const day = calendarDay(new Date(), config.timezone)
    const used = user?.role === 'student'
      ? db.prepare("SELECT count(*) AS n FROM jobs WHERE day=? AND owner_id=? AND kind='audio'").get(day, user.id).n
      : db.prepare("SELECT count(*) AS n FROM jobs WHERE day=? AND kind='audio' AND slot IS NOT NULL").get(day).n
    return { day, used, remaining: Math.max(0, 2 - used), limit: 2, timezone: config.timezone }
  }
  function create(user, kind, options, requestKey, attemptId = null, insideTransaction = false) {
    const insert = () => {
      const existing =
        requestKey && db.prepare('SELECT * FROM jobs WHERE owner_id=? AND request_key=?').get(user.id, requestKey)
      if (existing) return existing
      if (
        kind !== 'audio' &&
        db
          .prepare("SELECT id FROM jobs WHERE owner_id=? AND kind!='audio' AND status IN ('queued','running')")
          .get(user.id)
      )
        throw new AppError(409, 'Your previous generation is still running.')
      const budget = kind === 'audio' ? quota(user) : null
      if (budget?.remaining === 0)
        throw new AppError(
          429,
          'Both listening slots have been used today. Resume an existing failed job, or return tomorrow.'
        )
      const id = randomUUID()
      db.prepare(
        `INSERT INTO jobs(id,owner_id,request_key,kind,status,options,attempt_id,day,slot,created_at)
        VALUES(?,?,?,?,'queued',?,?,?,?,?)`
      ).run(
        id,
        user.id,
        requestKey || null,
        kind,
        JSON.stringify(options),
        attemptId,
        budget?.day || null,
        budget && user.role === 'admin' ? budget.used + 1 : null,
        now()
      )
      return db.prepare('SELECT * FROM jobs WHERE id=?').get(id)
    }
    const job = insideTransaction ? insert() : transaction(db, insert)
    if (autoRun) setImmediate(run)
    return job
  }
  function retry(job) {
    if (job.status !== 'failed') throw new AppError(409, 'Only a failed job can be resumed.')
    if (job.retries >= 3)
      throw new AppError(
        429,
        'This job has reached its three-retry limit. Ask the administrator to inspect the server.'
      )
    db.prepare("UPDATE jobs SET status='queued',error=NULL,retries=retries+1 WHERE id=? AND status='failed'").run(
      job.id
    )
    if (job.attempt_id) db.prepare("UPDATE attempts SET status='grading' WHERE id=?").run(job.attempt_id)
    if (autoRun) setImmediate(run)
    return db.prepare('SELECT * FROM jobs WHERE id=?').get(job.id)
  }
  async function run() {
    if (working || stopped) return
    working = true
    try {
      let job
      while (
        !stopped &&
        (job = db.prepare("SELECT * FROM jobs WHERE status='queued' ORDER BY created_at,id LIMIT 1").get())
      ) {
        db.prepare("UPDATE jobs SET status='running',error=NULL WHERE id=?").run(job.id)
        try {
          const options = JSON.parse(job.options)
          if (job.kind === 'essay') {
            const attempt = db.prepare('SELECT * FROM attempts WHERE id=?').get(job.attempt_id)
            const task = db.prepare('SELECT content FROM tasks WHERE id=?').get(attempt.task_id)
            const result = await gradeEssay(ai, JSON.parse(task.content), attempt.essay)
            transaction(db, () => {
              db.prepare("UPDATE attempts SET status='completed',result=? WHERE id=?").run(
                JSON.stringify(result),
                attempt.id
              )
              db.prepare("UPDATE jobs SET status='completed',progress=100,task_id=? WHERE id=?").run(
                attempt.task_id,
                job.id
              )
            })
          } else {
            const content = job.checkpoint
              ? JSON.parse(job.checkpoint)
              : await generateTask(ai, options, {
                  initialDraft: job.generation_draft ? JSON.parse(job.generation_draft) : null,
                  onDraft: (draft) =>
                    db.prepare('UPDATE jobs SET generation_draft=?,progress=5 WHERE id=?').run(
                      JSON.stringify(draft),
                      job.id
                    ),
                })
            if (!job.checkpoint)
              db.prepare('UPDATE jobs SET checkpoint=?,generation_draft=NULL,progress=15 WHERE id=?').run(
                JSON.stringify(content),
                job.id
              )
            let audio = null
            if (job.kind === 'audio')
              audio = await audioBuilder(config, ai, job.id, content, (progress) =>
                db.prepare('UPDATE jobs SET progress=? WHERE id=?').run(progress, job.id)
              )
            transaction(db, () => {
              const id = randomUUID()
              const sharedAudio =
                job.kind === 'audio' &&
                db.prepare('SELECT role FROM users WHERE id=?').get(job.owner_id)?.role === 'admin'
              db.prepare(
                `INSERT INTO tasks(id,owner_id,job_id,grade,stage,skill,format,title,content,audio_file,duration,created_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`
              ).run(
                id,
                sharedAudio ? null : job.owner_id,
                job.id,
                options.grade,
                options.stage,
                options.skill,
                options.format,
                content.title,
                JSON.stringify(content),
                audio?.audioFile || null,
                audio?.duration || null,
                now()
              )
              db.prepare("UPDATE jobs SET status='completed',progress=100,task_id=? WHERE id=?").run(id, job.id)
            })
          }
        } catch (error) {
          const message =
            error instanceof AppError
              ? error.message
              : 'The provider request failed. Check the API configuration or balance, then retry this saved job.'
          db.prepare("UPDATE jobs SET status='failed',error=? WHERE id=?").run(message, job.id)
          if (job.attempt_id) db.prepare("UPDATE attempts SET status='failed' WHERE id=?").run(job.attempt_id)
          console.error(
            `Job ${job.id} failed (${error.name || 'Error'}, status ${error.status || 'unknown'}): ${message}`
          )
        }
      }
    } finally {
      working = false
    }
  }
  return {
    create,
    retry,
    run,
    quota,
    stop: () => {
      stopped = true
    },
    get working() {
      return working
    },
  }
}
