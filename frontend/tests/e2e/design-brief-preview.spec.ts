import { test, expect } from '@playwright/test';
import { DESIGN_BRIEF_SESSION_KEY } from '../../src/lib/design-brief-session';
import { loginAsDemoUser } from './utils/auth';

async function continueIfAuthInterstitial(page: import('@playwright/test').Page) {
  const continueLink = page.getByRole('link', { name: /Lanjutkan/i });
  const visibleContinueLink = continueLink.first();
  if (await visibleContinueLink.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false)) {
    await visibleContinueLink.click();
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
          { page_number: 1, type: 'cover', layout: 'hero', content: { title: 'Beauty Catalog 2026' } },
          { page_number: 2, type: 'brand_story', layout: 'text-image', content: { title: 'Kenapa Kami Dipilih' } },
          { page_number: 3, type: 'product_list', layout: 'grid', content: { title: 'Produk Pilihan' } },
          { page_number: 4, type: 'product_list', layout: 'grid', content: { title: 'Produk Best Seller' } },
          { page_number: 5, type: 'cta', layout: 'contact-cta', content: { title: 'Siap Order' } },
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
          { style: 'Minimalist Clean', description: 'Ruang putih lega.', use_case: 'Premium catalog', layout: 'Grid modular' },
          { style: 'Editorial Confidence', description: 'Narasi tegas.', use_case: 'Brand storytelling', layout: 'Split layout' },
          { style: 'Commercial Impact', description: 'CTA konversi.', use_case: 'Fast-selling catalog', layout: 'Card layout' },
        ],
      }),
    });
  });

  await page.route('**/catalog/generate-copy', async (route) => {
    const body = {
      pages: [
        { page_number: 1, type: 'cover', layout: 'hero', content: { title: 'Beauty Catalog 2026', subtitle: 'Pilihan produk unggulan' } },
        { page_number: 2, type: 'brand_story', layout: 'text-image', content: { title: 'Kenapa Kami Dipilih', description: 'Formula lembut dan terpercaya.' } },
        { page_number: 3, type: 'product_list', layout: 'grid', content: { title: 'Produk Pilihan' } },
        { page_number: 4, type: 'product_list', layout: 'grid', content: { title: 'Produk Best Seller' } },
        { page_number: 5, type: 'cta', layout: 'contact-cta', content: { title: 'Siap Order', cta: 'Hubungi Sekarang' } },
      ],
      missing_data: [],
      warnings: [],
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.route('**/catalog/finalize-plan', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        schema_version: 'catalog.plan.v1',
        catalog_type: 'product',
        total_pages: 5,
        tone: 'soft_selling',
        style: 'Minimalist Clean',
        pages: [
          { page_number: 1, type: 'cover', layout: 'hero', content: { title: 'Beauty Catalog 2026' } },
          { page_number: 2, type: 'brand_story', layout: 'text-image', content: { title: 'Kenapa Kami Dipilih' } },
          { page_number: 3, type: 'product_list', layout: 'grid', content: { title: 'Produk Pilihan' } },
          { page_number: 4, type: 'product_list', layout: 'grid', content: { title: 'Produk Best Seller' } },
          { page_number: 5, type: 'cta', layout: 'contact-cta', content: { title: 'Siap Order' } },
        ],
        missing_data: [],
      }),
    });
  });
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

async function seedPreviewBrief(page: import('@playwright/test').Page, payload: Record<string, unknown>) {
  await page.goto('/design/new/preview');
  await continueIfAuthInterstitial(page);
  await page.evaluate(
    ({ key, payload }) => {
      window.sessionStorage.setItem(key, JSON.stringify(payload));
    },
    { key: DESIGN_BRIEF_SESSION_KEY, payload }
  );
  await page.reload();
}

test.describe('Design Brief Flow — Interview & Preview', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit session redirect race on protected design routes in CI');

  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await mockCatalogBuilderEndpoints(page);
  });

  test.describe('Preview page', () => {
    test('shows brief summary and generate button when brief exists', async ({ page }) => {
      await test.step('Reach preview through interview flow', async () => {
        await goToPreviewFromInterview(page);
      });

      await test.step('Brief summary cards are visible', async () => {
        const goalValue = page.getByText('Tujuan').locator('xpath=following-sibling::p[1]');
        const styleValue = page.getByText('Gaya').locator('xpath=following-sibling::p[1]');
        const channelValue = page.getByText('Channel Utama').locator('xpath=following-sibling::p[1]');

        await expect(goalValue).toHaveText(/catalog/i, { timeout: 10000 });
        await expect(styleValue).toHaveText('Bold marketplace');
        await expect(channelValue).toHaveText(/marketplace/i);
      });

      await test.step('Generated prompt includes all brief fields', async () => {
        await expect(page.getByText(/katalog produk/i)).toBeVisible();
        await expect(page.getByText(/Gaya visual:\s*Bold marketplace\./i)).toBeVisible();
        await expect(page.getByText(/Rancang sebagai katalog product dengan 5 halaman\./i)).toBeVisible();
      });

      await test.step('Generate Desain button is enabled', async () => {
        await expect(page.getByRole('button', { name: /Generate Desain/i })).toBeEnabled();
      });

      await test.step('Aspect ratio chip shows 1:1 for marketplace', async () => {
        await expect(page.getByText('1:1')).toBeVisible();
      });

      await test.step('Catalog structure, styles, and editable plan controls are visible', async () => {
        await expect(page.getByText(/Struktur katalog awal/i)).toBeVisible();
        await expect(page.getByText(/Beauty Catalog 2026/i)).toBeVisible();
        await expect(page.getByText(/Arah style yang disarankan AI/i)).toBeVisible();
        await expect(page.getByText(/Minimalist Clean/i)).toBeVisible();
        await expect(page.getByText(/Override halaman katalog/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /Perbarui Rencana Katalog/i })).toBeVisible();
      });
    });

    test('upload photo + skip AI mode opens editor without hitting generate endpoint', async ({ page }) => {
      let generateCalled = false;

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

      await seedPreviewBrief(page, {
        goal: 'promo',
        productType: 'Fashion',
        style: 'Minimal clean',
        channel: 'instagram',
        copyTone: 'Friendly',
        productImageUrl: 'https://example.com/product-image.jpg',
        productImageFilename: 'product.jpg',
        updatedAt: new Date().toISOString(),
      });

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
      const manualHeadline = 'Diskon besar akhir bulan';
      const manualSubHeadline = 'Harga spesial untuk stok terbatas.';
      const manualCta = 'Checkout Sekarang';
      const manualProductName = 'Serum Glow Max';
      const manualOffer = 'Gratis ongkir seluruh Indonesia';

      await seedPreviewBrief(page, {
        goal: 'catalog',
        productType: 'Beauty',
        style: 'Bold marketplace',
        channel: 'marketplace',
        copyTone: 'Persuasif',
        headlineOverride: manualHeadline,
        subHeadlineOverride: manualSubHeadline,
        ctaOverride: manualCta,
        productName: manualProductName,
        offerText: manualOffer,
        useAiCopyAssist: false,
        catalogType: 'product',
        catalogTotalPages: 5,
        updatedAt: new Date().toISOString(),
      });

      await test.step('Preview shows manual copy summary and prompt guardrail', async () => {
        await expect(page.getByText('Copy manual', { exact: true })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(manualHeadline, { exact: true })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(manualSubHeadline, { exact: true })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(manualCta, { exact: true })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(manualProductName, { exact: true })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(manualOffer, { exact: true })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/AI assist off/i)).toBeVisible({ timeout: 15000 });
      });

      await test.step('Click legacy engine link', async () => {
        await page.getByRole('button', { name: /Pakai engine lama/i }).click();
        await page.waitForURL('**/create**');
      });

      await test.step('smartdesign_create_state was written to localStorage with manual copy overrides', async () => {
        const saved = await page.evaluate(() => localStorage.getItem('smartdesign_create_state'));
        expect(saved).not.toBeNull();
        const parsed = JSON.parse(saved!);
        expect(parsed.briefAnswers.goal).toBe('catalog');
        expect(parsed.briefAnswers.headlineOverride).toBe(manualHeadline);
        expect(parsed.briefAnswers.subHeadlineOverride).toBe(manualSubHeadline);
        expect(parsed.briefAnswers.ctaOverride).toBe(manualCta);
        expect(parsed.briefAnswers.productName).toBe(manualProductName);
        expect(parsed.briefAnswers.offerText).toBe(manualOffer);
        expect(parsed.briefAnswers.useAiCopyAssist).toBe(false);
        expect(parsed.manualCopyOverrides).toEqual({
          headlineOverride: manualHeadline,
          subHeadlineOverride: manualSubHeadline,
          ctaOverride: manualCta,
          productName: manualProductName,
          offerText: manualOffer,
          useAiCopyAssist: false,
        });
      });
    });
  });
});
