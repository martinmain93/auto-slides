import { test, expect } from '@playwright/test'

// Creates a new song, verifies it appears in the queue, and can be presented
// Uses localStorage clearing for determinism across runs.

test('add new song -> appears in planner queue -> present and navigate slides', async ({ page }) => {
  // Ensure clean app state (since the app persists to localStorage)
  await page.addInitScript(() => localStorage.clear())

  await page.goto('/')

  // From splash to planner
  await page.getByRole('button', { name: /let's sing!/i }).click()
  await expect(page.getByRole('heading', { name: /queue/i })).toBeVisible()

  // Go to add song
  await page.getByRole('button', { name: /add new song/i }).click()
  await expect(page.getByRole('button', { name: /save/i })).toBeVisible()

  // Fill out song editor
  const title = `E2E Song`
  const slide1 = 'Line A1\nLine A2'
  const slide2 = 'Line B1\nLine B2'
  await page.getByLabel('Title').fill(title)
  await page.getByPlaceholder('Lyrics...').fill(`${slide1}\n\n${slide2}`)
  await page.getByPlaceholder('Authors, copyright...').fill('E2E Credits')

  // Save -> should navigate back to planner and enqueue the song
  await page.getByRole('button', { name: /^save$/i }).click()

  // Verify song appears in Queue and Edit button is enabled
  const queueItem = page.getByRole('button', { name: title, exact: true })
  await expect(queueItem).toBeVisible()
  await expect(page.getByRole('button', { name: /edit song/i })).toBeEnabled()

  // Start presentation
  await page.getByRole('button', { name: /start presentation/i }).click()
  // The centered slide content node is .slide-fade-in
  const slide = page.locator('.slide-fade-in')
  await expect(slide).toBeVisible()
  await expect(slide).toContainText('Line A1')

  // Navigate to next slide with ArrowRight
  await page.keyboard.press('ArrowRight')
  await expect(slide).toContainText('Line B1')

  // Navigate back to previous slide with ArrowLeft
  await page.keyboard.press('ArrowLeft')
  await expect(slide).toContainText('Line A1')

  // Return to planner
  await page.getByRole('button', { name: /planner/i }).click()
  await expect(page.getByRole('heading', { name: /queue/i })).toBeVisible()
})
