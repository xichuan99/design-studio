import { test, expect } from '@playwright/test';

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

test.describe('Design Brief Interview', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test('renders interview flow and navigates to preview after required selections', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/start');
    await continueIfAuthInterstitial(page);
    await page.getByRole('link', { name: /Mulai Jalur Desain/i }).click();
    await page.waitForURL('**/design/new/interview', { timeout: 15000 });

    await expect(page.getByRole('heading', { name: /Mulai dari brief visual, bukan panel samping\./i })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Promo cepat/i }).click();
    await page.getByRole('button', { name: /Fashion/i }).click();
    await page.getByRole('button', { name: /Minimal clean/i }).click();
    await page.getByRole('button', { name: /Instagram/i }).click();
    await page.getByRole('button', { name: /Friendly/i }).click();

    await expect(page.getByText('100%')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Lanjut ke Preview/i }).click();
    await page.waitForURL('**/design/new/preview', { timeout: 15000 });

    await expect(page.getByRole('heading', { name: /AI akan membuat desain awal langsung dari brief ini\./i })).toBeVisible({ timeout: 15000 });
  });

  test('supports manual custom category when selecting "Lainnya"', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/design/new/interview');
    await continueIfAuthInterstitial(page);
    await page.getByRole('button', { name: /Katalog produk/i }).click();
    await page.getByRole('button', { name: /^Lainnya$/i }).click();
    await page.getByRole('textbox', { name: /Kategori produk lainnya/i }).fill('Foto Studio');
    await page.getByRole('button', { name: /Professional tech/i }).click();
    await page.getByRole('button', { name: /^Marketplace$/i }).click();
    await page.getByRole('button', { name: /Persuasif/i }).click();

    await expect(page.getByText('100%')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Lanjut ke Preview/i }).click();
    await page.waitForURL('**/design/new/preview', { timeout: 15000 });

    const productTypeValue = page.getByText('Product Type').locator('xpath=following-sibling::p[1]');
    await expect(productTypeValue).toHaveText('Foto Studio', { timeout: 15000 });
    await expect(page.getByText(/konteks Foto Studio/i)).toBeVisible({ timeout: 15000 });
  });
});