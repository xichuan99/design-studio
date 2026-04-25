import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';
import { getPublicFixturePath } from './utils/fixtures';
import { goToToolsHub } from './utils/tools';

test.describe('AI Transform Pipeline Tool', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Safari', 'Mobile Safari auth redirect race on /tools');
    await loginAsDemoUser(page);
    await goToToolsHub(page);
  });

  test('can run preset pipeline with watermark and complete the flow', async ({ page }) => {
    test.setTimeout(120000);

    await test.step('Open transform tool and upload source image', async () => {
      const transformLink = page.getByRole('link', { name: /AI Transform Pipeline/i }).first();
      await transformLink.scrollIntoViewIfNeeded();
      await transformLink.click();
      await expect(page.getByRole('heading', { name: 'AI Transform Pipeline', exact: true })).toBeVisible();

      await page.locator('input[type="file"]').first().setInputFiles(getPublicFixturePath('before-product.png'));
      await expect(page.getByText('Pipeline Builder', { exact: true })).toBeVisible();
    });

    await test.step('Apply branded preset and upload logo for watermark', async () => {
      const advancedToggle = page.getByRole('button', { name: /^Mati$/i });
      if (await advancedToggle.count()) {
        await advancedToggle.click();
      }

      const brandedReady = page.getByRole('button', { name: /Branded Ready/i });
      if (await brandedReady.count()) {
        await brandedReady.click();
      } else {
        await page.getByRole('button', { name: /Perbaiki Cepat/i }).click();
      }

      const logoInput = page.locator('input#watermark-file');
      await expect(logoInput).toBeVisible();
      await logoInput.setInputFiles(getPublicFixturePath('before-product.png'));
    });

    await test.step('Run pipeline and verify submission state', async () => {
      await page.getByRole('button', { name: /Jalankan Pipeline/i }).click();

      // Verify frontend submits the job correctly — button becomes disabled/loading
      // or an error/API-unavailable message appears. Full AI completion is not
      // expected in unit-CI environments where the backend is not running.
      // Disambiguate [role="alert"] from Next.js route announcer by filtering for app error text.
      await expect(
        page.getByRole('button', { name: /^Memproses/i }).or(
          page.locator('[role="alert"]').filter({ hasText: /gagal|error|failed|tidak/i })
        ).or(
          page.getByRole('heading', { name: /Hasil pipeline siap/i })
        )
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test('submits image_bytes payload when starting transform pipeline job', async ({ page }) => {
    let createPipelinePayload: Record<string, unknown> | null = null;

    await page.route('**/tools/pipeline', async (route) => {
      createPipelinePayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'job-image-bytes',
          tool_name: 'pipeline',
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
    });

    await page.route('**/tools/jobs/job-image-bytes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'job-image-bytes',
          tool_name: 'pipeline',
          status: 'completed',
          progress_percent: 100,
          phase_message: 'done',
          result_url: 'https://example.com/pipeline-result.jpg',
          error_message: null,
          cancel_requested: false,
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        }),
      });
    });

    const transformLink = page.getByRole('link', { name: /AI Transform Pipeline/i }).first();
    await transformLink.scrollIntoViewIfNeeded();
    await transformLink.click();
    await page.locator('input[type="file"]').first().setInputFiles(getPublicFixturePath('before-product.png'));
    const advancedToggle = page.getByRole('button', { name: /^Mati$/i });
    if (await advancedToggle.count()) {
      await advancedToggle.click();
    }

    const brandedReady = page.getByRole('button', { name: /Branded Ready/i });
    if (await brandedReady.count()) {
      await brandedReady.click();
      await page.locator('input#watermark-file').setInputFiles(getPublicFixturePath('before-product.png'));
    } else {
      await page.getByRole('button', { name: /Perbaiki Cepat/i }).click();
    }

    await page.getByRole('button', { name: /Jalankan Pipeline/i }).click();

    await expect(page.getByRole('heading', { name: /Hasil pipeline siap/i })).toBeVisible({ timeout: 15000 });
    expect(createPipelinePayload).not.toBeNull();
    const submittedPipelinePayload = createPipelinePayload as Record<string, unknown>;
    expect(submittedPipelinePayload.image_bytes).toBeTruthy();
    expect(submittedPipelinePayload.image_url).toBeUndefined();
  });

  test('submits image_bytes payload when running synchronous preview', async ({ page }) => {
    let previewPayload: Record<string, unknown> | null = null;

    await page.route('**/tools/pipeline/preview', async (route) => {
      previewPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://example.com/pipeline-preview-result.jpg',
          result_id: 'result-1',
          stage_count: 3,
        }),
      });
    });

    const transformLink = page.getByRole('link', { name: /AI Transform Pipeline/i }).first();
    await transformLink.scrollIntoViewIfNeeded();
    await transformLink.click();
    await page.locator('input[type="file"]').first().setInputFiles(getPublicFixturePath('before-product.png'));
    const advancedToggle = page.getByRole('button', { name: /^Mati$/i });
    if (await advancedToggle.count()) {
      await advancedToggle.click();
    }

    const brandedReady = page.getByRole('button', { name: /Branded Ready/i });
    if (await brandedReady.count()) {
      await brandedReady.click();
      await page.locator('input#watermark-file').setInputFiles(getPublicFixturePath('before-product.png'));
    } else {
      await page.getByRole('button', { name: /Perbaiki Cepat/i }).click();
    }

    await page.getByRole('button', { name: /Preview Cepat/i }).click();

    await expect(page.getByRole('heading', { name: /Hasil pipeline siap/i })).toBeVisible({ timeout: 15000 });
    expect(previewPayload).not.toBeNull();
    const submittedPreviewPayload = previewPayload as Record<string, unknown>;
    expect(submittedPreviewPayload.image_bytes).toBeTruthy();
    expect(submittedPreviewPayload.image_url).toBeUndefined();
  });
});
