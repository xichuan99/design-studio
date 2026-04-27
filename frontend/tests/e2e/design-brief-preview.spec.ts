import { test, expect } from '@playwright/test';
import { DESIGN_BRIEF_SESSION_KEY } from '../../src/lib/design-brief-session';

async function mockAuthenticatedSession(page: import('@playwright/test').Page) {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          name: 'Demo User',
          email: 'demo@example.com',
          image: null,
        },
        expires: '2099-01-01T00:00:00.000Z',
      }),
    });
  });
}

async function continueIfAuthInterstitial(page: import('@playwright/test').Page) {
  const continueLink = page.getByRole('link', { name: /Lanjutkan/i });
  if (await continueLink.count()) {
    await continueLink.first().click();
    await page.waitForLoadState('domcontentloaded');
  }
}

async function goToPreviewFromInterview(page: import('@playwright/test').Page) {
  await page.goto('/design/new/interview');
  await continueIfAuthInterstitial(page);
  await page.getByRole('button', { name: /Katalog produk/i }).click();
  await page.getByRole('button', { name: /Beauty/i }).click();
  await page.getByRole('button', { name: /Bold marketplace/i }).click();
  await page.getByRole('button', { name: /^Marketplace$/i }).click();
  await page.getByRole('button', { name: /Persuasif/i }).click();
  await page.getByRole('button', { name: /Lanjut ke Preview/i }).click();
  await page.waitForURL('**/design/new/preview');
}

test.describe('Design Brief Flow — Interview & Preview', () => {
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit session redirect race on protected design routes in CI');

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test.describe('Preview page', () => {
    test('shows brief summary and generate button when brief exists', async ({ page }) => {
      await test.step('Reach preview through interview flow', async () => {
        await goToPreviewFromInterview(page);
      });

      await test.step('Brief summary cards are visible', async () => {
        const goalValue = page.getByText('Goal').locator('xpath=following-sibling::p[1]');
        const styleValue = page.getByText('Style').locator('xpath=following-sibling::p[1]');
        const channelValue = page.getByText('Channel').locator('xpath=following-sibling::p[1]');

        await expect(goalValue).toHaveText(/catalog/i, { timeout: 10000 });
        await expect(styleValue).toHaveText('Bold marketplace');
        await expect(channelValue).toHaveText(/marketplace/i);
      });

      await test.step('Generated prompt includes all brief fields', async () => {
        await expect(page.getByText(/katalog produk/i)).toBeVisible();
        await expect(page.getByText(/Gaya visual:\s*Bold marketplace\./i)).toBeVisible();
      });

      await test.step('Generate Desain button is enabled', async () => {
        await expect(page.getByRole('button', { name: /Generate Desain/i })).toBeEnabled();
      });

      await test.step('Aspect ratio chip shows 1:1 for marketplace', async () => {
        await expect(page.getByText('1:1')).toBeVisible();
      });
    });

    test('upload photo + skip AI mode opens editor without hitting generate endpoint', async ({ page }) => {
      let generateCalled = false;

      await page.route('**/designs/upload', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ url: 'https://example.com/product-image.jpg' }),
        });
      });

      await page.route('**/designs/generate', async (route) => {
        generateCalled = true;
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({ job_id: 'job-should-not-be-called' }),
        });
      });

      await page.route('**/projects/', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'project-from-skip-mode',
            title: 'Mock Project',
            status: 'draft',
            canvas_state: {},
          }),
        });
      });

      await page.goto('/design/new/interview');
      await page.getByRole('button', { name: /Katalog produk/i }).click();
      await page.getByRole('button', { name: /Fashion/i }).click();
      await page.getByRole('button', { name: /Minimal clean/i }).click();
      await page.getByRole('button', { name: /^Instagram$/i }).click();
      await page.getByRole('button', { name: /Friendly/i }).click();

      await page.locator('input[type="file"]').setInputFiles({
        name: 'product.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('mock-jpg-content'),
      });
      await expect(page.getByText(/Foto produk siap dipakai/i)).toBeVisible({ timeout: 10000 });

      await page.getByRole('button', { name: /Lanjut ke Preview/i }).click();
      await page.waitForURL('**/design/new/preview');

      await expect(page.getByRole('button', { name: /Pakai foto produk langsung \(tanpa AI\)/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Buka Editor dengan Foto Ini/i })).toBeVisible();

      await page.getByRole('button', { name: /Buka Editor dengan Foto Ini/i }).click();
      await page.waitForURL('**/edit/project-from-skip-mode', { timeout: 15000 });
      expect(generateCalled).toBe(false);
    });

    test('shows fallback when no brief exists in sessionStorage', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'Flaky auth redirect race on WebKit-family browsers in CI');
      await page.goto('/design/new/preview');
      await continueIfAuthInterstitial(page);
      await page.evaluate((key) => {
        window.sessionStorage.removeItem(key);
      }, DESIGN_BRIEF_SESSION_KEY);
      await page.reload();

      await test.step('Empty-state card is shown', async () => {
        await expect(page.getByRole('button', { name: /Isi Interview/i })).toBeVisible({ timeout: 15000 });
      });

      await test.step('"Isi Interview" button routes back', async () => {
        await page.getByRole('button', { name: /Isi Interview/i }).click();
        await page.waitForURL('**/design/new/interview');
      });
    });

    test('"Ubah Brief" back button returns to interview', async ({ page }) => {
      await goToPreviewFromInterview(page);

      await page.getByRole('button', { name: /Ubah Brief/i }).click();
      await page.waitForURL('**/design/new/interview');
    });

    test('"Pakai engine lama" link pre-fills localStorage and navigates to /create', async ({ page }) => {
      await goToPreviewFromInterview(page);

      await test.step('Click legacy engine link', async () => {
        await page.getByRole('button', { name: /Pakai engine lama/i }).click();
        await page.waitForURL('**/create**');
      });

      await test.step('smartdesign_create_state was written to localStorage', async () => {
        const saved = await page.evaluate(() => localStorage.getItem('smartdesign_create_state'));
        expect(saved).not.toBeNull();
        const parsed = JSON.parse(saved!);
        expect(parsed.briefAnswers.goal).toBe('catalog');
      });
    });
  });
});
