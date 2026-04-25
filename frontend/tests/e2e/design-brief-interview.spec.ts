import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';

test.describe('Design Brief Interview', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('renders the design brief interview and keeps answer state in sync', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/start');
    await page.getByRole('link', { name: /Mulai Jalur Desain/i }).click();
    await page.waitForURL('**/design/new/interview', { timeout: 15000 });

    await expect(page.getByRole('heading', { name: /Mulai dari brief visual, bukan panel samping\./i })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Promo cepat/i }).click();
    await page.getByRole('button', { name: /Minimal clean/i }).click();
    await page.getByRole('button', { name: /Instagram/i }).click();

    await page.getByRole('button', { name: /Lanjut ke Preview/i }).click();
    await page.waitForURL('**/design/new/preview', { timeout: 15000 });

    await expect(page.getByRole('heading', { name: /AI akan membuat desain awal langsung dari brief ini\./i })).toBeVisible({ timeout: 15000 });
  });
});