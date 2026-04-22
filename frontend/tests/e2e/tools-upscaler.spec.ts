import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('AI Image Upscaler Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload process and reach the upscaled result actions', async ({ page }) => {
    test.setTimeout(120000);

    await test.step('Open the upscaler tool', async () => {
      await page.getByRole('link', { name: /AI Image Upscaler/i }).click();
      await expect(page.getByRole('heading', { name: 'AI Image Upscaler', exact: true })).toBeVisible();
    });

    await test.step('Upload a sample image', async () => {
      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByRole('heading', { name: '2. Pilih Tingkat Upscale' })).toBeVisible();
    });

    await test.step('Choose 2x and confirm the credit dialog', async () => {
      await page.getByRole('button', { name: /2x/i }).click();
      await page.getByRole('button', { name: /Upscale & Enhance Gambar/i }).click();
      await page.getByRole('button', { name: /Lanjutkan/i }).click();
    });

    await test.step('Wait for the finished result state', async () => {
      await expect(page.getByRole('heading', { name: /Versi resolusi tinggi sudah siap/i })).toBeVisible({ timeout: 60000 });
      await expect(page.getByRole('button', { name: /Download Hasil/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Lanjut ke Editor/i })).toBeVisible();
    });
  });
});