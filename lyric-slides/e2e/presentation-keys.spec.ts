import { test, expect } from '@playwright/test'

// Starts presentation from demo library and verifies keyboard navigation

test('presentation arrow keys navigate slides', async ({ page }) => {
  // Clean state for determinism
  await page.addInitScript(() => localStorage.clear())

  await page.goto('/')
  await page.getByRole('button', { name: /let's sing!/i }).click()
  await expect(page.getByRole('heading', { name: /queue/i })).toBeVisible()

  // If queue is empty, start presentation of whole library
  await page.getByRole('button', { name: /start presentation/i }).click()
  const slide = page.locator('.slide-fade-in')
  await expect(slide).toBeVisible()

  // Read first slide text and ensure it changes after ArrowRight, then back with ArrowLeft
  const firstText = await slide.textContent()
  await page.keyboard.press('ArrowRight')
  await expect(slide).not.toHaveText(firstText || '', { timeout: 3000 })

  // Go back
  await page.keyboard.press('ArrowLeft')
  await expect(slide).toHaveText(firstText || '', { timeout: 3000 })
})
