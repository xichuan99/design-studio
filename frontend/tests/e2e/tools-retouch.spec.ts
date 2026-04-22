import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('Quick Retouch Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload and finish a retouch flow', async ({ page }) => {
    test.setTimeout(120000);

    await test.step('Open the retouch tool', async () => {
      await page.getByRole('link', { name: /Quick Retouch/i }).click();
      await expect(page.getByRole('heading', { name: 'Auto-Retouch & Color Correction', exact: true })).toBeVisible();
    });

    await test.step('Upload a sample photo', async () => {
      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
    });

    await test.step('Wait for the result state', async () => {
      await expect(page.getByRole('heading', { name: /Foto yang sudah dirapikan siap dipakai/i })).toBeVisible({ timeout: 60000 });
      await expect(page.getByRole('button', { name: /Download Hasil/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Lanjut ke Editor/i })).toBeVisible();
    });
  });
});