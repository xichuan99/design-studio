import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('AI Background Swap Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload process and reach the result actions', async ({ page }) => {
    test.setTimeout(120000);
    const jobId = 'bg-swap-job-1';

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
            tool_name: 'background_swap',
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
          tool_name: 'background_swap',
          status: 'completed',
          progress_percent: 100,
          phase_message: 'done',
          result_url: 'https://example.com/background-swap-result.png',
          error_message: null,
          cancel_requested: false,
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        }),
      });
    });

    await test.step('Open the background swap tool', async () => {
      await page.getByRole('link', { name: /AI Background Swap/i }).click();
      await expect(page.getByRole('heading', { name: 'AI Background Swap', exact: true })).toBeVisible();
    });

    await test.step('Upload a sample image', async () => {
      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByRole('heading', { name: '2. Tentukan Suasana Baru' })).toBeVisible();
      await expect(page.getByRole('img', { name: 'Original' })).toBeVisible();
    });

    await test.step('Write a custom prompt and generate', async () => {
      await page.getByRole('button', { name: /^Tulis Sendiri$/ }).click();
      await page.getByRole('textbox').fill('Studio putih minimalis dengan alas kayu oak');
      await page.getByRole('button', { name: /Buat Background Baru/i }).click();
    });

    await test.step('Wait for the result state', async () => {
      await expect(page.getByRole('heading', { name: /Background baru siap dipakai/i })).toBeVisible({ timeout: 30000 });
      await expect(page.getByRole('button', { name: /Download Hasil/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Lanjut ke Editor/i })).toBeVisible();
    });
  });
});