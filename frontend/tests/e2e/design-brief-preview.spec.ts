import { test, expect } from '@playwright/test';
import { loginAsDemoUser } from './utils/auth';
import { DESIGN_BRIEF_SESSION_KEY } from '../../src/lib/design-brief-session';

async function goToPreviewFromInterview(page: import('@playwright/test').Page) {
  await page.goto('/design/new/interview');
  await page.getByRole('button', { name: /Katalog produk/i }).click();
  await page.getByRole('button', { name: /Bold marketplace/i }).click();
  await page.getByRole('button', { name: /^Marketplace$/i }).click();
  await page.getByRole('button', { name: /Lanjut ke Preview/i }).click();
  await page.waitForURL('**/design/new/preview');
}

test.describe('Design Brief Flow — Interview & Preview', () => {
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit session redirect race on protected design routes in CI');

  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test.describe('Interview page', () => {
    test('renders all three question cards with default selections', async ({ page }) => {
      await page.goto('/design/new/interview');

      await test.step('Page heading visible', async () => {
        await expect(page.getByRole('heading', { name: /Mulai dari brief visual/i })).toBeVisible({ timeout: 10000 });
      });

      await test.step('All three question cards present', async () => {
        await expect(page.getByText('1. Apa tujuan desain ini?')).toBeVisible();
        await expect(page.getByText('2. Gaya visual yang diinginkan')).toBeVisible();
        await expect(page.getByText('3. Channel utama')).toBeVisible();
      });

      await test.step('Progress bar shows 100% (all pre-selected)', async () => {
        await expect(page.getByText('100%')).toBeVisible();
      });
    });

    test('selecting different options updates the brief and navigates to preview', async ({ page }) => {
      await page.goto('/design/new/interview');

      await test.step('Select "Katalog produk" goal', async () => {
        await page.getByRole('button', { name: /Katalog produk/i }).click();
      });

      await test.step('Select "Bold marketplace" style', async () => {
        await page.getByRole('button', { name: /Bold marketplace/i }).click();
      });

      await test.step('Select "Marketplace" channel', async () => {
        await page.getByRole('button', { name: /^Marketplace$/i }).click();
      });

      await test.step('Click Continue to Preview', async () => {
        await page.getByRole('button', { name: /Lanjut ke Preview/i }).click();
        await page.waitForURL('**/design/new/preview');
      });

      await test.step('Preview page shows the selected brief values', async () => {
        const goalValue = page.getByText('Goal').locator('xpath=following-sibling::p[1]');
        const styleValue = page.getByText('Style').locator('xpath=following-sibling::p[1]');
        const channelValue = page.getByText('Channel').locator('xpath=following-sibling::p[1]');

        await expect(goalValue).toHaveText(/catalog/i, { timeout: 10000 });
        await expect(styleValue).toHaveText('Bold marketplace');
        await expect(channelValue).toHaveText(/marketplace/i);
      });
    });
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

      await test.step('Aspect ratio chip shows 1:1 for instagram', async () => {
        await expect(page.getByText('1:1')).toBeVisible();
      });
    });

    test('shows fallback when no brief exists in sessionStorage', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'Flaky auth redirect race on WebKit-family browsers in CI');

      const openPreview = async () => {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            await page.goto('/design/new/preview');
          } catch {
            // ignore interrupted navigation; we'll verify resulting URL below
          }

          if (page.url().includes('/design/new/preview')) {
            return;
          }

          await loginAsDemoUser(page);
        }
        throw new Error('Unable to open /design/new/preview after auth retry');
      };

      await openPreview();
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
