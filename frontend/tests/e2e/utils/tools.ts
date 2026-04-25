import { expect, type Page } from '@playwright/test';

export async function goToToolsHub(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto('/tools', { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Some browsers intermittently bounce to root before session redirect settles.
      if (!page.url().includes('/tools')) {
        await page.goto('/tools', { waitUntil: 'domcontentloaded', timeout: 15000 });
      }

      await expect
        .poll(() => page.url(), { timeout: 10000 })
        .toContain('/tools');
      break;
    } catch {
      if (page.isClosed()) {
        throw new Error('Page was closed while opening /tools');
      }

      if (attempt === 3) {
        throw new Error('Failed to open /tools after 3 attempts');
      }
    }
  }

  await expect(
    page.getByRole('heading', { name: /Pilih alur edit foto yang paling cocok|AI Photo Tools/i })
  ).toBeVisible({ timeout: 10000 });
}