import { test, expect } from '@playwright/test';
import { loginAsDemoUser } from './utils/auth';

test.describe('Critical User Journey', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsDemoUser(page);
    });

    test('Complete flow: Login -> Open clean-photo editor -> Reopen from projects', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /Semua Desain/i })).toBeVisible();

        await page.goto('/create');
        await page.getByRole('button', { name: /Rapikan Foto Produk/i }).click();
        await page.waitForURL('**/edit/**', { timeout: 15000 });

        await expect(page.locator('.konvajs-content')).toBeVisible({ timeout: 10000 });

        await page.goto('/projects');
        await expect(page.getByRole('heading', { name: /Semua Desain/i })).toBeVisible();
        await expect(page.getByText('Rapikan Foto').first()).toBeVisible({ timeout: 10000 });

        await page.getByText('Rapikan Foto').first().click();
        await page.waitForURL('**/edit/**', { timeout: 15000 });
        await expect(page.locator('.konvajs-content')).toBeVisible({ timeout: 10000 });
    });
});
