import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { AppError } from './config.js'

export function createAI(config) {
  const client = config.apiKey ? new OpenAI({ apiKey: config.apiKey, timeout: 180_000, maxRetries: 2 }) : null
  function requireClient() {
    if (!client)
      throw new AppError(503, 'Generation is not configured yet. Ask the administrator to add the OpenAI API key.')
    return client
  }
  return {
    configured: Boolean(client),
    async json(schema, name, instructions, input, maxTokens = 12000) {
      const response = await requireClient().responses.parse({
        model: config.textModel,
        store: false,
        instructions,
        input: [{ role: 'user', content: JSON.stringify(input) }],
        text: { format: zodTextFormat(schema, name) },
        ...(config.textModel.startsWith('gpt-5') ? { reasoning: { effort: 'low' } } : {}),
        max_output_tokens: maxTokens,
      })
      if (response.status !== 'completed' || !response.output_parsed) {
        const truncated = response.status === 'incomplete' && response.incomplete_details?.reason === 'max_output_tokens'
        const error = new AppError(
          502,
          truncated
            ? 'The model response ran out of output tokens before the task was complete.'
            : 'The model could not produce a complete task. Please try again.'
        )
        if (truncated) error.code = 'incomplete_max_output_tokens'
        throw error
      }
      return schema.parse(response.output_parsed)
    },
    async speech(text, voice) {
      const response = await requireClient().audio.speech.create({
        model: config.ttsModel,
        voice,
        input: text,
        response_format: 'pcm',
        instructions:
          'Speak natural, clear English for a school olympiad listening exam. Use a measured pace around 140 words per minute. Keep a consistent speaker identity. Read only the supplied words, without adding introductions.',
      })
      const pcm = Buffer.from(await response.arrayBuffer())
      if (pcm.length < 4800 || pcm.length % 2 !== 0)
        throw new AppError(502, 'The speech service returned incomplete audio.')
      return pcm
    },
  }
}
