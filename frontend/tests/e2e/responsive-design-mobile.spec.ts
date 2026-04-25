import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';

/**
 * Mobile viewport smoke coverage for key flows.
 * Use: npx playwright test --project="Mobile Chrome" --project="Mobile Safari"
 * Can also run on desktop chromium to verify responsive behavior.
 */
test.describe('Responsive Design - Mobile Viewports', () => {
  test('login form loads on narrow viewport', async ({ page }) => {
    await page.goto('/login');

    // Should see login form elements without horizontal scroll
    await expect(page.getByPlaceholder(/Email/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Masuk/i })).toBeVisible();
  });

  test('projects hub is accessible on mobile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Safari', 'Mobile Safari auth redirect race on /projects');
    await loginAsDemoUser(page);
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /Semua Desain/i })).toBeVisible({ timeout: 15000 });

    // Search input should be accessible
    const searchInput = page.getByPlaceholder('Cari desain...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
  });

  test('tools hub displays tool cards on mobile', async ({ page }) => {
    await loginAsDemoUser(page);
    await page.goto('/tools');
    await expect(page.getByRole('heading', { name: /Pilih alur edit foto yang paling cocok|AI Photo Tools/i })).toBeVisible({ timeout: 10000 });

    // Tool cards should be visible
    const transformCard = page.getByRole('link', { name: /AI Transform Pipeline/i });
    await expect(transformCard).toBeVisible();
  });

  test('transform tool file upload works on mobile', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit redirect race on /tools for mobile upload smoke test');
    await loginAsDemoUser(page);
    await page.goto('/tools');
    await page.getByRole('link', { name: /AI Transform Pipeline/i }).click();

    // Wait for tool page to load
    await expect(page.getByRole('heading', { name: 'AI Transform Pipeline', exact: true })).toBeVisible({ timeout: 10000 });

    // File input might be hidden; use first visible file input
    const fileInput = page.locator('input[type="file"]').first();
    // Don't check visibility — input can be visually hidden but still accept files
    await fileInput.setInputFiles(getPublicFixturePath('before-product.png'));

    // Should show Pipeline Builder heading
    await expect(page.getByText('Pipeline Builder', { exact: true })).toBeVisible({ timeout: 10000 });
  });
});
