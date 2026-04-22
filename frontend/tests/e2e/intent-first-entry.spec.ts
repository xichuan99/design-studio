import { test, expect } from '@playwright/test';
import { loginAsDemoUser } from './utils/auth';

test.describe('Intent-First Entry Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('clean photo intent routes to background removal panel', async ({ page }) => {
    await page.goto('/create');

    await page.getByRole('button', { name: /Rapikan Foto Produk/i }).click();
    await page.waitForURL('**/edit/**', { timeout: 15000 });

    await expect(page.getByRole('heading', { name: /Hapus Background/i })).toBeVisible({ timeout: 10000 });
  });

  test('ad from photo intent opens redesign flow', async ({ page }) => {
    await page.goto('/create');

    await page.getByRole('button', { name: /Buat Iklan dari Foto/i }).click();

    await expect(page.getByText('Mulai dari foto yang ingin diubah')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Unggah Sekarang/i })).toBeVisible({ timeout: 10000 });
  });
});
