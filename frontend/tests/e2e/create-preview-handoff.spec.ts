import { test, expect } from '@playwright/test';

import { loginAsDemoUser } from './utils/auth';

const SEEDED_PREVIEW_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="%23f3f4f6"/><circle cx="512" cy="430" r="180" fill="%23f59e0b"/><rect x="280" y="650" width="464" height="140" rx="28" fill="%23111827"/></svg>';

test.describe('Create Preview Handoff', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
  });

  test('can continue from preview into the editor', async ({ page }) => {
    test.setTimeout(120000);

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
        })
      );
    }, SEEDED_PREVIEW_IMAGE);

    await page.goto('/create');

    await expect(page.getByRole('heading', { name: /Pilih hasil terbaik lalu lanjutkan ke editor/i })).toBeVisible();
    await page.getByRole('button', { name: /Lanjut Rapikan di Editor|Ke Editor/i }).click();

    await page.waitForURL('**/edit/**', { timeout: 20000 });
    await expect(page.locator('.konvajs-content')).toBeVisible({ timeout: 10000 });
  });
});