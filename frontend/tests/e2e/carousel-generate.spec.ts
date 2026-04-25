import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';


test.describe('Carousel Generator Path C', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit is flaky for carousel generate and export flow');
    await loginAsDemoUser(page);
  });

  test('can enter the carousel flow, generate slides, and export a zip', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/create/carousel');
    await expect(page).toHaveURL(/\/create\/carousel$/);

    await page.getByLabel('Topik Carousel').fill('5 tips onboarding yang membuat pengguna baru lebih cepat paham produk Anda');
    await page.getByLabel('Nama Brand').fill('DesignCo');
    await page.getByLabel('Handle Instagram').fill('@designco.id');

    const generateResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/carousel/generate') && response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: /Generate Carousel/i }).click();

    const generateResponse = await generateResponsePromise;
    const generateResponseBody = await generateResponse.text();
    expect(
      {
        status: generateResponse.status(),
        body: generateResponseBody,
      },
      'carousel generate request should succeed'
    ).toMatchObject({ status: 200 });

    await expect(page.getByRole('heading', { name: /Instagram Frame/i })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Slide 1', level: 3 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export ZIP Carousel/i })).toBeEnabled();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export ZIP Carousel/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/car_.*\.zip/);
  });
});