import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('ID Photo Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload configure and start an id photo generation job', async ({ page }) => {
    test.setTimeout(120000);

    await page.getByRole('link', { name: /ID Photo Maker/i }).click();
    await expect(page.getByRole('heading', { name: 'ID Photo (Pasfoto) Maker', exact: true })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
    await expect(page.getByRole('heading', { name: '2. Pengaturan Pasfoto' })).toBeVisible();

    await page.getByText('Biru Studio').click();
    await page.getByRole('button', { name: /Generate Pasfoto/i }).click();

    await expect(page.getByText(/Status Proses/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/AI sedang memproses pasfoto/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Batalkan Proses/i })).toBeVisible();
  });
});