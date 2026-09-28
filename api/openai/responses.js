import { timingSafeEqual } from 'node:crypto'

export const config = { maxDuration: 180 }

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function equal(a, b) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const chunks = []
  let length = 0
  for await (const chunk of req) {
    length += chunk.length
    if (length > 100_000) throw new Error('Request too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: { message: 'Method not allowed.' } })
  const accessCode = process.env.ACCESS_CODE || process.env.VITE_ACCESS_CODE
  const supplied = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1] || ''
  if (!accessCode || !equal(supplied, accessCode))
    return send(res, 401, { error: { message: 'Access code is invalid. Sign in again.' } })
  if (!process.env.OPENAI_API_KEY)
    return send(res, 503, { error: { message: 'Generation is not configured. Set OPENAI_API_KEY on the server.' } })

  let body
  try { body = await readBody(req) } catch {
    return send(res, 400, { error: { message: 'Invalid generation request.' } })
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body) ||
      typeof body.instructions !== 'string' || body.instructions.length > 20_000 ||
      !Array.isArray(body.input) || JSON.stringify(body.input).length > 60_000 ||
      body.text?.format?.type !== 'json_schema' ||
      !['olympiad_task', 'olympiad_question_repair', 'olympiad_script_continuation', 'writing_assessment'].includes(body.text.format.name) ||
      !Number.isInteger(body.max_output_tokens) || body.max_output_tokens > 20_000 ||
      body.max_output_tokens < 1) {
    return send(res, 400, { error: { message: 'Invalid generation request.' } })
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || 'gpt-5-mini',
        store: false,
        instructions: body.instructions,
        input: body.input,
        text: body.text,
        reasoning: { effort: 'low' },
        max_output_tokens: body.max_output_tokens,
      }),
      signal: AbortSignal.timeout(150_000),
    })
    const result = await upstream.json()
    return send(res, upstream.status, result)
  } catch {
    return send(res, 502, { error: { message: 'Generation service did not respond. Please resume the task.' } })
  }
}
