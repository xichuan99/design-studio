import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('Batch Photo Processor Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload multiple files and enter processing state', async ({ page }) => {
    test.setTimeout(90000);

    await page.getByRole('link', { name: /Batch Photo Processor/i }).click();
    await expect(page.getByRole('heading', { name: 'Batch Photo Processor', exact: true })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles([
      getPublicFixturePath('before-product.png'),
      getPublicFixturePath('before-product.png'),
    ]);

    await expect(page.getByText(/2\. Pilihan Edit Massal/i)).toBeVisible();
    await page.getByRole('button', { name: /Proses 2 Foto/i }).click();

    await expect(page.getByRole('heading', { name: 'Batch Photo Processor', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Proses 2 Foto|Memproses Batch/i })).toBeVisible();
  });
});