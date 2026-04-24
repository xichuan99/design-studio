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
    // Tab filters should be visible
    await expect(
      page.getByRole('button', { name: /AI Tools/i }).or(page.getByText(/Hasil AI Tools Anda akan tersimpan/i))
    ).toBeVisible({ timeout: 10000 });
  });

  test('can switch between asset tabs and filter chips', async ({ page }) => {
    // Check tabs exist
    const aiToolsTab = page.getByRole('button', { name: /AI Tools/i });
    const hasTab = await aiToolsTab.isVisible().catch(() => false);

    if (hasTab) {
      await aiToolsTab.click();
      await expect(aiToolsTab).toBeVisible();

      // Filter chips
      const allChip = page.getByRole('button', { name: /^Semua$/i });
      if (await allChip.isVisible().catch(() => false)) {
        await allChip.click();
      }
    } else {
      // Empty state — still a valid state to assert
      await expect(page.getByText(/Belum ada aset|Hasil AI Tools Anda/i)).toBeVisible({ timeout: 10000 });
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
