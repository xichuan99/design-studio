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

async function mockCatalogBuilderEndpoints(page: import('@playwright/test').Page) {
  await page.route('**/catalog/plan-structure', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        suggested_structure: [
          { page_number: 1, type: 'cover', layout: 'hero', content: { title: 'Foto Studio Catalog' } },
          { page_number: 2, type: 'product_list', layout: 'grid', content: { title: 'Paket Utama' } },
          { page_number: 3, type: 'cta', layout: 'contact-cta', content: { title: 'Booking Sekarang' } },
        ],
        missing_data: [],
        warnings: [],
      }),
    });
  });

  await page.route('**/catalog/suggest-styles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        style_options: [
          { style: 'Professional tech', description: 'Layout tegas.', use_case: 'Service catalog', layout: 'Grid modular' },
        ],
      }),
    });
  });

  await page.route('**/catalog/generate-copy', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pages: [
          { page_number: 1, type: 'cover', layout: 'hero', content: { title: 'Foto Studio Catalog' } },
          { page_number: 2, type: 'product_list', layout: 'grid', content: { title: 'Paket Utama' } },
          { page_number: 3, type: 'cta', layout: 'contact-cta', content: { title: 'Booking Sekarang' } },
        ],
        missing_data: [],
        warnings: [],
      }),
    });
  });

  await page.route('**/catalog/finalize-plan', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        schema_version: 'catalog.plan.v1',
        catalog_type: 'product',
        total_pages: 3,
        tone: 'hard_selling',
        style: 'Professional tech',
        pages: [
          { page_number: 1, type: 'cover', layout: 'hero', content: { title: 'Foto Studio Catalog' } },
          { page_number: 2, type: 'product_list', layout: 'grid', content: { title: 'Paket Utama' } },
          { page_number: 3, type: 'cta', layout: 'contact-cta', content: { title: 'Booking Sekarang' } },
        ],
        missing_data: [],
      }),
    });
  });
}

test.describe('Design Brief Interview', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockCatalogBuilderEndpoints(page);
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

    const productTypeValue = page.getByText('Jenis Produk').locator('xpath=following-sibling::p[1]');
    await expect(productTypeValue).toHaveText('Foto Studio', { timeout: 15000 });
  });

  test('shows non-blocking headline warning and carries manual copy overrides to preview', async ({ page }) => {
    test.setTimeout(90000);

    const manualHeadline = 'Diskon akhir pekan super hemat untuk semua menu favorit';
    const manualSubHeadline = 'Promo spesial dua hari saja untuk menu minuman paling laris.';
    const manualCta = 'Pesan Sekarang';
    const manualProductName = 'Es Teh Nusantara';
    const manualOffer = 'Beli 2 gratis 1 sampai Minggu';

    await page.goto('/design/new/interview');
    await continueIfAuthInterstitial(page);
    await page.getByRole('button', { name: /Promo cepat/i }).click();
    await page.getByRole('button', { name: /Makanan & Minuman/i }).click();
    await page.getByRole('button', { name: /Minimal clean/i }).click();
    await page.getByRole('button', { name: /^Instagram$/i }).click();
    await page.getByRole('button', { name: /Friendly/i }).click();

    await page.getByLabel(/^Headline$/i).fill(manualHeadline);
    await expect(page.getByText(/Headline \d+ karakter cukup panjang/i)).toBeVisible({ timeout: 10000 });

    await page.getByLabel(/Sub-headline/i).fill(manualSubHeadline);
    await page.getByLabel(/^CTA$/i).fill(manualCta);
    await page.getByLabel(/Nama produk \/ brand/i).fill(manualProductName);
    await page.getByLabel(/Offer \/ promo text/i).fill(manualOffer);

    const aiAssistSwitch = page.getByRole('switch', { name: /Aktifkan AI copy assist/i });
    await expect(aiAssistSwitch).toHaveAttribute('aria-checked', 'true');
    await aiAssistSwitch.click();
    await expect(aiAssistSwitch).toHaveAttribute('aria-checked', 'false');

    await page.getByRole('button', { name: /Lanjut ke Preview/i }).click();
    await page.waitForURL('**/design/new/preview', { timeout: 15000 });

    await expect(page.getByText('Copy manual', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(manualHeadline, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(manualSubHeadline, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(manualCta, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(manualProductName, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(manualOffer, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/AI assist off/i)).toBeVisible({ timeout: 15000 });
  });
});