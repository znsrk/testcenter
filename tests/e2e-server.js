// Isolated local test server. This module is never imported by production code.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createApp } from '../server/app.js'
import { readConfig } from '../server/config.js'
import { hashSecret } from '../server/auth.js'
import { exampleOptions, fakeAI, seedTask } from './fixtures.js'

const dataDir = mkdtempSync(path.join(tmpdir(), 'testcenter-browser-'))
const config = readConfig({
  DATA_DIR: dataDir,
  ADMIN_ACCESS_CODE: 'E2E-MASTER-CODE-DO-NOT-USE',
  APP_ORIGIN: 'http://127.0.0.1:4179',
  PORT: '4179',
})
const instance = createApp(config, {
  ai: fakeAI(),
  hasAudioEncoder: true,
  audioBuilder: async () => ({ audioFile: 'fixture.wav', duration: 420 }),
})
const access = instance.auth.issueCode('Browser test')
instance.db.prepare('INSERT INTO users VALUES(?,?,?)').run('browser-student', 'student', new Date().toISOString())
instance.db
  .prepare('UPDATE codes SET hash=?,user_id=? WHERE id=?')
  .run(hashSecret('E2E-STUDENT-CODE'), 'browser-student', access.id)
for (const project of ['DESKTOP', 'MOBILE']) {
  const audioAccess = instance.auth.issueCode(`Audio ${project.toLowerCase()} test`)
  instance.db.prepare('UPDATE codes SET hash=? WHERE id=?').run(hashSecret(`E2E-AUDIO-${project}-CODE`), audioAccess.id)
}
seedTask(instance.db, 'browser-student')
const listening = seedTask(instance.db, null, { ...exampleOptions, skill: 'listening' })
instance.db.prepare('UPDATE tasks SET audio_file=?,duration=? WHERE id=?').run('fixture.wav', 420, listening)
// A silent recording is intentional for deterministic browser tests; no paid TTS calls.
mkdirSync(path.join(dataDir, 'audio'), { recursive: true })
const wav = Buffer.alloc(44 + 420 * 48000)
wav.write('RIFF', 0)
wav.writeUInt32LE(wav.length - 8, 4)
wav.write('WAVEfmt ', 8)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(24000, 24)
wav.writeUInt32LE(48000, 28)
wav.writeUInt16LE(2, 32)
wav.writeUInt16LE(16, 34)
wav.write('data', 36)
wav.writeUInt32LE(wav.length - 44, 40)
writeFileSync(path.join(dataDir, 'audio', 'fixture.wav'), wav)
const server = instance.app.listen(4179, '127.0.0.1', () => console.log('Isolated browser test server ready on 4179.'))
// Explicit teardown avoids orphaned child processes from Windows shell wrappers.
instance.app.post('/__test/shutdown', (_req, res) => {
  res.json({ ok: true })
  instance.jobs.stop()
  server.close(() => {
    instance.db.close()
    rmSync(dataDir, { recursive: true, force: true })
    process.exit(0)
  })
})
