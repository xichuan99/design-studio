import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('AI Product Scene Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload a product photo, choose a theme, and finish the flow', async ({ page }) => {
    test.setTimeout(120000);
    const jobId = 'product-scene-job-1';

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
            tool_name: 'product_scene',
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
          tool_name: 'product_scene',
          status: 'completed',
          progress_percent: 100,
          phase_message: 'done',
          result_url: 'https://example.com/product-scene-result.png',
          error_message: null,
          cancel_requested: false,
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        }),
      });
    });

    await test.step('Open the product scene tool', async () => {
      await page.getByRole('link', { name: /AI Product Scene/i }).click();
      await expect(page.getByRole('heading', { name: 'AI Product Scene', exact: true })).toBeVisible();
    });

    await test.step('Upload a sample photo and choose a theme', async () => {
      await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByRole('heading', { name: '2. Pengaturan Tampilan' })).toBeVisible();
      await page.getByRole('button', { name: /Suasana Cafe/i }).click();
    });

    await test.step('Confirm credits and wait for the finished scene', async () => {
      await page.getByRole('button', { name: /Buat Foto Produk/i }).click();
      await page.getByRole('button', { name: /Lanjutkan/i }).click();

      await expect(page.getByRole('heading', { name: /Scene produk baru siap dipakai/i })).toBeVisible({ timeout: 30000 });
      await expect(page.getByRole('button', { name: /Download Hasil/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Lanjut ke Editor/i })).toBeVisible();
    });
  });
});