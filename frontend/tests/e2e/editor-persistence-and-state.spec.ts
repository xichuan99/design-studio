import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';

test.describe('Editor Persistence And State', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('can rename a project save it and reopen it from projects', async ({ page }) => {
    test.setTimeout(120000);

    const renamedTitle = `Persistensi Editor ${Date.now()}`;

    await page.goto('/create');
    await page.getByRole('button', { name: /Rapikan Foto Produk/i }).click();
    await page.waitForURL('**/edit/**', { timeout: 30000 });
    await expect(page.locator('.konvajs-content')).toBeVisible({ timeout: 10000 });

    const skipTourButton = page.getByRole('button', { name: 'Skip' });
    if (await skipTourButton.isVisible().catch(() => false)) {
      await skipTourButton.click();
    }

    const titleHeading = page.getByRole('heading', { level: 1, name: /Rapikan Foto|Untitled Design/i });
    await titleHeading.click();

    const titleInput = page.getByRole('textbox').first();
    await titleInput.fill(renamedTitle);
    await titleInput.press('Enter');

    await expect(page.getByText(/Perubahan belum tersimpan/i)).toBeVisible({ timeout: 10000 });
    await page.getByText(/Perubahan belum tersimpan/i).click();
    await expect(page.getByText(/Tersimpan/i)).toBeVisible({ timeout: 10000 });

    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /Semua Desain/i })).toBeVisible();

    const searchInput = page.getByPlaceholder('Cari desain...');
    await searchInput.fill(renamedTitle);
    await expect(page.getByText(renamedTitle).first()).toBeVisible({ timeout: 10000 });

    await page.getByText(renamedTitle).first().click();
    await page.waitForURL('**/edit/**', { timeout: 30000 });
    await expect(page.getByRole('heading', { level: 1, name: renamedTitle })).toBeVisible({ timeout: 10000 });
  });
});