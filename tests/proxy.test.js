import { test } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/openai/responses.js'

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(body) { this.body = JSON.parse(body) },
  }
}

test('same-origin generation endpoint checks access and keeps the OpenAI key server-side', async () => {
  const originalKey = process.env.OPENAI_API_KEY
  const originalCode = process.env.ACCESS_CODE
  const originalFetch = globalThis.fetch
  process.env.ACCESS_CODE = 'friends-test-code'
  process.env.OPENAI_API_KEY = 'server-only-test-key'
  try {
    const body = { instructions: 'Write questions.', input: [{ role: 'user', content: '{}' }],
      text: { format: { type: 'json_schema', name: 'olympiad_task', strict: true, schema: {} } },
      max_output_tokens: 1000, model: 'untrusted-model', store: true }
    let calls = 0
    globalThis.fetch = async (url, options) => {
      calls++
      assert.equal(url, 'https://api.openai.com/v1/responses')
      assert.equal(options.headers.Authorization, 'Bearer server-only-test-key')
      const sent = JSON.parse(options.body)
      assert.equal(sent.model, 'gpt-5-mini')
      assert.equal(sent.store, false)
      return { status: 200, async json() { return { status: 'completed', output: [] } } }
    }
    const denied = response()
    await handler({ method: 'POST', headers: { authorization: 'Bearer wrong' }, body }, denied)
    assert.equal(denied.statusCode, 401)
    assert.equal(calls, 0)
    const accepted = response()
    await handler({ method: 'POST', headers: { authorization: 'Bearer friends-test-code' }, body }, accepted)
    assert.equal(accepted.statusCode, 200)
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalKey
    if (originalCode === undefined) delete process.env.ACCESS_CODE
    else process.env.ACCESS_CODE = originalCode
  }
})
