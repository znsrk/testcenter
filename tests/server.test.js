import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createApp } from '../server/app.js'
import { readConfig } from '../server/config.js'
import { openDatabase } from '../server/db.js'
import { hashSecret } from '../server/auth.js'
import { createJobs, calendarDay } from '../server/jobs.js'
import { validateTask } from '../server/generation.js'
import { gradeAnswers, validateEssayAssessment } from '../server/grading.js'
import { fakeAI, rawTask, rawEssay, exampleOptions, seedTask } from './fixtures.js'

async function fixture(t, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'testcenter-test-'))
  const config = {
    ...readConfig({
      ADMIN_ACCESS_CODE: 'test-master-code-long-enough',
      DATA_DIR: dir,
      APP_ORIGIN: 'http://localhost:9999',
    }),
    ...options.config,
  }
  const ai = options.ai || fakeAI()
  const instance = createApp(config, { ai, autoRun: false, hasAudioEncoder: true, ...options.dependencies })
  const server = instance.app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  t.after(async () => {
    instance.jobs.stop()
    await new Promise((resolve) => server.close(resolve))
    instance.db.close()
    rmSync(dir, { recursive: true, force: true })
  })
  async function request(route, { method = 'GET', body, cookie, headers = {} } = {}) {
    const response = await fetch(url + '/api' + route, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = await response.json()
    return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0], response }
  }
  async function login(code = config.adminCode) {
    return request('/login', { method: 'POST', body: { code } })
  }
  return { ...instance, config, ai, dir, request, login }
}

test('codes create one stable anonymous profile, cookies are HttpOnly, raw codes are not stored, and revoked sessions are denied', async (t) => {
  const f = await fixture(t)
  const admin = await f.login()
  assert.equal(admin.data.user.role, 'admin')
  assert.match(admin.response.headers.get('set-cookie'), /HttpOnly/)
  assert.match(admin.response.headers.get('set-cookie'), /SameSite=Strict/)
  const created = await f.request('/admin/codes', {
    method: 'POST',
    cookie: admin.cookie,
    body: { count: 1, label: 'Practice' },
  })
  const code = created.data[0]
  const first = await f.login(code.code)
  const second = await f.login(code.code)
  assert.equal(first.data.user.id, second.data.user.id)
  assert.equal(first.data.user.email, undefined)
  // Successful school logins from the same shared IP must not exhaust the failed-login limit.
  for (let i = 0; i < 16; i++) assert.equal((await f.login(code.code)).status, 200)
  assert.equal(f.db.prepare('SELECT hash FROM codes WHERE id=?').get(code.id).hash, hashSecret(code.code))
  assert.equal((await f.login('invalid')).status, 401)
  assert.equal((await f.request('/admin', { cookie: first.cookie })).status, 403)
  await f.request(`/admin/codes/${code.id}/revoke`, { method: 'POST', cookie: admin.cookie, body: {} })
  assert.equal((await f.request('/session', { cookie: first.cookie })).status, 401)
  assert.equal((await f.login(code.code)).status, 401)
  assert.ok(f.db.prepare('SELECT id FROM users WHERE id=?').get(first.data.user.id))
})

test('private tasks cannot be read or submitted by another profile, no answers leak before marking', async (t) => {
  const f = await fixture(t)
  const codes = [f.auth.issueCode('one'), f.auth.issueCode('two')]
  const a = await f.login(codes[0].code)
  const b = await f.login(codes[1].code)
  const id = seedTask(f.db, a.data.user.id)
  const own = await f.request(`/tasks/${id}`, { cookie: a.cookie })
  assert.equal(own.status, 200)
  assert.equal(own.data.questions[0].correctAnswer, undefined)
  assert.equal(own.data.questions[0].explanation, undefined)
  assert.equal((await f.request(`/tasks/${id}`, { cookie: b.cookie })).status, 404)
  assert.equal((await f.request(`/tasks/${id}/submit`, { method: 'POST', cookie: b.cookie, body: {} })).status, 404)
  assert.equal((await f.request('/tasks')).status, 401)
  assert.equal((await f.request('/admin/audio', { method: 'POST', cookie: a.cookie, body: {} })).status, 403)
})

test('drafts survive database reopen, stale writes conflict, scores are server-controlled and submissions idempotent', async (t) => {
  const f = await fixture(t)
  const user = await f.login(f.auth.issueCode('one').code)
  const id = seedTask(f.db, user.data.user.id)
  const draft = { answers: { q1: 'Saturday', q2: 'Monday' }, essay: '', seconds: 73, revision: 0 }
  const save = await f.request(`/tasks/${id}/draft`, { method: 'PUT', cookie: user.cookie, body: draft })
  assert.equal(save.status, 200)
  assert.equal(save.data.revision, 1)
  assert.equal((await f.request(`/tasks/${id}/draft`, { method: 'PUT', cookie: user.cookie, body: draft })).status, 409)
  const reopened = openDatabase(f.dir)
  assert.equal(reopened.prepare('SELECT seconds FROM drafts WHERE task_id=?').get(id).seconds, 73)
  reopened.close()
  const body = { ...draft, revision: 1, requestId: randomUUID() }
  const submitted = await f.request(`/tasks/${id}/submit`, { method: 'POST', cookie: user.cookie, body })
  assert.equal(submitted.status, 200)
  assert.equal(submitted.data.attempt.result.score, 1)
  assert.equal(submitted.data.attempt.seconds, 73)
  const duplicate = await f.request(`/tasks/${id}/submit`, { method: 'POST', cookie: user.cookie, body })
  assert.equal(duplicate.data.attempt.id, submitted.data.attempt.id)
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM attempts').get().n, 1)
  const repeated = await f.request(`/tasks/${id}/submit`, {
    method: 'POST',
    cookie: user.cookie,
    body: { ...body, seconds: 100, revision: 2, requestId: randomUUID() },
  })
  assert.equal(repeated.data.attempt.seconds, 27, 'new attempts count only additional active time')
  assert.equal(
    (await f.request(`/tasks/${id}/submit`, { method: 'POST', cookie: user.cookie, body: { ...body, score: 999 } }))
      .status,
    400
  )
})

test('text generation is queued, persists across restart, and duplicate requests reuse the same task', async (t) => {
  const f = await fixture(t)
  const user = await f.login(f.auth.issueCode('one').code)
  const body = { ...exampleOptions, requestId: randomUUID() }
  const created = await f.request('/generate', { method: 'POST', cookie: user.cookie, body })
  assert.equal(created.status, 202)
  const twice = await f.request('/generate', { method: 'POST', cookie: user.cookie, body })
  assert.equal(twice.data.id, created.data.id)
  f.db.prepare("UPDATE jobs SET status='running' WHERE id=?").run(created.data.id)
  const restarted = createJobs(f.db, f.config, f.ai, { autoRun: false })
  await restarted.run()
  const job = (await f.request(`/jobs/${created.data.id}`, { cookie: user.cookie })).data
  assert.equal(job.status, 'completed')
  assert.ok(job.taskId)
  assert.equal((await f.request('/tasks', { cookie: user.cookie })).data.length, 1)
  assert.equal(f.ai.calls.length, 1)
})

test('two global daily audio reservations are atomic, failed retries keep their slot and publication is shared only when complete', async (t) => {
  let fail = true
  const f = await fixture(t, {
    dependencies: {
      audioBuilder: async () => {
        if (fail) throw new Error('network')
        return { audioFile: 'test.wav', duration: 420 }
      },
    },
  })
  const admin = await f.login()
  const student = await f.login(f.auth.issueCode('one').code)
  const input = { ...exampleOptions, skill: 'listening' }
  const requested = await Promise.all(
    [1, 2, 3].map(() =>
      f.request('/admin/audio', { method: 'POST', cookie: admin.cookie, body: { ...input, requestId: randomUUID() } })
    )
  )
  assert.deepEqual(requested.map((r) => r.status).sort(), [202, 202, 429])
  assert.equal((await f.request('/tasks', { cookie: student.cookie })).data.length, 0)
  await f.jobs.run()
  assert.equal(f.jobs.quota().remaining, 0)
  const failed = f.db.prepare("SELECT * FROM jobs WHERE kind='audio' LIMIT 1").get()
  assert.equal(failed.status, 'failed')
  assert.ok(failed.checkpoint)
  fail = false
  assert.equal(
    (await f.request(`/jobs/${failed.id}/retry`, { method: 'POST', cookie: student.cookie, body: {} })).status,
    404
  )
  await f.request(`/jobs/${failed.id}/retry`, { method: 'POST', cookie: admin.cookie, body: {} })
  await f.jobs.run()
  assert.equal(f.jobs.quota().remaining, 0)
  assert.equal(f.ai.calls.length, 2, 'saved script must be reused on retry')
  const shared = (await f.request('/tasks', { cookie: student.cookie })).data
  assert.equal(shared.length, 1)
  assert.equal(shared[0].shared, true)
  const before = (await f.request(`/tasks/${shared[0].id}`, { cookie: student.cookie })).data
  assert.ok(before.segments.length > 0, 'students can read a shared transcript before answering')
  assert.equal(before.questions[0].correctAnswer, undefined)
  assert.equal(calendarDay(new Date('2026-09-25T18:59:59Z'), 'Asia/Qyzylorda'), '2026-09-25')
  assert.equal(calendarDay(new Date('2026-09-25T19:00:00Z'), 'Asia/Qyzylorda'), '2026-09-26')
})

test('each student can generate two private audio tasks per day and see transcripts before submitting', async (t) => {
  let firstAudioFails = true
  const f = await fixture(t, {
    dependencies: {
      audioBuilder: async () => {
        if (firstAudioFails) {
          firstAudioFails = false
          throw new Error('temporary TTS failure')
        }
        return { audioFile: 'test.wav', duration: 420 }
      },
    },
  })
  const admin = await f.login()
  const a = await f.login(f.auth.issueCode('one').code)
  const b = await f.login(f.auth.issueCode('two').code)
  const input = { ...exampleOptions, skill: 'listening', count: 20, format: 'mixed' }
  const create = (cookie, requestId = randomUUID()) =>
    f.request('/generate', { method: 'POST', cookie, body: { ...input, requestId } })
  const idempotentKey = randomUUID()
  const requestedA = await Promise.all([create(a.cookie, idempotentKey), create(a.cookie), create(a.cookie)])
  assert.deepEqual(requestedA.map((result) => result.status).sort(), [202, 202, 429])
  assert.equal((await create(a.cookie, idempotentKey)).data.id, requestedA[0].data.id)
  assert.equal((await f.request('/audio/quota', { cookie: a.cookie })).data.quota.remaining, 0)
  assert.equal((await f.request('/audio/quota', { cookie: b.cookie })).data.quota.remaining, 2)
  assert.deepEqual((await Promise.all([create(b.cookie), create(b.cookie), create(b.cookie)])).map((r) => r.status).sort(), [202, 202, 429])
  assert.equal((await f.request('/audio/quota', { cookie: b.cookie })).data.quota.remaining, 0)
  assert.equal((await f.request('/audio/quota', { cookie: admin.cookie })).data.quota.remaining, 2)
  assert.equal((await f.request('/admin/audio', { method: 'POST', cookie: a.cookie, body: {} })).status, 403)
  await f.jobs.run()
  const failed = f.db.prepare("SELECT * FROM jobs WHERE owner_id=? AND kind='audio' AND status='failed'").get(a.data.user.id)
  assert.ok(failed)
  assert.equal((await f.request(`/jobs/${failed.id}/retry`, { method: 'POST', cookie: b.cookie, body: {} })).status, 404)
  const originalGenerations = f.ai.calls.length
  assert.equal((await f.request(`/jobs/${failed.id}/retry`, { method: 'POST', cookie: a.cookie, body: {} })).status, 202)
  await f.jobs.run()
  assert.equal(f.ai.calls.length, originalGenerations, 'retry reuses the saved script and questions')
  assert.equal((await f.request('/audio/quota', { cookie: a.cookie })).data.quota.remaining, 0)
  const privateA = (await f.request('/tasks', { cookie: a.cookie })).data
  const privateB = (await f.request('/tasks', { cookie: b.cookie })).data
  assert.equal(privateA.length, 2)
  assert.equal(privateB.length, 2)
  assert.ok(privateA.every((task) => !task.shared))
  assert.ok(privateB.every((task) => !task.shared))
  assert.ok(privateA.every((task) => !privateB.some((other) => other.id === task.id)))
  const before = (await f.request(`/tasks/${privateA[0].id}`, { cookie: a.cookie })).data
  assert.ok(before.segments.length > 0)
  assert.equal(before.questions[0].correctAnswer, undefined)
  assert.equal((await f.request(`/tasks/${privateA[0].id}`, { cookie: b.cookie })).status, 404)
  assert.equal((await f.request(`/tasks/${privateA[0].id}/audio`, { cookie: b.cookie })).status, 404)
  const shared = await f.request('/admin/audio', {
    method: 'POST', cookie: admin.cookie, body: { ...input, requestId: randomUUID() },
  })
  assert.equal(shared.status, 202, 'student audio does not use an administrator slot')
  await f.jobs.run()
  assert.equal((await f.request('/audio/quota', { cookie: admin.cookie })).data.quota.remaining, 1)
  assert.equal((await f.request('/tasks', { cookie: a.cookie })).data.filter((task) => task.shared).length, 1)
  assert.equal((await f.request('/admin', { cookie: admin.cookie })).data.jobs.length, 1)
})

test('failed audio question repair keeps its script through a server restart and resumes the same job', async (t) => {
  const input = { ...exampleOptions, grade: 10, stage: 'national', skill: 'listening', format: 'mixed', count: 20 }
  let allowRepair = false
  const calls = []
  const ai = {
    configured: true,
    async json(_schema, name) {
      calls.push(name)
      if (name === 'olympiad_question_repair') {
        const question = rawTask(input).questions[18]
        if (!allowRepair) question.evidence = 'Invented evidence.'
        return { question }
      }
      const task = rawTask(input)
      task.questions[18].evidence = 'Invented evidence.'
      return task
    },
  }
  const audioBuilder = async () => ({ audioFile: 'saved.wav', duration: 420 })
  const f = await fixture(t, { ai, dependencies: { audioBuilder } })
  const admin = await f.login()
  const created = await f.request('/admin/audio', {
    method: 'POST', cookie: admin.cookie, body: { ...input, requestId: randomUUID() },
  })
  assert.equal(created.status, 202)
  await f.jobs.run()
  const failed = f.db.prepare('SELECT * FROM jobs WHERE id=?').get(created.data.id)
  assert.equal(failed.status, 'failed')
  assert.equal(failed.checkpoint, null)
  assert.equal(JSON.parse(failed.generation_draft).questions.length, 20)
  const fullGenerations = calls.filter((name) => name === 'olympiad_task').length
  allowRepair = true
  const reopened = openDatabase(f.dir)
  const resumed = createJobs(reopened, f.config, ai, { autoRun: false, audioBuilder })
  resumed.retry(reopened.prepare('SELECT * FROM jobs WHERE id=?').get(created.data.id))
  await resumed.run()
  const completed = reopened.prepare('SELECT * FROM jobs WHERE id=?').get(created.data.id)
  assert.equal(completed.status, 'completed')
  assert.ok(completed.checkpoint)
  assert.equal(completed.generation_draft, null)
  assert.equal(calls.filter((name) => name === 'olympiad_task').length, fullGenerations)
  reopened.close()
})

test('essays are saved before evaluation, recover after provider failure and return proportional /40 feedback', async (t) => {
  const ai = fakeAI()
  const original = ai.json
  let fail = true
  ai.json = async function (...args) {
    if (fail) throw new Error('offline')
    return original.apply(this, args)
  }
  const f = await fixture(t, { ai })
  const student = await f.login(f.auth.issueCode('one').code)
  const id = seedTask(f.db, student.data.user.id, { ...exampleOptions, skill: 'writing', format: 'essay' })
  const essay =
    'Schools can help students discover new interests by creating a community garden. Every student can participate.'
  const response = await f.request(`/tasks/${id}/submit`, {
    method: 'POST',
    cookie: student.cookie,
    body: { answers: {}, essay, seconds: 300, revision: 0, requestId: randomUUID() },
  })
  assert.equal(response.status, 200)
  assert.equal(response.data.attempt.essay, essay)
  await f.jobs.run()
  assert.equal(f.db.prepare('SELECT status FROM attempts WHERE id=?').get(response.data.attempt.id).status, 'failed')
  fail = false
  await f.request(`/jobs/${response.data.job.id}/retry`, { method: 'POST', cookie: student.cookie, body: {} })
  await f.jobs.run()
  const task = (await f.request(`/tasks/${id}`, { cookie: student.cookie })).data
  assert.equal(task.attempts[0].result.score, 28.9)
  assert.equal(task.attempts[0].result.criteria.length, 4)
  assert.equal(task.draft.essay, essay)
})

test('hostile origins and non-JSON requests are rejected', async (t) => {
  const f = await fixture(t)
  assert.equal(
    (
      await f.request('/login', {
        method: 'POST',
        headers: { Origin: 'https://evil.example' },
        body: { code: f.config.adminCode },
      })
    ).status,
    403
  )
  assert.equal(
    (
      await f.request('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: { code: f.config.adminCode },
      })
    ).status,
    415
  )
})

test('gap answers normalize typography/space while enforcing word limits; source and essay evidence are validated', () => {
  const content = validateTask(rawTask({ ...exampleOptions, format: 'gap_fill' }), {
    ...exampleOptions,
    format: 'gap_fill',
  })
  assert.equal(gradeAnswers(content, { q1: '  SATURDAY. ', q2: 'Saturday morning' }).score, 1)
  const invalid = rawTask()
  invalid.questions[0].correctAnswer = 'Sunday'
  assert.throws(() => validateTask(invalid, exampleOptions), /invalid answer key/)
  const essay = rawEssay()
  essay.taskResponse.band = 12
  assert.throws(() => validateEssayAssessment(essay, 'Schools can help.', content), /invalid band/)
  const invented = rawEssay()
  invented.corrections = [{ original: 'Never written', improved: 'Better', explanation: 'Made up' }]
  assert.throws(() => validateEssayAssessment(invented, 'Schools can help.', content), /could not be verified/)
  const national = validateTask(rawTask({ ...exampleOptions, grade: 9, stage: 'national' }), {
    ...exampleOptions,
    grade: 9,
    stage: 'national',
  })
  assert.equal(national.profile.adapted, true)
})
