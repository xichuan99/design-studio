import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';

test.describe('Brand Kit Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await page.goto('/brand');
    await expect(page.getByRole('heading', { name: 'Smart Brand Kit', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('can create edit and delete a brand kit', async ({ page }) => {
    test.setTimeout(60000);

    await test.step('Open create brand kit form', async () => {
      await page.getByRole('button', { name: /Buat Baru/i }).click();
      // CardTitle renders as div, not semantic heading — use getByText
      await expect(page.getByText('Create Brand Kit', { exact: true })).toBeVisible({ timeout: 10000 });
    });

    await test.step('Fill in brand name and save', async () => {
      const brandName = `Test Brand ${Date.now()}`;
      // Label has no htmlFor — use placeholder to locate the input
      await page.getByPlaceholder('Misal: Bite Cake').fill(brandName);
      await page.getByRole('button', { name: /Simpan/i }).click();

      await expect(page.getByText(brandName)).toBeVisible({ timeout: 10000 });
    });

    await test.step('Edit the brand kit', async () => {
      await page.getByRole('button', { name: /Edit/i }).first().click();
      await expect(page.getByText('Edit Brand Kit', { exact: true })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: /Batal/i }).click();
    });

    await test.step('Delete the brand kit via confirmation dialog', async () => {
      await page.getByRole('button', { name: /Hapus/i }).first().click();
      await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /Ya, Hapus/i }).click();

      // Dialog should close after deletion
      await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 10000 });
    });
  });

  test('shows the brand kit listing page with correct heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Smart Brand Kit', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Buat Baru/i })).toBeVisible();
  });
});
