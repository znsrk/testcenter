import 'dotenv/config'
import path from 'node:path'
export { AppError } from './errors.js'

export function readConfig(env = process.env) {
  const config = {
    apiKey: env.OPENAI_API_KEY || '',
    textModel: env.OPENAI_TEXT_MODEL || 'gpt-5-mini',
    ttsModel: env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
    adminCode: env.ADMIN_ACCESS_CODE || '',
    dataDir: path.resolve(env.DATA_DIR || './data'),
    port: Number(env.PORT || 3001),
    origin: env.APP_ORIGIN || 'http://localhost:5173',
    timezone: env.APP_TIMEZONE || 'Asia/Qyzylorda',
    secureCookie: env.COOKIE_SECURE === 'true',
    ffmpeg: env.FFMPEG_PATH || 'ffmpeg',
    trustProxy: Number(env.TRUST_PROXY || 0),
  }
  new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone }).format()
  if (config.adminCode && config.adminCode.length < 16)
    throw new Error('ADMIN_ACCESS_CODE must have at least 16 characters.')
  if (
    env.NODE_ENV === 'production' &&
    (!config.adminCode || !config.secureCookie || !config.origin.startsWith('https://'))
  ) {
    throw new Error('Production requires ADMIN_ACCESS_CODE, COOKIE_SECURE=true and an HTTPS APP_ORIGIN.')
  }
  return config
}
