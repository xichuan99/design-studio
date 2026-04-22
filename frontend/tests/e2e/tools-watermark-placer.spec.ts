import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('AI Watermark Placer Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload a source image and logo then apply watermark', async ({ page }) => {
    test.setTimeout(120000);

    await page.getByRole('link', { name: /AI Watermark Placer/i }).click();
    await expect(page.getByRole('heading', { name: 'AI Watermark Placer', exact: true })).toBeVisible();

    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.nth(0).setInputFiles(getPublicFixturePath('before-product.png'));
    await fileInputs.nth(1).setInputFiles(getPublicFixturePath('before-product.png'));

    await page.getByRole('button', { name: /Pasang Watermark/i }).click();

    await expect(page.getByRole('button', { name: /Download Hasil/i })).toBeVisible({ timeout: 60000 });
  });
});