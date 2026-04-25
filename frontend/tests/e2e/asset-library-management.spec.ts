import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';

test.describe('Asset Library Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await page.goto('/my-assets');
    await expect(page.getByRole('heading', { name: 'Aset AI Saya', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('shows asset page with correct heading and interactive controls', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Aset AI Saya', exact: true })).toBeVisible();

    const aiToolsTab = page.getByText(/^AI Tools\d+$/i).first();
    await expect(aiToolsTab).toBeVisible({ timeout: 10000 });
  });

  test('can switch between asset tabs and filter chips', async ({ page }) => {
    const aiToolsTab = page.getByText(/^AI Tools\d+$/i).first();
    const hasTab = (await aiToolsTab.count()) > 0;

    if (hasTab) {
      await aiToolsTab.scrollIntoViewIfNeeded();
      await aiToolsTab.click();
      await expect(aiToolsTab).toBeVisible();

      const allChip = page.getByRole('button', { name: /^Semua$/i });
      if ((await allChip.count()) > 0) {
        await allChip.click();
      }
    } else {
      await expect(page.getByText(/Semua hasil dari AI Tools Anda tersimpan di sini|Belum ada aset|Hasil AI Tools Anda akan tersimpan/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('can enter selection mode and exit', async ({ page }) => {
    const selectButton = page.getByRole('button', { name: /^Pilih$/i });
    const hasSelectButton = await selectButton.isVisible().catch(() => false);

    if (hasSelectButton) {
      await selectButton.click();
      await expect(page.getByRole('button', { name: /Selesai Pilih/i })).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /Selesai Pilih/i }).click();
      await expect(selectButton).toBeVisible({ timeout: 5000 });
    } else {
      // No assets yet — empty state is valid
      await expect(page.getByText(/Belum ada aset|Hasil AI Tools Anda/i)).toBeVisible({ timeout: 10000 });
    }
  });
});
