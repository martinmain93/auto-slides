import { test, expect } from '@playwright/test'

// Base URL is the Vite preview server; we will run against built assets in CI.
// You can also configure use.baseURL in playwright.config if desired.

test('smoke: user can navigate splash -> planner -> presentation', async ({ page }) => {
  // Assuming app runs on default dev port when using `npm run dev` during local E2E.
  // In CI we will run against `vite preview` or a static server; adjust as needed.
await page.goto('/')

  // Splash content
  await expect(page.getByRole('heading', { name: /auto presenter/i })).toBeVisible()

  // Go to planner
  await page.getByRole('button', { name: /let's sing!/i }).click()
  await expect(page.getByRole('heading', { name: /queue/i })).toBeVisible()

  // Optionally start presentation (may rely on demo data)
  await page.getByRole('button', { name: /start presentation/i }).click()
  // Expect the centered slide text container to be visible
  await expect(page.locator('.slide-fade-in')).toBeVisible()

  // Return to planner via overlay button
  await page.getByRole('button', { name: /planner/i }).click()
  await expect(page.getByRole('heading', { name: /queue/i })).toBeVisible()
})

