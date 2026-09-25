import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildAudio, ffmpegAvailable, PCM_BYTES_PER_SECOND, wavDuration } from '../server/audio.js'

test('audio resumes completed segments, assigns different voices, assembles valid audio and checks 6–8 minute duration', async (t) => {
  if (!ffmpegAvailable('ffmpeg')) {
    t.skip('Install FFmpeg to run the audio assembly integration test.')
    return
  }
  const dataDir = mkdtempSync(path.join(tmpdir(), 'testcenter-audio-'))
  t.after(() => rmSync(dataDir, { recursive: true, force: true }))
  const config = { dataDir, ffmpeg: 'ffmpeg' }
  const voices = []
  let failure = true
  const ai = {
    async speech(_text, voice) {
      voices.push(voice)
      if (voice === 'onyx' && failure) throw new Error('Network failed')
      return Buffer.alloc(PCM_BYTES_PER_SECOND * 165)
    },
  }
  const content = {
    segments: [
      { speaker: 1, text: 'First voice' },
      { speaker: 2, text: 'Second voice' },
    ],
  }
  await assert.rejects(buildAudio(config, ai, 'test-job', content), /Network failed/)
  failure = false
  const result = await buildAudio(config, ai, 'test-job', content)
  assert.deepEqual(voices, ['coral', 'onyx', 'onyx'])
  assert.ok(result.duration >= 360 && result.duration <= 480)
  assert.ok(Math.abs(result.duration - 420) < 2)
  const wav = readFileSync(path.join(dataDir, 'audio', result.audioFile))
  assert.equal(wavDuration(wav), result.duration)
  await buildAudio(config, ai, 'test-job', content)
  assert.equal(voices.length, 3, 'published audio should not call TTS again')
})
