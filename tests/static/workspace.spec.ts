import { expect, test } from '@playwright/test'

test('shared code opens a local workspace; audio is under construction', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('Your access code')).toBeVisible()
  await page.getByLabel('Your access code').fill('wrong-code')
  await page.getByRole('button', { name: /get started/i }).click()
  await expect(page.getByText('That access code is not correct.')).toBeVisible()
  await page.getByLabel('Your access code').fill('friends-test-code')
  await page.getByRole('button', { name: /get started/i }).click()
  await expect(page.getByRole('heading', { name: /Make room for progress/i })).toBeVisible()
  await page.getByRole('link', { name: /Listening room/i }).click()
  await expect(page.getByText('Audio generation · Under construction')).toBeVisible()
  await expect(page.getByRole('button', { name: /Generate listening task/i })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'The listening room.' })).toBeVisible()
})

test('generated task, scoring and attempts survive reload without a server', async ({ page }) => {
  await page.route('https://api.openai.com/v1/responses', async (route) => {
    const questions = Array.from({ length: 10 }, (_, index) => ({
      id: `q${index + 1}`, type: 'mcq', text: `Choose the correct answer for item ${index + 1}.`,
      choices: ['Correct', 'Incorrect A', 'Incorrect B'], correctAnswer: 'Correct',
      acceptedAnswers: ['Correct'], explanation: 'Correct is the answer.', evidence: '', maxWords: 0,
    }))
    const task = { title: 'Mocked grammar practice', instructions: 'Choose the correct answer.',
      passage: '', writingPrompt: '', questions, segments: [] }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      id: 'resp_test', object: 'response', created_at: 1, model: 'gpt-5-mini', status: 'completed',
      output: [{ id: 'msg_test', type: 'message', status: 'completed', role: 'assistant',
        content: [{ type: 'output_text', text: JSON.stringify(task), annotations: [] }] }],
      usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
    }) })
  })
  await page.goto('/')
  await page.getByLabel('Your access code').fill('friends-test-code')
  await page.getByRole('button', { name: /get started/i }).click()
  await page.getByRole('link', { name: /Practice studio/i }).click()
  await page.getByLabel('Task format').selectOption('mcq')
  await page.getByRole('button', { name: /Generate my practice/i }).click()
  await expect(page.locator('.job-card.completed').getByRole('button', { name: /Open/i })).toBeVisible({ timeout: 20_000 })
  await page.locator('.job-card.completed').getByRole('button', { name: /Open/i }).click()
  await expect(page.getByRole('heading', { name: 'Mocked grammar practice' })).toBeVisible()
  await page.locator('.question').first().getByRole('radio', { name: 'A Correct' }).check()
  await page.getByRole('button', { name: /Finish & see feedback/i }).click()
  await expect(page.getByText('Correct answer: Correct')).toHaveCount(0)
  await expect(page.getByText('Nicely done.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Mocked grammar practice' })).toBeVisible()
  await expect(page.getByText('Nicely done.')).toBeVisible()
})

test('writing assessment saves IELTS-style feedback in this browser', async ({ page }) => {
  await page.route('https://api.openai.com/v1/responses', async (route) => {
    const name = route.request().postDataJSON().text.format.name
    const criterion = { band: 7, feedback: 'Clear writing with room for detail.',
      evidence: 'My story', nextStep: 'Develop the setting.' }
    const output = name === 'writing_assessment'
      ? { taskResponse: criterion, coherenceCohesion: criterion, lexicalResource: criterion,
          grammaticalRange: criterion, summary: 'A clear start.', strengths: ['Clear opening'],
          improvements: ['Add detail'], corrections: [] }
      : { title: 'A story to tell', instructions: 'Write a short story.', passage: '',
          writingPrompt: 'Write a story for your school magazine about a surprising day. Explain what happened and how you felt.',
          questions: [], segments: [] }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      id: 'resp_test', object: 'response', created_at: 1, model: 'gpt-5-mini', status: 'completed',
      output: [{ id: 'msg_test', type: 'message', status: 'completed', role: 'assistant',
        content: [{ type: 'output_text', text: JSON.stringify(output), annotations: [] }] }],
      usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
    }) })
  })
  await page.goto('/')
  await page.getByLabel('Your access code').fill('friends-test-code')
  await page.getByRole('button', { name: /get started/i }).click()
  await page.getByRole('link', { name: /Writing desk/i }).click()
  await page.getByRole('button', { name: /Create a writing prompt/i }).click()
  await page.locator('.job-card.completed').getByRole('button', { name: /Open/i }).click()
  await expect(page.getByRole('heading', { name: 'A story to tell' })).toBeVisible()
  await page.getByLabel('Your writing').fill('My story begins on a quiet morning.')
  await page.getByRole('button', { name: /Get writing feedback/i }).click()
  await expect(page.getByText('A clear start.')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Four ways to grow')).toBeVisible()
  await page.reload()
  await expect(page.getByText('A clear start.')).toBeVisible()
})
