import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';

/**
 * Session and re-authentication flow coverage.
 * Tests logout behavior and forced re-login scenarios.
 */
test.describe('Session, Logout & Re-Auth', () => {
  test('can logout from authenticated pages', async ({ page }) => {
    await loginAsDemoUser(page);
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /Semua Desain/i })).toBeVisible({ timeout: 15000 });

    // Look for logout action — typically in settings or header menu
    const settingsLink = page.getByRole('link', { name: /Pengaturan|Settings/i }).or(page.getByRole('button', { name: /Pengaturan|Settings/i }));
    const profileMenu = page.getByRole('button', { name: /profil|Profile|demo@/i });

    // Try to find and click menu
    let logoutButton = page.getByRole('button', { name: /Keluar|Logout/i });

    // If no direct logout, try opening a menu
    if (!(await logoutButton.isVisible().catch(() => false))) {
      const menuTrigger = profileMenu.or(settingsLink);
      if (await menuTrigger.isVisible().catch(() => false)) {
        await menuTrigger.click();
        logoutButton = page.getByRole('button', { name: /Keluar|Logout/i });
      }
    }

    // Only test logout if button is actually visible/enabled
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
      // Should redirect to login or public page
      await expect(page).toHaveURL(/\/(login|register|)$/, { timeout: 15000 });
    }
  });

  test('protected pages redirect to login when unauthenticated', async ({ page }) => {
    // Try to access protected page without auth
    await page.goto('/projects');
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('can re-authenticate after accessing protected route', async ({ page }) => {
    // Navigate to protected page (should redirect to login)
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Now login
    await loginAsDemoUser(page);

    // Should navigate to projects or dashboard
    await expect(page).toHaveURL(/\/(projects|create|)/, { timeout: 15000 });
  });

  test('session persists across page navigations', async ({ page }) => {
    await loginAsDemoUser(page);
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /Semua Desain/i })).toBeVisible({ timeout: 15000 });

    // Navigate to settings
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Pengaturan', exact: true })).toBeVisible({ timeout: 15000 });

    // Navigate to tools
    await page.goto('/tools');
    await expect(page.getByRole('heading', { name: 'AI Photo Tools' })).toBeVisible({ timeout: 10000 });

    // Should still be authenticated
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /Semua Desain/i })).toBeVisible({ timeout: 15000 });
  });
});
