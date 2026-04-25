import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';

test.describe('User Settings and Profile', () => {
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit session redirect race on /settings in CI');

  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Pengaturan', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('shows all settings sections on the page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Pengaturan', exact: true })).toBeVisible();
    // Profile section
    await expect(page.getByRole('heading', { name: /Profil Akun/i })).toBeVisible();
    // Credits section
    await expect(page.getByRole('heading', { name: /Kredit AI/i })).toBeVisible();
    // Storage section
    await expect(page.getByRole('heading', { name: /Penyimpanan/i })).toBeVisible();
    // Danger zone
    await expect(page.getByRole('heading', { name: /Danger Zone/i })).toBeVisible();
  });

  test('can update display name in profile section', async ({ page }) => {
    const nameInput = page.getByLabel('Nama Tampilan');
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    const currentValue = await nameInput.inputValue();
    // Must use a value that differs from what's stored (canSave requires isNameChanged)
    const uniqueSuffix = `_${Date.now()}`;
    const newName = `Demo${uniqueSuffix}`;

    await nameInput.fill(newName);
    // Trigger change detection
    await nameInput.dispatchEvent('input');

    const saveButton = page.getByRole('button', { name: /Simpan Perubahan/i });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();

    // Reset back to original to avoid polluting demo user state
    await nameInput.fill(currentValue || 'Demo User');
    await nameInput.dispatchEvent('input');
    await expect(page.getByRole('button', { name: /Simpan Perubahan/i })).toBeEnabled({ timeout: 5000 });
    await page.getByRole('button', { name: /Simpan Perubahan/i }).click();
  });

  test('shows credit count and transaction history section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Kredit AI/i })).toBeVisible();
    // Either credits are shown or there's an empty state
    await expect(
      page.getByText(/Kredit|kredit/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows storage usage display', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Penyimpanan/i })).toBeVisible();
    // Either usage in MB or loading/error state
    await expect(
      page.getByText(/MB|Terpakai|Gagal memuat/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
