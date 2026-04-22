import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('AI Background Swap Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload process and reach the result actions', async ({ page }) => {
    test.setTimeout(120000);

    await test.step('Open the background swap tool', async () => {
      await page.getByRole('link', { name: /AI Background Swap/i }).click();
      await expect(page.getByRole('heading', { name: 'AI Background Swap', exact: true })).toBeVisible();
    });

    await test.step('Upload a sample image', async () => {
      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByRole('heading', { name: '2. Tentukan Suasana Baru' })).toBeVisible();
      await expect(page.getByRole('img', { name: 'Original' })).toBeVisible();
    });

    await test.step('Write a custom prompt and generate', async () => {
      await page.getByRole('button', { name: /^Tulis Sendiri$/ }).click();
      await page.getByRole('textbox').fill('Studio putih minimalis dengan alas kayu oak');
      await page.getByRole('button', { name: /Buat Background Baru/i }).click();
    });

    await test.step('Wait for the result state', async () => {
      await expect(page.getByRole('heading', { name: /Background baru siap dipakai/i })).toBeVisible({ timeout: 60000 });
      await expect(page.getByRole('button', { name: /Download Hasil/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Lanjut ke Editor/i })).toBeVisible();
    });
  });
});