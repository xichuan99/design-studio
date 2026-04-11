import { test, expect } from '@playwright/test';

test.describe('Intent-First Entry Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('demo@example.com');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: /^Masuk$/i }).click();
    await page.waitForURL('**/projects*');
  });

  test('clean photo intent routes to background removal panel', async ({ page }) => {
    await page.goto('/create');

    await page.getByRole('button', { name: /Rapikan Foto Produk/i }).click();
    await page.waitForURL('**/edit/**', { timeout: 15000 });

    await expect(page.getByRole('heading', { name: /Hapus Background/i })).toBeVisible({ timeout: 10000 });
  });

  test('smart ad entry opens AI Studio ad tab', async ({ page }) => {
    await page.goto('/create');

    await page.getByRole('button', { name: /Smart Ad Creator/i }).click();
    await page.waitForURL('**/edit/**', { timeout: 15000 });

    await expect(page.getByRole('button', { name: /Foto Produk/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('1. Foto Produk')).toBeVisible({ timeout: 10000 });
  });
});
