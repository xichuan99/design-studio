import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('Generative Expand Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload a photo expand it and expose result actions', async ({ page }) => {
    test.setTimeout(120000);

    await test.step('Open the tool and upload a sample image', async () => {
      await page.getByRole('link', { name: /Generative Expand/i }).click();
      await expect(page.getByRole('heading', { name: 'Generative Expand', exact: true })).toBeVisible();

      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByRole('tab', { name: /Perluas Sisi/i })).toBeVisible();
    });

    await test.step('Configure a simple directional expand and generate', async () => {
      await page.getByRole('button', { name: /Kanan/i }).click();
      await page.getByPlaceholder(/Contoh: pemandangan gunung/i).fill('Lanjutkan background studio yang bersih');
      await page.getByRole('button', { name: /Generate Expand/i }).click();
    });

    await test.step('Wait for the finished result state', async () => {
      await expect(page.getByRole('heading', { name: /Hasil Generative Expand/i })).toBeVisible({ timeout: 60000 });
      await expect(page.getByRole('button', { name: /Download Hasil/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Lanjut ke Editor/i })).toBeVisible();
    });
  });
});