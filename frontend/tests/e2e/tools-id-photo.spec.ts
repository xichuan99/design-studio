import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('ID Photo Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can upload configure and start an id photo generation job', async ({ page }) => {
    test.setTimeout(120000);
    const jobId = 'id-photo-job-1';

    await page.route('**/designs/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.com/id-photo-input.png' }),
      });
    });

    await page.route('**/tools/jobs', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            job_id: jobId,
            tool_name: 'id_photo',
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
          tool_name: 'id_photo',
          status: 'completed',
          progress_percent: 100,
          phase_message: 'done',
          result_url: 'https://example.com/id-photo-result.png',
          error_message: null,
          cancel_requested: false,
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        }),
      });
    });

    await page.getByRole('link', { name: /ID Photo Maker/i }).click();
    await expect(page.getByRole('heading', { name: 'ID Photo (Pasfoto) Maker', exact: true })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(getPublicFixturePath('before-product.png'));
    await expect(page.getByRole('heading', { name: '2. Pengaturan Pasfoto' })).toBeVisible();

    await page.getByText('Biru Studio').click();
    await page.getByRole('button', { name: /Generate Pasfoto/i }).click();

    await expect(page.getByRole('heading', { name: /Hasil Pasfoto \(300 DPI\)/i })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: /Download HD/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Lanjut ke Editor/i })).toBeVisible();
  });
});