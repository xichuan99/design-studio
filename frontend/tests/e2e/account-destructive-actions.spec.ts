import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';

/**
 * This spec covers the Danger Zone section in settings.
 * The actual account deletion is NOT executed to avoid destroying the demo user.
 * Tests cover: button visibility, dialog rendering, and cancel behavior.
 */
test.describe('Account Destructive Actions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Pengaturan', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('danger zone section is visible with delete account button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Danger Zone/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Hapus Akun/i })).toBeVisible();
  });

  test('delete account button opens confirmation dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Hapus Akun/i }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByRole('heading', { name: /Peringatan Keras/i })).toBeVisible();
    await expect(dialog.getByText(/akan menghapus akun/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Batalkan/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Ya, Hapus Selamanya/i })).toBeVisible();
  });

  test('cancel button dismisses the delete confirmation dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Hapus Akun/i }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /Batalkan/i }).click();

    await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 5000 });
    // Settings page should still be intact
    await expect(page.getByRole('heading', { name: 'Pengaturan', exact: true })).toBeVisible();
  });
});
