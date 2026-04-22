import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { goToToolsHub } from './utils/tools';

test.describe('AI Text Banner Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can generate a text banner and expose result actions', async ({ page }) => {
    test.setTimeout(120000);

    await page.getByRole('link', { name: /AI Text Banner/i }).click();
    await expect(page.getByRole('heading', { name: 'AI Text Banner', exact: true })).toBeVisible();

    await page.getByPlaceholder('Contoh: DISKON BESAR!').fill('DISKON 50%');
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /Ribbon Banner/i }).click();

    await page.getByRole('button', { name: /Generate Text Banner/i }).click();
    await page.getByRole('button', { name: /Lanjutkan/i }).click();

    await expect(page.getByRole('button', { name: /Download Resolusi Tinggi/i })).toBeVisible({ timeout: 60000 });
    await expect(page.getByRole('button', { name: /Gunakan di Desain Baru/i })).toBeVisible();
  });
});