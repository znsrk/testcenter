import { expect, test } from '@playwright/test'

test('public calculator works without a session and preserves the original grading rules', async ({ page }) => {
  const apiRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url())
  })
  await page.goto('/calc')
  await expect(page.getByRole('heading', { name: 'Калькулятор оценок' })).toBeVisible()
  await expect(page.getByLabel('Your access code')).toHaveCount(0)

  const midterm = page.getByPlaceholder('e.g., 72')
  const endterm = page.getByPlaceholder('e.g., 65')
  const final = page.getByPlaceholder('e.g., 80')
  await midterm.fill('80')
  await endterm.fill('70')
  await expect(page.getByText('Сохранить степуху (70): Нужно минимум 62.50 на Final.', { exact: true })).toBeVisible()
  await final.fill('90')
  await expect(page.getByText('Сохранить степуху (70): Уже достиг с оценкой 81.0.', { exact: true })).toBeVisible()

  // The last historical fix lowered Endterm's minimum to 25; Final still needs 50.
  await midterm.fill('100')
  await endterm.fill('25')
  await final.fill('50')
  await expect(page.getByText('Не завалить (50): Уже достиг с оценкой 57.5.', { exact: true })).toBeVisible()
  await final.fill('49')
  await expect(page.getByText('Не завалить (50): Невозможно из-за неудачного порога на экзамене.', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Обнулить' }).click()
  await expect(midterm).toHaveValue('')
  await expect(endterm).toHaveValue('')
  await expect(final).toHaveValue('')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Калькулятор оценок' })).toBeVisible()
  expect(apiRequests).toEqual([])
  expect(await page.evaluate(() => localStorage.getItem('testcenter:static-session'))).toBeNull()
})

test('calculator supports a trailing slash and query string on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/calc/?from=shared')
  await expect(page.getByRole('heading', { name: 'Калькулятор оценок' })).toBeVisible()
  await expect(page.getByPlaceholder('e.g., 80')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
