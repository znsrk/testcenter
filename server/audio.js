import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { AppError } from './config.js'

export const speakerVoices = ['coral', 'onyx', 'sage', 'nova', 'ash']
export const PCM_BYTES_PER_SECOND = 24000 * 2
export const ffmpegAvailable = (executable) =>
  spawnSync(executable, ['-version'], { windowsHide: true, timeout: 5000, stdio: 'ignore' }).status === 0

export function wavDuration(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE')
    throw new Error('Invalid WAV')
  let rate = 0
  for (let at = 12; at + 8 <= buffer.length;) {
    const kind = buffer.toString('ascii', at, at + 4)
    const size = buffer.readUInt32LE(at + 4)
    if (kind === 'fmt ') rate = buffer.readUInt32LE(at + 16)
    if (kind === 'data') {
      if (!rate || size > buffer.length - at - 8) throw new Error('Incomplete WAV')
      return size / rate
    }
    at += 8 + size + (size % 2)
  }
  throw new Error('Missing WAV audio')
}

async function encode(config, pcm, output, tempo) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      config.ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-f',
        's16le',
        '-ar',
        '24000',
        '-ac',
        '1',
        '-i',
        'pipe:0',
        '-af',
        `atempo=${tempo.toFixed(6)}`,
        '-c:a',
        'pcm_s16le',
        '-f',
        'wav',
        output,
      ],
      { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] }
    )
    const timer = setTimeout(() => {
      child.kill()
      reject(new AppError(500, 'Audio assembly timed out. Retry this job.'))
    }, 120_000)
    child.stderr.resume()
    child.on('error', () => {
      clearTimeout(timer)
      reject(new AppError(503, 'FFmpeg is unavailable. Ask the administrator to check its installation.'))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      code === 0
        ? resolve()
        : reject(new AppError(500, 'Audio assembly failed. Retry to reuse the saved speech segments.'))
    })
    child.stdin.on('error', () => {})
    child.stdin.end(pcm)
  })
}

export async function buildAudio(config, ai, jobId, content, progress = () => {}) {
  const root = path.join(config.dataDir, 'audio')
  const partsDir = path.join(root, 'parts', jobId)
  mkdirSync(partsDir, { recursive: true })
  const finalPath = path.join(root, `${jobId}.wav`)
  if (existsSync(finalPath)) {
    const duration = wavDuration(readFileSync(finalPath))
    if (duration >= 360 && duration <= 480) return { audioFile: `${jobId}.wav`, duration }
    throw new AppError(500, 'The saved recording failed its duration check.')
  }
  const buffers = []
  for (const [index, segment] of content.segments.entries()) {
    const part = path.join(partsDir, `${index}.pcm`)
    let pcm
    if (existsSync(part)) {
      pcm = readFileSync(part)
      if (pcm.length < 4800 || pcm.length % 2)
        throw new AppError(500, 'A saved speech segment is damaged. Restore it from a backup.')
    } else {
      pcm = await ai.speech(segment.text, speakerVoices[segment.speaker - 1])
      writeFileSync(part + '.partial', pcm)
      renameSync(part + '.partial', part)
    }
    buffers.push(pcm)
    if (index < content.segments.length - 1) buffers.push(Buffer.alloc(PCM_BYTES_PER_SECOND * 0.35))
    progress(Math.round(15 + (70 * (index + 1)) / content.segments.length))
  }
  const pcm = Buffer.concat(buffers)
  const rawSeconds = pcm.length / PCM_BYTES_PER_SECOND
  const tempo = rawSeconds < 365 || rawSeconds > 475 ? rawSeconds / 420 : 1
  if (tempo < 0.65 || tempo > 1.4)
    throw new AppError(
      502,
      'The speech duration is outside the safe pacing range. The job was saved but cannot be published.'
    )
  progress(90)
  await encode(config, pcm, finalPath + '.partial', tempo)
  const duration = wavDuration(readFileSync(finalPath + '.partial'))
  if (duration < 360 || duration > 480)
    throw new AppError(502, 'The final recording did not pass its 6–8 minute duration check.')
  renameSync(finalPath + '.partial', finalPath)
  return { audioFile: `${jobId}.wav`, duration }
}
