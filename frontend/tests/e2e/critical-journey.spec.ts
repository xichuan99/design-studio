import { test, expect } from '@playwright/test';

// Before running tests, we assume PLAYWRIGHT_TEST=true is set in the environment
// Next.js will enable the Credentials Provider for test@example.com

test.describe('Critical User Journey', () => {

    test('Complete flow: Login -> Create -> Edit -> Export', async ({ page }) => {
        // 1. Visit Home Page
        await page.goto('/');
        await expect(page).toHaveTitle(/Lesprivate/i);

        // Check for essential hero elements
        await expect(page.getByRole('heading', { name: /Design Stunning Graphics/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Start Designing/i })).toBeVisible();

        // 2. Navigate to Login / Dashboard
        await page.getByRole('link', { name: /Start Designing/i }).click();

        // Check if we get redirected to the signin page or dashboard
        await page.waitForTimeout(1000);
        const url = page.url();
        if (url.includes('/api/auth/signin')) {
            // Use the test credentials provider
            await page.getByPlaceholder('Email').fill('test@example.com');
            await page.getByPlaceholder('Name').fill('Test User');
            await page.getByRole('button', { name: /Sign in with Test Credentials/i }).click();
            await page.waitForURL('**/dashboard*');
        }

        // Now we should be on dashboard or creation page
        // Navigate specifically to create
        await page.goto('/create');
        await expect(page.getByRole('heading', { name: /What do you want to design\?/i })).toBeVisible();

        // 3. Fill prompt and generate
        await page.getByRole('textbox').fill('A vibrant modern social media post for a tech startup');

        // Select an aspect ratio (if available) - clicking the first ratio card
        await page.locator('button.aspect-ratio-card').first().click().catch(() => { }); // Optional safely catch if not found

        // Click Generate
        await page.getByRole('button', { name: /Generate Content/i }).click();

        // Wait for the AI generation to finish and redirect to editor
        // This could take a while depending on Celery/Fal.ai. We'll set a higher timeout.
        await page.waitForURL('**/edit/**', { timeout: 60000 });

        // 4. Verify Editor Canvas
        await expect(page.locator('.konvajs-content')).toBeVisible({ timeout: 10000 });

        // Verify toolbar elements
        await expect(page.getByRole('button', { name: /Add Text/i })).toBeVisible();

        // 5. Test Export Dialog Integration
        await page.getByRole('button', { name: /Export/i }).click();
        await expect(page.getByRole('dialog', { name: /Export Design/i })).toBeVisible();

        // Try downloading the PNG
        // Normally in tests we listen for the download event to verify it works
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        await page.getByRole('button', { name: /Download PNG/i }).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.png$/);
    });
});
