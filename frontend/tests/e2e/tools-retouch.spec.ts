import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('Quick Retouch Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload and finish a retouch flow', async ({ page }) => {
    test.setTimeout(120000);

    await page.route('**/designs/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.com/before-product.png' }),
      });
    });

    await page.route('**/tools/jobs', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            job_id: 'retouch-job-1',
            tool_name: 'retouch',
            status: 'queued',
            progress_percent: 0,
            phase_message: 'queued',
            result_url: null,
            error_message: null,
            cancel_requested: false,
            created_at: new Date().toISOString(),
            started_at: null,
            finished_at: null,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/tools/jobs/retouch-job-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'retouch-job-1',
          tool_name: 'retouch',
          status: 'completed',
          progress_percent: 100,
          phase_message: 'done',
          result_url: 'https://example.com/retouched.png',
          error_message: null,
          cancel_requested: false,
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        }),
      });
    });

    await test.step('Open the retouch tool', async () => {
      const retouchLink = page.getByRole('link', { name: /Quick Retouch/i }).first();
      await retouchLink.scrollIntoViewIfNeeded();
      await retouchLink.click();
      await expect(page.getByRole('heading', { name: 'Auto-Retouch & Color Correction', exact: true })).toBeVisible();
    });

    await test.step('Upload a sample photo', async () => {
      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
    });

    await test.step('Wait for the result state', async () => {
      await expect(page.getByRole('heading', { name: /Foto yang sudah dirapikan siap dipakai/i })).toBeVisible({ timeout: 60000 });
      await expect(page.getByRole('button', { name: /Download Hasil/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Lanjut ke Editor/i })).toBeVisible();
    });
  });
});