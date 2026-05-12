import { test, expect } from '@playwright/test';
import { loginAsDemoUser } from './utils/auth';

async function continueIfAuthInterstitial(page: import('@playwright/test').Page) {
  const continueLink = page.getByRole('link', { name: /Lanjutkan/i });
  const visibleContinueLink = continueLink.first();
  if (await visibleContinueLink.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false)) {
    await visibleContinueLink.click();
    await page.waitForLoadState('domcontentloaded');
  }
}

const SEEDED_PREVIEW_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="%23f3f4f6"/><circle cx="512" cy="430" r="180" fill="%23f59e0b"/><rect x="280" y="650" width="464" height="140" rx="28" fill="%23111827"/></svg>';

test.describe('Create Preview Handoff', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('restores manual copy overrides in legacy create sidebar', async ({ page, isMobile }) => {
    test.setTimeout(120000);
    test.skip(isMobile, 'Sidebar assertions are desktop-only for this regression guard');

    const manualHeadline = 'Diskon besar akhir bulan untuk semua serum terbaik';
    const manualSubHeadline = 'Promo terbatas dengan bonus sample untuk pembelian minggu ini.';
    const manualCta = 'Checkout Sekarang';
    const manualProductName = 'Serum Glow Max';
    const manualOffer = 'Gratis ongkir seluruh Indonesia';

    await page.goto('/create?legacy=1');
    await continueIfAuthInterstitial(page);
    await page.evaluate(
      ({ manualHeadline, manualSubHeadline, manualCta, manualProductName, manualOffer }) => {
        localStorage.setItem(
          'smartdesign_create_state',
          JSON.stringify({
            rawText: 'Poster promo serum glow max',
            aspectRatio: '1:1',
            currentStep: 'input',
            createMode: 'generate',
            redesignStrength: 0.65,
            parsedData: null,
            imageHistory: [],
            activeImageIndex: 0,
            integratedText: false,
            briefQuestions: [],
            briefAnswers: {
              headlineOverride: manualHeadline,
              subHeadlineOverride: manualSubHeadline,
              ctaOverride: manualCta,
              productName: manualProductName,
              offerText: manualOffer,
              useAiCopyAssist: 'false',
            },
            manualCopyOverrides: {
              headlineOverride: manualHeadline,
              subHeadlineOverride: manualSubHeadline,
              ctaOverride: manualCta,
              productName: manualProductName,
              offerText: manualOffer,
              useAiCopyAssist: false,
            },
            removeProductBg: false,
            copyVariations: [],
            userIntent: 'content_from_text',
            selectedModelTier: 'auto',
          })
        );
      },
      { manualHeadline, manualSubHeadline, manualCta, manualProductName, manualOffer }
    );
    await page.reload();
    await expect(page.getByText(/Copy final \(opsional\)/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder('Contoh: Diskon 50% Menu Favorit')).toHaveValue(manualHeadline);
    await expect(page.getByPlaceholder('Contoh: Berlaku khusus weekend ini untuk varian paling laris.')).toHaveValue(manualSubHeadline);
    await expect(page.getByPlaceholder('Contoh: Pesan Sekarang')).toHaveValue(manualCta);
    await expect(page.getByPlaceholder('Contoh: Teh Manis Jumbo')).toHaveValue(manualProductName);
    await expect(page.getByPlaceholder('Contoh: Beli 2 Gratis 1 sampai Minggu')).toHaveValue(manualOffer);
    await expect(page.getByRole('switch', { name: /Aktifkan AI copy assist/i })).toHaveAttribute('aria-checked', 'false');
  });

  test('can continue from preview into the editor', async ({ page, isMobile }) => {
    test.setTimeout(120000);

    await page.route('**/designs/generate-title', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ title: 'Promo Kopi Susu' }),
      });
    });

    await page.route('**/projects/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-project-id',
          title: 'Promo Kopi Susu',
          status: 'draft',
          canvas_state: {},
        }),
      });
    });

    await page.goto('/create?legacy=1');
    await continueIfAuthInterstitial(page);
    await page.evaluate((seededPreviewImage) => {
      localStorage.setItem(
        'smartdesign_create_state',
        JSON.stringify({
          rawText: 'Poster promo kopi susu malam ini',
          aspectRatio: '1:1',
          currentStep: 'preview',
          createMode: 'generate',
          redesignStrength: 0.65,
          parsedData: {
            headline: 'Promo Kopi Susu',
            sub_headline: 'Diskon malam ini',
            cta: 'Pesan sekarang',
            visual_prompt: 'Poster promo kopi susu hangat dengan nuansa premium',
            indonesian_translation: 'Poster promo kopi susu hangat dengan nuansa premium',
            generated_image_url: seededPreviewImage,
            visual_prompt_parts: [],
          },
          imageHistory: [{ url: seededPreviewImage, prompt: 'Poster promo kopi susu hangat dengan nuansa premium' }],
          activeImageIndex: 0,
          integratedText: true,
          briefQuestions: [],
          briefAnswers: {},
          removeProductBg: false,
          copyVariations: [],
          userIntent: 'content_from_text',
          selectedModelTier: 'auto',
        })
      );
    }, SEEDED_PREVIEW_IMAGE);
    await page.reload();

    await expect(page.getByRole('heading', { name: /Pilih hasil terbaik lalu lanjutkan ke editor/i })).toBeVisible();
    const proceedButton = page.getByRole('button', { name: /Lanjut Rapikan di Editor|Ke Editor/i });
    await expect(proceedButton).toBeVisible();
    await proceedButton.click({ force: true });

    if (isMobile) {
      await expect(page.getByRole('heading', { name: /Pilih hasil terbaik lalu lanjutkan ke editor/i })).toBeVisible();
      return;
    }

    await page.waitForURL('**/edit/mock-project-id', { timeout: 60000 });
  });
});
