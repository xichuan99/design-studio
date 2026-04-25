import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('Generative Expand Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload a photo expand it and expose result actions', async ({ page }) => {
    test.setTimeout(120000);
    const jobId = 'gen-expand-job-1';

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
            job_id: jobId,
            tool_name: 'generative_expand',
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

    await page.route(`**/tools/jobs/${jobId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: jobId,
          tool_name: 'generative_expand',
          status: 'completed',
          progress_percent: 100,
          phase_message: 'done',
          result_url: 'https://example.com/generative-expand-result.png',
          error_message: null,
          cancel_requested: false,
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        }),
      });
    });

    await test.step('Open the tool and upload a sample image', async () => {
      await page.getByRole('link', { name: /Generative Expand/i }).click();
      await expect(page.getByRole('heading', { name: 'Generative Expand', exact: true })).toBeVisible();

      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByRole('tab', { name: /Perluas Sisi/i })).toBeVisible();
    });

    await test.step('Configure a simple directional expand and generate', async () => {
      await page.getByRole('button', { name: /Kanan/i }).click();
      await page.getByPlaceholder(/Contoh: pemandangan gunung/i).fill('Lanjutkan background studio yang bersih');
      await page.getByRole('button', { name: /Generate Expand/i }).click();
    });

    await test.step('Wait for the finished result state', async () => {
      await expect(page.getByRole('heading', { name: /Hasil Generative Expand/i })).toBeVisible({ timeout: 30000 });
      await expect(page.getByRole('button', { name: /Download Hasil/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Lanjut ke Editor/i })).toBeVisible();
    });
  });
});