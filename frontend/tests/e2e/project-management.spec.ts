import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /Semua Desain/i })).toBeVisible({ timeout: 15000 });
  });

  test('can create search sort and reopen a project from the projects hub', async ({ page }) => {
    await test.step('Start a new project from projects', async () => {
      await page.getByRole('button', { name: /Desain Baru/i }).click();
      await page.waitForURL('**/create', { timeout: 15000 });
    });

    await test.step('Create a clean-photo project from intent entry', async () => {
      await page.getByRole('button', { name: /Rapikan Foto Produk/i }).click();
      await page.waitForURL('**/edit/**', { timeout: 15000 });
      await expect(page.locator('.konvajs-content')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Search for the newly created project', async () => {
      await page.goto('/projects');
      await expect(page.getByRole('heading', { name: /Semua Desain/i })).toBeVisible({ timeout: 15000 });

      const searchInput = page.getByPlaceholder('Cari desain...');
      await searchInput.fill('Rapikan Foto');
      await expect(page.getByText('Rapikan Foto').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Change sort order and reopen the project', async () => {
      await page.getByRole('button', { name: /Terbaru|Terlama|A-Z|Z-A/i }).click();
      await page.getByRole('menuitem', { name: 'A-Z' }).click();
      await expect(page.getByRole('button', { name: /A-Z/i })).toBeVisible();

      await page.getByText('Rapikan Foto').first().click();
      await page.waitForURL('**/edit/**', { timeout: 15000 });
      await expect(page.locator('.konvajs-content')).toBeVisible({ timeout: 10000 });
    });
  });
});