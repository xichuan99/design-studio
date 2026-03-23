import { test, expect } from '@playwright/test';

test.describe('Critical User Journey', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByPlaceholder('Email').fill('demo@example.com');
        await page.getByPlaceholder('Password').fill('password123');
        await page.getByRole('button', { name: /^Masuk$/i }).click();
        await page.waitForURL('**/projects*');
    });

    test('Complete flow: Login -> Create blank project -> Open editor -> Reopen from projects', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /Desain Saya/i })).toBeVisible();

        await page.goto('/create');
        await page.getByRole('button', { name: /Smart Ad Creator/i }).click();
        await page.waitForURL('**/edit/**', { timeout: 15000 });

        await expect(page.locator('.konvajs-content')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/Smart Ad/i).first()).toBeVisible();

        await page.goto('/projects');
        await expect(page.getByRole('heading', { name: /Desain Saya/i })).toBeVisible();
        await expect(page.getByText('Smart Ad').first()).toBeVisible({ timeout: 10000 });

        await page.getByText('Smart Ad').first().click();
        await page.waitForURL('**/edit/**', { timeout: 15000 });
        await expect(page.locator('.konvajs-content')).toBeVisible({ timeout: 10000 });
    });
});
